-- Migration: 057_update_upsert_meal_with_usage_for_status
-- 역할: g/kg 품목의 usage_status 기반 재고 처리를 지원하도록 RPC를 업데이트합니다.
-- 동작:
-- 1. usage_status='used': dish_ingredients 기록만, 배치 변화 없음
-- 2. usage_status='depleted': 전체 배치 quantity→0, meal_batch_usages 기록
-- 3. usage_status 없이 amount>0 (개 단위): 기존 FIFO 차감 로직 유지

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
  v_usage_status text;
  v_remaining numeric;
  v_batch record;
  v_usage record;
  v_depleted record;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_type), 0)
  );

  insert into public.meals (household_id, date, type)
  values (p_household_id, p_date, p_type)
  on conflict (household_id, date, type)
  do update set updated_at = now()
  returning id into v_meal_id;

  -- 기존 배치 사용량 원복
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

  -- dishes/ingredients 재저장
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
        v_usage_status   := v_ingredient->>'usage_status';
        v_amount         := (v_ingredient->>'amount')::numeric;

        if v_fridge_item_id is null then
          continue;
        end if;

        -- g/kg 품목: usage_status 기반 처리 (amount 없음)
        if v_usage_status in ('used', 'depleted') then
          insert into public.dish_ingredients (dish_id, fridge_item_id, amount, usage_status)
          values (v_dish_id, v_fridge_item_id, null, v_usage_status);
          continue;
        end if;

        -- 개 품목: amount 기반 처리
        if coalesce(v_amount, 0) <= 0 then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, amount, usage_status)
        values (v_dish_id, v_fridge_item_id, v_amount, 'used');
      end loop;
    end if;
  end loop;

  -- 개 품목 FIFO 배치 차감
  for v_usage in
    select di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.amount is not null
      and di.usage_status = 'used'
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

  -- g/kg 소진 품목: 전체 배치 quantity → 0, meal_batch_usages 기록
  for v_depleted in
    select distinct di.fridge_item_id
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.usage_status = 'depleted'
  loop
    for v_batch in
      select b.id, b.quantity
      from public.fridge_item_batches b
      where b.fridge_item_id = v_depleted.fridge_item_id
        and b.deleted_at is null
        and b.quantity > 0
      order by b.purchased_date asc, b.created_at asc
      for update
    loop
      update public.fridge_item_batches
      set quantity = 0,
          updated_at = now()
      where id = v_batch.id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_depleted.fridge_item_id, v_batch.id, v_batch.quantity);
    end loop;
  end loop;

  return v_meal_id;
end;
$$;
