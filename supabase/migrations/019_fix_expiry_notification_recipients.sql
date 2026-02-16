-- ============================================================
-- Fix expiry notification recipients
-- - include profiles.household_id users as fallback recipients
-- ============================================================

create or replace function public.generate_expiry_soon_notifications(p_target_date date default current_date)
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
    union
    select p.household_id, p.user_id
    from public.profiles p
    where p.household_id is not null
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
    where b.expiry_date is not null
  ),
  prepared as (
    select
      user_id,
      household_id,
      'expiry_soon'::text as type,
      format('유통기한 임박: %s', item_name) as title,
      case
        when days_left < 0 then format(
          '유통기한이 %s일 지났어요. 남은 수량 %s%s',
          abs(days_left),
          remaining_quantity,
          case when unit = 'count' then '개' else 'g' end
        )
        when days_left = 0 then format(
          '오늘 만료 예정이에요. 남은 수량 %s%s',
          remaining_quantity,
          case when unit = 'count' then '개' else 'g' end
        )
        when days_left = 1 then format(
          '내일 만료 예정이에요. 남은 수량 %s%s',
          remaining_quantity,
          case when unit = 'count' then '개' else 'g' end
        )
        else format(
          '%s일 후 만료 예정이에요. 남은 수량 %s%s',
          days_left,
          remaining_quantity,
          case when unit = 'count' then '개' else 'g' end
        )
      end as description,
      jsonb_build_object(
        'householdId', household_id,
        'itemId', item_id,
        'batchId', batch_id,
        'itemName', item_name,
        'expiryDate', expiry_date,
        'daysLeft', days_left,
        'remainingQuantity', remaining_quantity,
        'unit', unit
      ) as payload,
      (p_target_date::timestamp + interval '09:00')::timestamptz as scheduled_at,
      now() as sent_at,
      'sent'::text as status,
      format(
        'expiry_soon:%s:%s:%s:%s',
        user_id,
        batch_id,
        to_char(p_target_date, 'YYYY-MM-DD'),
        days_left
      ) as dedupe_key
    from candidates
    where expiry_soon_enabled = true
      and days_left = any (expiry_remind_days)
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

revoke all on function public.generate_expiry_soon_notifications(date) from public;
revoke all on function public.generate_expiry_soon_notifications(date) from authenticated;
grant execute on function public.generate_expiry_soon_notifications(date) to service_role;

select pg_notify('pgrst', 'reload schema');
