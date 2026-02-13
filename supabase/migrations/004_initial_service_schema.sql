-- ============================================================
-- How Munch - Initial Schema
-- ============================================================

-- 1. households (가구)
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. household_members (가구 멤버)
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- 3. profiles 업데이트 (household_id 추가)
alter table public.profiles
  add column if not exists household_id uuid references public.households(id) on delete set null;

-- 4. fridge_items (냉장고 재고) — ingredients보다 먼저 생성 (FK 참조)
create table public.fridge_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  total_count numeric not null default 0,
  unit text not null default 'count' check (unit in ('count', 'g')),
  is_subdivided boolean not null default false,
  category text not null default 'other',
  from_grocery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. ingredients (장보기 내역)
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete set null,
  date date not null default current_date,
  name text not null,
  price integer not null default 0,
  store text,
  category text not null default 'other',
  count numeric not null default 1,
  unit text not null default 'count' check (unit in ('count', 'g')),
  linked_fridge_item_id uuid references public.fridge_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. meals (식단)
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  date date not null,
  type text not null check (type in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, date, type)
);

-- 7. dishes (요리)
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. dish_ingredients (요리 재료)
create table public.dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  fridge_item_id uuid not null references public.fridge_items(id) on delete cascade,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_household_members_user on public.household_members(user_id);
create index idx_household_members_household on public.household_members(household_id);
create index idx_ingredients_household_date on public.ingredients(household_id, date);
create index idx_ingredients_linked_fridge on public.ingredients(linked_fridge_item_id);
create index idx_fridge_items_household on public.fridge_items(household_id);
create index idx_meals_household_date on public.meals(household_id, date);
create index idx_dishes_meal on public.dishes(meal_id);
create index idx_dish_ingredients_dish on public.dish_ingredients(dish_id);
create index idx_dish_ingredients_fridge on public.dish_ingredients(fridge_item_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.households
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.fridge_items
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ingredients
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.meals
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.dishes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Helper: 현재 유저가 해당 가구에 속하는지 확인
create or replace function public.is_household_member(h_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = h_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- households
alter table public.households enable row level security;
create policy "household_select" on public.households for select
  using (public.is_household_member(id));
create policy "household_insert" on public.households for insert
  with check (true); -- 누구나 가구 생성 가능
create policy "household_update" on public.households for update
  using (public.is_household_member(id));
create policy "household_delete" on public.households for delete
  using (public.is_household_member(id));

-- household_members
alter table public.household_members enable row level security;
create policy "hm_select" on public.household_members for select
  using (public.is_household_member(household_id));
create policy "hm_insert" on public.household_members for insert
  with check (user_id = auth.uid() or public.is_household_member(household_id));
create policy "hm_delete" on public.household_members for delete
  using (user_id = auth.uid() or public.is_household_member(household_id));

-- ingredients
alter table public.ingredients enable row level security;
create policy "ingredients_select" on public.ingredients for select
  using (public.is_household_member(household_id));
create policy "ingredients_insert" on public.ingredients for insert
  with check (public.is_household_member(household_id));
create policy "ingredients_update" on public.ingredients for update
  using (public.is_household_member(household_id));
create policy "ingredients_delete" on public.ingredients for delete
  using (public.is_household_member(household_id));

-- fridge_items
alter table public.fridge_items enable row level security;
create policy "fridge_select" on public.fridge_items for select
  using (public.is_household_member(household_id));
create policy "fridge_insert" on public.fridge_items for insert
  with check (public.is_household_member(household_id));
create policy "fridge_update" on public.fridge_items for update
  using (public.is_household_member(household_id));
create policy "fridge_delete" on public.fridge_items for delete
  using (public.is_household_member(household_id));

-- meals
alter table public.meals enable row level security;
create policy "meals_select" on public.meals for select
  using (public.is_household_member(household_id));
create policy "meals_insert" on public.meals for insert
  with check (public.is_household_member(household_id));
create policy "meals_update" on public.meals for update
  using (public.is_household_member(household_id));
create policy "meals_delete" on public.meals for delete
  using (public.is_household_member(household_id));

-- dishes (meal을 통해 간접 확인)
alter table public.dishes enable row level security;
create policy "dishes_select" on public.dishes for select
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and public.is_household_member(m.household_id)
  ));
create policy "dishes_insert" on public.dishes for insert
  with check (exists (
    select 1 from public.meals m
    where m.id = meal_id and public.is_household_member(m.household_id)
  ));
create policy "dishes_update" on public.dishes for update
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and public.is_household_member(m.household_id)
  ));
create policy "dishes_delete" on public.dishes for delete
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and public.is_household_member(m.household_id)
  ));

-- dish_ingredients (dish → meal을 통해 간접 확인)
alter table public.dish_ingredients enable row level security;
create policy "di_select" on public.dish_ingredients for select
  using (exists (
    select 1 from public.dishes d
    join public.meals m on m.id = d.meal_id
    where d.id = dish_id and public.is_household_member(m.household_id)
  ));
create policy "di_insert" on public.dish_ingredients for insert
  with check (exists (
    select 1 from public.dishes d
    join public.meals m on m.id = d.meal_id
    where d.id = dish_id and public.is_household_member(m.household_id)
  ));
create policy "di_update" on public.dish_ingredients for update
  using (exists (
    select 1 from public.dishes d
    join public.meals m on m.id = d.meal_id
    where d.id = dish_id and public.is_household_member(m.household_id)
  ));
create policy "di_delete" on public.dish_ingredients for delete
  using (exists (
    select 1 from public.dishes d
    join public.meals m on m.id = d.meal_id
    where d.id = dish_id and public.is_household_member(m.household_id)
  ));
