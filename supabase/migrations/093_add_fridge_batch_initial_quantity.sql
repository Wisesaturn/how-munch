-- ============================================================
-- 재고 배치에 등록 수량을 추가하고, 현재 수량 직접 수정을 허용
-- ============================================================
-- 1. fridge_item_batches.initial_quantity를 추가하고 기존 데이터를 백필합니다.
--    버리기/소분으로 줄어든 직접 등록 배치는 원래 값을 알 수 없어 근사값이 됩니다.
-- 2. 모든 배치 생성 경로에서 등록 수량이 채워지도록 BEFORE INSERT 트리거를 둡니다.
-- 3. 장보기 재고 판별을 품목 from_grocery에서 배치별 장보기 링크로 옮깁니다.
-- 4. 장보기 수정이 직접 맞춘 현재 수량을 덮어쓰지 않도록 변경분만 반영합니다.

alter table public.fridge_item_batches
  add column if not exists initial_quantity numeric;

-- 백필이 updated_at과 total_count 트리거를 건드리지 않도록 잠시 끈다.
alter table public.fridge_item_batches disable trigger user;

update public.fridge_item_batches b
set initial_quantity = greatest(
  b.quantity + coalesce((
    select sum(mbu.amount)
    from public.meal_batch_usages mbu
    where mbu.batch_id = b.id
  ), 0),
  coalesce((
    select max(i.count)
    from public.ingredients i
    where i.linked_fridge_batch_id = b.id
      and i.deleted_at is null
  ), 0)
);

alter table public.fridge_item_batches enable trigger user;

alter table public.fridge_item_batches
  alter column initial_quantity set not null;

create or replace function public.set_fridge_batch_initial_quantity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.initial_quantity := new.quantity;
  return new;
end;
$$;

drop trigger if exists set_fridge_batch_initial_quantity on public.fridge_item_batches;
create trigger set_fridge_batch_initial_quantity
before insert on public.fridge_item_batches
for each row execute function public.set_fridge_batch_initial_quantity();

