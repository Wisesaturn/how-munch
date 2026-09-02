-- ============================================================
-- 073~080 적용 검증 스크립트
-- ============================================================
-- 사용법: Supabase SQL Editor에서 섹션 단위로 실행합니다.
-- A~D는 읽기 전용입니다. E는 트랜잭션 안에서만 쓰고 ROLLBACK으로 되돌립니다.
-- 각 쿼리의 판정 열(예상)이 기대값과 다르면 그 줄이 문제 지점입니다.

/* ============================================================
 * A. 스키마 적용 확인 — 마이그레이션이 실제로 반영됐는가
 * ==========================================================*/

-- A1. dish_ingredients 컬럼 상태 (기대: batch_id YES / amount YES / usage_status NO / consumption_mode NO)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'dish_ingredients'
  and column_name in ('batch_id', 'amount', 'usage_status', 'consumption_mode')
order by column_name;

-- A2. 제약·트리거·인덱스·함수 존재 여부 (기대: 모두 true)
select
  (select count(*) from pg_constraint
    where conname = 'dish_ingredients_consumption_shape_check') = 1          as "074 CHECK 제약",
  (select count(*) from pg_trigger
    where tgname = 'sync_dish_ingredient_consumption_mode') = 1              as "074 모드 파생 트리거",
  (select count(*) from pg_trigger
    where tgname = 'sync_dish_ingredients_on_batch_move') = 1                as "075 배치이동 추종 트리거",
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'uq_fridge_items_identity') = 1 as "077 정체성 유니크 인덱스",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'cleanup_emptied_fridge_item_after_move') = 1 as "077 정리 함수",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_fridge_item_guarded') = 1 as "078 냉장고 수정 RPC",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'resolve_orphan_ingredient_names') = 1 as "079 이름 해석 함수";

-- A3. 배치이동 트리거의 WHEN 절이 실제로 걸렸는가
--     (기대: 조건에 fridge_item_id 비교가 보여야 함. 없으면 모든 배치 갱신마다 헛돎)
select tgname, pg_get_triggerdef(oid) as 정의
from pg_trigger
where tgname in ('sync_dish_ingredients_on_batch_move', 'sync_dish_ingredient_consumption_mode');

-- A4. 소프트 삭제 가드가 dish_ingredients를 보는가 (기대: 3개 함수 모두 true / meal_batch_usages는 false)
select
  p.proname as 함수,
  pg_get_functiondef(p.oid) like '%dish_ingredients%' as "dish_ingredients 참조",
  pg_get_functiondef(p.oid) like '%meal_batch_usages%' as "meal_batch_usages 참조"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('soft_delete_fridge_item', 'soft_delete_fridge_batch', 'soft_delete_ingredient')
order by p.proname;


/* ============================================================
 * B. 데이터 정합성 — 원래 버그가 사라졌는가
 * ==========================================================*/

-- B1. 종합 상태 (기대: 짝어긋남 0 / CHECK위반 0 / 모드누락 0, batch_id없음은 76 부근)
select
  count(*)                                                                        as 전체행,
  count(*) filter (where fi.deleted_at is not null)                               as "삭제품목 참조(079가 이름 복원)",
  count(*) filter (where di.batch_id is null)                                     as "batch_id 없음(복구 불가분)",
  count(*) filter (where di.batch_id is not null
                     and b.fridge_item_id is distinct from di.fridge_item_id)     as "품목·배치 짝어긋남",
  count(*) filter (where di.consumption_mode is null)                             as "모드 누락",
  count(*) filter (where di.consumption_mode = 'quantity'
                     and (di.amount is null or di.usage_status <> 'used'))        as "quantity 형태위반",
  count(*) filter (where di.consumption_mode = 'toggle'
                     and (di.amount is not null
                          or di.usage_status not in ('used','depleted')))         as "toggle 형태위반"
from public.dish_ingredients di
left join public.fridge_items fi on fi.id = di.fridge_item_id
left join public.fridge_item_batches b on b.id = di.batch_id;

-- B2. 073 백필이 실제로 먹었는가 (기대: 백필 후 batch_id 없음이 801 → 76 수준)
select
  count(*) filter (where batch_id is not null) as "batch_id 있음",
  count(*) filter (where batch_id is null)     as "batch_id 없음",
  round(100.0 * count(*) filter (where batch_id is not null) / nullif(count(*), 0), 1) as "복구율(%)"
from public.dish_ingredients;

-- B3. 모드가 품목 단위와 일치하는가 (기대: 불일치 0)
select count(*) as "모드-단위 불일치"
from public.dish_ingredients di
join public.fridge_items fi on fi.id = di.fridge_item_id
where di.consumption_mode <> (case when fi.unit = 'count' then 'quantity' else 'toggle' end);

