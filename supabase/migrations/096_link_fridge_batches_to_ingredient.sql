-- ============================================================
-- 장보기 항목 하나에 재고 배치 여러 개를 연결
-- ============================================================
-- 1. fridge_item_batches.ingredient_id를 추가하고 ingredients.linked_fridge_batch_id에서 옮깁니다.
--    배치 하나를 활성 장보기 항목 여럿이 공유하면 옮길 수 없으므로 마이그레이션을 중단합니다.
-- 2. ingredients.linked_fridge_batch_id를 제거합니다.
-- 3. add_ingredient_with_fridge에 p_batches를 추가합니다. 배치별 수량과 유통기한을 받습니다.
-- 4. 배치가 2개 이상인 장보기 수량은 배치별 등록 수량 합계로 관리합니다.
-- 5. 냉장고 목록에 잔여율 분모(remaining_initial_total)를 추가합니다.

do $$
declare
  v_shared_count bigint;
begin
  select count(*)
    into v_shared_count
  from (
    select i.linked_fridge_batch_id
    from public.ingredients i
    where i.deleted_at is null
      and i.linked_fridge_batch_id is not null
    group by i.linked_fridge_batch_id
    having count(*) > 1
  ) shared;

  if v_shared_count > 0 then
    raise exception '활성 장보기 항목이 공유하는 배치가 %건 있어 마이그레이션을 중단합니다.', v_shared_count;
  end if;
end;
$$;

alter table public.fridge_item_batches
  add column if not exists ingredient_id uuid references public.ingredients(id) on delete set null;

create index if not exists idx_fridge_item_batches_ingredient_id
  on public.fridge_item_batches (ingredient_id)
  where ingredient_id is not null;

-- 백필이 updated_at과 total_count 트리거를 건드리지 않도록 잠시 끈다.
alter table public.fridge_item_batches disable trigger user;

update public.fridge_item_batches b
set ingredient_id = i.id
from public.ingredients i
where i.linked_fridge_batch_id = b.id
  and i.deleted_at is null;

alter table public.fridge_item_batches enable trigger user;

drop view public.v_food_expenses;

alter table public.ingredients
  drop column linked_fridge_batch_id;

-- 역할: 장보기(ingredients)와 외식비(dining_expenses)를 하나의 식비 내역으로 노출하는 통합 조회 뷰.
-- 동작:
--   1. ingredients에서 deleted_at is null 행을 kind='grocery' 리터럴과 함께 선택한다.
--   2. dining_expenses에서 deleted_at is null 행을 kind(restaurant|delivery) 그대로 선택한다.
--   3. 두 결과를 UNION ALL로 합친다. 한쪽에만 있는 컬럼은 서로 null로 채워 컬럼 구조를 맞춘다.
--   4. security_invoker = true라 두 원본 테이블의 RLS가 호출자 기준으로 그대로 적용된다.
-- 비고: 새 식비 유형은 테이블을 늘리지 않고 dining_expenses.kind로 흡수한다. UNION은 이 뷰 한 곳에만 존재한다.

create or replace view public.v_food_expenses
with (security_invoker = true)
as
select
  i.id,
  i.household_id,
  i.user_id,
  'grocery'::text as kind,
  i.date,
  i.name,
  i.brand,
  i.store,
  i.price,
  i.category_id,
  i.count,
  i.unit,
  i.linked_fridge_item_id,
  null::text as memo,
  i.created_at,
  i.updated_at
from public.ingredients i
where i.deleted_at is null
union all
select
  d.id,
  d.household_id,
  d.user_id,
  d.kind,
  d.date,
  d.name,
  d.brand,
  d.store,
  d.price,
  null::uuid as category_id,
  null::numeric as count,
  null::text as unit,
  null::uuid as linked_fridge_item_id,
  d.memo,
  d.created_at,
  d.updated_at
from public.dining_expenses d
where d.deleted_at is null;

grant select on public.v_food_expenses to authenticated;

drop function public.add_ingredient_with_fridge(uuid, text, integer, text, text, uuid, numeric, text, date);

