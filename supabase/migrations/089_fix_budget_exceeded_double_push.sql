-- 예산 초과 알림이 두 번 발송되던 문제를 고친다.
--
-- create_budget_exceeded_notifications는 push_sent_at 없이 알림 행을 넣었고,
-- route(notifyBudgetExceeded)가 그 직후 dispatch-household-notification으로 push를 한 번 보냈다.
-- 그런데 get_pending_push_notifications는 type을 가리지 않고
-- push_sent_at is null and read_at is null인 행을 전부 집어가므로,
-- 다음 cron(만료 알림, 주간 지출 알림)이 돌 때 같은 예산 초과 알림이 다시 발송됐다.
--
-- 즉시 발송하는 알림이므로 insert 시점에 push_sent_at을 채워 cron 대상에서 제외한다.

create or replace function public.create_budget_exceeded_notifications(
  p_household_id uuid,
  p_year_month text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer := 0;
  v_month_start date;
begin
  -- security definer라 RLS를 우회한다. 남의 가구에 알림을 꽂지 못하도록 여기서 직접 막는다.
  if not public.is_household_member(p_household_id) then
    raise exception '가구 구성원만 호출할 수 있습니다'
      using errcode = 'A0002', hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception '예산 연월 형식이 올바르지 않습니다'
      using errcode = 'B0002', hint = 'BUDGET_YEAR_MONTH_INVALID';
  end if;

  v_month_start := to_date(p_year_month || '-01', 'YYYY-MM-DD');

  with spending as (
    select
      'total'::text as scope,
      coalesce(sum(f.price), 0)::bigint as spent
    from public.v_food_expenses f
    where f.household_id = p_household_id
      and f.date >= v_month_start
      and f.date < v_month_start + interval '1 month'
    union all
    select
      f.kind as scope,
      coalesce(sum(f.price), 0)::bigint as spent
    from public.v_food_expenses f
    where f.household_id = p_household_id
      and f.date >= v_month_start
      and f.date < v_month_start + interval '1 month'
    group by f.kind
  ),
  exceeded as (
    select
      b.scope,
      b.amount as budget_amount,
      s.spent as spent_amount
    from public.budgets b
    join spending s on s.scope = b.scope
    where b.household_id = p_household_id
      and b.year_month = p_year_month
      and s.spent > b.amount
  ),
  recipients as (
    select distinct hm.user_id
    from public.household_members hm
    left join public.notification_preferences np on np.user_id = hm.user_id
    where hm.household_id = p_household_id
      and coalesce(np.budget_exceeded_enabled, true) = true
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
      push_sent_at,
      status,
      dedupe_key
    )
    select
      r.user_id,
      p_household_id,
      'budget_exceeded',
      '예산 초과',
      '이번 달 예산을 초과했어요!',
      jsonb_build_object(
        'householdId', p_household_id,
        'yearMonth', p_year_month,
        'scope', e.scope,
        'budgetAmount', e.budget_amount,
        'spentAmount', e.spent_amount
      ),
      now(),
      now(),
      -- 이 알림은 route에서 곧바로 push를 보낸다.
      -- push_sent_at을 비워두면 get_pending_push_notifications가 type을 가리지 않고 집어가
      -- 다음 cron에서 같은 알림이 한 번 더 발송된다.
      now(),
      'sent',
      -- 사용자별 row이므로 dedupe_key에도 user_id를 넣어야 가구원 모두가 한 번씩 받는다.
      format('budget_exceeded:%s:%s:%s:%s', p_household_id, p_year_month, e.scope, r.user_id)
    from exceeded e
    cross join recipients r
    on conflict (dedupe_key) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;

select pg_notify('pgrst', 'reload schema');
