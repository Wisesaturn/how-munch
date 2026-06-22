-- Migration: 068_fix_brand_in_fridge_merge_matching
-- 역할: 장보기 항목을 냉장고 재고로 합칠 때 브랜드를 식별 키에 포함시켜,
--       같은 품목이라도 브랜드가 다르면 별도 재고로 분리되도록 한다.
-- 동작:
-- 1. merge lookup 인덱스에 브랜드 정규화 컬럼을 추가한다.
-- 2. add_ingredient_with_fridge / update_ingredient_with_fridge의 매칭 조건에 브랜드를 추가한다.
-- 3. 기존에 브랜드가 다른데도 하나로 합쳐진 fridge_item을 브랜드별로 분리한다.
-- 브랜드 정규화 규칙: lower(btrim(brand)), NULL/빈문자열은 '' 로 동일 취급.

/* -------------------------------------------------------------------------------------------------
 * 1. merge lookup 인덱스 재생성 (브랜드 포함)
 * -----------------------------------------------------------------------------------------------*/

drop index if exists public.idx_fridge_items_merge_lookup;

create index if not exists idx_fridge_items_merge_lookup
  on public.fridge_items (
    household_id,
    lower(btrim(name)),
    coalesce(nullif(lower(btrim(brand)), ''), ''),
    unit,
    category_id,
    created_at
  )
  where deleted_at is null;

/* -------------------------------------------------------------------------------------------------
 * 2. add_ingredient_with_fridge — 매칭 조건에 브랜드 추가
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

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
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
    null,
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
 * 3. update_ingredient_with_fridge — 매칭 조건에 브랜드 추가
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

  select f.id
    into v_target_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
    and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
    and coalesce(nullif(lower(btrim(f.brand)), ''), '')
      = coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '')
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

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

      if v_previous_fridge_item_id is not null
        and v_previous_fridge_item_id is distinct from v_target_fridge_item_id
        and not exists (
          select 1
          from public.fridge_item_batches b
          where b.fridge_item_id = v_previous_fridge_item_id
            and b.deleted_at is null
        ) then
        update public.ingredients
        set linked_fridge_item_id = null,
            linked_fridge_batch_id = null,
            updated_at = now()
        where linked_fridge_item_id = v_previous_fridge_item_id;

        update public.fridge_items
        set deleted_at = now(),
            updated_at = now()
        where id = v_previous_fridge_item_id
          and deleted_at is null;
      end if;

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

  if v_previous_fridge_item_id is not null
    and v_previous_fridge_item_id is distinct from v_target_fridge_item_id
    and not exists (
      select 1
      from public.fridge_item_batches b
      where b.fridge_item_id = v_previous_fridge_item_id
        and b.deleted_at is null
    ) then
    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null,
        updated_at = now()
    where linked_fridge_item_id = v_previous_fridge_item_id;

    update public.fridge_items
    set deleted_at = now(),
        updated_at = now()
    where id = v_previous_fridge_item_id
      and deleted_at is null;
  end if;

  return v_ingredient;
end;
$$;

/* -------------------------------------------------------------------------------------------------
 * 4. 기존 데이터 정정 — 브랜드가 다른데 하나로 합쳐진 fridge_item을 분리
 *    - 같은 fridge_item에 연결된 활성 ingredient의 정규화 브랜드가 2개 이상이면 충돌 그룹
 *    - fridge_item.brand 정규값과 일치하는 묶음은 기존 항목에 유지, 나머지는 새 항목으로 분리
 *    - 배치 이동 시 total_count는 트리거가 재계산, meal_batch_usages.fridge_item_id도 동기화
 *    - 멱등: 충돌 그룹이 없으면 아무 변경도 일어나지 않음
 * -----------------------------------------------------------------------------------------------*/

do $$
declare
  v_group record;
  v_keep_item_id uuid;
  v_keep_brand_norm text;
  v_brand record;
  v_new_item_id uuid;
