-- Function: public.update_fridge_item_guarded
-- Source: supabase/migrations/078_guard_fridge_item_update.sql
-- 역할: 냉장고 품목 메타(이름·브랜드·카테고리·단위·소분 여부) 수정을 검증과 함께 수행합니다.
-- 동작:
-- 1. 대상 품목을 잠그고 가구 구성원 권한을 확인합니다.
-- 2. 허용된 컬럼의 변경 후 값을 먼저 계산합니다(deleted_at·household_id·수량 컬럼은 대상이 아닙니다).
-- 3. UPDATE 전에 검증합니다.
--    - 식단이 참조 중인 품목의 단위 변경은 INGREDIENT_UNIT_LOCKED_BY_MEAL로 막습니다.
--    - 같은 가구에 동일 정체성의 활성 품목이 생기면 FRIDGE_ITEM_DUPLICATE_IDENTITY로 막습니다.
--      유니크 인덱스가 raw 23505로 먼저 터지지 않도록 반드시 UPDATE 이전에 검사합니다.
-- 4. 검증을 통과한 값만 반영합니다.
create or replace function public.update_fridge_item_guarded(
  p_fridge_item_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.fridge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.fridge_items%rowtype;
  v_next_name text;
  v_next_brand text;
  v_next_category_id uuid;
  v_next_unit text;
  v_next_is_subdivided boolean;
  v_brand_norm text;
begin
  select *
    into v_item
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_item.household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  v_next_name := case
    when p_updates ? 'name' then coalesce(nullif(trim(p_updates->>'name'), ''), v_item.name)
    else v_item.name
  end;
  v_next_brand := case
    when p_updates ? 'brand' then (p_updates->>'brand')::text
    else v_item.brand
  end;
  v_next_category_id := case
    when p_updates ? 'category_id' then public.normalize_ingredient_category_id(v_item.household_id, nullif(trim(p_updates->>'category_id'), '')::uuid)
    else v_item.category_id
  end;
  v_next_unit := case
    when p_updates ? 'unit' then coalesce(nullif(trim(p_updates->>'unit'), ''), v_item.unit)
    else v_item.unit
  end;
  v_next_is_subdivided := case
    when p_updates ? 'is_subdivided' then coalesce((p_updates->>'is_subdivided')::boolean, v_item.is_subdivided)
    else v_item.is_subdivided
  end;

  if v_next_unit is distinct from v_item.unit
    and exists (
      select 1
      from public.dish_ingredients di
      where di.fridge_item_id = p_fridge_item_id
    ) then
    raise exception using
      errcode = 'I0006',
      message = '식단에서 사용 중인 재료는 단위를 변경할 수 없습니다.',
      hint = 'INGREDIENT_UNIT_LOCKED_BY_MEAL';
  end if;

  v_brand_norm := coalesce(nullif(lower(btrim(v_next_brand)), ''), '');

  if not v_next_is_subdivided and exists (
    select 1
    from public.fridge_items f2
    where f2.id <> v_item.id
      and f2.household_id = v_item.household_id
      and f2.deleted_at is null
      and not f2.is_subdivided
      and lower(btrim(f2.name)) = lower(btrim(v_next_name))
      and coalesce(nullif(lower(btrim(f2.brand)), ''), '') = v_brand_norm
      and f2.unit = v_next_unit
      and f2.category_id = v_next_category_id
  ) then
    raise exception using
      errcode = 'F0007',
      message = '같은 이름·브랜드·단위·카테고리의 재료가 이미 있습니다.',
      hint = 'FRIDGE_ITEM_DUPLICATE_IDENTITY';
  end if;

  update public.fridge_items f
  set name = v_next_name,
      brand = v_next_brand,
      category_id = v_next_category_id,
      unit = v_next_unit,
      is_subdivided = v_next_is_subdivided,
      updated_at = now()
  where f.id = p_fridge_item_id
  returning * into v_item;

  return v_item;
end;
$$;
