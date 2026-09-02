-- Migration: 077_rename_grocery_item_in_place_when_exclusive
-- 역할: 장보기 항목 이름/브랜드 변경을 병합·제자리 변경·분리 3분기로 재정의합니다.
-- 동작:
-- 1. cleanup_emptied_fridge_item_after_move를 추가해, 배치가 빠져나가 비게 된 옛 품목을 정리하면서
--    batch_id가 NULL인 과거 식단 행까지 새 품목으로 일괄 재연결합니다.
-- 2. update_ingredient_with_fridge를 3분기로 재작성합니다.
--    (A) 새 이름과 같은 정체성의 다른 활성 품목이 있으면 병합
--    (B) 없고 그 품목을 이 장보기 항목이 단독으로 쓰면 제자리에서 이름 변경 (참조가 끊기지 않음)
--    (C) 없고 다른 장보기 항목/배치와 공유 중이면 새 품목으로 분리
-- 3. 식단이 참조 중인 재료의 단위 변경을 INGREDIENT_UNIT_LOCKED_BY_MEAL 예외로 막습니다.
-- 4. 정체성 튜플에 advisory lock을 걸어 동시 요청이 같은 이름의 품목을 중복 생성하지 않게 합니다.
-- 5. 병합 매처에서 소분 파생 품목을 제외합니다(add/update 양쪽).
-- 6. 활성·비소분 품목의 정체성 유일성을 부분 유니크 인덱스로 강제합니다.

/* -------------------------------------------------------------------------------------------------
 * 1. cleanup_emptied_fridge_item_after_move
 * -----------------------------------------------------------------------------------------------*/

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
      linked_fridge_batch_id = null,
      updated_at = now()
  where linked_fridge_item_id = p_previous_fridge_item_id;

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_previous_fridge_item_id
    and deleted_at is null;
end;
$$;

revoke all on function public.cleanup_emptied_fridge_item_after_move(uuid, uuid) from public;

/* -------------------------------------------------------------------------------------------------
 * 2. update_ingredient_with_fridge — 병합 / 제자리 이름 변경 / 분리
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
  v_previous_unit text;
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
  v_previous_unit := v_ingredient.unit;

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
  -- 식단이 이미 이 재고를 참조하고 있으면 단위 변경을 막는다.
  if v_ingredient.unit is distinct from v_previous_unit
    and v_previous_fridge_item_id is not null
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
 * 3. add_ingredient_with_fridge — 병합 매처에서 소분 품목 제외
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
 * 4. 활성 품목 정체성 유일 인덱스
 * -----------------------------------------------------------------------------------------------*/

create unique index if not exists uq_fridge_items_identity
  on public.fridge_items (
    household_id,
    lower(btrim(name)),
    coalesce(nullif(lower(btrim(brand)), ''), ''),
    unit,
    category_id
  )
  where deleted_at is null and not is_subdivided;

select pg_notify('pgrst', 'reload schema');
