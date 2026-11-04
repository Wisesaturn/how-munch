-- Function: public.create_voice_record_with_usage
-- Source: supabase/migrations/097_add_create_voice_record_with_usage.sql
-- 역할: 음성 기록 한 번의 재고 정리, 장보기, 식단, 외식비 저장을 한 트랜잭션으로 처리합니다.
-- 동작:
-- 1. 재고 정리를 먼저 적용해 "버리고 새로 샀어"의 새 구매분이 함께 버려지지 않게 합니다.
-- 2. 장보기를 add_ingredient_with_fridge로 저장하고 항목 순서대로 ingredient id를 기억합니다.
-- 3. p_purchase_links로 이번에 산 구매분을 메뉴 재료에 잇습니다. 없는 메뉴면 새로 만듭니다.
-- 4. 끼니 잠금을 잡은 뒤 기존 메뉴를 읽어 뒤에 붙이고 upsert_meal_with_usage로 재고를 차감합니다.
-- 5. 외식비를 저장합니다. 어느 단계든 실패하면 전부 취소됩니다.
create or replace function public.create_voice_record_with_usage(
  p_household_id uuid,
  p_date date,
  p_meal_type text default null,
  p_purchases jsonb default '[]'::jsonb,
  p_stock_updates jsonb default '[]'::jsonb,
  p_dishes jsonb default '[]'::jsonb,
  p_purchase_links jsonb default '[]'::jsonb,
  p_expense jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_update jsonb;
  v_batch jsonb;
  v_purchase jsonb;
  v_ingredient public.ingredients%rowtype;
  v_ingredient_ids uuid[] := array[]::uuid[];
  v_purchase_names text[] := array[]::text[];
  v_link jsonb;
  v_link_ingredient_id uuid;
  v_link_item record;
  v_link_batch record;
  v_link_left numeric;
  v_link_taken numeric;
  v_taken_by_batch jsonb := '{}'::jsonb;
  v_link_rows jsonb;
  v_dish_name text;
  v_dish_index integer;
  v_new_dishes jsonb := coalesce(nullif(p_dishes, 'null'::jsonb), '[]'::jsonb);
  v_existing_dishes jsonb := '[]'::jsonb;
  v_meal_dishes jsonb;
  v_meal_id uuid;
  v_expense public.dining_expenses%rowtype;
begin
  if v_user_id is null then
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

  -- 재고 정리: 호출하는 함수가 각자 품목과 구매분의 가구 소속을 검증한다
  for v_update in
    select value from jsonb_array_elements(coalesce(nullif(p_stock_updates, 'null'::jsonb), '[]'::jsonb))
  loop
    if v_update->>'action' = 'discard' then
      perform public.discard_fridge_item((v_update->>'fridge_item_id')::uuid);
      continue;
    end if;

    for v_batch in
      select value from jsonb_array_elements(coalesce(v_update->'batches', '[]'::jsonb))
    loop
      perform public.update_fridge_batch_guarded(
        (v_batch->>'batch_id')::uuid,
        jsonb_build_object('current_quantity', (v_batch->>'current_quantity')::numeric)
      );
    end loop;
  end loop;

  -- 장보기
  for v_purchase in
    select value from jsonb_array_elements(coalesce(nullif(p_purchases, 'null'::jsonb), '[]'::jsonb))
  loop
    v_ingredient := public.add_ingredient_with_fridge(
      p_household_id,
      v_purchase->>'name',
      coalesce((v_purchase->>'price')::integer, 0),
      v_purchase->>'store',
      v_purchase->>'brand',
      (v_purchase->>'category_id')::uuid,
      coalesce((v_purchase->>'count')::numeric, 1),
      coalesce(v_purchase->>'unit', 'count'),
      p_date,
      nullif(v_purchase->'batches', 'null'::jsonb)
    );
    v_ingredient_ids := v_ingredient_ids || v_ingredient.id;
    v_purchase_names := v_purchase_names || v_ingredient.name;
  end loop;

  -- 이번에 산 구매분을 메뉴 재료로 잇는다
  for v_link in
    select value from jsonb_array_elements(coalesce(nullif(p_purchase_links, 'null'::jsonb), '[]'::jsonb))
  loop
    v_link_ingredient_id := v_ingredient_ids[(v_link->>'purchase_index')::integer + 1];
    if v_link_ingredient_id is null then
      continue;
    end if;

    select f.id, f.unit
      into v_link_item
    from public.ingredients i
    join public.fridge_items f on f.id = i.linked_fridge_item_id
    where i.id = v_link_ingredient_id;

    v_link_rows := '[]'::jsonb;
    v_link_left := coalesce((v_link->>'amount')::numeric, 0);

    for v_link_batch in
      select b.id, b.quantity
      from public.fridge_item_batches b
      where b.ingredient_id = v_link_ingredient_id
        and b.deleted_at is null
      order by b.created_at, b.id
    loop
      if v_link_item.unit <> 'count' then
        v_link_rows := v_link_rows || jsonb_build_object(
          'fridge_item_id', v_link_item.id,
          'batch_id', v_link_batch.id,
          'amount', null,
          'usage_status', coalesce(v_link->>'usage_status', 'used')
        );
        -- 썼다고만 남기는 줄은 구매분 하나면 된다. 다 쓴 경우에만 나눈 구매분을 모두 소진한다
        exit when coalesce(v_link->>'usage_status', 'used') <> 'depleted';
        continue;
      end if;

      v_link_taken := least(
        v_link_left,
        v_link_batch.quantity - coalesce((v_taken_by_batch->>v_link_batch.id::text)::numeric, 0)
      );
      if v_link_taken > 0 then
        v_link_rows := v_link_rows || jsonb_build_object(
          'fridge_item_id', v_link_item.id,
          'batch_id', v_link_batch.id,
          'amount', v_link_taken,
          'usage_status', 'used'
        );
        v_taken_by_batch := v_taken_by_batch || jsonb_build_object(
          v_link_batch.id::text,
          coalesce((v_taken_by_batch->>v_link_batch.id::text)::numeric, 0) + v_link_taken
        );
        v_link_left := v_link_left - v_link_taken;
      end if;
      exit when v_link_left <= 0;
    end loop;

    if jsonb_array_length(v_link_rows) = 0 then
      continue;
    end if;

    v_dish_name := btrim(coalesce(v_link->>'dish_name', ''));
    v_dish_index := null;
    select (e.ord - 1)::integer
      into v_dish_index
    from jsonb_array_elements(v_new_dishes) with ordinality as e(value, ord)
    where btrim(e.value->>'name') = v_dish_name
    order by e.ord
    limit 1;

    if v_dish_index is null then
      v_new_dishes := v_new_dishes || jsonb_build_array(
        jsonb_build_object('name', v_dish_name, 'ingredients', v_link_rows)
      );
    else
      v_new_dishes := jsonb_set(
        v_new_dishes,
        array[v_dish_index::text, 'ingredients'],
        coalesce(v_new_dishes->v_dish_index->'ingredients', '[]'::jsonb) || v_link_rows
      );
    end if;
  end loop;

  -- 식단: 재료가 있는 새 메뉴를 기존 메뉴 뒤에 붙인다
  select coalesce(jsonb_agg(e.value order by e.ord), '[]'::jsonb)
    into v_new_dishes
  from jsonb_array_elements(v_new_dishes) with ordinality as e(value, ord)
  where jsonb_array_length(coalesce(e.value->'ingredients', '[]'::jsonb)) > 0;

  if p_meal_type is not null and jsonb_array_length(v_new_dishes) > 0 then
    -- 기존 메뉴를 읽기 전에 upsert_meal_with_usage와 같은 잠금을 잡아 동시 저장이 서로의 메뉴를 지우지 않게 한다
    perform pg_advisory_xact_lock(
      hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_meal_type), 0)
    );

    select coalesce(jsonb_agg(saved.dish order by saved.sort_order, saved.created_at), '[]'::jsonb)
      into v_existing_dishes
    from (
      select
        d.sort_order,
        d.created_at,
        jsonb_build_object(
          'name', d.name,
          'ingredients', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'fridge_item_id', di.fridge_item_id,
                'batch_id', di.batch_id,
                'amount', di.amount,
                'usage_status', di.usage_status
              )
              order by di.created_at, di.id
            )
            from public.dish_ingredients di
            join public.fridge_items f on f.id = di.fridge_item_id
            -- 삭제된 품목을 가리키는 재료는 다시 보낼 수 없어 뺀다
            where di.dish_id = d.id
              and f.deleted_at is null
          ), '[]'::jsonb)
        ) as dish
      from public.dishes d
      join public.meals m on m.id = d.meal_id
      where m.household_id = p_household_id
        and m.date = p_date
        and m.type = p_meal_type
    ) saved;

    select coalesce(
      jsonb_agg(e.value || jsonb_build_object('sort_order', e.ord - 1) order by e.ord),
      '[]'::jsonb
    )
      into v_meal_dishes
    from jsonb_array_elements(v_existing_dishes || v_new_dishes) with ordinality as e(value, ord);

    v_meal_id := public.upsert_meal_with_usage(p_household_id, p_date, p_meal_type, v_meal_dishes);
  end if;

  -- 외식비
  if p_expense is not null and p_expense <> 'null'::jsonb then
    insert into public.dining_expenses (
      household_id,
      user_id,
      date,
      kind,
      name,
      brand,
      store,
      price,
      memo
    )
    values (
      p_household_id,
      v_user_id,
      coalesce((p_expense->>'date')::date, p_date),
      p_expense->>'kind',
      nullif(btrim(p_expense->>'name'), ''),
      p_expense->>'brand',
      case when p_expense->>'kind' = 'delivery' then nullif(btrim(p_expense->>'store'), '') end,
      coalesce((p_expense->>'price')::integer, 0),
      nullif(btrim(p_expense->>'memo'), '')
    )
    returning * into v_expense;
  end if;

  return jsonb_build_object(
    'meal_id', v_meal_id,
    'purchase_names', to_jsonb(v_purchase_names),
    'expense',
    case
      when v_expense.id is null then null
      else jsonb_build_object(
        'kind', v_expense.kind,
        'brand', v_expense.brand,
        'store', v_expense.store,
        'date', v_expense.date
      )
    end
  );
end;
$$;

select pg_notify('pgrst', 'reload schema');
