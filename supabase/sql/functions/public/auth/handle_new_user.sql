-- Function: public.handle_new_user
-- Source: supabase/migrations/003_auto_create_profile_trigger.sql
-- 역할: Auth 신규 사용자가 생성될 때 profiles 기본 행을 자동 생성합니다.
-- 동작:
-- 1. auth.users INSERT 트리거에서 호출됩니다.
-- 2. 새 user_id 기준으로 profiles 기본 데이터를 삽입합니다.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, nickname)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', '사용자')
  );
  return new;
end;
$$ language plpgsql security definer;
