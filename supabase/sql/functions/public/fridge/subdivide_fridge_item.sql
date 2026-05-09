-- Function: public.subdivide_fridge_item
-- Source: supabase/migrations/055_add_subdivide_fridge_item_rpc.sql
-- 역할: 부모 fridge_item에서 FIFO로 재고를 차감하고 새 독립 fridge_item을 생성합니다.
-- 동작:
-- 1. 부모 fridge_item과 household 권한을 검증합니다.
-- 2. pg_advisory_xact_lock으로 동시 소분을 방지합니다.
-- 3. FIFO(purchased_date asc, created_at asc) 순서로 배치를 차감합니다.
-- 4. 재고 부족 시 SUBDIVISION_INSUFFICIENT_STOCK 예외를 발생시킵니다.
-- 5. refresh_fridge_item_total_count로 부모 total_count를 갱신합니다.
-- 6. 새 fridge_item(is_subdivided=true, 부모 속성 상속)과 첫 배치를 생성합니다.
create or replace function public.subdivide_fridge_item(
  p_source_item_id uuid,
  p_consume_amount numeric,
  p_new_item_name text,
  p_new_item_quantity numeric,
  p_new_expiry_date date default null
)
returns public.fridge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_item public.fridge_items%rowtype;
  v_new_item public.fridge_items%rowtype;
  v_batch record;
  v_remaining numeric;
  v_take numeric;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  select * into v_source_item
  from public.fridge_items
  where id = p_source_item_id
    and deleted_at is null;

  if v_source_item.id is null then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_source_item.household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(format('subdivide:%s', p_source_item_id::text), 0)
  );

  v_remaining := p_consume_amount;

  for v_batch in
    select b.id, b.quantity
    from public.fridge_item_batches b
    where b.fridge_item_id = p_source_item_id
      and b.deleted_at is null
    order by b.purchased_date asc, b.created_at asc
    for update
  loop
    exit when v_remaining <= 0;

    if coalesce(v_batch.quantity, 0) <= 0 then
      continue;
    end if;

    v_take := least(v_batch.quantity, v_remaining);

    update public.fridge_item_batches
    set quantity = quantity - v_take,
        updated_at = now()
    where id = v_batch.id;

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception using
      errcode = 'S0001',
      message = '소분할 재고가 부족합니다.',
      hint = 'SUBDIVISION_INSUFFICIENT_STOCK';
  end if;

  perform public.refresh_fridge_item_total_count(p_source_item_id);

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
    v_source_item.household_id,
    p_new_item_name,
    v_source_item.brand,
    v_source_item.category_id,
    v_source_item.unit,
    p_new_item_quantity,
    0,
    true,
    false
  )
  returning * into v_new_item;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date
  )
  values (
    v_new_item.id,
    p_new_item_quantity,
    current_date,
    p_new_expiry_date
  );

  return v_new_item;
end;
$$;
