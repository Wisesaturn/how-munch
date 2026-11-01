-- Function: public.create_fridge_item_with_batch
-- Source: supabase/migrations/081_fix_review_findings.sql
--         supabase/migrations/092_reuse_depleted_fridge_item_on_create.sql (재고 0 품목 재사용)
-- 역할: 냉장고 아이템과 첫 배치를 동시에 생성합니다.
-- 동작:
-- 1. category_id를 정규화하고 동일 정체성 품목을 잠금 조회합니다.
-- 2. 재고가 남은 동일 품목이 있으면 FRIDGE_ITEM_DUPLICATE_IDENTITY로 막습니다.
-- 3. 재고가 0인 동일 품목이 있으면 그 품목에 새 batch를 추가하고 max_count를 새 수량으로 맞춥니다.
-- 4. 동일 품목이 없으면 item을 생성하고 입력 수량으로 첫 batch를 생성합니다.
-- 5. fridge_items와 fridge_item_batches에 created_by(auth.uid())를 기록하고 item을 반환합니다.
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
  v_existing public.fridge_items%rowtype;
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
  if not coalesce(p_is_subdivided, false) then
    select f.*
      into v_existing
    from public.fridge_items f
    where f.household_id = p_household_id
      and f.deleted_at is null
      and not f.is_subdivided
      and lower(btrim(f.name)) = lower(btrim(p_name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '')
        = coalesce(nullif(lower(btrim(p_brand)), ''), '')
      and f.unit = coalesce(p_unit, 'count')
      and f.category_id = v_category_id
    order by f.created_at asc
    limit 1
    for update;
  end if;

  if v_existing.id is not null then
    if v_existing.total_count > 0 then
      raise exception using
        errcode = 'F0007',
        message = '같은 이름·브랜드·단위·카테고리의 재료가 이미 있습니다.',
        hint = 'FRIDGE_ITEM_DUPLICATE_IDENTITY';
    end if;

    -- 재고가 0인(전부 소진/폐기된) 품목은 새로 만들지 않고 그 품목에 재입고한다.
    -- 잔여율 기준이 새 입고량이 되도록 max_count를 함께 갱신한다.
    insert into public.fridge_item_batches (
      fridge_item_id,
      quantity,
      purchased_date,
      expiry_date,
      memo,
      created_by
    )
    values (
      v_existing.id,
      coalesce(p_quantity, 1),
      coalesce(p_purchased_date, current_date),
      p_expiry_date,
      p_memo,
      auth.uid()
    );

    -- total_count는 배치 트리거(sync_fridge_item_total_count_from_batches)가 갱신한다.
    update public.fridge_items
    set max_count = coalesce(p_quantity, 1),
        updated_at = now()
    where id = v_existing.id
    returning * into v_item;

    return v_item;
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
