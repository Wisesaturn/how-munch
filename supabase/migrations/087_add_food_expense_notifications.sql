-- 식비 알림 2종(예산 초과, 주간 지출)을 추가한다.
-- 화면에서만 예산을 보여주면 앱을 열어야만 초과 사실을 알 수 있다.

alter table public.notification_preferences
  add column if not exists budget_exceeded_enabled boolean not null default true,
  add column if not exists weekly_expense_enabled boolean not null default true;

-- 역할: 지출이 추가된 직후 해당 월의 예산 초과 여부를 판정해 알림 레코드를 만든다.
-- 동작:
--   1. 대상 월의 scope별 지출 합계를 v_food_expenses에서 구한다.
--   2. 예산이 설정된 scope 중 지출이 예산을 넘은 것만 남긴다.
--   3. budget_exceeded_enabled가 켜진 가구원마다 알림을 insert한다.
--   4. dedupe_key로 월 × scope × 사용자당 1회만 남아, 지출을 추가할 때마다 알림이 쏟아지지 않는다.
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

grant execute on function public.create_budget_exceeded_notifications(uuid, text) to authenticated;

-- 역할: 지난주(월~일) 식비 합계를 요약해 주간 지출 알림 레코드를 만든다.
-- 동작:
--   1. p_target_date가 속한 주의 직전 주 월요일~일요일 구간을 구한다.
--   2. 가구별 지난주 식비 합계를 v_food_expenses에서 구한다.
--   3. 발송일이 속한 달의 total 예산이 있으면 누적 사용 비율을 문구에 덧붙인다.
--   4. weekly_expense_enabled가 켜진 가구원마다 알림을 insert한다.
create or replace function public.generate_weekly_expense_notifications(
  p_target_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer := 0;
  v_week_start date;
  v_week_end date;
  v_month_start date;
  v_year_month text;
begin
  -- date_trunc('week')는 월요일 시작이다. 발송 시점이 월요일이므로 직전 주를 집계한다.
  v_week_start := (date_trunc('week', p_target_date::timestamp) - interval '7 days')::date;
  v_week_end := v_week_start + 6;
  v_month_start := date_trunc('month', p_target_date::timestamp)::date;
  v_year_month := to_char(v_month_start, 'YYYY-MM');

  with weekly as (
    select
      f.household_id,
      sum(f.price)::bigint as weekly_total
    from public.v_food_expenses f
    where f.date >= v_week_start
      and f.date <= v_week_end
    group by f.household_id
  ),
  monthly as (
    select
      f.household_id,
      sum(f.price)::bigint as monthly_total
    from public.v_food_expenses f
    where f.date >= v_month_start
      and f.date < v_month_start + interval '1 month'
    group by f.household_id
  ),
  summarized as (
    select
      w.household_id,
      w.weekly_total,
      b.amount as budget_amount,
      coalesce(m.monthly_total, 0) as monthly_total
    from weekly w
    left join monthly m on m.household_id = w.household_id
    left join public.budgets b
      on b.household_id = w.household_id
      and b.year_month = v_year_month
      and b.scope = 'total'
  ),
  recipients as (
    select
      hm.household_id,
      hm.user_id
    from public.household_members hm
    left join public.notification_preferences np on np.user_id = hm.user_id
    where coalesce(np.weekly_expense_enabled, true) = true
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
      r.user_id,
      s.household_id,
      'weekly_expense',
      '지난주 지출',
      case
        when s.budget_amount is null or s.budget_amount = 0 then
          format('지난주는 %s원 사용했어요.', to_char(s.weekly_total, 'FM999,999,999,999'))
        else
          format(
            '지난주는 %s원 사용했어요. %s월 예산의 %s%%를 썼어요.',
            to_char(s.weekly_total, 'FM999,999,999,999'),
            extract(month from v_month_start)::integer,
            round(s.monthly_total::numeric * 100 / s.budget_amount)
          )
      end,
      jsonb_build_object(
        'householdId', s.household_id,
        'weekStart', v_week_start,
        'weekEnd', v_week_end,
        'weeklyTotal', s.weekly_total,
        'yearMonth', v_year_month,
        'monthlyTotal', s.monthly_total,
        'budgetAmount', s.budget_amount
      ),
      (p_target_date::timestamp + interval '09:00')::timestamptz,
      now(),
      'sent',
      -- 사용자별 row이므로 dedupe_key에도 user_id를 넣어야 가구원 모두가 한 번씩 받는다.
      format(
        'weekly_expense:%s:%s:%s',
        s.household_id,
        to_char(v_week_start, 'IYYY-"W"IW'),
        r.user_id
      )
    from summarized s
    join recipients r on r.household_id = s.household_id
    where s.weekly_total > 0
    on conflict (dedupe_key) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;

grant execute on function public.generate_weekly_expense_notifications(date) to service_role;
