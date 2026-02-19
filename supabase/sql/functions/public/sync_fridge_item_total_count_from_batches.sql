-- Function: public.sync_fridge_item_total_count_from_batches
-- Source: supabase/migrations/012_sync_fridge_item_total_count_from_batches.sql
-- 역할: fridge_item_batches 변경 이벤트를 감지해 재고 합계를 동기화합니다.
-- 동작:
-- 1. INSERT/UPDATE/DELETE 트리거에서 호출됩니다.
-- 2. 영향받은 fridge_item_id 대상으로 refresh 함수를 호출합니다.
create or replace function public.sync_fridge_item_total_count_from_batches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_fridge_item_total_count(new.fridge_item_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.fridge_item_id is distinct from old.fridge_item_id then
      perform public.refresh_fridge_item_total_count(old.fridge_item_id);
    end if;

    perform public.refresh_fridge_item_total_count(new.fridge_item_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_fridge_item_total_count(old.fridge_item_id);
    return old;
  end if;

  return null;
end;
$$;