-- B4. 정체성 중복 (기대: 0행)
select household_id, lower(btrim(name)) as 이름,
       coalesce(nullif(lower(btrim(brand)), ''), '') as 브랜드, unit, count(*) as 중복수
from public.fridge_items
where deleted_at is null and not is_subdivided
group by 1, 2, 3, 4, category_id
having count(*) > 1;

-- B5. 073이 죽은 배치에 고정한 행이 있는가 (P2 지적 확인, 기대: 0)
--     0이 아니면 해당 식단은 저장 시 MEAL_STOCK_INSUFFICIENT로 실패한다
select count(*) as "소프트삭제된 배치를 참조"
from public.dish_ingredients di
join public.fridge_item_batches b on b.id = di.batch_id
where b.deleted_at is not null;

-- B6. 079가 이름을 복원할 수 있는 행인지 확인 (끊긴 참조의 실제 이름이 보여야 함)
select m.date, m.type, d.name as 요리, fi.name as "복원될 이름", fi.unit,
       di.consumption_mode, di.amount, di.usage_status
from public.dish_ingredients di
join public.dishes d on d.id = di.dish_id
join public.meals m on m.id = d.meal_id
join public.fridge_items fi on fi.id = di.fridge_item_id
where fi.deleted_at is not null
order by m.date desc;


/* ============================================================
 * C. 권한·경계 확인 (078)
 * ==========================================================*/

-- C1. fridge_items 직접 UPDATE 권한 (기대: authenticated/anon 행이 없어야 함)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'fridge_items'
  and privilege_type in ('UPDATE', 'DELETE')
  and grantee in ('authenticated', 'anon')
order by grantee, privilege_type;

-- C2. fridge_update 정책에 with check가 붙었는가 (기대: with_check 열이 NULL이 아님)
select policyname, cmd, qual as using_절, with_check as with_check_절
from pg_policies
where schemaname = 'public' and tablename = 'fridge_items' and cmd = 'UPDATE';


/* ============================================================
 * D. 리뷰 지적 반영 여부 (081 적용 후 전부 true 여야 함)
 * ==========================================================*/

-- D1. [P1] upsert_meal_with_usage가 가구 소속을 검증하는가
--     081 적용 전 false / 적용 후 true. false면 다른 가구 batch를 0으로 만들 수 있음
select pg_get_functiondef(p.oid) like '%household_id = p_household_id%' as "가구 검증 있음"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'upsert_meal_with_usage';

-- D2. [P1] 단위 가드가 품목의 실제 단위를 비교하는가
--     081 적용 전 false / 적용 후 true. false면 장보기 행의 이전 단위만 보고 있는 상태
select pg_get_functiondef(p.oid) like '%from public.fridge_items f where f.id = v_previous_fridge_item_id%'
         as "품목 실제 단위 비교"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'update_ingredient_with_fridge';

-- D2b. [P2] 모드 파생 트리거가 amount까지 정규화하는가 (081 적용 후 true)
select pg_get_functiondef(p.oid) like '%new.amount := null%' as "amount 정규화 있음"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'sync_dish_ingredient_consumption_mode';

-- D3. [P3] 정체성 advisory lock을 잡는 함수 (기대: 3개 모두 true)
select p.proname as 함수, pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%' as "락 있음"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('update_ingredient_with_fridge', 'add_ingredient_with_fridge', 'create_fridge_item_with_batch')
order by p.proname;


/* ============================================================
 * E. 기능 테스트 — 실제 시나리오 재현 (전부 ROLLBACK)
 * ============================================================
 * 실행법: 아래 begin; 부터 rollback; 까지 블록만 선택해 한 번에 실행하세요.
 *         Supabase SQL Editor는 RAISE NOTICE를 표시하지 않으므로
 *         판정 결과를 임시 테이블에 모아 마지막에 SELECT로 돌려줍니다.
 * 판정:   통과 열이 전부 true 여야 합니다.
 * ==========================================================*/

begin;

create temp table zz_verify_result (
  순번 integer,
  시나리오 text,
  통과 boolean,
  상세 text
) on commit drop;

do $$
declare
  v_household_id uuid;
  v_user_id uuid;
  v_category_id uuid;
  v_suffix text := substr(md5(random()::text), 1, 8);
  v_ing public.ingredients%rowtype;
  v_item_id uuid;
  v_batch_id uuid;
  v_item_id_after uuid;
  v_meal_id uuid;
  v_di_item_id uuid;
  v_resolved_name text;
  v_expected_name text;
  v_usage_rows integer;
  v_blocked boolean;
  v_err text;
