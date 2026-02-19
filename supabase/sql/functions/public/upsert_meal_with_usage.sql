-- Function: public.upsert_meal_with_usage
-- Source: supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql
-- 역할: 식단 저장 시 dish/ingredient와 배치 사용량 차감을 원자적으로 처리합니다.
-- 동작:
-- 1. 기존 meal usage를 롤백한 뒤 새 dishes/ingredients를 재저장합니다.
-- 2. FIFO 배치 차감 후 부족 시 도메인 예외를 발생시킵니다.
create or replace function public.upsert_meal_with_usage(
  p_household_id uuid,
  p_date date,
  p_type text,
  p_dishes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_dish jsonb;
  v_ingredient jsonb;
  v_dish_id uuid;
  v_name text;
  v_fridge_item_id uuid;
  v_amount numeric;
  v_remaining numeric;
  v_batch record;
  v_usage record;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_type), 0)
  );

  insert into public.meals (household_id, date, type)
  values (p_household_id, p_date, p_type)
  on conflict (household_id, date, type)
  do update set updated_at = now()
  returning id into v_meal_id;

  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = v_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meal_batch_usages where meal_id = v_meal_id;
  delete from public.dishes where meal_id = v_meal_id;

  if p_dishes is null or jsonb_typeof(p_dishes) <> 'array' then
    return v_meal_id;
  end if;

  for v_dish in
    select value from jsonb_array_elements(p_dishes)
  loop
    v_name := coalesce(nullif(trim(v_dish->>'name'), ''), '[이름 없음]');

    insert into public.dishes (meal_id, name, sort_order)
    values (
      v_meal_id,
      v_name,
      coalesce((v_dish->>'sort_order')::integer, 0)
    )
    returning id into v_dish_id;

    if jsonb_typeof(v_dish->'ingredients') = 'array' then
      for v_ingredient in
        select value from jsonb_array_elements(v_dish->'ingredients')
      loop
        v_fridge_item_id := (v_ingredient->>'fridge_item_id')::uuid;
        v_amount := coalesce((v_ingredient->>'amount')::numeric, 0);

        if v_fridge_item_id is null or v_amount <= 0 then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, amount)
        values (v_dish_id, v_fridge_item_id, v_amount);
      end loop;
    end if;
  end loop;

  for v_usage in
    select di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
    group by di.fridge_item_id
    order by di.fridge_item_id
  loop
    v_remaining := v_usage.total_amount;

    for v_batch in
      select b.id, b.quantity
      from public.fridge_item_batches b
      where b.fridge_item_id = v_usage.fridge_item_id
        and b.deleted_at is null
      order by b.purchased_date asc, b.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if coalesce(v_batch.quantity, 0) <= 0 then
        continue;
      end if;

      v_amount := least(v_batch.quantity, v_remaining);

      update public.fridge_item_batches
      set quantity = quantity - v_amount,
          updated_at = now()
      where id = v_batch.id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_usage.fridge_item_id, v_batch.id, v_amount);

      v_remaining := v_remaining - v_amount;
    end loop;

    if v_remaining > 0 then
      raise exception using
        errcode = 'M0001',
        message = '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
        hint = 'MEAL_STOCK_INSUFFICIENT';
    end if;
  end loop;

  return v_meal_id;
end;
$$;
