-- ============================================================
-- Backfill meal batch usage from existing meals (FIFO)
-- ============================================================

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

do $$
declare
  v_usage record;
begin
  for v_usage in
    with target_meals as (
      select m.id
      from public.meals m
      where not exists (
        select 1 from public.meal_batch_usages mbu where mbu.meal_id = m.id
      )
    )
    select
      tm.id as meal_id,
      di.fridge_item_id,
      sum(di.amount)::numeric as amount
    from target_meals tm
    join public.dishes d on d.meal_id = tm.id
    join public.dish_ingredients di on di.dish_id = d.id
    group by tm.id, di.fridge_item_id
    having sum(di.amount) > 0
  loop
    perform public.backfill_consume_meal_batch_usage(
      v_usage.meal_id,
      v_usage.fridge_item_id,
      v_usage.amount
    );
  end loop;
end $$;

drop function if exists public.backfill_consume_meal_batch_usage(uuid, uuid, numeric);

-- Re-sync total_count/max_count after backfill
update public.fridge_items f
set total_count = coalesce(b.total_quantity, 0),
  max_count = greatest(coalesce(f.max_count, 0), coalesce(b.total_quantity, 0)),
  updated_at = now()
from (
  select fridge_item_id, sum(quantity) as total_quantity
  from public.fridge_item_batches
  group by fridge_item_id
) b
where f.id = b.fridge_item_id;

update public.fridge_items f
set total_count = 0,
  max_count = greatest(coalesce(f.max_count, 0), 0),
  updated_at = now()
where not exists (
  select 1 from public.fridge_item_batches b where b.fridge_item_id = f.id
);

select pg_notify('pgrst', 'reload schema');
