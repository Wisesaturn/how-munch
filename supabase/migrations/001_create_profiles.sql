create table if not exists public.profiles (
  id bigint generated always as identity primary key,
  email text not null unique,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.profiles enable row level security;
