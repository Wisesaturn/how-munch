-- 장보기 수정이 유니크 위반으로 막히던 문제를 고친다.
--
-- 같은 품목을 두 번 장보면 두 장보기 행이 냉장고 품목 하나를 공유한다.
-- 이 상태에서 한 행의 날짜나 가격만 바꾸면 update_ingredient_with_fridge가
--   (A) 병합 대상 탐색에서 기존 품목을 제외해 아무것도 못 찾고
--   (B) 공유 중이라 제자리 갱신을 건너뛴 뒤
--   (C) 정체성이 똑같은 품목을 새로 insert
-- 해서 uq_fridge_items_identity를 위반했다. errcode 23505는 도메인 매핑이 없어
-- 클라이언트에는 CMN_001 500으로만 보였고, 그 행은 이후 어떤 수정도 같은 경로로 실패했다.
--
-- 정체성이 그대로면 기존 품목이 곧 목표라는 선처리(분기 0)를 앞에 두어 (C)까지 내려가지 않게 한다.

create or replace function public.update_ingredient_with_fridge(
  p_ingredient_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_household_id uuid;
  v_previous_fridge_item_id uuid;
  v_previous_batch_id uuid;
  v_target_fridge_item_id uuid;
  v_batch_id uuid;
  v_used_amount numeric := 0;
  v_brand_norm text;
  v_is_exclusive boolean := false;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  v_household_id := v_ingredient.household_id;
  v_previous_fridge_item_id := v_ingredient.linked_fridge_item_id;
  v_previous_batch_id := v_ingredient.linked_fridge_batch_id;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  update public.ingredients i
  set name = case
        when p_updates ? 'name' then coalesce(nullif(trim(p_updates->>'name'), ''), i.name)
        else i.name
      end,
      price = case
        when p_updates ? 'price' then coalesce((p_updates->>'price')::integer, i.price)
        else i.price
      end,
      store = case
        when p_updates ? 'store' then (p_updates->>'store')::text
        else i.store
      end,
      brand = case
        when p_updates ? 'brand' then (p_updates->>'brand')::text
        else i.brand
      end,
      category_id = case
        when p_updates ? 'category_id' then public.normalize_ingredient_category_id(i.household_id, nullif(trim(p_updates->>'category_id'), '')::uuid)
        else i.category_id
      end,
      count = case
        when p_updates ? 'count' then coalesce((p_updates->>'count')::numeric, i.count)
        else i.count
      end,
      unit = case
        when p_updates ? 'unit' then coalesce(nullif(trim(p_updates->>'unit'), ''), i.unit)
        else i.unit
      end,
      date = case
        when p_updates ? 'date' then coalesce((p_updates->>'date')::date, i.date)
        else i.date
      end,
      updated_at = now()
  where i.id = p_ingredient_id
  returning * into v_ingredient;

  -- 단위 변경 가드:
  -- 단위가 바뀌면 식단에 기록된 사용량/소진 상태의 의미가 통째로 달라진다.
  -- 비교 대상은 장보기 행의 이전 단위가 아니라 "냉장고 품목의 현재 단위"다.
  -- 분기 (B)가 덮어쓰는 대상이 품목이므로, 장보기 단위가 그대로여도
  -- 품목 단위가 다르면 식단이 참조하는 값이 바뀐다.
  if v_previous_fridge_item_id is not null
    and v_ingredient.unit is distinct from (
      select f.unit
      from public.fridge_items f
      where f.id = v_previous_fridge_item_id
    )
    and exists (
      select 1
      from public.dish_ingredients di
      where di.fridge_item_id = v_previous_fridge_item_id
    ) then
    raise exception using
      errcode = 'I0006',
      message = '식단에서 사용 중인 재료는 단위를 변경할 수 없습니다.',
      hint = 'INGREDIENT_UNIT_LOCKED_BY_MEAL';
  end if;

  v_brand_norm := coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '');

  -- 같은 정체성(가구·이름·브랜드·단위·카테고리)에 대한 동시 처리를 직렬화한다.
  -- 매칭 대상이 없을 때는 select ... for update가 아무 행도 잠그지 못해
  -- 동시 요청이 각자 새 품목을 만들거나 같은 이름으로 갈라질 수 있다.
  perform pg_advisory_xact_lock(
    hashtext(
      v_ingredient.household_id::text
      || ':' || lower(btrim(v_ingredient.name))
      || ':' || v_brand_norm
      || ':' || v_ingredient.unit
      || ':' || coalesce(v_ingredient.category_id::text, '')
    )
  );

  -- 분기 (0): 정체성(이름·브랜드·단위·카테고리)이 그대로면 옮길 곳이 없다. 기존 품목이 곧 목표다.
  -- 이 선처리가 없으면 날짜나 가격만 바꿔도 아래 분기 (C)까지 내려가 같은 정체성의 품목을
  -- 새로 만들고, uq_fridge_items_identity(활성 품목 1개) 유니크 위반으로 수정 자체가 막힌다.
  -- 같은 품목을 두 번 장봐서 두 장보기 행이 한 품목을 공유할 때 실제로 이 경로를 탔다.
  if v_previous_fridge_item_id is not null then
    select f.id
      into v_target_fridge_item_id
    from public.fridge_items f
    where f.id = v_previous_fridge_item_id
      and f.deleted_at is null
      and not f.is_subdivided
      and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '') = v_brand_norm
      and f.unit = v_ingredient.unit
      and f.category_id = v_ingredient.category_id
    for update;
  end if;

  -- 분기 (A): 새 이름과 같은 정체성의 다른 활성 품목이 있으면 그쪽으로 병합한다.
  -- 소분으로 파생된 품목은 장보기와 무관한 별도 재고이므로 병합 대상에서 제외한다.
  if v_target_fridge_item_id is null then
    select f.id
      into v_target_fridge_item_id
    from public.fridge_items f
    where f.household_id = v_ingredient.household_id
      and f.deleted_at is null
      and not f.is_subdivided
      and f.id is distinct from v_previous_fridge_item_id
      and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
      and coalesce(nullif(lower(btrim(f.brand)), ''), '') = v_brand_norm
      and f.unit = v_ingredient.unit
      and f.category_id = v_ingredient.category_id
    order by f.created_at asc
    limit 1
    for update;
  end if;

  -- 분기 (B): 목표가 없거나 기존 품목 그대로인데, 이 장보기 항목이 그 품목을 단독으로 쓰고 있으면
  -- 제자리에서 갱신한다. 참조가 끊기지 않으므로 식단은 자동으로 새 이름을 따라간다.
  -- 공유 중이면 갱신하지 않는다. max_count를 건드리면 다른 장보기 행의 몫까지 덮어쓴다.
  if v_previous_fridge_item_id is not null
    and (
      v_target_fridge_item_id is null
      or v_target_fridge_item_id = v_previous_fridge_item_id
    ) then
    select
      not exists (
        select 1
        from public.ingredients i2
        where i2.id <> v_ingredient.id
          and i2.deleted_at is null
          and (
            i2.linked_fridge_item_id = v_previous_fridge_item_id
            or i2.linked_fridge_batch_id in (
              select b.id
              from public.fridge_item_batches b
              where b.fridge_item_id = v_previous_fridge_item_id
            )
          )
      )
      and not exists (
        select 1
        from public.fridge_item_batches b
        where b.fridge_item_id = v_previous_fridge_item_id
          and b.deleted_at is null
          and b.id is distinct from v_previous_batch_id
      )
      and not exists (
        select 1
        from public.fridge_items f2
        where f2.id = v_previous_fridge_item_id
          and f2.is_subdivided
      )
      into v_is_exclusive;

    if v_is_exclusive then
      update public.fridge_items
      set name = v_ingredient.name,
          brand = v_ingredient.brand,
          category_id = v_ingredient.category_id,
          unit = v_ingredient.unit,
          max_count = v_ingredient.count,
          from_grocery = true,
          updated_at = now()
      where id = v_previous_fridge_item_id;

      v_target_fridge_item_id := v_previous_fridge_item_id;
    end if;
  end if;

  -- 분기 (C): 병합 대상도 없고 기존 품목을 다른 장보기 항목/배치와 공유하고 있으면
  -- 새 품목으로 분리한다. 기존 품목과 거기 남은 배치들은 원래 이름을 유지한다.
  if v_target_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
      brand,
      category_id,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.brand,
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_target_fridge_item_id;
  end if;

  if v_previous_batch_id is not null then
    select b.id
      into v_batch_id
    from public.fridge_item_batches b
    where b.id = v_previous_batch_id
      and b.deleted_at is null
    for update;

    if found then
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch_id;

      if v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      -- 배치를 목표 품목으로 옮긴다. 품목이 바뀌는 경우
      -- sync_dish_ingredients_on_batch_move 트리거가 식단 재료 참조를 함께 따라가게 한다.
      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          quantity = v_ingredient.count - v_used_amount,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      update public.meal_batch_usages
      set fridge_item_id = v_target_fridge_item_id
      where batch_id = v_batch_id
        and fridge_item_id is distinct from v_target_fridge_item_id;

      update public.ingredients
      set linked_fridge_item_id = v_target_fridge_item_id,
          linked_fridge_batch_id = v_batch_id,
          updated_at = now()
      where id = v_ingredient.id
      returning * into v_ingredient;

      perform public.cleanup_emptied_fridge_item_after_move(
        v_previous_fridge_item_id,
        v_target_fridge_item_id
      );

      return v_ingredient;
    end if;
  end if;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_target_fridge_item_id,
    v_ingredient.count,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_target_fridge_item_id,
      linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  perform public.cleanup_emptied_fridge_item_after_move(
    v_previous_fridge_item_id,
    v_target_fridge_item_id
  );

  return v_ingredient;
end;
$$;

select pg_notify('pgrst', 'reload schema');
