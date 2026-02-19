-- Function: public.refresh_fridge_item_total_count
-- Source: supabase/migrations/025_add_soft_delete_to_fridge_item_batches.sql
-- 역할: 배치 합계를 기반으로 fridge_items.total_count/max_count를 재계산합니다.
-- 동작:
-- 1. 활성 배치들의 quantity 합계를 집계합니다.
-- 2. fridge_items 집계 컬럼을 최신 상태로 업데이트합니다.
create or replace function public.refresh_fridge_item_total_count(p_fridge_item_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.fridge_items f
  set total_count = coalesce((
      select sum(b.quantity)
      from public.fridge_item_batches b
      where b.fridge_item_id = p_fridge_item_id
        and b.deleted_at is null
    ), 0),
    updated_at = now()
  where f.id = p_fridge_item_id;
$$;
