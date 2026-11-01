-- Function: public.get_fridge_items_with_active_batches
-- Source: supabase/migrations/095_fix_fridge_list_without_preferences.sql
-- 역할: 냉장고 목록 조회 시 활성 배치(수량 > 0) 기준으로 재고/사용량을 정합성 있게 반환합니다.
-- 동작:
-- 1. 요청 유저의 household 멤버십과 냉장고 숨김 설정(hide_depleted)을 확인합니다.
-- 2. 수량 > 0, 삭제되지 않은 배치만 활성 배치로 간주해 item을 필터링합니다.
-- 2-1. 검색 키워드는 배열로 받아 OR 조건으로 묶습니다. 클라이언트가 검색어를 별칭 그룹으로
--      확장해 넘기므로, '계란'으로 검색해도 '대란'이 이름에 든 재고가 함께 조회됩니다.
-- 3. 활성 배치와 해당 배치 사용량(meal_batch_usages)만 묶어 JSON 형태로 반환합니다.
-- 3-1. 배치마다 활성 장보기 항목 연결 여부(is_from_grocery)를 파생해 함께 반환합니다.
-- 4. 식단 사용 이력 유무(has_meal_usage)를 dish_ingredients 기준으로 함께 반환합니다.
--    (g/kg 'used'처럼 meal_batch_usages 행이 없는 사용도 포함하기 위함)
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

  -- 설정 행이 없으면 select into가 변수를 null로 덮어써 모든 품목이 필터에서 걸러진다.
  v_hide_depleted := coalesce(v_hide_depleted, false);

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