begin
  select hm.household_id, hm.user_id
    into v_household_id, v_user_id
  from public.household_members hm
  limit 1;

  if v_household_id is null then
    insert into zz_verify_result values (0, '사전 조건', false, 'household_members가 비어 있어 테스트 불가');
    return;
  end if;

  -- auth.uid()가 동작하도록 JWT 클레임 주입
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_id)::text, true);

  select id into v_category_id
  from public.ingredient_categories
  where household_id = v_household_id
  limit 1;

  insert into zz_verify_result
  values (0, '사전 조건', true, format('가구 %s / 사용자 %s', v_household_id, v_user_id));

  /* ---------- [1] 개 단위 — 제자리 이름 변경(분기 B) ---------- */
  v_expected_name := 'ZZ테스트메추리알' || v_suffix;

  v_ing := public.add_ingredient_with_fridge(
    p_household_id := v_household_id,
    p_name         := 'ZZ테스트계란' || v_suffix,
    p_category_id  := v_category_id,
    p_count        := 10,
    p_unit         := 'count'
  );
  v_item_id  := v_ing.linked_fridge_item_id;
  v_batch_id := v_ing.linked_fridge_batch_id;

  v_meal_id := public.upsert_meal_with_usage(
    v_household_id, date '2099-01-01', 'dinner',
    jsonb_build_array(jsonb_build_object(
      'name', 'ZZ테스트요리', 'sort_order', 0,
      'ingredients', jsonb_build_array(jsonb_build_object(
        'fridge_item_id', v_item_id, 'batch_id', v_batch_id, 'amount', 2))))
  );

  v_ing := public.update_ingredient_with_fridge(
    v_ing.id, jsonb_build_object('name', v_expected_name)
  );
  v_item_id_after := v_ing.linked_fridge_item_id;

  select di.fridge_item_id into v_di_item_id
  from public.dish_ingredients di
  join public.dishes d on d.id = di.dish_id
  where d.meal_id = v_meal_id
  limit 1;

  select f.name into v_resolved_name
  from public.fridge_items f
  where f.id = v_di_item_id and f.deleted_at is null;

  insert into zz_verify_result values (
    1, '개 단위 이름 변경 → 식단 반영',
    v_resolved_name is not distinct from v_expected_name,
    format('품목 유지=%s / 식단이 보는 이름=%s',
           (v_item_id = v_item_id_after), coalesce(v_resolved_name, '<빈 값>'))
  );

  /* ---------- [2] 무게 단위 사용 중 삭제 차단(구멍 4) ---------- */
  v_ing := public.add_ingredient_with_fridge(
    p_household_id := v_household_id,
    p_name         := 'ZZ테스트돼지고기' || v_suffix,
    p_category_id  := v_category_id,
    p_count        := 500,
    p_unit         := 'g'
  );
  v_item_id  := v_ing.linked_fridge_item_id;
  v_batch_id := v_ing.linked_fridge_batch_id;

  perform public.upsert_meal_with_usage(
    v_household_id, date '2099-01-02', 'lunch',
    jsonb_build_array(jsonb_build_object(
      'name', 'ZZ테스트찌개', 'sort_order', 0,
      'ingredients', jsonb_build_array(jsonb_build_object(
        'fridge_item_id', v_item_id, 'batch_id', v_batch_id, 'usage_status', 'used'))))
  );

  select count(*) into v_usage_rows
  from public.meal_batch_usages where batch_id = v_batch_id;

  v_blocked := false;
  v_err := null;
  begin
    perform public.soft_delete_fridge_item(v_item_id);
  exception when others then
    v_blocked := true;
    v_err := sqlerrm;
  end;

  insert into zz_verify_result values (
    2, '무게 재료 사용 중 삭제 차단',
    v_blocked,
    format('원장 행 수=%s (0이 정상) / %s', v_usage_rows, coalesce(v_err, '차단되지 않음'))
  );

  /* ---------- [3] 식단 참조 중 단위 변경 차단 ---------- */
  v_blocked := false;
  v_err := null;
  begin
    perform public.update_ingredient_with_fridge(
      v_ing.id, jsonb_build_object('unit', 'count')
    );
  exception when others then
    v_blocked := true;
    v_err := sqlerrm;
  end;

  insert into zz_verify_result values (
    3, '식단 참조 중 단위 변경 차단',
    v_blocked,
    coalesce(v_err, '차단되지 않음')
  );
end;
$$;

select * from zz_verify_result order by 순번;

rollback;
