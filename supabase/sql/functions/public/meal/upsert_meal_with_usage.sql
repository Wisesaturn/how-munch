-- Function: public.upsert_meal_with_usage
-- Source: supabase/migrations/081_fix_review_findings.sql
-- 역할: 식단 저장 시 dish/ingredient와 배치 사용량 차감을 원자적으로 처리합니다.
-- 동작:
-- 1. 기존 meal usage를 롤백한 뒤 새 dishes/ingredients를 재저장합니다.
-- 2. usage_status='used' (g/kg·ml/L): dish_ingredients에만 기록, 배치 변화 없음.
-- 3. usage_status='depleted' (g/kg·ml/L): 지정된 batch_id 배치를 0으로 소진, meal_batch_usages 기록.
-- 4. amount>0 (개): 지정된 batch_id 배치에서만 차감(FIFO 아님), 부족 시 도메인 예외 발생.
-- 5. 각 재료 줄은 batch_id로 특정 구매분을 지정한다 (같은 품목도 배치별로 여러 줄 가능).
-- 6. meals 테이블에 created_by(auth.uid())를 기록합니다 (신규 등록 시에만, 수정 시 유지).
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
  v_fridge_unit text;
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

        -- 기록 방식은 클라이언트가 보낸 unit이 아니라 DB의 실제 단위로 결정한다.
        -- 클라이언트 캐시가 낡아 단위가 어긋나면 amount/usage_status 조합이 깨져
        -- dish_ingredients의 CHECK 제약에 걸리기 때문이다.
        --
        -- 같은 조회로 가구 소속도 검증한다. 이 함수는 security definer라 RLS를 우회하므로,
        -- 요청 JSON에 실린 재료 ID가 이 가구 것인지 여기서 확인하지 않으면
        -- 다른 가구의 배치를 차감하거나 0으로 만들 수 있다.
        select fi.unit
          into v_fridge_unit
        from public.fridge_items fi
        where fi.id = v_fridge_item_id
          and fi.household_id = p_household_id;

        if v_fridge_unit is null then
          raise exception using
            errcode = 'A0002',
            message = '권한이 없습니다.',
            hint = 'COMMON_PERMISSION_DENIED';
        end if;

        -- 배치도 같은 품목에 속해야 한다.
        -- 자기 가구 품목 ID와 남의 배치 ID를 섞어 보내는 경로를 막는다.
        if v_batch_id is not null and not exists (
          select 1
          from public.fridge_item_batches b
          where b.id = v_batch_id
            and b.fridge_item_id = v_fridge_item_id
        ) then
          raise exception using
            errcode = 'A0002',
            message = '권한이 없습니다.',
            hint = 'COMMON_PERMISSION_DENIED';
        end if;

        if v_fridge_unit = 'count' then
          -- 개 품목: amount 기반 처리 (usage_status는 항상 'used')
          -- 요청이 무게 품목 형태(usage_status만 있고 amount 없음)로 왔다면
          -- 클라이언트가 보고 있는 단위가 실제와 다르다. 조용히 버리면 재료가 사라진 채 저장된다.
          if v_amount is null and coalesce(v_usage_status, '') in ('used', 'depleted') then
            raise exception using
              errcode = 'M0004',
              message = '재료 정보가 변경되었습니다. 새로고침한 뒤 다시 저장해 주세요.',
              hint = 'MEAL_INGREDIENT_UNIT_MISMATCH';
          end if;

          if coalesce(v_amount, 0) <= 0 then
            continue;
          end if;

          insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
          values (v_dish_id, v_fridge_item_id, v_batch_id, v_amount, 'used');
          continue;
        end if;

        -- 무게·부피 품목: usage_status 기반 처리 (amount 없음)
        if v_usage_status is null and coalesce(v_amount, 0) > 0 then
          raise exception using
            errcode = 'M0004',
            message = '재료 정보가 변경되었습니다. 새로고침한 뒤 다시 저장해 주세요.',
            hint = 'MEAL_INGREDIENT_UNIT_MISMATCH';
        end if;

        -- coalesce로 NULL을 걸러낸다. NULL not in (...)은 NULL이라 분기가 성립하지 않는다.
        if coalesce(v_usage_status, '') not in ('used', 'depleted') then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, batch_id, amount, usage_status)
        values (v_dish_id, v_fridge_item_id, v_batch_id, null, v_usage_status);
      end loop;
    end if;
  end loop;

  -- 개 품목: 지정된 배치에서만 차감 (배치별 합산)
  for v_usage in
    select di.batch_id, di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
      and di.consumption_mode = 'quantity'
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
