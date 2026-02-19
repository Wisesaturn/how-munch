-- Function: public.sync_items_category_code_after_category_update
-- Source: supabase/migrations/037_complete_category_id_transition.sql
-- 역할: 카테고리 변경 시 관련 아이템의 category code를 후속 동기화합니다.
-- 동작:
-- 1. 카테고리 업데이트 이벤트를 감지합니다.
-- 2. 연관 ingredients/fridge_items의 code 참조를 맞춥니다.
create or replace function public.sync_items_category_code_after_category_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is not distinct from old.code then
    return new;
  end if;

  update public.ingredients
  set category = new.code
  where category_id = new.id
    and category is distinct from new.code;

  update public.fridge_items
  set category = new.code
  where category_id = new.id
    and category is distinct from new.code;

  return new;
end;
$$;
