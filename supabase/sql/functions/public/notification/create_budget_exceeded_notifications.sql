-- 역할: 지출이 추가된 직후 해당 월의 예산 초과 여부를 판정해 알림 레코드를 만든다.
-- 동작:
--   1. 호출자가 해당 가구 구성원인지 검증한다(security definer라 RLS를 우회하기 때문).
--   2. 대상 월의 scope별 지출 합계를 v_food_expenses에서 구한다.
--   3. 예산이 설정된 scope 중 지출이 예산을 넘은 것만 남긴다.
--   4. budget_exceeded_enabled가 켜진 가구원마다 알림을 insert한다.
-- 비고: dedupe_key로 월 × scope × 사용자당 1회만 남아, 지출을 추가할 때마다 알림이 쏟아지지 않는다.

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
