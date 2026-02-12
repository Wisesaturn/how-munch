-- profiles 테이블에 user_id (auth.users FK) 추가
alter table public.profiles
  add column user_id uuid not null unique references auth.users(id) on delete cascade;

-- 기존 데이터 정리 후 인덱스 생성
create index idx_profiles_user_id on public.profiles(user_id);

-- RLS 정책: 본인 프로필만 조회 가능
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- RLS 정책: 본인 프로필만 생성 가능
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- RLS 정책: 본인 프로필만 수정 가능
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS 정책: 본인 프로필만 삭제 가능
create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);
