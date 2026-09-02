-- Migration: 081_fix_review_findings
-- 역할: 073~080 적용 이후 코드 리뷰에서 확인된 결함을 수정하고, 073이 남긴 잘못된 데이터를 보정합니다.
-- 동작:
-- 1. [073 보정] batch_id 백필이 deleted_at을 보지 않아 생긴 두 오류를 되돌립니다.
--    - 소프트 삭제된 배치에 고정된 행은 NULL로 되돌립니다(그대로 두면 식단 저장이 재고 부족으로 실패).
--    - 활성 배치가 유일한데 소프트 삭제된 형제 때문에 건너뛴 행을 이제 백필합니다.
-- 2. [074] 모드 파생 트리거가 amount/usage_status까지 정규화하게 해,
--    교차 단위 재연결에서 CHECK 위반으로 상위 작업이 통째로 실패하지 않게 합니다.
-- 3. [077] 단위 변경 가드가 장보기 행의 이전 단위가 아니라 냉장고 품목의 현재 단위를 비교하게 합니다.
--    이전 구현은 분기 (B)가 품목 단위를 덮어쓰는데도 가드가 통과할 수 있었습니다.
-- 4. [077] add_ingredient_with_fridge / create_fridge_item_with_batch에도 정체성 advisory lock을 걸어
--    동시 생성이 uq_fridge_items_identity에서 raw 23505로 실패하지 않게 합니다.
-- 5. [080] upsert_meal_with_usage가 재료·배치의 가구 소속을 검증하게 합니다.
--    security definer라 RLS를 우회하므로, 검증이 없으면 다른 가구 배치를 차감·소진할 수 있었습니다.

/* -------------------------------------------------------------------------------------------------
 * 1. 073 백필 결과 보정
 * -----------------------------------------------------------------------------------------------*/

do $$
declare
  v_unpinned integer;
  v_backfilled integer;
begin
  -- 1-a. 소프트 삭제된 배치에 고정된 행 해제
  update public.dish_ingredients di
  set batch_id = null
  where di.batch_id is not null
    and exists (
      select 1
      from public.fridge_item_batches b
      where b.id = di.batch_id
        and b.deleted_at is not null
    );
  get diagnostics v_unpinned = row_count;

  -- 1-b. 활성 배치가 유일한 품목의 미확정 행 백필
  update public.dish_ingredients di
  set batch_id = (
    select b.id
    from public.fridge_item_batches b
    where b.fridge_item_id = di.fridge_item_id
      and b.deleted_at is null
  )
  where di.batch_id is null
    and (
      select count(*)
      from public.fridge_item_batches b
      where b.fridge_item_id = di.fridge_item_id
        and b.deleted_at is null
    ) = 1;
  get diagnostics v_backfilled = row_count;

  raise notice '073 보정: 죽은 배치 해제 % / 유일 활성배치 백필 %', v_unpinned, v_backfilled;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 2. sync_dish_ingredient_consumption_mode — 모드에 맞춰 값 형태까지 정규화
 * -----------------------------------------------------------------------------------------------*/

