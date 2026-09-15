-- 월 단위 식비 예산 테이블과 예산 현황 조회용 함수를 추가한다.
-- row 없음 = 미설정(추적하지 않음), amount 0 = 명시적 목표(0원으로 산다). 두 상태는 다르게 취급한다.
-- 그래서 year_month는 NOT NULL이고, 직전 달 자동 복사 같은 암묵적 쓰기를 하지 않는다.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year_month text not null,
  scope text not null check (scope in ('total', 'grocery', 'restaurant', 'delivery')),
  amount integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_year_month_format check (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  constraint budgets_amount_non_negative check (amount >= 0),
  constraint budgets_unique_scope unique (household_id, year_month, scope)
);

create index if not exists idx_budgets_household_year_month
  on public.budgets(household_id, year_month);

drop trigger if exists set_updated_at on public.budgets;
create trigger set_updated_at before update on public.budgets
  for each row execute function public.handle_updated_at();

alter table public.budgets enable row level security;

drop policy if exists "budgets_select" on public.budgets;
create policy "budgets_select" on public.budgets for select
  using (public.is_household_member(household_id));
drop policy if exists "budgets_insert" on public.budgets;
create policy "budgets_insert" on public.budgets for insert
  with check (public.is_household_member(household_id));
drop policy if exists "budgets_update" on public.budgets;
create policy "budgets_update" on public.budgets for update
  using (public.is_household_member(household_id));
drop policy if exists "budgets_delete" on public.budgets;
create policy "budgets_delete" on public.budgets for delete
  using (public.is_household_member(household_id));

grant select, insert, update, delete on public.budgets to authenticated;

-- 4개 scope를 한 트랜잭션으로 쓰는 read-modify-write라 RPC로 강제한다.
-- p_budgets는 {"total": 600000, "grocery": 400000, ...} 형태이며,
-- 키가 없거나 값이 null이면 "미설정"으로 보고 해당 scope row를 지운다.
create or replace function public.upsert_household_budgets_guarded(
  p_household_id uuid,
  p_year_month text,
  p_budgets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
  v_amount integer;
  v_total integer;
  v_scope_sum integer := 0;
  v_result jsonb;
begin
  if not public.is_household_member(p_household_id) then
    raise exception '가구 구성원만 예산을 변경할 수 있습니다'
      using errcode = 'A0002', hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception '예산 연월 형식이 올바르지 않습니다'
      using errcode = 'B0002', hint = 'BUDGET_YEAR_MONTH_INVALID';
  end if;

  v_total := nullif(p_budgets ->> 'total', '')::integer;

  foreach v_scope in array array['grocery', 'restaurant', 'delivery'] loop
    v_amount := nullif(p_budgets ->> v_scope, '')::integer;
    if v_amount is not null then
      v_scope_sum := v_scope_sum + v_amount;
    end if;
  end loop;

  -- 전체 예산이 설정된 경우에만 항목 합계를 검증한다. 전체가 미설정이면 비교 기준이 없다.
  if v_total is not null and v_scope_sum > v_total then
    raise exception '항목별 예산 합계가 전체 예산을 초과합니다'
      using errcode = 'B0001', hint = 'BUDGET_SCOPE_SUM_EXCEEDS_TOTAL';
  end if;

  foreach v_scope in array array['total', 'grocery', 'restaurant', 'delivery'] loop
    v_amount := nullif(p_budgets ->> v_scope, '')::integer;

    if v_amount is null then
      -- 미설정으로 되돌리는 경로. amount 0(명시적 목표)과 구분된다.
      delete from public.budgets
      where household_id = p_household_id
        and year_month = p_year_month
        and scope = v_scope;
    else
      if v_amount < 0 then
        raise exception '예산은 0원 이상이어야 합니다'
          using errcode = 'B0003', hint = 'BUDGET_AMOUNT_NEGATIVE';
      end if;

      insert into public.budgets (household_id, year_month, scope, amount)
      values (p_household_id, p_year_month, v_scope, v_amount)
      on conflict (household_id, year_month, scope)
      do update set amount = excluded.amount, updated_at = now();
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.scope), '[]'::jsonb)
  into v_result
  from public.budgets b
  where b.household_id = p_household_id
    and b.year_month = p_year_month;

  return v_result;
end;
$$;

grant execute on function public.upsert_household_budgets_guarded(uuid, text, jsonb) to authenticated;

-- 그래프용 일자별 합계. 두 달치 전체 row를 클라이언트로 끌어오는 낭비를 막는다.
-- 대상 월과 직전 월을 한 번에 반환하고, 누적 계산은 클라이언트가 한다.
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

grant execute on function public.get_food_expense_daily_series(uuid, text) to authenticated;
