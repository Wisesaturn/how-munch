-- Function: public.update_fridge_batch_guarded
-- Source: supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql
-- 역할: 배치 수정 시 식단 사용량/출처 정책을 검증하는 guarded 업데이트입니다.
-- 동작:
-- 1. 장보기 연동 배치 수량 직접 수정 금지 규칙을 검증합니다.
-- 2. 사용 중 수량 하한을 지킨 뒤 변경값을 반영합니다.
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
  v_from_grocery boolean;
  v_used_amount numeric := 0;
  v_requested_total_quantity numeric;
  v_result public.fridge_item_batches%rowtype;
begin
  select f.household_id, f.from_grocery
    into v_household_id, v_from_grocery
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null
  for update of b, f;

  if not found then
    raise exception 'fridge batch not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  if p_updates ? 'quantity' then
    if v_from_grocery then
      raise exception using
        errcode = 'F0002',
        message = '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
        hint = 'FRIDGE_QUANTITY_MANAGED_IN_GROCERY';
    end if;

    v_requested_total_quantity := (p_updates->>'quantity')::numeric;
    if v_requested_total_quantity is null then
      raise exception 'invalid quantity';
    end if;

    select coalesce(sum(mbu.amount), 0)
      into v_used_amount
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id;

    if v_requested_total_quantity < v_used_amount then
      raise exception using
        errcode = 'F0003',
        message = format('식단에서 사용 중인 수량(%s)보다 작게 설정할 수 없습니다.', v_used_amount),
        hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
    end if;
  end if;

  update public.fridge_item_batches b
  set quantity = case
        when p_updates ? 'quantity' then v_requested_total_quantity - v_used_amount
        else b.quantity
      end,
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
