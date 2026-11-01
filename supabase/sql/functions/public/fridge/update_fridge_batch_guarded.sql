-- Function: public.update_fridge_batch_guarded
-- Source: supabase/migrations/096_link_fridge_batches_to_ingredient.sql
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
