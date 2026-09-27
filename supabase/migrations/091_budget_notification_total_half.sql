-- 예산 알림을 전체(total) 예산 기준 50% / 100% 두 기준선으로 바꾼다.
--
-- 기존에는 항목별(grocery/restaurant/delivery) 예산만 넘어도
-- "이번 달 예산을 초과했어요!" 알림이 가서 전체 예산 초과로 오해할 수 있었다.
-- 이제 항목별 예산은 알림 대상에서 빼고, 전체 예산의 절반 사용 알림을 추가한다.
-- 반환값은 새로 남긴 기준선(50 | 100, 없으면 0)으로 바꿔 route가 push 문구를 고르게 한다.

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
  v_budget_amount integer;
  v_spent_amount bigint;
  v_threshold integer;
  v_exceeded_key_prefix text;
  v_half_key_prefix text;
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

  select b.amount
  into v_budget_amount
  from public.budgets b
  where b.household_id = p_household_id
    and b.year_month = p_year_month
    and b.scope = 'total';

  -- total 예산 미설정 = 추적하지 않음
  if v_budget_amount is null then
    return 0;
  end if;

  v_month_start := to_date(p_year_month || '-01', 'YYYY-MM-DD');

  select coalesce(sum(f.price), 0)::bigint
  into v_spent_amount
  from public.v_food_expenses f
  where f.household_id = p_household_id
    and f.date >= v_month_start
    and f.date < v_month_start + interval '1 month';

  if v_spent_amount > v_budget_amount then
    v_threshold := 100;
  elsif v_budget_amount > 0 and v_spent_amount * 2 >= v_budget_amount then
    v_threshold := 50;
  else
    return 0;
  end if;

  v_exceeded_key_prefix := format('budget_exceeded:%s:%s:total:', p_household_id, p_year_month);
  v_half_key_prefix := format('budget_exceeded:%s:%s:total:half:', p_household_id, p_year_month);

  with recipients as (
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
      case when v_threshold = 100 then '예산 초과' else '예산 절반 사용' end,
      case
        when v_threshold = 100 then '이번 달 예산을 초과했어요!'
        else '이번 달 예산의 절반을 썼어요!'
      end,
      jsonb_build_object(
        'householdId', p_household_id,
        'yearMonth', p_year_month,
        'threshold', v_threshold,
        'budgetAmount', v_budget_amount,
        'spentAmount', v_spent_amount
      ),
      now(),
      now(),
      -- 이 알림은 route에서 곧바로 push를 보낸다.
      -- push_sent_at을 비워두면 get_pending_push_notifications가 type을 가리지 않고 집어가
      -- 다음 cron에서 같은 알림이 한 번 더 발송된다.
      now(),
      'sent',
      -- 사용자별 row이므로 dedupe_key에도 user_id를 넣어야 가구원 모두가 한 번씩 받는다.
      case
        when v_threshold = 100 then v_exceeded_key_prefix || r.user_id
        else v_half_key_prefix || r.user_id
      end
    from recipients r
    -- 한 번에 50%와 100%를 넘었거나, 초과 후 지출 삭제로 비율이 내려간 경우
    -- 뒤늦게 "절반 사용" 알림이 가지 않도록 이미 초과 알림을 받은 사용자는 제외한다.
    where v_threshold = 100
      or not exists (
        select 1
        from public.notifications n
        where n.dedupe_key = v_exceeded_key_prefix || r.user_id
      )
    on conflict (dedupe_key) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  if v_inserted_count = 0 then
    return 0;
  end if;

  return v_threshold;
end;
$$;

select pg_notify('pgrst', 'reload schema');
