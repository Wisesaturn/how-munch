-- Function: public.handle_updated_at
-- Source: supabase/migrations/004_initial_service_schema.sql
-- 역할: 테이블 갱신 시 updated_at을 현재 시각으로 동기화합니다.
-- 동작:
-- 1. UPDATE 트리거에서 호출됩니다.
-- 2. new.updated_at = now()로 설정 후 NEW를 반환합니다.
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
