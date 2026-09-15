-- 역할: 예산 현황 그래프용으로 대상 월과 직전 월의 일자별 식비 합계를 반환한다.
-- 동작:
--   1. 가구 구성원 여부와 연월 형식을 검증한다.
--   2. 대상 월 1일과 직전 월 1일을 계산한다.
--   3. v_food_expenses에서 직전 월 1일 ~ 대상 월 말일 구간을 일자 × 종류(kind)별로 집계해 반환한다.
-- 비고: 누적 그래프와 scope별 지출 합계를 모두 이 결과에서 파생시킨다.
--       그래프를 그리려고 두 달치 전체 row를 내려보내지 않기 위한 함수다.

create or replace function public.get_food_expense_daily_series(
  p_household_id uuid,
  p_year_month text
)
returns table (
  year_month text,
  expense_date date,
  kind text,
  total bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_start date;
  v_previous_start date;
begin
  if not public.is_household_member(p_household_id) then
    raise exception '가구 구성원만 조회할 수 있습니다'
      using errcode = 'A0002', hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception '예산 연월 형식이 올바르지 않습니다'
      using errcode = 'B0002', hint = 'BUDGET_YEAR_MONTH_INVALID';
  end if;

  v_current_start := to_date(p_year_month || '-01', 'YYYY-MM-DD');
  v_previous_start := v_current_start - interval '1 month';

  return query
  select
    to_char(f.date, 'YYYY-MM') as year_month,
    f.date as expense_date,
    f.kind,
    sum(f.price)::bigint as total
  from public.v_food_expenses f
  where f.household_id = p_household_id
    and f.date >= v_previous_start
    and f.date < v_current_start + interval '1 month'
  group by 1, 2, 3
  order by 2, 3;
end;
$$;
