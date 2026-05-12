-- ============================================================
-- Fix: delete_ingredient_with_cleanup의 잘못된 식단 사용 검사 수정
-- ============================================================
-- 문제:
--   장보기 항목 삭제 시 delete_ingredient_with_cleanup이 내부적으로
--   soft_delete_fridge_batch → soft_delete_ingredient 순으로 호출한다.
--   soft_delete_fridge_batch는 성공 후 ingredients.linked_fridge_batch_id를 NULL로 클리어한다.
--   이후 soft_delete_ingredient가 ingredient를 다시 읽으면 linked_fridge_batch_id = NULL이므로
--   fridge_item 단위(elif 분기)로 meal_batch_usages를 검사한다.
--   같은 재료의 다른 배치를 다른 식단에서 사용 중이면 이 검사에 걸려 잘못된 차단이 발생한다.
--   (장보기 배치 자체는 식단에서 사용 안 하는데도 삭제 불가 에러가 발생)
--
-- 수정:
--   linked_fridge_batch_id가 있는 경우, soft_delete_fridge_batch의 배치 단위 검증이
--   완료된 후 soft_delete_ingredient를 거치지 않고 직접 ingredients를 soft delete한다.

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
    -- soft_delete_fridge_batch이 배치 단위 식단 사용 여부를 검증한다.
    -- 성공 시 linked_fridge_batch_id를 NULL로 클리어하므로, 이후 soft_delete_ingredient를
    -- 거치면 fridge_item 단위 fallback 검사로 다른 배치를 참조하는 식단이 잘못 차단된다.
    -- 배치 검증이 완료된 경우 직접 soft delete한다.
    perform public.soft_delete_fridge_batch(v_ingredient.linked_fridge_batch_id);

    update public.ingredients
    set deleted_at = now(),
        updated_at = now()
    where id = p_ingredient_id
      and deleted_at is null;

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