begin
  for v_group in
    select f.id as fridge_item_id,
           f.household_id,
           f.name,
           f.category_id,
           f.unit,
           coalesce(nullif(lower(btrim(f.brand)), ''), '') as item_brand_norm
    from public.fridge_items f
    where f.deleted_at is null
      and (
        select count(distinct coalesce(nullif(lower(btrim(i.brand)), ''), ''))
        from public.ingredients i
        where i.linked_fridge_item_id = f.id
          and i.deleted_at is null
      ) > 1
  loop
    v_keep_item_id := v_group.fridge_item_id;

    -- 유지할 브랜드 정규값 결정
    if exists (
      select 1
      from public.ingredients i
      where i.linked_fridge_item_id = v_group.fridge_item_id
        and i.deleted_at is null
        and coalesce(nullif(lower(btrim(i.brand)), ''), '') = v_group.item_brand_norm
    ) then
      -- fridge_item.brand와 일치하는 묶음이 있으면 그 값을 유지
      v_keep_brand_norm := v_group.item_brand_norm;
    else
      -- 일치 묶음이 없으면(폴백) 가장 이른 ingredient의 브랜드를 유지하고
      -- 기존 항목의 brand 표기도 그 값으로 갱신
      select coalesce(nullif(lower(btrim(i.brand)), ''), '')
        into v_keep_brand_norm
      from public.ingredients i
      where i.linked_fridge_item_id = v_group.fridge_item_id
        and i.deleted_at is null
      order by i.date asc, i.created_at asc
      limit 1;

      update public.fridge_items f
      set brand = (
            select i.brand
            from public.ingredients i
            where i.linked_fridge_item_id = v_group.fridge_item_id
              and i.deleted_at is null
              and coalesce(nullif(lower(btrim(i.brand)), ''), '') = v_keep_brand_norm
            order by i.date asc, i.created_at asc
            limit 1
          ),
          updated_at = now()
      where f.id = v_group.fridge_item_id;
    end if;

    -- 유지 브랜드를 제외한 나머지 브랜드별로 새 항목 분리
    for v_brand in
      select coalesce(nullif(lower(btrim(i.brand)), ''), '') as brand_norm,
             min(i.date) as first_date,
             sum(i.count) as count_sum
      from public.ingredients i
      where i.linked_fridge_item_id = v_group.fridge_item_id
        and i.deleted_at is null
        and coalesce(nullif(lower(btrim(i.brand)), ''), '') <> v_keep_brand_norm
      group by coalesce(nullif(lower(btrim(i.brand)), ''), '')
    loop
      -- 새 fridge_item 생성 (brand 원본 표기는 가장 이른 ingredient에서 가져옴)
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
        created_at
      )
      select v_group.household_id,
             v_group.name,
             (
               select i2.brand
               from public.ingredients i2
               where i2.linked_fridge_item_id = v_group.fridge_item_id
                 and i2.deleted_at is null
                 and coalesce(nullif(lower(btrim(i2.brand)), ''), '') = v_brand.brand_norm
               order by i2.date asc, i2.created_at asc
               limit 1
             ),
             v_group.category_id,
             v_group.unit,
             0,                                 -- total_count: 배치 이동 후 트리거가 재계산
             v_brand.count_sum,                 -- max_count: 들여온 총량
             false,
             true,
             v_brand.first_date::timestamptz    -- created_at: 해당 브랜드를 처음 들인 시점
      returning id into v_new_item_id;

      -- 해당 브랜드 묶음의 배치를 새 항목으로 이동 (트리거가 total_count 재계산)
      update public.fridge_item_batches b
      set fridge_item_id = v_new_item_id,
          updated_at = now()
      where b.fridge_item_id = v_group.fridge_item_id
        and exists (
          select 1
          from public.ingredients i
          where i.linked_fridge_batch_id = b.id
            and i.linked_fridge_item_id = v_group.fridge_item_id
            and i.deleted_at is null
            and coalesce(nullif(lower(btrim(i.brand)), ''), '') = v_brand.brand_norm
        );

      -- 옮겨진 배치를 참조하는 식단 사용 기록의 fridge_item_id 동기화
      update public.meal_batch_usages mbu
      set fridge_item_id = v_new_item_id
      where mbu.fridge_item_id = v_group.fridge_item_id
        and exists (
          select 1
          from public.fridge_item_batches b
          where b.id = mbu.batch_id
            and b.fridge_item_id = v_new_item_id
        );

      -- 해당 브랜드 묶음의 ingredient 연결을 새 항목으로 갱신
      update public.ingredients i
      set linked_fridge_item_id = v_new_item_id,
          updated_at = now()
      where i.linked_fridge_item_id = v_group.fridge_item_id
        and i.deleted_at is null
        and coalesce(nullif(lower(btrim(i.brand)), ''), '') = v_brand.brand_norm;

      -- 새 항목 total_count 명시적 재동기화 (트리거 보강)
      perform public.refresh_fridge_item_total_count(v_new_item_id);
    end loop;

    -- 기존(유지) 항목의 max_count를 남은 ingredient count 합으로 재계산
    update public.fridge_items f
    set max_count = coalesce((
          select sum(i.count)
          from public.ingredients i
          where i.linked_fridge_item_id = v_keep_item_id
            and i.deleted_at is null
        ), f.max_count),
        updated_at = now()
    where f.id = v_keep_item_id;

    -- 기존(유지) 항목 total_count 재동기화
    perform public.refresh_fridge_item_total_count(v_keep_item_id);
  end loop;
end $$;
