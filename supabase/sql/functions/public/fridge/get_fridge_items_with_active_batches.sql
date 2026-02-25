-- Function: public.get_fridge_items_with_active_batches
-- Source: supabase/migrations/046_add_get_fridge_items_with_active_batches_rpc.sql
-- 역할: 냉장고 목록 조회 시 활성 배치(수량 > 0) 기준으로 재고/사용량을 정합성 있게 반환합니다.
-- 동작:
-- 1. 요청 유저의 household 멤버십과 냉장고 숨김 설정(hide_depleted)을 확인합니다.
-- 2. 수량 > 0, 삭제되지 않은 배치만 활성 배치로 간주해 item을 필터링합니다.
-- 3. 활성 배치와 해당 배치 사용량(meal_batch_usages)만 묶어 JSON 형태로 반환합니다.
create or replace function public.get_fridge_items_with_active_batches(
  p_household_id uuid,
  p_search_keyword text default null
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hide_depleted boolean := false;
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
    join active_batches ab on ab.id = mbu.batch_id
  ),
  filtered_items as (
    select fi.*
    from public.fridge_items fi
    where fi.household_id = p_household_id
      and fi.deleted_at is null
      and (
        nullif(trim(coalesce(p_search_keyword, '')), '') is null
        or fi.name ilike ('%' || trim(coalesce(p_search_keyword, '')) || '%')
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
            select jsonb_agg(to_jsonb(ab) order by ab.purchased_date asc, ab.id asc)
            from active_batches ab
            where ab.fridge_item_id = fi.id
          )
          else (
            select jsonb_agg(to_jsonb(vb) order by vb.purchased_date asc, vb.id asc)
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
      )
    )
  from filtered_items fi
  order by fi.name;
end;
$$;
