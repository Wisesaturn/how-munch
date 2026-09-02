-- Migration: 078_guard_fridge_item_update
-- 역할: 냉장고 품목 수정 경로를 RPC로 좁히고, DB 차원에서 무제한 컬럼 수정을 차단합니다.
-- 동작:
-- 1. update_fridge_item_guarded RPC를 추가합니다.
--    허용 컬럼만 부분 갱신하고, 식단 참조 중 단위 변경과 정체성 중복을 도메인 예외로 막습니다.
-- 2. fridge_update RLS 정책에 with check를 추가합니다.
--    기존 정책은 using만 있어 수정 결과가 검증되지 않았고, household_id를 다른 가구로 바꿀 수 있었습니다.
-- 3. authenticated/anon의 fridge_items 직접 UPDATE 권한을 회수합니다.
--    브라우저가 PostgREST에 직접 접근할 수 있는 구조이므로 API 라우트의 화이트리스트만으로는 우회됩니다.
--    총량 동기화 트리거와 소프트 삭제 함수는 모두 security definer라 영향받지 않습니다.

/* -------------------------------------------------------------------------------------------------
 * 1. update_fridge_item_guarded
 * -----------------------------------------------------------------------------------------------*/

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

revoke all on function public.update_fridge_item_guarded(uuid, jsonb) from public;
grant execute on function public.update_fridge_item_guarded(uuid, jsonb) to authenticated;

/* -------------------------------------------------------------------------------------------------
 * 2. fridge_update 정책에 with check 추가
 * -----------------------------------------------------------------------------------------------*/

drop policy if exists "fridge_update" on public.fridge_items;
create policy "fridge_update" on public.fridge_items for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

/* -------------------------------------------------------------------------------------------------
 * 3. 직접 UPDATE 권한 회수
 * -----------------------------------------------------------------------------------------------*/

revoke update on public.fridge_items from authenticated;
revoke update on public.fridge_items from anon;

select pg_notify('pgrst', 'reload schema');
