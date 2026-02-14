-- ============================================================
-- Backfill sync for ingredients <-> fridge_items
-- ============================================================

-- 1) 깨진 링크 정리: linked_fridge_item_id가 존재하지 않는 경우 null 처리
update public.ingredients i
set linked_fridge_item_id = null,
    updated_at = now()
where i.linked_fridge_item_id is not null
  and not exists (
    select 1
    from public.fridge_items f
    where f.id = i.linked_fridge_item_id
  );

-- 2) 미연동 ingredients를 기존 fridge_items와 최대한 매칭 (동일 household/name/category/unit)
with candidates as (
  select
    i.id as ingredient_id,
    (
      select f.id
      from public.fridge_items f
      where f.household_id = i.household_id
        and f.name = i.name
        and f.category = i.category
        and f.unit = i.unit
        and not exists (
          select 1
          from public.ingredients i2
          where i2.linked_fridge_item_id = f.id
            and i2.id <> i.id
        )
      order by
        case when f.from_grocery then 0 else 1 end,
        f.created_at asc
      limit 1
    ) as fridge_item_id
  from public.ingredients i
  where i.linked_fridge_item_id is null
)
update public.ingredients i
set linked_fridge_item_id = c.fridge_item_id,
    updated_at = now()
from candidates c
where i.id = c.ingredient_id
  and c.fridge_item_id is not null;

-- 3) 여전히 미연동인 ingredients는 fridge_items/batches를 생성해서 연결
with to_create as (
  select
    i.id as ingredient_id,
    gen_random_uuid() as fridge_item_id,
    i.household_id,
    i.name,
    i.category,
    i.unit,
    coalesce(i.count, 0) as quantity,
    i.date as purchased_date
  from public.ingredients i
  where i.linked_fridge_item_id is null
),
insert_fridge as (
  insert into public.fridge_items (
    id,
    household_id,
    name,
    total_count,
    unit,
    is_subdivided,
    category,
    from_grocery
  )
  select
    t.fridge_item_id,
    t.household_id,
    t.name,
    t.quantity,
    t.unit,
    false,
    t.category,
    true
  from to_create t
  returning id
),
insert_batch as (
  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  select
    t.fridge_item_id,
    t.quantity,
    t.purchased_date,
    null,
    'Backfilled from ingredients'
  from to_create t
  returning id
)
update public.ingredients i
set linked_fridge_item_id = t.fridge_item_id,
    updated_at = now()
from to_create t
where i.id = t.ingredient_id;

-- 4) fridge_items.total_count를 batch 합계 기준으로 재동기화
update public.fridge_items f
set total_count = coalesce(b.total_quantity, 0),
    updated_at = now()
from (
  select
    fridge_item_id,
    sum(quantity) as total_quantity
  from public.fridge_item_batches
  group by fridge_item_id
) b
where f.id = b.fridge_item_id;

update public.fridge_items f
set total_count = 0,
    updated_at = now()
where not exists (
  select 1
  from public.fridge_item_batches b
  where b.fridge_item_id = f.id
);

-- 5) fridge_items에 대응 ingredient가 없는 경우 ingredient를 생성
with preferred_member as (
  select distinct on (hm.household_id)
    hm.household_id,
    hm.user_id
  from public.household_members hm
  order by
    hm.household_id,
    case when hm.role = 'owner' then 0 else 1 end,
    hm.created_at asc
),
to_create_ingredients as (
  select
    f.id as fridge_item_id,
    f.household_id,
    pm.user_id,
    f.name,
    f.category,
    f.unit,
    coalesce(
      (
        select sum(b.quantity)
        from public.fridge_item_batches b
        where b.fridge_item_id = f.id
      ),
      f.total_count,
      0
    ) as quantity,
    coalesce(
      (
        select min(b.purchased_date)
        from public.fridge_item_batches b
        where b.fridge_item_id = f.id
      ),
      f.created_at::date
    ) as purchased_date
  from public.fridge_items f
  left join preferred_member pm on pm.household_id = f.household_id
  where not exists (
    select 1
    from public.ingredients i
    where i.linked_fridge_item_id = f.id
  )
)
insert into public.ingredients (
  household_id,
  user_id,
  date,
  name,
  price,
  store,
  category,
  count,
  unit,
  linked_fridge_item_id
)
select
  t.household_id,
  t.user_id,
  t.purchased_date,
  t.name,
  0,
  null,
  t.category,
  t.quantity,
  t.unit,
  t.fridge_item_id
from to_create_ingredients t
where t.user_id is not null;
