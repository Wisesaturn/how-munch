-- Function: public.reassign_items_to_other_category_before_delete
-- Source: supabase/migrations/036_finalize_category_fk_with_sync.sql
-- 역할: 카테고리 삭제 전에 연관 아이템을 기타 카테고리로 재배치합니다.
-- 동작:
-- 1. 삭제 대상 카테고리를 참조하는 행을 탐색합니다.
-- 2. 기타 카테고리로 FK를 재할당해 삭제 제약을 충족합니다.
create or replace function public.reassign_items_to_other_category_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replacement_category_id uuid;
begin
  if old.code = 'other' then
    raise exception 'other category cannot be deleted'
      using errcode = 'I0001', hint = 'INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED';
  end if;

  if old.household_id is not null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id = old.household_id
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    raise exception 'replacement other category not found'
      using errcode = 'I0004', hint = 'INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND';
  end if;

  update public.ingredients
  set category_id = v_replacement_category_id
  where category_id = old.id;

  update public.fridge_items
  set category_id = v_replacement_category_id
  where category_id = old.id;

  return old;
end;
$$;
