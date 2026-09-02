-- Function: public.add_ingredient_with_fridge
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
--         supabase/migrations/070_add_fridge_category_expiry_defaults.sql (카테고리 기본 유효기간 반영)
-- 역할: 장보기 항목 생성과 냉장고 아이템/배치 연결을 한 트랜잭션으로 처리합니다.
-- 동작:
-- 1. ingredient를 생성하고 category_id를 정규화합니다.
-- 2. 카테고리 기본 유효기간이 설정돼 있으면 구매일 + 기본일수로 배치 expiry_date를 채웁니다.
-- 3. 동일 품목 fridge_item을 재사용하거나 없으면 생성한 뒤 batch를 추가합니다.
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
