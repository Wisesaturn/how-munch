-- Function: public.delete_ingredient_with_cleanup
-- Source: supabase/migrations/096_link_fridge_batches_to_ingredient.sql
-- 역할: 장보기 삭제 시 연결된 냉장고 리소스를 함께 정리합니다.
-- 동작:
-- 1. 연결 batch/item 상태를 확인해 soft delete를 연쇄 수행합니다.
-- 2. 활성 배치가 있으면 장보기를 먼저 삭제 표시한 뒤 배치를 모두 soft delete합니다.
--    soft_delete_fridge_batch가 배치 단위 식단 사용 여부를 검증하므로, 한 배치라도 사용 중이면
--    트랜잭션 전체가 취소됩니다. 먼저 삭제 표시를 해 두면 배치 삭제의 수량 재계산도 건너뜁니다.
-- 3. linked_fridge_item_id만 있는 경우: 활성 배치가 없으면 fridge_item까지 soft delete 후
--    soft_delete_ingredient를 호출한다.
create or replace function public.delete_ingredient_with_cleanup(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_active_batch_count bigint := 0;
  v_batch_ids uuid[];
  v_batch_id uuid;
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

  select array_agg(b.id)
    into v_batch_ids
  from public.fridge_item_batches b
  where b.ingredient_id = p_ingredient_id
    and b.deleted_at is null;

  if v_batch_ids is not null then
    update public.ingredients
    set deleted_at = now(),
        updated_at = now()
    where id = p_ingredient_id
      and deleted_at is null;

    foreach v_batch_id in array v_batch_ids loop
      perform public.soft_delete_fridge_batch(v_batch_id);
    end loop;

    return;
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