-- 역할: 장보기 항목 생성과 냉장고 아이템/배치 연결을 한 트랜잭션으로 처리합니다.
-- 동작:
-- 1. ingredient를 생성하고 category_id를 정규화합니다.
-- 2. 카테고리 기본 유효기간이 설정돼 있으면 구매일 + 기본일수로 배치 expiry_date를 채웁니다.
-- 3. 동일 품목 fridge_item을 재사용하거나 없으면 생성한 뒤 batch를 추가합니다.
-- 4. p_batches를 받으면 수량 합계를 검증하고 항목별로 배치를 만듭니다.
--    배치의 expiry_date 키가 있으면 그 값(null 포함)을 쓰고, 없으면 카테고리 기본값을 씁니다.
create or replace function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
  p_brand text default null,
  p_category_id uuid default null,
  p_count numeric default 1,
  p_unit text default 'count',
  p_date date default current_date,
  p_batches jsonb default null
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingredient public.ingredients%rowtype;
  v_fridge_item_id uuid;
  v_batches jsonb := nullif(p_batches, 'null'::jsonb);
  v_batch jsonb;
  v_category_id uuid;
  v_expiry_days integer;
  v_expiry_date date;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if v_batches is not null and (
    jsonb_typeof(v_batches) <> 'array'
    or jsonb_array_length(v_batches) = 0
    or exists (
      select 1
      from jsonb_array_elements(v_batches) e
      where coalesce((e->>'quantity')::numeric, 0) <= 0
    )
    or (
      select sum((e->>'quantity')::numeric)
      from jsonb_array_elements(v_batches) e
    ) <> coalesce(p_count, 1)
  ) then
    raise exception using
      errcode = 'I0007',
      message = '배치 수량의 합계가 항목 수량과 일치하지 않습니다.',
      hint = 'INGREDIENT_BATCH_QUANTITY_MISMATCH';
  end if;

  v_category_id := public.normalize_ingredient_category_id(p_household_id, p_category_id);

  insert into public.ingredients (
    household_id,
    user_id,
    date,
    name,
    price,
    store,
    brand,
    category_id,
    count,
    unit
  )
  values (
    p_household_id,
    v_user_id,
    coalesce(p_date, current_date),
    p_name,
    coalesce(p_price, 0),
    p_store,
    p_brand,
    v_category_id,
    coalesce(p_count, 1),
    coalesce(p_unit, 'count')
  )
  returning * into v_ingredient;

  -- 카테고리 기본 유효기간이 설정돼 있으면 구매일 기준으로 expiry_date를 계산한다.
  -- 설정이 없으면 v_expiry_date는 null로 유지된다. (과거 날짜가 되어도 그대로 저장)
  select d.default_expiry_days
    into v_expiry_days
  from public.fridge_category_expiry_defaults d
  where d.household_id = v_ingredient.household_id
    and d.category_id = v_ingredient.category_id;

  if v_expiry_days is not null then
    v_expiry_date := v_ingredient.date + v_expiry_days;
  end if;

  -- 같은 정체성(가구·이름·브랜드·단위·카테고리)에 대한 동시 생성을 직렬화한다.
  -- 매칭 대상이 없을 때는 select ... for update가 아무 행도 잠그지 못해
  -- 동시 요청이 각각 새 품목을 만들고 uq_fridge_items_identity에서 raw 23505가 난다.
  perform pg_advisory_xact_lock(
    hashtext(
      v_ingredient.household_id::text
      || ':' || lower(btrim(v_ingredient.name))
      || ':' || coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '')
      || ':' || v_ingredient.unit
      || ':' || coalesce(v_ingredient.category_id::text, '')
    )
  );

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
    and not f.is_subdivided
    and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
    and coalesce(nullif(lower(btrim(f.brand)), ''), '')
      = coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '')
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

  if v_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
      brand,
      category_id,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.brand,
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;
  end if;

  for v_batch in
    select e
    from jsonb_array_elements(
      coalesce(v_batches, jsonb_build_array(jsonb_build_object('quantity', v_ingredient.count)))
    ) e
  loop
    insert into public.fridge_item_batches (
      fridge_item_id,
      ingredient_id,
      quantity,
      purchased_date,
      expiry_date,
      memo
    )
    values (
      v_fridge_item_id,
      v_ingredient.id,
      (v_batch->>'quantity')::numeric,
      v_ingredient.date,
      case
        when v_batch ? 'expiry_date' then (v_batch->>'expiry_date')::date
        else v_expiry_date
      end,
      null
    );
  end loop;

  update public.ingredients
  set linked_fridge_item_id = v_fridge_item_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  return v_ingredient;
end;
$$;

revoke all on function public.add_ingredient_with_fridge(uuid, text, integer, text, text, uuid, numeric, text, date, jsonb) from public;
grant execute on function public.add_ingredient_with_fridge(uuid, text, integer, text, text, uuid, numeric, text, date, jsonb) to authenticated;

