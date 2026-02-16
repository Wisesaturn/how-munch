-- ============================================================
-- Push dispatch helper RPCs
-- ============================================================

create or replace function public.get_pending_push_notifications(p_limit integer default 100)
returns table (
  notification_id uuid,
  user_id uuid,
  title text,
  description text,
  endpoint text,
  p256dh text,
  auth text
)
language sql
security definer
set search_path = public
as $$
  select
    n.id as notification_id,
    n.user_id,
    n.title,
    n.description,
    s.endpoint,
    s.p256dh,
    s.auth
  from public.notifications n
  join public.notification_push_subscriptions s
    on s.user_id = n.user_id
   and s.is_active = true
  where n.push_sent_at is null
    and n.read_at is null
  order by n.created_at asc
  limit p_limit;
$$;

create or replace function public.mark_notifications_push_sent(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.notifications
  set push_sent_at = now(),
      updated_at = now()
  where id = any (p_ids)
    and push_sent_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.deactivate_push_subscription_by_endpoint(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_push_subscriptions
  set is_active = false,
      updated_at = now()
  where endpoint = p_endpoint;

  return true;
end;
$$;

revoke all on function public.get_pending_push_notifications(integer) from public;
revoke all on function public.mark_notifications_push_sent(uuid[]) from public;
revoke all on function public.deactivate_push_subscription_by_endpoint(text) from public;

grant execute on function public.get_pending_push_notifications(integer) to service_role;
grant execute on function public.mark_notifications_push_sent(uuid[]) to service_role;
grant execute on function public.deactivate_push_subscription_by_endpoint(text) to service_role;

select pg_notify('pgrst', 'reload schema');
