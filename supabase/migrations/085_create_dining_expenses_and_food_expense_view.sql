-- 외식비(식당/배달) 기록 테이블과 식비 통합 조회 뷰를 추가한다.
-- 장보기(ingredients)는 재고로 들어가는 지출, 외식비(dining_expenses)는 재고로 들어가지 않는 지출이다.
-- 두 소스는 v_food_expenses 뷰 한 곳에서만 UNION ALL로 합쳐, 필터·정렬·페이징을 서버에 그대로 남긴다.
-- 새로운 식비 유형(카페, 편의점 등)은 테이블을 늘리지 않고 dining_expenses.kind로 흡수한다.

create table if not exists public.dining_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  date date not null default current_date,
  kind text not null check (kind in ('restaurant', 'delivery')),
  -- 먹은 것. 식당에서 메뉴를 기억 못 할 수 있어 선택 입력이다.
  name text,
  -- 만든/파는 주체(가게명). 외식 기록의 최소 식별자라 필수다.
  brand text not null,
  -- 결제 채널(배달 플랫폼). kind='restaurant'이면 비어 있다.
  store text,
  price integer not null default 0,
  memo text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dining_expenses_brand_not_blank check (length(trim(brand)) > 0),
  constraint dining_expenses_price_non_negative check (price >= 0)
);

create index if not exists idx_dining_expenses_household_date
  on public.dining_expenses(household_id, date);

create index if not exists idx_dining_expenses_household_kind
  on public.dining_expenses(household_id, kind);

drop trigger if exists set_updated_at on public.dining_expenses;
create trigger set_updated_at before update on public.dining_expenses
  for each row execute function public.handle_updated_at();

alter table public.dining_expenses enable row level security;

drop policy if exists "dining_expenses_select" on public.dining_expenses;
create policy "dining_expenses_select" on public.dining_expenses for select
  using (public.is_household_member(household_id));
drop policy if exists "dining_expenses_insert" on public.dining_expenses;
create policy "dining_expenses_insert" on public.dining_expenses for insert
  with check (public.is_household_member(household_id));
drop policy if exists "dining_expenses_update" on public.dining_expenses;
create policy "dining_expenses_update" on public.dining_expenses for update
  using (public.is_household_member(household_id));
drop policy if exists "dining_expenses_delete" on public.dining_expenses;
create policy "dining_expenses_delete" on public.dining_expenses for delete
  using (public.is_household_member(household_id));

grant select, insert, update, delete on public.dining_expenses to authenticated;

-- 식비 통합 조회 뷰.
-- security_invoker = true로 두어 두 원본 테이블의 RLS가 그대로 적용된다.
-- 공통 컬럼은 이름을 맞췄고, 한쪽에만 있는 컬럼은 서로 null로 노출한다.
create or replace view public.v_food_expenses
with (security_invoker = true)
as
select
  i.id,
  i.household_id,
  i.user_id,
  'grocery'::text as kind,
  i.date,
  i.name,
  i.brand,
  i.store,
  i.price,
  i.category_id,
  i.count,
  i.unit,
  i.linked_fridge_item_id,
  i.linked_fridge_batch_id,
  null::text as memo,
  i.created_at,
  i.updated_at
from public.ingredients i
where i.deleted_at is null
union all
select
  d.id,
  d.household_id,
  d.user_id,
  d.kind,
  d.date,
  d.name,
  d.brand,
  d.store,
  d.price,
  null::uuid as category_id,
  null::numeric as count,
  null::text as unit,
  null::uuid as linked_fridge_item_id,
  null::uuid as linked_fridge_batch_id,
  d.memo,
  d.created_at,
  d.updated_at
from public.dining_expenses d
where d.deleted_at is null;

grant select on public.v_food_expenses to authenticated;
