-- Function: public.add_ingredient_with_fridge
-- Source: supabase/migrations/096_link_fridge_batches_to_ingredient.sql
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
