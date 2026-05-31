-- Function: public.discard_fridge_item
-- Source: supabase/migrations/064_add_discard_fridge_item_rpc.sql
-- 역할: 냉장고 아이템의 모든 배치 잔여 재고를 소진 처리합니다.
-- 동작:
-- 1. 아이템 존재 여부와 권한을 검증합니다.
-- 2. 활성 배치 전체의 quantity를 0으로 설정합니다.
-- 3. 아이템 총량을 재계산합니다.
create or replace function public.discard_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  update public.fridge_item_batches
  set quantity = 0,
      updated_at = now()
  where fridge_item_id = p_fridge_item_id
    and deleted_at is null;

  perform public.refresh_fridge_item_total_count(p_fridge_item_id);
end;
$$;
