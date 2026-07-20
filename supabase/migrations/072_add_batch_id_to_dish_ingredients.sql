-- Migration: 072_add_batch_id_to_dish_ingredients
-- 역할: 식단 재료를 특정 배치(구매분) 단위로 지정하도록 바꾸고, 소진/차감을 그 배치에만 적용합니다.
-- 동작:
-- 1. dish_ingredients.batch_id 컬럼을 추가합니다 (fridge_item_batches FK, 배치 삭제 시 NULL).
-- 2. usage_status CHECK 제약을 다시 'used' | 'depleted'로 되돌립니다 (depleted_batch 제거).
-- 3. upsert_meal_with_usage RPC를 재작성해 지정된 batch_id에만 소진/차감을 적용합니다.
--    - g/kg·ml/L usage_status='depleted': 지정 배치 quantity→0
--    - 개 단위 amount>0: 지정 배치에서만 차감(FIFO 아님), 부족 시 도메인 예외
--    - usage_status='used': dish_ingredients 기록만, 배치 변화 없음

-- Step 1: batch_id 컬럼 추가
ALTER TABLE public.dish_ingredients
  ADD COLUMN IF NOT EXISTS batch_id uuid
  REFERENCES public.fridge_item_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dish_ingredients_batch_id_idx
  ON public.dish_ingredients(batch_id);

-- Step 2: usage_status CHECK 제약 원복 ('used' | 'depleted')
ALTER TABLE public.dish_ingredients
  DROP CONSTRAINT IF EXISTS dish_ingredients_usage_status_check;

ALTER TABLE public.dish_ingredients
  ADD CONSTRAINT dish_ingredients_usage_status_check
  CHECK (usage_status IN ('used', 'depleted'));

-- Step 3: RPC 재작성
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
  v_batch_id uuid;
  v_amount numeric;
  v_usage_status text;
  v_batch_qty numeric;
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

  insert into public.meals (household_id, date, type, created_by)
  values (p_household_id, p_date, p_type, auth.uid())
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
        v_batch_id       := (v_ingredient->>'batch_id')::uuid;
        v_usage_status   := v_ingredient->>'usage_status';
        v_amount         := (v_ingredient->>'amount')::numeric;

        if v_fridge_item_id is null then
          continue;
        end if;

        -- g/kg·ml/L 품목: usage_status 기반 처리 (amount 없음)
        if v_usage_status in ('used', 'depleted') then
          insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
          values (v_dish_id, v_fridge_item_id, v_batch_id, null, v_usage_status);
          continue;
        end if;

        -- 개 품목: amount 기반 처리
        if coalesce(v_amount, 0) <= 0 then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
        values (v_dish_id, v_fridge_item_id, v_batch_id, v_amount, 'used');
      end loop;
    end if;
  end loop;

  -- 개 품목: 지정된 배치에서만 차감 (배치별 합산)
  for v_usage in
    select di.batch_id, di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.amount is not null
      and di.usage_status = 'used'
      and di.batch_id is not null
    group by di.batch_id, di.fridge_item_id
    order by di.batch_id
  loop
    select b.quantity
      into v_batch_qty
    from public.fridge_item_batches b
    where b.id = v_usage.batch_id
      and b.deleted_at is null
    for update;

    if not found or coalesce(v_batch_qty, 0) < v_usage.total_amount then
      raise exception using
        errcode = 'M0001',
        message = '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
        hint = 'MEAL_STOCK_INSUFFICIENT';
    end if;

    update public.fridge_item_batches
    set quantity = quantity - v_usage.total_amount,
        updated_at = now()
    where id = v_usage.batch_id;

    insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
    values (v_meal_id, v_usage.fridge_item_id, v_usage.batch_id, v_usage.total_amount);
  end loop;

  -- g/kg·ml/L 소진 품목: 지정된 배치 quantity → 0, meal_batch_usages 기록
  for v_depleted in
    select distinct di.batch_id, di.fridge_item_id
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.usage_status = 'depleted'
      and di.batch_id is not null
  loop
    select b.quantity
      into v_batch_qty
    from public.fridge_item_batches b
    where b.id = v_depleted.batch_id
      and b.deleted_at is null
    for update;

    if found and coalesce(v_batch_qty, 0) > 0 then
      update public.fridge_item_batches
      set quantity = 0,
          updated_at = now()
      where id = v_depleted.batch_id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_depleted.fridge_item_id, v_depleted.batch_id, v_batch_qty);
    end if;
  end loop;

  return v_meal_id;
end;
$$;
