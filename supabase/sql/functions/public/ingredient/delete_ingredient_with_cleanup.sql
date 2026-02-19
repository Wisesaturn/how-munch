-- Function: public.delete_ingredient_with_cleanup
-- Source: supabase/migrations/033_harden_remaining_consistency_paths.sql
-- 역할: 장보기 삭제 시 연결된 냉장고 리소스를 함께 정리합니다.
-- 동작:
-- 1. 연결 batch/item 상태를 확인해 soft delete를 연쇄 수행합니다.
-- 2. 마지막에 ingredient를 soft delete합니다.
create or replace function public.delete_ingredient_with_cleanup(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_active_batch_count bigint := 0;
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

  if not public.is_household_member(v_ingredient.household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if v_ingredient.linked_fridge_batch_id is not null then
    perform public.soft_delete_fridge_batch(v_ingredient.linked_fridge_batch_id);
  elsif v_ingredient.linked_fridge_item_id is not null then
    select count(*)
      into v_active_batch_count
    from public.fridge_item_batches
    where fridge_item_id = v_ingredient.linked_fridge_item_id
      and deleted_at is null;

    if v_active_batch_count = 0 then
      perform public.soft_delete_fridge_item(v_ingredient.linked_fridge_item_id);
    end if;
  end if;

  perform public.soft_delete_ingredient(p_ingredient_id);
end;
$$;
