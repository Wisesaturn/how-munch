-- Function: public.sync_category_reference_columns
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 카테고리 전환 마이그레이션 시 구/신 참조 컬럼 값을 동기화합니다.
-- 동작:
-- 1. category_id와 레거시 category code를 상호 변환합니다.
-- 2. 트리거/배치 실행으로 컬럼 간 정합성을 유지합니다.
create or replace function public.sync_category_reference_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category_id := public.normalize_ingredient_category_id(new.household_id, new.category_id);
  return new;
end;
$$;