create or replace function public.update_fridge_batch_guarded(
  p_batch_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.fridge_item_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_initial_quantity numeric;
  v_purchased_date date;
  v_used_amount numeric := 0;
  v_requested_current_quantity numeric;
  v_result public.fridge_item_batches%rowtype;
begin
  select f.household_id, b.initial_quantity, b.purchased_date
    into v_household_id, v_initial_quantity, v_purchased_date
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null
  for update of b, f;

  if not found then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if coalesce((p_updates->>'purchased_date')::date, v_purchased_date) <> v_purchased_date
    and exists (
      select 1
      from public.ingredients i
      where i.linked_fridge_batch_id = p_batch_id
        and i.deleted_at is null
    ) then
    raise exception using
      errcode = 'F0009',
      message = '장보기에서 등록한 재고의 구매일은 장보기에서만 변경할 수 있습니다.',
      hint = 'FRIDGE_PURCHASED_DATE_MANAGED_IN_GROCERY';
  end if;

  if p_updates ? 'current_quantity' or p_updates ? 'quantity' then
    select coalesce(sum(mbu.amount), 0)
      into v_used_amount
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id;

    v_requested_current_quantity := case
      when p_updates ? 'current_quantity' then (p_updates->>'current_quantity')::numeric
      else (p_updates->>'quantity')::numeric - v_used_amount
    end;

    if v_requested_current_quantity is null or v_requested_current_quantity < 0 then
      raise exception using
        errcode = 'F0006',
        message = '유효하지 않은 수량입니다.',
        hint = 'FRIDGE_INVALID_QUANTITY';
    end if;

    if v_requested_current_quantity + v_used_amount > v_initial_quantity then
      raise exception using
        errcode = 'F0008',
        message = '현재 수량은 등록 수량에서 식단 사용량을 뺀 값보다 클 수 없습니다.',
        hint = 'FRIDGE_QUANTITY_ABOVE_INITIAL';
    end if;
  end if;

  update public.fridge_item_batches b
  set quantity = coalesce(v_requested_current_quantity, b.quantity),
      purchased_date = case
        when p_updates ? 'purchased_date' then coalesce((p_updates->>'purchased_date')::date, b.purchased_date)
        else b.purchased_date
      end,
      expiry_date = case
        when p_updates ? 'expiry_date' then (p_updates->>'expiry_date')::date
        else b.expiry_date
      end,
      memo = case
        when p_updates ? 'memo' then (p_updates->>'memo')::text
        else b.memo
      end,
      updated_at = now()
  where b.id = p_batch_id
  returning * into v_result;

  return v_result;
end;
$$;

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
  v_previous_count numeric;
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
  v_previous_count := v_ingredient.count;

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

      if v_ingredient.count <> v_previous_count and v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      -- 배치를 목표 품목으로 옮긴다. 품목이 바뀌는 경우
      -- sync_dish_ingredients_on_batch_move 트리거가 식단 재료 참조를 함께 따라가게 한다.
      update public.fridge_item_batches
      set fridge_item_id = v_target_fridge_item_id,
          -- 가격·날짜만 고친 경우 직접 맞춘 현재 수량을 덮어쓰지 않는다.
          quantity = case
            when v_ingredient.count = v_previous_count then quantity
            else least(
              greatest(quantity + v_ingredient.count - v_previous_count, 0),
              v_ingredient.count - v_used_amount
            )
          end,
          initial_quantity = case
            when v_ingredient.count = v_previous_count then initial_quantity
            else v_ingredient.count
          end,
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

create or replace function public.get_fridge_items_with_active_batches(
  p_household_id uuid,
  p_search_keywords text[] default null
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hide_depleted boolean := false;
  v_keywords text[];
begin
  if v_user_id is null then
    raise exception 'unauthorized'
      using errcode = 'A0001',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'permission denied'
      using errcode = 'A0002',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  -- 빈 문자열만 넘어온 경우를 검색 없음과 동일하게 취급한다.
  select nullif(array_agg(trim(kw)), '{}')
    into v_keywords
  from unnest(coalesce(p_search_keywords, array[]::text[])) as kw
  where length(trim(coalesce(kw, ''))) > 0;

  select coalesce(fp.hide_depleted_fridge_items, false)
    into v_hide_depleted
  from public.fridge_preferences fp
  where fp.user_id = v_user_id;

  return query
  with active_batches as (
    select b.*
    from public.fridge_item_batches b
    where b.deleted_at is null
      and b.quantity > 0
  ),
  visible_batches as (
    select b.*
    from public.fridge_item_batches b
    where b.deleted_at is null
      and b.quantity >= 0
  ),
  active_usages as (
    select mbu.*
    from public.meal_batch_usages mbu
    join visible_batches vb on vb.id = mbu.batch_id
  ),
  filtered_items as (
    select fi.*
    from public.fridge_items fi
    where fi.household_id = p_household_id
      and fi.deleted_at is null
      and (
        v_keywords is null
        or exists (
          select 1
          from unnest(v_keywords) as kw
          where fi.name ilike ('%' || kw || '%')
        )
      )
      and (
        (
          v_hide_depleted
          and fi.total_count > 0
          and exists (
            select 1
            from active_batches ab
            where ab.fridge_item_id = fi.id
          )
        )
        or (
          not v_hide_depleted
          and exists (
            select 1
            from visible_batches vb
            where vb.fridge_item_id = fi.id
          )
        )
      )
  )
  select
    to_jsonb(fi)
    || jsonb_build_object(
      'fridge_item_batches',
      coalesce(
        case
          when v_hide_depleted then (
            select jsonb_agg(to_jsonb(ab) || jsonb_build_object(
              'is_from_grocery',
              exists (
                select 1
                from public.ingredients i
                where i.linked_fridge_batch_id = ab.id
                  and i.deleted_at is null
              )
            ) order by ab.purchased_date asc, ab.id asc)
            from active_batches ab
            where ab.fridge_item_id = fi.id
          )
          else (
            select jsonb_agg(to_jsonb(vb) || jsonb_build_object(
              'is_from_grocery',
              exists (
                select 1
                from public.ingredients i
                where i.linked_fridge_batch_id = vb.id
                  and i.deleted_at is null
              )
            ) order by vb.purchased_date asc, vb.id asc)
            from visible_batches vb
            where vb.fridge_item_id = fi.id
          )
        end,
        '[]'::jsonb
      ),
      'meal_batch_usages',
      coalesce(
        (
          select jsonb_agg(to_jsonb(au) order by au.created_at asc, au.id asc)
          from active_usages au
          where au.fridge_item_id = fi.id
        ),
        '[]'::jsonb
      ),
      'has_meal_usage',
      exists (
        select 1
        from public.dish_ingredients di
        where di.fridge_item_id = fi.id
      )
    )
  from filtered_items fi
  order by fi.name;
end;
$$;

select pg_notify('pgrst', 'reload schema');