create or replace function public.sync_dish_ingredient_consumption_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
begin
  select fi.unit
    into v_unit
  from public.fridge_items fi
  where fi.id = new.fridge_item_id;

  new.consumption_mode := case when v_unit = 'count' then 'quantity' else 'toggle' end;

  if new.consumption_mode = 'toggle' then
    new.amount := null;
    new.usage_status := coalesce(new.usage_status, 'used');
  else
    new.amount := coalesce(new.amount, 0);
    new.usage_status := 'used';
  end if;

  return new;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 3. update_ingredient_with_fridge — 단위 가드 비교 대상 수정
 * -----------------------------------------------------------------------------------------------*/

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
  v_brand_norm text;
  v_is_exclusive boolean := false;
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
  v_previous_batch_id := v_ingredient.linked_fridge_batch_id;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  update public.ingredients i
  set name = case
        when p_updates ? 'name' then coalesce(nullif(trim(p_updates->>'name'), ''), i.name)
        else i.name
      end,
      price = case
        when p_updates ? 'price' then coalesce((p_updates->>'price')::integer, i.price)
        else i.price
      end,
      store = case
        when p_updates ? 'store' then (p_updates->>'store')::text
        else i.store
      end,
      brand = case
        when p_updates ? 'brand' then (p_updates->>'brand')::text
        else i.brand
      end,
      category_id = case
        when p_updates ? 'category_id' then public.normalize_ingredient_category_id(i.household_id, nullif(trim(p_updates->>'category_id'), '')::uuid)
        else i.category_id
      end,
      count = case
        when p_updates ? 'count' then coalesce((p_updates->>'count')::numeric, i.count)
        else i.count
      end,
      unit = case
        when p_updates ? 'unit' then coalesce(nullif(trim(p_updates->>'unit'), ''), i.unit)
        else i.unit
      end,
      date = case
        when p_updates ? 'date' then coalesce((p_updates->>'date')::date, i.date)
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

  -- 분기 (A): 새 이름과 같은 정체성의 다른 활성 품목이 있으면 그쪽으로 병합한다.
  -- 소분으로 파생된 품목은 장보기와 무관한 별도 재고이므로 병합 대상에서 제외한다.
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

  -- 분기 (B): 병합 대상이 없고 기존 품목을 이 장보기 항목이 단독으로 쓰고 있으면 제자리에서 이름을 바꾼다.
  -- 참조가 끊기지 않으므로 식단은 자동으로 새 이름을 따라간다.
  if v_target_fridge_item_id is null and v_previous_fridge_item_id is not null then
    select
      not exists (
        select 1
        from public.ingredients i2
        where i2.id <> v_ingredient.id
          and i2.deleted_at is null
          and (
            i2.linked_fridge_item_id = v_previous_fridge_item_id
            or i2.linked_fridge_batch_id in (
              select b.id
              from public.fridge_item_batches b
              where b.fridge_item_id = v_previous_fridge_item_id
            )
          )
      )
      and not exists (
        select 1
        from public.fridge_item_batches b
        where b.fridge_item_id = v_previous_fridge_item_id
          and b.deleted_at is null
          and b.id is distinct from v_previous_batch_id
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

  if v_previous_batch_id is not null then
    select b.id
      into v_batch_id
    from public.fridge_item_batches b
    where b.id = v_previous_batch_id
      and b.deleted_at is null
    for update;

    if found then
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch_id;

      if v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      -- 배치를 목표 품목으로 옮긴다. 품목이 바뀌는 경우
      -- sync_dish_ingredients_on_batch_move 트리거가 식단 재료 참조를 함께 따라가게 한다.
      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          quantity = v_ingredient.count - v_used_amount,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      update public.meal_batch_usages
      set fridge_item_id = v_target_fridge_item_id
      where batch_id = v_batch_id
        and fridge_item_id is distinct from v_target_fridge_item_id;

      update public.ingredients
      set linked_fridge_item_id = v_target_fridge_item_id,
          linked_fridge_batch_id = v_batch_id,
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
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_target_fridge_item_id,
    v_ingredient.count,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_target_fridge_item_id,
      linked_fridge_batch_id = v_batch_id,
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

revoke all on function public.update_ingredient_with_fridge(uuid, jsonb) from public;
grant execute on function public.update_ingredient_with_fridge(uuid, jsonb) to authenticated;

/* -------------------------------------------------------------------------------------------------
 * 4. add_ingredient_with_fridge — 정체성 advisory lock
 * -----------------------------------------------------------------------------------------------*/

create or replace function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
  p_brand text default null,
  p_category_id uuid default null,
  p_count numeric default 1,
  p_unit text default 'count',
  p_date date default current_date
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
  v_batch_id uuid;
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

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_fridge_item_id,
    v_ingredient.count,
    v_ingredient.date,
    v_expiry_date,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_fridge_item_id,
      linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  return v_ingredient;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 5. create_fridge_item_with_batch — 정체성 advisory lock
 * -----------------------------------------------------------------------------------------------*/

create or replace function public.create_fridge_item_with_batch(
  p_household_id uuid,
  p_name text,
  p_brand text default null,
  p_category_id uuid default null,
  p_unit text default 'count',
  p_is_subdivided boolean default false,
  p_from_grocery boolean default false,
  p_quantity numeric default 1,
  p_purchased_date date default current_date,
  p_expiry_date date default null,
  p_memo text default null
)
returns public.fridge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.fridge_items%rowtype;
  v_category_id uuid;
begin
  if auth.uid() is null then
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

  v_category_id := public.normalize_ingredient_category_id(p_household_id, p_category_id);

  -- 중복 검사와 INSERT 사이의 경합을 막기 위해 정체성 튜플을 먼저 잠근다.
  -- 락이 없으면 두 요청이 모두 "중복 없음"을 보고 각자 INSERT해 raw 23505가 난다.
  perform pg_advisory_xact_lock(
    hashtext(
      p_household_id::text
      || ':' || lower(btrim(p_name))
      || ':' || coalesce(nullif(lower(btrim(p_brand)), ''), '')
      || ':' || coalesce(p_unit, 'count')
      || ':' || coalesce(v_category_id::text, '')
    )
  );

  -- 유니크 인덱스(uq_fridge_items_identity)가 raw 23505로 터지지 않도록 먼저 검사한다.
  -- 소분 품목은 인덱스 대상이 아니므로 검사에서도 제외한다.
  if not coalesce(p_is_subdivided, false) and exists (
    select 1
    from public.fridge_items f
    where f.household_id = p_household_id
      and f.deleted_at is null
      and not f.is_subdivided
      and lower(btrim(f.name)) = lower(btrim(p_name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '')
        = coalesce(nullif(lower(btrim(p_brand)), ''), '')
      and f.unit = coalesce(p_unit, 'count')
      and f.category_id = v_category_id
  ) then
    raise exception using
      errcode = 'F0007',
      message = '같은 이름·브랜드·단위·카테고리의 재료가 이미 있습니다.',
      hint = 'FRIDGE_ITEM_DUPLICATE_IDENTITY';
  end if;

  insert into public.fridge_items (
    household_id,
    name,
    brand,
    category_id,
    unit,
    total_count,
    max_count,
    is_subdivided,
    from_grocery,
    created_by
  )
  values (
    p_household_id,
    p_name,
    p_brand,
    v_category_id,
    coalesce(p_unit, 'count'),
    coalesce(p_quantity, 1),
    coalesce(p_quantity, 1),
    coalesce(p_is_subdivided, false),
    coalesce(p_from_grocery, false),
    auth.uid()
  )
  returning * into v_item;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo,
    created_by
  )
  values (
    v_item.id,
    coalesce(p_quantity, 1),
    coalesce(p_purchased_date, current_date),
    p_expiry_date,
    p_memo,
    auth.uid()
  );

  return v_item;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 6. upsert_meal_with_usage — 재료·배치의 가구 소속 검증
 * -----------------------------------------------------------------------------------------------*/

create or replace function public.upsert_meal_with_usage(
  p_household_id uuid,
  p_date date,
  p_type text,
  p_dishes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_dish jsonb;
  v_ingredient jsonb;
  v_dish_id uuid;
  v_name text;
  v_fridge_item_id uuid;
  v_batch_id uuid;
  v_amount numeric;
  v_usage_status text;
  v_fridge_unit text;
  v_batch_qty numeric;
  v_usage record;
  v_depleted record;
begin
  if auth.uid() is null then
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

  perform pg_advisory_xact_lock(
    hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_type), 0)
  );

  insert into public.meals (household_id, date, type, created_by)
  values (p_household_id, p_date, p_type, auth.uid())
  on conflict (household_id, date, type)
  do update set updated_at = now()
  returning id into v_meal_id;

  -- 기존 배치 사용량 원복
  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = v_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meal_batch_usages where meal_id = v_meal_id;
  delete from public.dishes where meal_id = v_meal_id;

  if p_dishes is null or jsonb_typeof(p_dishes) <> 'array' then
    return v_meal_id;
  end if;

  -- dishes/ingredients 재저장
  for v_dish in
    select value from jsonb_array_elements(p_dishes)
  loop
    v_name := coalesce(nullif(trim(v_dish->>'name'), ''), '[이름 없음]');

    insert into public.dishes (meal_id, name, sort_order)
    values (
      v_meal_id,
      v_name,
      coalesce((v_dish->>'sort_order')::integer, 0)
    )
    returning id into v_dish_id;

    if jsonb_typeof(v_dish->'ingredients') = 'array' then
      for v_ingredient in
        select value from jsonb_array_elements(v_dish->'ingredients')
      loop
        v_fridge_item_id := (v_ingredient->>'fridge_item_id')::uuid;
        v_batch_id       := (v_ingredient->>'batch_id')::uuid;
        v_usage_status   := v_ingredient->>'usage_status';
        v_amount         := (v_ingredient->>'amount')::numeric;

        if v_fridge_item_id is null then
          continue;
        end if;

        -- 기록 방식은 클라이언트가 보낸 unit이 아니라 DB의 실제 단위로 결정한다.
        -- 클라이언트 캐시가 낡아 단위가 어긋나면 amount/usage_status 조합이 깨져
        -- dish_ingredients의 CHECK 제약에 걸리기 때문이다.
        --
        -- 같은 조회로 가구 소속도 검증한다. 이 함수는 security definer라 RLS를 우회하므로,
        -- 요청 JSON에 실린 재료 ID가 이 가구 것인지 여기서 확인하지 않으면
        -- 다른 가구의 배치를 차감하거나 0으로 만들 수 있다.
        select fi.unit
          into v_fridge_unit
        from public.fridge_items fi
        where fi.id = v_fridge_item_id
          and fi.household_id = p_household_id;

        if v_fridge_unit is null then
          raise exception using
            errcode = 'A0002',
            message = '권한이 없습니다.',
            hint = 'COMMON_PERMISSION_DENIED';
        end if;

        -- 배치도 같은 품목에 속해야 한다.
        -- 자기 가구 품목 ID와 남의 배치 ID를 섞어 보내는 경로를 막는다.
        if v_batch_id is not null and not exists (
          select 1
          from public.fridge_item_batches b
          where b.id = v_batch_id
            and b.fridge_item_id = v_fridge_item_id
        ) then
          raise exception using
            errcode = 'A0002',
            message = '권한이 없습니다.',
            hint = 'COMMON_PERMISSION_DENIED';
        end if;

        if v_fridge_unit = 'count' then
          -- 개 품목: amount 기반 처리 (usage_status는 항상 'used')
          -- 요청이 무게 품목 형태(usage_status만 있고 amount 없음)로 왔다면
          -- 클라이언트가 보고 있는 단위가 실제와 다르다. 조용히 버리면 재료가 사라진 채 저장된다.
          if v_amount is null and coalesce(v_usage_status, '') in ('used', 'depleted') then
            raise exception using
              errcode = 'M0004',
              message = '재료 정보가 변경되었습니다. 새로고침한 뒤 다시 저장해 주세요.',
              hint = 'MEAL_INGREDIENT_UNIT_MISMATCH';
          end if;

          if coalesce(v_amount, 0) <= 0 then
            continue;
          end if;

          insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
          values (v_dish_id, v_fridge_item_id, v_batch_id, v_amount, 'used');
          continue;
        end if;

        -- 무게·부피 품목: usage_status 기반 처리 (amount 없음)
        if v_usage_status is null and coalesce(v_amount, 0) > 0 then
          raise exception using
            errcode = 'M0004',
            message = '재료 정보가 변경되었습니다. 새로고침한 뒤 다시 저장해 주세요.',
            hint = 'MEAL_INGREDIENT_UNIT_MISMATCH';
        end if;

        -- coalesce로 NULL을 걸러낸다. NULL not in (...)은 NULL이라 분기가 성립하지 않는다.
        if coalesce(v_usage_status, '') not in ('used', 'depleted') then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
        values (v_dish_id, v_fridge_item_id, v_batch_id, null, v_usage_status);
      end loop;
    end if;
  end loop;

  -- 개 품목: 지정된 배치에서만 차감 (배치별 합산)
  for v_usage in
    select di.batch_id, di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.consumption_mode = 'quantity'
      and di.amount is not null
      and di.usage_status = 'used'
      and di.batch_id is not null
    group by di.batch_id, di.fridge_item_id
    order by di.batch_id
  loop
    select b.quantity
      into v_batch_qty
    from public.fridge_item_batches b
    where b.id = v_usage.batch_id
      and b.deleted_at is null
    for update;

    if not found or coalesce(v_batch_qty, 0) < v_usage.total_amount then
      raise exception using
        errcode = 'M0001',
        message = '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
        hint = 'MEAL_STOCK_INSUFFICIENT';
    end if;

    update public.fridge_item_batches
    set quantity = quantity - v_usage.total_amount,
        updated_at = now()
    where id = v_usage.batch_id;

    insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
    values (v_meal_id, v_usage.fridge_item_id, v_usage.batch_id, v_usage.total_amount);
  end loop;

  -- g/kg·ml/L 소진 품목: 지정된 배치 quantity → 0, meal_batch_usages 기록
  for v_depleted in
    select distinct di.batch_id, di.fridge_item_id
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.usage_status = 'depleted'
      and di.batch_id is not null
  loop
    select b.quantity
      into v_batch_qty
    from public.fridge_item_batches b
    where b.id = v_depleted.batch_id
      and b.deleted_at is null
    for update;

    if found and coalesce(v_batch_qty, 0) > 0 then
      update public.fridge_item_batches
      set quantity = 0,
          updated_at = now()
      where id = v_depleted.batch_id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_depleted.fridge_item_id, v_depleted.batch_id, v_batch_qty);
    end if;
  end loop;

  return v_meal_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');
