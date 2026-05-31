-- Function: public.discard_fridge_batch
-- Source: supabase/migrations/065_add_discard_fridge_batch_rpc.sql
-- 역할: 냉장고 배치의 잔여 재고를 소진 처리합니다.
-- 동작:
-- 1. 배치 존재 여부와 권한을 검증합니다.
-- 2. 식단 사용량을 내부적으로 조회합니다.
-- 3. 배치 quantity를 0으로 설정하고 아이템 총량을 재계산합니다.
create or replace function public.discard_fridge_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fridge_item_id uuid;
  v_household_id uuid;
  v_used_amount numeric := 0;
begin
  select b.fridge_item_id, f.household_id
    into v_fridge_item_id, v_household_id
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null;

  if v_fridge_item_id is null then
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

  select coalesce(sum(mbu.amount), 0)
    into v_used_amount
  from public.meal_batch_usages mbu
  where mbu.batch_id = p_batch_id;

  update public.fridge_item_batches
  set quantity = 0,
      updated_at = now()
  where id = p_batch_id;

  perform public.refresh_fridge_item_total_count(v_fridge_item_id);
end;
$$;
