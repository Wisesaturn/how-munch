-- 카테고리별 기본 유효기간(일수) 설정 테이블 추가 및 장보기 자동 유효기간 채움 반영.
-- 가구(household) 단위로 카테고리별 기본 유효기간을 저장하고,
-- 장보기(add_ingredient_with_fridge) 경로에서 구매일 + 기본일수로 배치 expiry_date를 자동 확정한다.

create table if not exists public.fridge_category_expiry_defaults (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.ingredient_categories(id) on delete cascade,
  default_expiry_days integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fridge_category_expiry_days_range check (default_expiry_days between 1 and 180),
  constraint uq_fridge_category_expiry_defaults unique (household_id, category_id)
);

create index if not exists idx_fridge_category_expiry_defaults_household
  on public.fridge_category_expiry_defaults(household_id);

drop trigger if exists set_updated_at on public.fridge_category_expiry_defaults;
create trigger set_updated_at before update on public.fridge_category_expiry_defaults
for each row execute function public.handle_updated_at();

alter table public.fridge_category_expiry_defaults enable row level security;

create policy "fridge_category_expiry_defaults_select"
  on public.fridge_category_expiry_defaults for select
  using (public.is_household_member(household_id));

create policy "fridge_category_expiry_defaults_insert"
  on public.fridge_category_expiry_defaults for insert
  with check (public.is_household_member(household_id));

create policy "fridge_category_expiry_defaults_update"
  on public.fridge_category_expiry_defaults for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "fridge_category_expiry_defaults_delete"
  on public.fridge_category_expiry_defaults for delete
  using (public.is_household_member(household_id));

grant select, insert, update, delete on public.fridge_category_expiry_defaults to authenticated;

-- add_ingredient_with_fridge: 카테고리 기본 유효기간이 설정돼 있으면 배치 expiry_date를 구매일 + 기본일수로 채운다.
create or replace function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
  p_brand text default null,
  p_category_id uuid default null,
  p_count numeric default 1,
  p_unit text default 'count',
  p_date date default current_date
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingredient public.ingredients%rowtype;
  v_fridge_item_id uuid;
  v_batch_id uuid;
  v_category_id uuid;
  v_expiry_days integer;
  v_expiry_date date;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  v_category_id := public.normalize_ingredient_category_id(p_household_id, p_category_id);

  insert into public.ingredients (
    household_id,
    user_id,
    date,
    name,
    price,
    store,
    brand,
    category_id,
    count,
    unit
  )
  values (
    p_household_id,
    v_user_id,
    coalesce(p_date, current_date),
    p_name,
    coalesce(p_price, 0),
    p_store,
    p_brand,
    v_category_id,
    coalesce(p_count, 1),
    coalesce(p_unit, 'count')
  )
  returning * into v_ingredient;

  -- 카테고리 기본 유효기간이 설정돼 있으면 구매일 기준으로 expiry_date를 계산한다.
  -- 설정이 없으면 v_expiry_date는 null로 유지된다. (과거 날짜가 되어도 그대로 저장)
  select d.default_expiry_days
    into v_expiry_days
  from public.fridge_category_expiry_defaults d
  where d.household_id = v_ingredient.household_id
    and d.category_id = v_ingredient.category_id;

  if v_expiry_days is not null then
    v_expiry_date := v_ingredient.date + v_expiry_days;
  end if;

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.household_id = v_ingredient.household_id
    and f.deleted_at is null
    and lower(btrim(f.name)) = lower(btrim(v_ingredient.name))
    and coalesce(nullif(lower(btrim(f.brand)), ''), '')
      = coalesce(nullif(lower(btrim(v_ingredient.brand)), ''), '')
    and f.unit = v_ingredient.unit
    and f.category_id = v_ingredient.category_id
  order by f.created_at asc
  limit 1
  for update;

  if v_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
      brand,
      category_id,
      unit,
      total_count,
      max_count,
      is_subdivided,
      from_grocery
    )
    values (
      v_ingredient.household_id,
      v_ingredient.name,
      v_ingredient.brand,
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;
  end if;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_fridge_item_id,
    v_ingredient.count,
    v_ingredient.date,
    v_expiry_date,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_item_id = v_fridge_item_id,
      linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  return v_ingredient;
end;
$$;
