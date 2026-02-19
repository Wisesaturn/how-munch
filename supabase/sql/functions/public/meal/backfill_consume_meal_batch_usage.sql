-- Function: public.backfill_consume_meal_batch_usage
-- Source: supabase/migrations/015_backfill_meal_batch_usages_from_existing_meals.sql
-- 역할: 과거 데이터 마이그레이션용으로 meal usage를 배치 단위로 역산 기록합니다.
-- 동작:
-- 1. 요청 amount를 배치 FIFO 순으로 소진합니다.
-- 2. meal_batch_usages 기록과 배치 quantity 차감을 함께 수행합니다.
create or replace function public.backfill_consume_meal_batch_usage(
  p_meal_id uuid,
  p_fridge_item_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric := coalesce(p_amount, 0);
  v_batch record;
  v_consume numeric;
begin
  if v_remaining <= 0 then
    return;
  end if;

  for v_batch in
    select id, quantity
    from public.fridge_item_batches
    where fridge_item_id = p_fridge_item_id
    order by purchased_date asc, created_at asc
  loop
    exit when v_remaining <= 0;
    if coalesce(v_batch.quantity, 0) <= 0 then
      continue;
    end if;

    v_consume := least(v_batch.quantity, v_remaining);

    update public.fridge_item_batches
    set quantity = quantity - v_consume
    where id = v_batch.id;

    insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
    values (p_meal_id, p_fridge_item_id, v_batch.id, v_consume);

    v_remaining := v_remaining - v_consume;
  end loop;
end;
$$;
