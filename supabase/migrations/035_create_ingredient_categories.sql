-- Introduce ingredient categories table for DB-driven category rendering.
create table if not exists public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid null references public.households(id) on delete cascade,
  code text not null,
  name text not null,
  emoji_unicode text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_categories_code_not_blank check (length(trim(code)) > 0),
  constraint ingredient_categories_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists uq_ingredient_categories_global_code
  on public.ingredient_categories(code)
  where household_id is null;

create unique index if not exists uq_ingredient_categories_household_code
  on public.ingredient_categories(household_id, code)
  where household_id is not null;

create index if not exists idx_ingredient_categories_scope_order
  on public.ingredient_categories(household_id, sort_order, created_at);

drop trigger if exists set_updated_at on public.ingredient_categories;
create trigger set_updated_at before update on public.ingredient_categories
for each row execute function public.handle_updated_at();

alter table public.ingredient_categories enable row level security;

create policy "ingredient_categories_select" on public.ingredient_categories for select
  using (
    household_id is null
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = ingredient_categories.household_id
        and hm.user_id = auth.uid()
    )
  );

grant select on public.ingredient_categories to authenticated;

insert into public.ingredient_categories (code, name, emoji_unicode, sort_order)
values
  ('meat', '육류', '1F969', 10),
  ('fish', '수산물', '1F41F', 20),
  ('veggie', '채소', '1F96C', 30),
  ('fruit', '과일', '1F34E', 40),
  ('dairy', '유제품', '1F95B', 50),
  ('grain', '곡류', '1F33E', 60),
  ('bread', '빵/베이커리', '1F35E', 70),
  ('noodle', '면류', '1F35C', 80),
  ('frozen', '냉동식품', '1F9CA', 90),
  ('canned', '통조림/캔', '1F96B', 100),
  ('seasoning', '양념', '1F9C2', 110),
  ('processed', '가공식품', '1F9C0', 120),
  ('snack', '간식', '1F36A', 130),
  ('drink', '음료', '1F964', 140),
  ('other', '기타', '1F4E6', 150)
on conflict do nothing;
