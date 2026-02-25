-- ============================================================
-- Update expiry notification message by overdue presence
-- ============================================================

drop function if exists public.generate_expiry_soon_notifications(date);
drop function if exists public.generate_expiry_soon_notifications(date, text);

create or replace function public.generate_expiry_soon_notifications(
  p_target_date date default current_date,
  p_test_email text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer := 0;
begin
  with recipients as (
    select hm.household_id, hm.user_id
    from public.household_members hm
    join public.profiles p on p.user_id = hm.user_id
    where p_test_email is null or p.email = p_test_email
    union
    select p.household_id, p.user_id
    from public.profiles p
    where p.household_id is not null
      and (p_test_email is null or p.email = p_test_email)
  ),
  candidates as (
    select
      r.user_id,
      fi.household_id,
      b.id as batch_id,
      fi.id as item_id,
      fi.name as item_name,
      fi.unit,
      b.quantity as remaining_quantity,
      b.expiry_date,
      (b.expiry_date - p_target_date) as days_left,
      coalesce(np.expiry_soon_enabled, true) as expiry_soon_enabled,
      coalesce(np.expiry_remind_days, array[7, 6, 5, 4, 3, 2, 1]) as expiry_remind_days
    from public.fridge_item_batches b
    join public.fridge_items fi on fi.id = b.fridge_item_id
    join recipients r on r.household_id = fi.household_id
    left join public.notification_preferences np on np.user_id = r.user_id
    left join public.fridge_preferences fp on fp.user_id = r.user_id
    where b.expiry_date is not null
      and b.deleted_at is null
      and fi.deleted_at is null
      and b.quantity > 0
      and (
        coalesce(fp.hide_depleted_fridge_items, false) = false
        or fi.total_count > 0
      )
  ),
  filtered_candidates as (
    select
      user_id,
      household_id,
      batch_id,
      item_id,
      item_name,
      unit,
      remaining_quantity,
      expiry_date,
      days_left
    from candidates
    where expiry_soon_enabled = true
      and (
        days_left <= 0
        or days_left = any (expiry_remind_days)
      )
  ),
  deduped_items as (
    select
      user_id,
      household_id,
      item_id,
      item_name,
      expiry_date,
      days_left,
      row_number() over (
        partition by user_id, household_id, item_id
        order by
          case when days_left < 0 then 0 else 1 end asc,
          days_left asc,
          expiry_date asc,
          batch_id asc
      ) as item_rank
    from filtered_candidates
  ),
  ranked_items as (
    select
      user_id,
      household_id,
      item_id,
      item_name,
      expiry_date,
      days_left,
      row_number() over (
        partition by user_id, household_id
        order by
          case when days_left < 0 then 0 else 1 end asc,
          days_left asc,
          expiry_date asc,
          item_name asc,
          item_id asc
      ) as summary_rank,
      count(*) over (partition by user_id, household_id) as total_item_count
    from deduped_items
    where item_rank = 1
  ),
  grouped as (
    select
      user_id,
      household_id,
      max(total_item_count) as total_item_count,
      bool_or(days_left < 0) as has_overdue,
      string_agg(item_name, ', ' order by summary_rank) filter (where summary_rank <= 3) as top_item_names,
      jsonb_agg(
        jsonb_build_object(
          'itemId', item_id,
          'itemName', item_name,
          'expiryDate', expiry_date,
          'daysLeft', days_left
        )
        order by summary_rank
      ) filter (where summary_rank <= 3) as top_items_payload
    from ranked_items
    group by user_id, household_id
  ),
  prepared as (
    select
      user_id,
      household_id,
      'expiry_soon'::text as type,
      case
        when has_overdue then '큰일났어요... 도와주세요!'
        else '유통기한 임박 재료가 기다리고 있어요!'
      end::text as title,
      case
        when has_overdue and total_item_count > 3 then format(
          '%s 외 %s개... 냉장고에서 화석이 되가고 있어요! 🦴',
          top_item_names,
          total_item_count - 3
        )
        when has_overdue then format(
          '%s... 냉장고에서 화석이 되가고 있어요! 🦴',
          top_item_names
        )
        when total_item_count > 3 then format(
          '%s 외 %s개... 잊으신 건 아니겠죠? 어서 소비해 주세요 🥗',
          top_item_names,
          total_item_count - 3
        )
        else format(
          '%s... 잊으신 건 아니겠죠? 어서 소비해 주세요 🥗',
          top_item_names
        )
      end as description,
      jsonb_build_object(
        'householdId', household_id,
        'targetDate', p_target_date,
        'totalCandidateCount', total_item_count,
        'selectedItems', coalesce(top_items_payload, '[]'::jsonb),
        'hasOverdue', has_overdue,
        'hasMore', total_item_count > 3,
        'moreCount', greatest(total_item_count - 3, 0)
      ) as payload,
      (p_target_date::timestamp + interval '09:00')::timestamptz as scheduled_at,
      now() as sent_at,
      'sent'::text as status,
      format(
        'expiry_soon_summary:%s:%s:%s',
        user_id,
        household_id,
        to_char(p_target_date, 'YYYY-MM-DD')
      ) as dedupe_key
    from grouped
  ),
  inserted as (
    insert into public.notifications (
      user_id,
      household_id,
      type,
      title,
      description,
      payload,
      scheduled_at,
      sent_at,
      status,
      dedupe_key
    )
    select
      user_id,
      household_id,
      type,
      title,
      description,
      payload,
      scheduled_at,
      sent_at,
      status,
      dedupe_key
    from prepared
    on conflict (dedupe_key) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;

revoke all on function public.generate_expiry_soon_notifications(date, text) from public;
revoke all on function public.generate_expiry_soon_notifications(date, text) from authenticated;
grant execute on function public.generate_expiry_soon_notifications(date, text) to service_role;

select pg_notify('pgrst', 'reload schema');