-- 역할: 장보기 항목 수정 시 연결 냉장고 재고를 정합성 있게 동기화합니다.
-- 동작:
-- 1. ingredient를 갱신하고, 식단이 참조 중이면 단위 변경을 막습니다.
-- 2. 정체성 튜플에 advisory lock을 건 뒤 병합 대상 품목을 찾습니다.
-- 3. 정체성이 그대로면 (0) 기존 품목을 그대로 씁니다.
-- 4. 병합 대상이 있으면 (A) 병합, 없고 단독 소유면 (B) 제자리 이름 변경, 공유 중이면 (C) 분리합니다.
-- 5. 연결 배치를 목표 품목으로 옮기고, 비게 된 옛 품목은 식단 참조를 재연결한 뒤 소프트 삭제합니다.
-- 6. 장보기 수량이나 단위가 바뀐 경우에만 등록 수량을 갱신하고 현재 수량에 변경분을 반영합니다.
--    g↔kg, ml↔l 변경은 새 단위로 환산해 계산하고, 환산할 수 없는 단위 변경은 현재 수량을 초기화합니다.
-- 7. 배치가 2개 이상이면 수량·단위를 직접 바꿀 수 없고, batch_quantities로 배치별 등록 수량만 고칩니다.
--    장보기 수량은 활성 배치의 등록 수량 합계가 됩니다.
create or replace function public.update_ingredient_with_fridge(
  p_ingredient_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_household_id uuid;
  v_previous_fridge_item_id uuid;
  v_previous_batch_id uuid;
  v_target_fridge_item_id uuid;
  v_batch_id uuid;
  v_used_amount numeric := 0;
  v_previous_count numeric;
  v_previous_unit text;
  v_batch_quantity numeric;
  v_batch_initial_quantity numeric;
  v_unit_factor numeric;
  v_is_quantity_unchanged boolean;
  v_raw_quantity numeric;
  v_quantity_scale integer;
  v_next_quantity numeric;
  v_brand_norm text;
  v_is_exclusive boolean := false;
  v_updates jsonb := p_updates - 'batch_quantities';
  v_requested_quantities jsonb := coalesce(p_updates->'batch_quantities', '[]'::jsonb);
  v_active_batch_count integer := 0;
  v_next_count numeric;
  v_batch record;
  v_next_initial_quantity numeric;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  v_household_id := v_ingredient.household_id;
  v_previous_fridge_item_id := v_ingredient.linked_fridge_item_id;
  v_previous_count := v_ingredient.count;
  v_previous_unit := v_ingredient.unit;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  perform 1
  from public.fridge_item_batches b
  where b.ingredient_id = p_ingredient_id
    and b.deleted_at is null
  for update;

  select count(*), (array_agg(b.id))[1]
    into v_active_batch_count, v_previous_batch_id
  from public.fridge_item_batches b
  where b.ingredient_id = p_ingredient_id
    and b.deleted_at is null;

  -- 배치가 여럿이면 장보기 수량 하나를 어느 배치에 반영할지 정할 수 없다.
  -- 수량은 batch_quantities로만 받고, 합계를 장보기 수량으로 저장한다.
  if v_active_batch_count >= 2 then
    if (p_updates ? 'unit' and (p_updates->>'unit') is distinct from v_previous_unit)
      or (
        not p_updates ? 'batch_quantities'
        and p_updates ? 'count'
        and (p_updates->>'count')::numeric is distinct from v_previous_count
      ) then
      raise exception using
        errcode = 'I0008',
        message = '배치가 여러 개인 항목은 배치별로 수량을 수정해 주세요.',
        hint = 'INGREDIENT_QUANTITY_LOCKED_BY_BATCHES';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_requested_quantities) e
      where not exists (
        select 1
        from public.fridge_item_batches b
        where b.id = (e->>'id')::uuid
          and b.ingredient_id = p_ingredient_id
          and b.deleted_at is null
      )
    ) then
      raise exception using
        errcode = 'F0005',
        message = '재고 배치를 찾을 수 없습니다.',
        hint = 'FRIDGE_BATCH_NOT_FOUND';
    end if;

    select sum(coalesce(
      (
        select (e->>'initial_quantity')::numeric
        from jsonb_array_elements(v_requested_quantities) e
        where (e->>'id')::uuid = b.id
      ),
      b.initial_quantity
    ))
      into v_next_count
    from public.fridge_item_batches b
    where b.ingredient_id = p_ingredient_id
      and b.deleted_at is null;

    v_updates := v_updates || jsonb_build_object('count', v_next_count);
  end if;

  update public.ingredients i
  set name = case
        when v_updates ? 'name' then coalesce(nullif(trim(v_updates->>'name'), ''), i.name)
        else i.name
      end,
      price = case
        when v_updates ? 'price' then coalesce((v_updates->>'price')::integer, i.price)
        else i.price
      end,
      store = case
        when v_updates ? 'store' then (v_updates->>'store')::text
        else i.store
      end,
      brand = case
        when v_updates ? 'brand' then (v_updates->>'brand')::text
        else i.brand
      end,
      category_id = case
        when v_updates ? 'category_id' then public.normalize_ingredient_category_id(i.household_id, nullif(trim(v_updates->>'category_id'), '')::uuid)
        else i.category_id
      end,
      count = case
        when v_updates ? 'count' then coalesce((v_updates->>'count')::numeric, i.count)
        else i.count
      end,
      unit = case
        when v_updates ? 'unit' then coalesce(nullif(trim(v_updates->>'unit'), ''), i.unit)
        else i.unit
      end,
      date = case
        when v_updates ? 'date' then coalesce((v_updates->>'date')::date, i.date)
        else i.date
      end,
      updated_at = now()
  where i.id = p_ingredient_id
  returning * into v_ingredient;

  -- 단위 변경 가드:
  -- 단위가 바뀌면 식단에 기록된 사용량/소진 상태의 의미가 통째로 달라진다.
  -- 비교 대상은 장보기 행의 이전 단위가 아니라 "냉장고 품목의 현재 단위"다.
  -- 분기 (B)가 덮어쓰는 대상이 품목이므로, 장보기 단위가 그대로여도
  -- 품목 단위가 다르면 식단이 참조하는 값이 바뀐다.
  if v_previous_fridge_item_id is not null
    and v_ingredient.unit is distinct from (
      select f.unit
      from public.fridge_items f
      where f.id = v_previous_fridge_item_id
    )
    and exists (
      select 1
      from public.dish_ingredients di
      where di.fridge_item_id = v_previous_fridge_item_id
    ) then
    raise exception using
      errcode = 'I0006',
      message = '식단에서 사용 중인 재료는 단위를 변경할 수 없습니다.',
      hint = 'INGREDIENT_UNIT_LOCKED_BY_MEAL';
  end if;

  v_brand_norm := coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '');

  -- 같은 정체성(가구·이름·브랜드·단위·카테고리)에 대한 동시 처리를 직렬화한다.
  -- 매칭 대상이 없을 때는 select ... for update가 아무 행도 잠그지 못해
  -- 동시 요청이 각자 새 품목을 만들거나 같은 이름으로 갈라질 수 있다.
  perform pg_advisory_xact_lock(
    hashtext(
      v_ingredient.household_id::text
      || ':' || lower(btrim(v_ingredient.name))
      || ':' || v_brand_norm
      || ':' || v_ingredient.unit
      || ':' || coalesce(v_ingredient.category_id::text, '')
    )
  );

  -- 분기 (0): 정체성(이름·브랜드·단위·카테고리)이 그대로면 옮길 곳이 없다. 기존 품목이 곧 목표다.
  -- 이 선처리가 없으면 날짜나 가격만 바꿔도 아래 분기 (C)까지 내려가 같은 정체성의 품목을
  -- 새로 만들고, uq_fridge_items_identity(활성 품목 1개) 유니크 위반으로 수정 자체가 막힌다.
  -- 같은 품목을 두 번 장봐서 두 장보기 행이 한 품목을 공유할 때 실제로 이 경로를 탔다.
  if v_previous_fridge_item_id is not null then
    select f.id
      into v_target_fridge_item_id
    from public.fridge_items f
    where f.id = v_previous_fridge_item_id
      and f.deleted_at is null
      and not f.is_subdivided
      and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '') = v_brand_norm
      and f.unit = v_ingredient.unit
      and f.category_id = v_ingredient.category_id
    for update;
  end if;

  -- 분기 (A): 새 이름과 같은 정체성의 다른 활성 품목이 있으면 그쪽으로 병합한다.
  -- 소분으로 파생된 품목은 장보기와 무관한 별도 재고이므로 병합 대상에서 제외한다.
  if v_target_fridge_item_id is null then
    select f.id
      into v_target_fridge_item_id
    from public.fridge_items f
    where f.household_id = v_ingredient.household_id
      and f.deleted_at is null
      and not f.is_subdivided
      and f.id is distinct from v_previous_fridge_item_id
      and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '') = v_brand_norm
      and f.unit = v_ingredient.unit
      and f.category_id = v_ingredient.category_id
    order by f.created_at asc
    limit 1
    for update;
  end if;

  -- 분기 (B): 목표가 없거나 기존 품목 그대로인데, 이 장보기 항목이 그 품목을 단독으로 쓰고 있으면
  -- 제자리에서 갱신한다. 참조가 끊기지 않으므로 식단은 자동으로 새 이름을 따라간다.
  -- 공유 중이면 갱신하지 않는다. max_count를 건드리면 다른 장보기 행의 몫까지 덮어쓴다.
  if v_previous_fridge_item_id is not null
    and (
      v_target_fridge_item_id is null
      or v_target_fridge_item_id = v_previous_fridge_item_id
    ) then
    select
      not exists (
        select 1
        from public.ingredients i2
        where i2.id <> v_ingredient.id
          and i2.deleted_at is null
          and (
            i2.linked_fridge_item_id = v_previous_fridge_item_id
            or exists (
              select 1
              from public.fridge_item_batches b
              where b.fridge_item_id = v_previous_fridge_item_id
                and b.ingredient_id = i2.id
            )
          )
      )
      and not exists (
        select 1
        from public.fridge_item_batches b
        where b.fridge_item_id = v_previous_fridge_item_id
          and b.deleted_at is null
          and b.ingredient_id is distinct from v_ingredient.id
      )
      and not exists (
        select 1
        from public.fridge_items f2
        where f2.id = v_previous_fridge_item_id
          and f2.is_subdivided
      )
      into v_is_exclusive;

    if v_is_exclusive then
      update public.fridge_items
      set name = v_ingredient.name,
          brand = v_ingredient.brand,
          category_id = v_ingredient.category_id,
          unit = v_ingredient.unit,
          max_count = v_ingredient.count,
          from_grocery = true,
          updated_at = now()
      where id = v_previous_fridge_item_id;

      v_target_fridge_item_id := v_previous_fridge_item_id;
    end if;
  end if;

  -- 분기 (C): 병합 대상도 없고 기존 품목을 다른 장보기 항목/배치와 공유하고 있으면
  -- 새 품목으로 분리한다. 기존 품목과 거기 남은 배치들은 원래 이름을 유지한다.
  if v_target_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
      brand,
      category_id,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.brand,
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_target_fridge_item_id;
  end if;

  if v_active_batch_count >= 2 then
    for v_batch in
      select b.id, b.quantity, b.initial_quantity
      from public.fridge_item_batches b
      where b.ingredient_id = p_ingredient_id
        and b.deleted_at is null
    loop
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch.id;

      v_next_initial_quantity := coalesce(
        (
          select (e->>'initial_quantity')::numeric
          from jsonb_array_elements(v_requested_quantities) e
          where (e->>'id')::uuid = v_batch.id
        ),
        v_batch.initial_quantity
      );

      if v_next_initial_quantity <= 0 then
        raise exception using
          errcode = 'F0006',
          message = '유효하지 않은 수량입니다.',
          hint = 'FRIDGE_INVALID_QUANTITY';
      end if;

      if v_next_initial_quantity < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          quantity = least(
            greatest(v_batch.quantity + v_next_initial_quantity - v_batch.initial_quantity, 0),
            v_next_initial_quantity - v_used_amount
          ),
          initial_quantity = v_next_initial_quantity,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch.id;

      update public.meal_batch_usages
      set fridge_item_id = v_target_fridge_item_id
      where batch_id = v_batch.id
        and fridge_item_id is distinct from v_target_fridge_item_id;
    end loop;

    update public.ingredients
    set linked_fridge_item_id = v_target_fridge_item_id,
        updated_at = now()
    where id = v_ingredient.id
    returning * into v_ingredient;

    perform public.cleanup_emptied_fridge_item_after_move(
      v_previous_fridge_item_id,
      v_target_fridge_item_id
    );

    return v_ingredient;
  end if;

  if v_previous_batch_id is not null then
    select b.id, b.quantity, b.initial_quantity
      into v_batch_id, v_batch_quantity, v_batch_initial_quantity
    from public.fridge_item_batches b
    where b.id = v_previous_batch_id
      and b.deleted_at is null
    for update;

    if found then
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch_id;

      -- 이전 단위 값과 새 단위 값을 섞어 계산하지 않도록 새 단위 기준 배율을 구한다.
      -- 환산할 수 없는 단위 변경(개↔g 등)이면 null이다.
      v_unit_factor := case
        when v_ingredient.unit = v_previous_unit then 1
        when (v_previous_unit, v_ingredient.unit) in (('g', 'kg'), ('ml', 'l')) then 0.001
        when (v_previous_unit, v_ingredient.unit) in (('kg', 'g'), ('l', 'ml')) then 1000
      end;
      v_is_quantity_unchanged := v_ingredient.unit = v_previous_unit
        and v_ingredient.count = v_previous_count;

      if not v_is_quantity_unchanged and v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      if v_is_quantity_unchanged then
        -- 가격·날짜만 고친 경우 직접 맞춘 현재 수량을 덮어쓰지 않는다.
        v_next_quantity := v_batch_quantity;
      elsif v_unit_factor is null then
        v_next_quantity := v_ingredient.count - v_used_amount;
      else
        v_raw_quantity := v_batch_quantity * v_unit_factor
          + v_ingredient.count
          - v_previous_count * v_unit_factor;
        v_quantity_scale := case when v_ingredient.unit in ('kg', 'l') then 1 else 0 end;
        v_next_quantity := round(v_raw_quantity, v_quantity_scale);

        -- 40g → 0kg처럼 반올림으로 남은 재고가 사라지지 않게 최소 단위를 유지한다.
        if v_raw_quantity > 0 and v_next_quantity = 0 then
          v_next_quantity := power(10::numeric, -v_quantity_scale);
        end if;

        v_next_quantity := least(greatest(v_next_quantity, 0), v_ingredient.count - v_used_amount);
      end if;

      -- 배치를 목표 품목으로 옮긴다. 품목이 바뀌는 경우
      -- sync_dish_ingredients_on_batch_move 트리거가 식단 재료 참조를 함께 따라가게 한다.
      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          quantity = v_next_quantity,
          initial_quantity = case
            when v_is_quantity_unchanged then v_batch_initial_quantity
            else v_ingredient.count
          end,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      update public.meal_batch_usages
      set fridge_item_id = v_target_fridge_item_id
      where batch_id = v_batch_id
        and fridge_item_id is distinct from v_target_fridge_item_id;

      update public.ingredients
      set linked_fridge_item_id = v_target_fridge_item_id,
          updated_at = now()
      where id = v_ingredient.id
      returning * into v_ingredient;

      perform public.cleanup_emptied_fridge_item_after_move(
        v_previous_fridge_item_id,
        v_target_fridge_item_id
      );

      return v_ingredient;
    end if;
  end if;

  insert into public.fridge_item_batches (
    fridge_item_id,
    ingredient_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_target_fridge_item_id,
    v_ingredient.id,
    v_ingredient.count,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_target_fridge_item_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  perform public.cleanup_emptied_fridge_item_after_move(
    v_previous_fridge_item_id,
    v_target_fridge_item_id
  );

  return v_ingredient;
end;
$$;

-- 역할: 장보기 항목을 소프트 삭제합니다.
-- 동작:
-- 1. 권한/대상 존재를 검증합니다.
-- 2. 연결된 배치(없으면 아이템) 기준으로 dish_ingredients에 식단 사용 기록이 있는지 확인합니다.
-- 3. 사용 중이면 GROCERY_IN_USE_IN_MEAL 예외를 던지고, 아니면 deleted_at을 설정합니다.
create or replace function public.soft_delete_ingredient(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_linked_fridge_item_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id, linked_fridge_item_id
    into v_household_id, v_linked_fridge_item_id
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if exists (
    select 1
    from public.fridge_item_batches b
    where b.ingredient_id = p_ingredient_id
      and b.deleted_at is null
  ) then
    select exists (
      select 1
      from public.dish_ingredients di
      join public.fridge_item_batches b on b.id = di.batch_id
      where b.ingredient_id = p_ingredient_id
        and b.deleted_at is null
    )
    into v_is_used_in_meal;
  elsif v_linked_fridge_item_id is not null then
    select exists (
      select 1 from public.dish_ingredients di where di.fridge_item_id = v_linked_fridge_item_id
    )
    into v_is_used_in_meal;
  end if;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'C0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'GROCERY_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set deleted_at = now(),
      updated_at = now()
  where id = p_ingredient_id
    and deleted_at is null;
end;
$$;

-- 역할: 장보기 삭제 시 연결된 냉장고 리소스를 함께 정리합니다.
-- 동작:
-- 1. 연결 batch/item 상태를 확인해 soft delete를 연쇄 수행합니다.
-- 2. 활성 배치가 있으면 장보기를 먼저 삭제 표시한 뒤 배치를 모두 soft delete합니다.
--    soft_delete_fridge_batch가 배치 단위 식단 사용 여부를 검증하므로, 한 배치라도 사용 중이면
--    트랜잭션 전체가 취소됩니다. 먼저 삭제 표시를 해 두면 배치 삭제의 수량 재계산도 건너뜁니다.
-- 3. linked_fridge_item_id만 있는 경우: 활성 배치가 없으면 fridge_item까지 soft delete 후
--    soft_delete_ingredient를 호출한다.
create or replace function public.delete_ingredient_with_cleanup(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_active_batch_count bigint := 0;
  v_batch_ids uuid[];
  v_batch_id uuid;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  if not public.is_household_member(v_ingredient.household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select array_agg(b.id)
    into v_batch_ids
  from public.fridge_item_batches b
  where b.ingredient_id = p_ingredient_id
    and b.deleted_at is null;

  if v_batch_ids is not null then
    update public.ingredients
    set deleted_at = now(),
        updated_at = now()
    where id = p_ingredient_id
      and deleted_at is null;

    foreach v_batch_id in array v_batch_ids loop
      perform public.soft_delete_fridge_batch(v_batch_id);
    end loop;

    return;
  elsif v_ingredient.linked_fridge_item_id is not null then
    select count(*)
      into v_active_batch_count
    from public.fridge_item_batches
    where fridge_item_id = v_ingredient.linked_fridge_item_id
      and deleted_at is null;

    if v_active_batch_count = 0 then
      perform public.soft_delete_fridge_item(v_ingredient.linked_fridge_item_id);
    end if;
  end if;

  perform public.soft_delete_ingredient(p_ingredient_id);
end;
$$;

-- 역할: 배치가 모두 빠져나가 비게 된 옛 냉장고 품목을 정리합니다.
-- 동작:
-- 1. 이전 품목이 없거나 목표 품목과 같으면 아무것도 하지 않습니다.
-- 2. 이전 품목에 활성 배치가 남아 있으면 정리하지 않습니다.
-- 3. batch_id가 NULL인 과거 행을 포함해 식단 재료 참조를 목표 품목으로 재연결한 뒤,
--    장보기 링크를 끊고 이전 품목을 소프트 삭제합니다.
create or replace function public.cleanup_emptied_fridge_item_after_move(
  p_previous_fridge_item_id uuid,
  p_target_fridge_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_previous_fridge_item_id is null
    or p_previous_fridge_item_id is not distinct from p_target_fridge_item_id then
    return;
  end if;

  if exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = p_previous_fridge_item_id
      and b.deleted_at is null
  ) then
    return;
  end if;

  -- batch_id가 NULL이라 배치 이동 트리거로는 따라올 수 없는 과거 식단 행까지 일괄 재연결한다.
  -- 이 재연결이 없으면 소프트 삭제된 품목을 가리키는 행이 남아 식단에서 빈 값으로 보인다.
  update public.dish_ingredients
  set fridge_item_id = p_target_fridge_item_id
  where fridge_item_id = p_previous_fridge_item_id;

  update public.ingredients
  set linked_fridge_item_id = null,
      updated_at = now()
  where linked_fridge_item_id = p_previous_fridge_item_id;

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_previous_fridge_item_id
    and deleted_at is null;
end;
$$;

-- 역할: 냉장고 배치를 소프트 삭제합니다.
-- 동작:
-- 1. 권한을 검증하고, dish_ingredients 기준으로 해당 배치의 식단 사용 여부를 확인합니다.
-- 2. 배치를 소프트 삭제하고 아이템 총량을 동기화합니다.
-- 3. 같은 장보기 항목에 배치가 남아 있으면 장보기 수량을 남은 등록 수량 합계로 맞춥니다.
-- 4. 마지막 배치였고 식단이 그 아이템을 참조하지 않을 때만 아이템까지 소프트 삭제합니다.
create or replace function public.soft_delete_fridge_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fridge_item_id uuid;
  v_household_id uuid;
  v_ingredient_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select b.fridge_item_id, f.household_id, b.ingredient_id
    into v_fridge_item_id, v_household_id, v_ingredient_id
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null;

  if v_fridge_item_id is null then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.dish_ingredients di
    where di.batch_id = p_batch_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where id = p_batch_id;

  perform public.refresh_fridge_item_total_count(v_fridge_item_id);

  -- 마지막 배치를 지우면 sum이 null이라 수량이 바뀌지 않는다. 내역은 지출 기록으로 남긴다.
  update public.ingredients i
  set count = remaining.total,
      updated_at = now()
  from (
    select sum(b.initial_quantity) as total
    from public.fridge_item_batches b
    where b.ingredient_id = v_ingredient_id
      and b.deleted_at is null
  ) remaining
  where i.id = v_ingredient_id
    and i.deleted_at is null
    and remaining.total is not null;

  -- 마지막 배치였다면 품목도 정리한다.
  -- 다만 식단이 아직 이 품목을 참조하고 있으면(batch_id가 NULL인 과거 행 포함)
  -- 품목을 남겨 식단의 재료 이름이 빈 값이 되지 않게 한다.
  if not exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = v_fridge_item_id
      and b.deleted_at is null
  ) and not exists (
    select 1
    from public.dish_ingredients di
    where di.fridge_item_id = v_fridge_item_id
  ) then
    update public.ingredients
    set linked_fridge_item_id = null
    where linked_fridge_item_id = v_fridge_item_id;

    update public.fridge_items
    set deleted_at = now(),
        updated_at = now()
    where id = v_fridge_item_id
      and deleted_at is null;
  end if;
end;
$$;

-- 역할: 냉장고 아이템을 소프트 삭제하며 연관 배치 정리를 수행합니다.
-- 동작:
-- 1. 권한을 검증하고, dish_ingredients 기준으로 식단 사용 여부를 확인합니다.
-- 2. 사용 중이면 FRIDGE_IN_USE_IN_MEAL 예외를 던집니다.
-- 3. 연관 배치를 소프트 삭제하고 장보기 링크를 끊은 뒤 아이템을 소프트 삭제합니다.
create or replace function public.soft_delete_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.dish_ingredients di
    where di.fridge_item_id = p_fridge_item_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where fridge_item_id = p_fridge_item_id
    and deleted_at is null;

  update public.ingredients
  set linked_fridge_item_id = null
  where linked_fridge_item_id = p_fridge_item_id;

  perform public.refresh_fridge_item_total_count(p_fridge_item_id);

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_fridge_item_id
    and deleted_at is null;
end;
$$;

-- 역할: 배치 수정 시 식단 사용량/출처 정책을 검증하는 guarded 업데이트입니다.
-- 동작:
-- 1. 활성 장보기 항목에 연결된 배치는 구매일을 장보기에서만 바꾸도록 막습니다.
-- 2. current_quantity(현재 수량)가 0 ~ 등록 수량 - 식단 사용량 범위인지 검증합니다.
--    quantity 키는 이전 클라이언트 계약(현재 수량 + 식단 사용량)으로 해석합니다.
-- 3. 검증을 통과한 변경값을 반영합니다.
create or replace function public.update_fridge_batch_guarded(
  p_batch_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.fridge_item_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_initial_quantity numeric;
  v_purchased_date date;
  v_used_amount numeric := 0;
  v_requested_current_quantity numeric;
  v_result public.fridge_item_batches%rowtype;
begin
  select f.household_id, b.initial_quantity, b.purchased_date
    into v_household_id, v_initial_quantity, v_purchased_date
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null
  for update of b, f;

  if not found then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if coalesce((p_updates->>'purchased_date')::date, v_purchased_date) <> v_purchased_date
    and exists (
      select 1
      from public.fridge_item_batches b
      join public.ingredients i on i.id = b.ingredient_id
      where b.id = p_batch_id
        and i.deleted_at is null
    ) then
    raise exception using
      errcode = 'F0009',
      message = '장보기에서 등록한 재고의 구매일은 장보기에서만 변경할 수 있습니다.',
      hint = 'FRIDGE_PURCHASED_DATE_MANAGED_IN_GROCERY';
  end if;

  if p_updates ? 'current_quantity' or p_updates ? 'quantity' then
    select coalesce(sum(mbu.amount), 0)
      into v_used_amount
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id;

    v_requested_current_quantity := case
      when p_updates ? 'current_quantity' then (p_updates->>'current_quantity')::numeric
      else (p_updates->>'quantity')::numeric - v_used_amount
    end;

    if v_requested_current_quantity is null or v_requested_current_quantity < 0 then
      raise exception using
        errcode = 'F0006',
        message = '유효하지 않은 수량입니다.',
        hint = 'FRIDGE_INVALID_QUANTITY';
    end if;

    if v_requested_current_quantity + v_used_amount > v_initial_quantity then
      raise exception using
        errcode = 'F0008',
        message = '현재 수량은 등록 수량에서 식단 사용량을 뺀 값보다 클 수 없습니다.',
        hint = 'FRIDGE_QUANTITY_ABOVE_INITIAL';
    end if;
  end if;

  update public.fridge_item_batches b
  set quantity = coalesce(v_requested_current_quantity, b.quantity),
      purchased_date = case
        when p_updates ? 'purchased_date' then coalesce((p_updates->>'purchased_date')::date, b.purchased_date)
        else b.purchased_date
      end,
      expiry_date = case
        when p_updates ? 'expiry_date' then (p_updates->>'expiry_date')::date
        else b.expiry_date
      end,
      memo = case
        when p_updates ? 'memo' then (p_updates->>'memo')::text
        else b.memo
      end,
      updated_at = now()
  where b.id = p_batch_id
  returning * into v_result;

  return v_result;
end;
$$;

-- 역할: 냉장고 목록 조회 시 활성 배치(수량 > 0) 기준으로 재고/사용량을 정합성 있게 반환합니다.
-- 동작:
-- 1. 요청 유저의 household 멤버십과 냉장고 숨김 설정(hide_depleted)을 확인합니다.
-- 2. 수량 > 0, 삭제되지 않은 배치만 활성 배치로 간주해 item을 필터링합니다.
-- 2-1. 검색 키워드는 배열로 받아 OR 조건으로 묶습니다. 클라이언트가 검색어를 별칭 그룹으로
--      확장해 넘기므로, '계란'으로 검색해도 '대란'이 이름에 든 재고가 함께 조회됩니다.
-- 3. 활성 배치와 해당 배치 사용량(meal_batch_usages)만 묶어 JSON 형태로 반환합니다.
-- 3-1. 배치마다 활성 장보기 항목 연결 여부(is_from_grocery)를 파생해 함께 반환합니다.
-- 3-2. 잔여율 분모(remaining_initial_total)를 함께 반환합니다. 남은 재고가 있는 배치와,
--      그 배치와 같은 장보기 항목에서 나온 소진 배치의 등록 수량 합계입니다.
-- 4. 식단 사용 이력 유무(has_meal_usage)를 dish_ingredients 기준으로 함께 반환합니다.
--    (g/kg 'used'처럼 meal_batch_usages 행이 없는 사용도 포함하기 위함)
create or replace function public.get_fridge_items_with_active_batches(
  p_household_id uuid,
  p_search_keywords text[] default null
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hide_depleted boolean := false;
  v_keywords text[];
begin
  if v_user_id is null then
    raise exception 'unauthorized'
      using errcode = 'A0001',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied'
      using errcode = 'A0002',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  -- 빈 문자열만 넘어온 경우를 검색 없음과 동일하게 취급한다.
  select nullif(array_agg(trim(kw)), '{}')
    into v_keywords
  from unnest(coalesce(p_search_keywords, array[]::text[])) as kw
  where length(trim(coalesce(kw, ''))) > 0;

  select coalesce(fp.hide_depleted_fridge_items, false)
    into v_hide_depleted
  from public.fridge_preferences fp
  where fp.user_id = v_user_id;

  -- 설정 행이 없으면 select into가 변수를 null로 덮어써 모든 품목이 필터에서 걸러진다.
  v_hide_depleted := coalesce(v_hide_depleted, false);

  return query
  with active_batches as (
    select b.*
    from public.fridge_item_batches b
    where b.deleted_at is null
      and b.quantity > 0
  ),
  visible_batches as (
    select b.*
    from public.fridge_item_batches b
    where b.deleted_at is null
      and b.quantity >= 0
  ),
  active_usages as (
    select mbu.*
    from public.meal_batch_usages mbu
    join visible_batches vb on vb.id = mbu.batch_id
  ),
  filtered_items as (
    select fi.*
    from public.fridge_items fi
    where fi.household_id = p_household_id
      and fi.deleted_at is null
      and (
        v_keywords is null
        or exists (
          select 1
          from unnest(v_keywords) as kw
          where fi.name ilike ('%' || kw || '%')
        )
      )
      and (
        (
          v_hide_depleted
          and fi.total_count > 0
          and exists (
            select 1
            from active_batches ab
            where ab.fridge_item_id = fi.id
          )
        )
        or (
          not v_hide_depleted
          and exists (
            select 1
            from visible_batches vb
            where vb.fridge_item_id = fi.id
          )
        )
      )
  )
  select
    to_jsonb(fi)
    || jsonb_build_object(
      'fridge_item_batches',
      coalesce(
        case
          when v_hide_depleted then (
            select jsonb_agg(to_jsonb(ab) || jsonb_build_object(
              'is_from_grocery',
              exists (
                select 1
                from public.ingredients i
                where i.id = ab.ingredient_id
                  and i.deleted_at is null
              )
            ) order by ab.purchased_date asc, ab.id asc)
            from active_batches ab
            where ab.fridge_item_id = fi.id
          )
          else (
            select jsonb_agg(to_jsonb(vb) || jsonb_build_object(
              'is_from_grocery',
              exists (
                select 1
                from public.ingredients i
                where i.id = vb.ingredient_id
                  and i.deleted_at is null
              )
            ) order by vb.purchased_date asc, vb.id asc)
            from visible_batches vb
            where vb.fridge_item_id = fi.id
          )
        end,
        '[]'::jsonb
      ),
      'meal_batch_usages',
      coalesce(
        (
          select jsonb_agg(to_jsonb(au) order by au.created_at asc, au.id asc)
          from active_usages au
          where au.fridge_item_id = fi.id
        ),
        '[]'::jsonb
      ),
      'remaining_initial_total',
      coalesce(
        (
          select sum(vb.initial_quantity)
          from visible_batches vb
          where vb.fridge_item_id = fi.id
            and (
              vb.quantity > 0
              or exists (
                select 1
                from active_batches ab
                where ab.ingredient_id = vb.ingredient_id
              )
            )
        ),
        0
      ),
      'has_meal_usage',
      exists (
        select 1
        from public.dish_ingredients di
        where di.fridge_item_id = fi.id
      )
    )
  from filtered_items fi
  order by fi.name;
end;
$$;

select pg_notify('pgrst', 'reload schema');
