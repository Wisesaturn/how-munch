-- Function: public.add_ingredient_with_fridge
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 장보기 항목 생성과 냉장고 아이템/첫 배치를 한 트랜잭션으로 생성합니다.
-- 동작:
-- 1. ingredient를 생성하고 category_id를 정규화합니다.
-- 2. 연결 fridge_item + batch를 만들고 링크 컬럼을 업데이트합니다.
create function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
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
    v_category_id,
    coalesce(p_count, 1),
    coalesce(p_unit, 'count')
  )
  returning * into v_ingredient;

  insert into public.fridge_items (
    household_id,
    name,
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
    v_ingredient.category_id,
    v_ingredient.unit,
    v_ingredient.count,
    v_ingredient.count,
    false,
    true
  )
  returning id into v_fridge_item_id;

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
