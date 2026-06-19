-- g/kg 등 비-개 단위 재료를 식단에 usage_status='used'로 넣으면 dish_ingredients에만 기록되고
-- meal_batch_usages에는 행이 생기지 않는다. 그 결과 냉장고 목록/만료 화면에서 식단 사용 이력이
-- 없는 것으로 판정돼 스와이프 시 "소진"이 아니라 "삭제"로 빠지는 문제가 있었다.
-- 식단 사용 이력의 완전한 출처는 dish_ingredients이므로, item별로 has_meal_usage 플래그를
-- 함께 반환해 프론트가 소진/삭제를 올바르게 분기하도록 한다.
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
    join visible_batches vb on vb.id = mbu.batch_id
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
