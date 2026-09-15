-- 역할: 한 가구의 특정 연월 식비 예산 4개 scope(total/grocery/restaurant/delivery)를 한 트랜잭션으로 갱신한다.
-- 동작:
--   1. 가구 구성원 여부와 연월 형식을 검증한다.
--   2. p_budgets에서 항목별(grocery/restaurant/delivery) 금액 합계를 구해 total을 넘으면 B0001로 중단한다.
--   3. scope별로 값이 null이면 row를 삭제(미설정)하고, 값이 있으면 upsert한다.
--   4. 갱신 후 해당 연월의 예산 row 전체를 jsonb 배열로 반환한다.
-- 비고: row 없음 = 미설정(진행바 숨김), amount 0 = 명시적 목표(진행바 표시). 두 상태를 구분해야 하므로 암묵적 복사를 하지 않는다.

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
