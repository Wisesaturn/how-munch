-- ============================================================
-- 039: Normalize RPC exception messages with domain error map
-- ============================================================

-- Source: supabase/sql/functions/public/auth/delete_my_account.sql
-- Function: public.delete_my_account
-- Source: supabase/migrations/011_delete_my_account_rpc.sql
-- 역할: 현재 인증 사용자 계정 관련 데이터를 안전하게 정리합니다.
-- 동작:
-- 1. 본인 uid 기준 연관 데이터 정리/삭제를 수행합니다.
-- 2. 최종적으로 auth 계정 삭제 워크플로우를 완료합니다.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  delete from auth.users where id = v_user_id;

  return found;
end;
$$;

-- Source: supabase/sql/functions/public/category/normalize_ingredient_category_id.sql
-- Function: public.normalize_ingredient_category_id
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 입력 category_id를 household 기준 유효한 값으로 정규화합니다.
-- 동작:
-- 1. null/invalid 입력을 기본 기타 카테고리로 보정합니다.
-- 2. 유효한 category_id를 반환하여 RPC 내부에서 공통 사용합니다.
create or replace function public.normalize_ingredient_category_id(
  p_household_id uuid,
  p_category_id uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  if p_category_id is null then
    return public.resolve_ingredient_category_id(p_household_id, null);
  end if;

  select ic.id
    into v_category_id
  from public.ingredient_categories ic
  where ic.id = p_category_id
    and (ic.household_id is null or ic.household_id = p_household_id)
  limit 1;

  if v_category_id is null then
    raise exception using
      errcode = 'I0003',
      message = '유효하지 않은 카테고리입니다.',
      hint = 'INGREDIENT_CATEGORY_ID_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;

-- Source: supabase/sql/functions/public/category/reassign_items_to_other_category_before_delete.sql
-- Function: public.reassign_items_to_other_category_before_delete
-- Source: supabase/migrations/036_finalize_category_fk_with_sync.sql
-- 역할: 카테고리 삭제 전에 연관 아이템을 기타 카테고리로 재배치합니다.
-- 동작:
-- 1. 삭제 대상 카테고리를 참조하는 행을 탐색합니다.
-- 2. 기타 카테고리로 FK를 재할당해 삭제 제약을 충족합니다.
create or replace function public.reassign_items_to_other_category_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replacement_category_id uuid;
begin
  if old.code = 'other' then
    raise exception using
      errcode = 'I0001',
      message = '기본 카테고리(기타)는 삭제할 수 없습니다.',
      hint = 'INGREDIENT_CATEGORY_OTHER_DELETE_NOT_ALLOWED';
  end if;

  if old.household_id is not null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id = old.household_id
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    select ic.id
      into v_replacement_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_replacement_category_id is null then
    raise exception using
      errcode = 'I0004',
      message = '대체할 기본 카테고리(기타)를 찾을 수 없습니다.',
      hint = 'INGREDIENT_CATEGORY_REPLACEMENT_NOT_FOUND';
  end if;

  update public.ingredients
  set category_id = v_replacement_category_id
  where category_id = old.id;

  update public.fridge_items
  set category_id = v_replacement_category_id
  where category_id = old.id;

  return old;
end;
$$;

-- Source: supabase/sql/functions/public/category/resolve_ingredient_category_id.sql
-- Function: public.resolve_ingredient_category_id
-- Source: supabase/migrations/036_finalize_category_fk_with_sync.sql
-- 역할: 카테고리 코드 문자열을 카테고리 UUID로 해석합니다.
-- 동작:
-- 1. household 기본/커스텀 카테고리를 조회합니다.
-- 2. 유효한 id를 반환하거나 fallback 정책을 적용합니다.
create or replace function public.resolve_ingredient_category_id(
  p_household_id uuid,
  p_category_code text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_code text;
  v_category_id uuid;
begin
  v_category_code := coalesce(nullif(trim(p_category_code), ''), 'other');

  if p_household_id is not null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id = p_household_id
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = v_category_code
    limit 1;
  end if;

  if v_category_id is null then
    select ic.id
      into v_category_id
    from public.ingredient_categories ic
    where ic.household_id is null
      and ic.code = 'other'
    limit 1;
  end if;

  if v_category_id is null then
    raise exception using
      errcode = 'I0002',
      message = '기본 카테고리(기타)를 찾을 수 없습니다.',
      hint = 'INGREDIENT_CATEGORY_OTHER_NOT_FOUND';
  end if;

  return v_category_id;
end;
$$;

-- Source: supabase/sql/functions/public/fridge/create_fridge_item_with_batch.sql
-- Function: public.create_fridge_item_with_batch
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 냉장고 아이템과 첫 배치를 동시에 생성합니다.
-- 동작:
-- 1. category_id를 정규화하고 item을 생성합니다.
-- 2. 입력 수량으로 첫 batch를 생성하고 item을 반환합니다.
create or replace function public.create_fridge_item_with_batch(
  p_household_id uuid,
  p_name text,
  p_category_id uuid default null,
  p_unit text default 'count',
  p_is_subdivided boolean default false,
  p_from_grocery boolean default false,
  p_quantity numeric default 1,
  p_purchased_date date default current_date,
  p_expiry_date date default null,
  p_memo text default null
)
returns public.fridge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.fridge_items%rowtype;
  v_category_id uuid;
begin
  if auth.uid() is null then
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

  insert into public.fridge_items (
    household_id,
    name,
    category_id,
    unit,
    total_count,
    max_count,
    is_subdivided,
    from_grocery
  )
  values (
    p_household_id,
    p_name,
    v_category_id,
    coalesce(p_unit, 'count'),
    coalesce(p_quantity, 1),
    coalesce(p_quantity, 1),
    coalesce(p_is_subdivided, false),
    coalesce(p_from_grocery, false)
  )
  returning * into v_item;

  insert into public.fridge_item_batches (
    fridge_item_id,
    quantity,
    purchased_date,
    expiry_date,
    memo
  )
  values (
    v_item.id,
    coalesce(p_quantity, 1),
    coalesce(p_purchased_date, current_date),
    p_expiry_date,
    p_memo
  );

  return v_item;
end;
$$;

-- Source: supabase/sql/functions/public/fridge/soft_delete_fridge_batch.sql
-- Function: public.soft_delete_fridge_batch
-- Source: supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql
-- 역할: 냉장고 배치를 소프트 삭제합니다.
-- 동작:
-- 1. 식단 사용 중 배치인지 검증합니다.
-- 2. 삭제 처리 후 아이템 총량 동기화를 수행합니다.
create or replace function public.soft_delete_fridge_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fridge_item_id uuid;
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select b.fridge_item_id, f.household_id
    into v_fridge_item_id, v_household_id
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null;

  if v_fridge_item_id is null then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set linked_fridge_batch_id = null
  where linked_fridge_batch_id = p_batch_id;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where id = p_batch_id;

  perform public.refresh_fridge_item_total_count(v_fridge_item_id);

  if not exists (
    select 1
    from public.fridge_item_batches b
    where b.fridge_item_id = v_fridge_item_id
      and b.deleted_at is null
  ) then
    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null
    where linked_fridge_item_id = v_fridge_item_id;

    update public.fridge_items
    set deleted_at = now(),
        updated_at = now()
    where id = v_fridge_item_id
      and deleted_at is null;
  end if;
end;
$$;

-- Source: supabase/sql/functions/public/fridge/soft_delete_fridge_item.sql
-- Function: public.soft_delete_fridge_item
-- Source: supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql
-- 역할: 냉장고 아이템을 소프트 삭제하며 연관 배치 정리를 수행합니다.
-- 동작:
-- 1. 권한과 식단 사용 여부를 검증합니다.
-- 2. 삭제 시각을 기록하고 연관 배치 정합성을 함께 맞춥니다.
create or replace function public.soft_delete_fridge_item(p_fridge_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id
    into v_household_id
  from public.fridge_items
  where id = p_fridge_item_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'F0004',
      message = '냉장고 재료를 찾을 수 없습니다.',
      hint = 'FRIDGE_ITEM_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  select exists (
    select 1
    from public.meal_batch_usages mbu
    where mbu.fridge_item_id = p_fridge_item_id
  )
  into v_is_used_in_meal;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'F0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'FRIDGE_IN_USE_IN_MEAL';
  end if;

  update public.fridge_item_batches
  set deleted_at = now(),
      updated_at = now()
  where fridge_item_id = p_fridge_item_id
    and deleted_at is null;

  update public.ingredients
  set linked_fridge_item_id = null,
      linked_fridge_batch_id = null
  where linked_fridge_item_id = p_fridge_item_id;

  perform public.refresh_fridge_item_total_count(p_fridge_item_id);

  update public.fridge_items
  set deleted_at = now(),
      updated_at = now()
  where id = p_fridge_item_id
    and deleted_at is null;
end;
$$;

-- Source: supabase/sql/functions/public/fridge/update_fridge_batch_guarded.sql
-- Function: public.update_fridge_batch_guarded
-- Source: supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql
-- 역할: 배치 수정 시 식단 사용량/출처 정책을 검증하는 guarded 업데이트입니다.
-- 동작:
-- 1. 장보기 연동 배치 수량 직접 수정 금지 규칙을 검증합니다.
-- 2. 사용 중 수량 하한을 지킨 뒤 변경값을 반영합니다.
create or replace function public.update_fridge_batch_guarded(
  p_batch_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.fridge_item_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_from_grocery boolean;
  v_used_amount numeric := 0;
  v_requested_total_quantity numeric;
  v_result public.fridge_item_batches%rowtype;
begin
  select f.household_id, f.from_grocery
    into v_household_id, v_from_grocery
  from public.fridge_item_batches b
  join public.fridge_items f on f.id = b.fridge_item_id
  where b.id = p_batch_id
    and b.deleted_at is null
    and f.deleted_at is null
  for update of b, f;

  if not found then
    raise exception using
      errcode = 'F0005',
      message = '재고 배치를 찾을 수 없습니다.',
      hint = 'FRIDGE_BATCH_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if p_updates ? 'quantity' then
    if v_from_grocery then
      raise exception using
        errcode = 'F0002',
        message = '장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.',
        hint = 'FRIDGE_QUANTITY_MANAGED_IN_GROCERY';
    end if;

    v_requested_total_quantity := (p_updates->>'quantity')::numeric;
    if v_requested_total_quantity is null then
      raise exception using
        errcode = 'F0006',
        message = '유효하지 않은 수량입니다.',
        hint = 'FRIDGE_INVALID_QUANTITY';
    end if;

    select coalesce(sum(mbu.amount), 0)
      into v_used_amount
    from public.meal_batch_usages mbu
    where mbu.batch_id = p_batch_id;

    if v_requested_total_quantity < v_used_amount then
      raise exception using
        errcode = 'F0003',
        message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
        hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
    end if;
  end if;

  update public.fridge_item_batches b
  set quantity = case
        when p_updates ? 'quantity' then v_requested_total_quantity - v_used_amount
        else b.quantity
      end,
      purchased_date = case
        when p_updates ? 'purchased_date' then coalesce((p_updates->>'purchased_date')::date, b.purchased_date)
        else b.purchased_date
      end,
      expiry_date = case
        when p_updates ? 'expiry_date' then (p_updates->>'expiry_date')::date
        else b.expiry_date
      end,
      memo = case
        when p_updates ? 'memo' then (p_updates->>'memo')::text
        else b.memo
      end,
      updated_at = now()
  where b.id = p_batch_id
  returning * into v_result;

  return v_result;
end;
$$;

-- Source: supabase/sql/functions/public/household/create_household_with_owner.sql
-- Function: public.create_household_with_owner
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: household 생성과 owner 멤버 연결을 원자적으로 처리합니다.
-- 동작:
-- 1. household 생성 후 현재 유저를 owner로 등록합니다.
-- 2. profiles.household_id를 새 household로 갱신합니다.
create or replace function public.create_household_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  insert into public.households (id, name)
  values (v_household_id, p_name);

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'owner')
  on conflict (household_id, user_id) do update
    set role = excluded.role;

  update public.profiles
  set household_id = v_household_id,
      updated_at = now()
  where user_id = v_user_id;

  return v_household_id;
end;
$$;

-- Source: supabase/sql/functions/public/household/join_household.sql
-- Function: public.join_household
-- Source: supabase/migrations/005_household_invites_and_join_household.sql
-- 역할: 초대 코드로 household 가입을 처리합니다.
-- 동작:
-- 1. 초대 코드 유효성과 사용 가능 횟수를 검증합니다.
-- 2. 멤버십 추가, 초대 사용 횟수 증가, profile household 연결을 트랜잭션으로 처리합니다.
create or replace function public.join_household(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.household_invites%rowtype;
  v_household_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  -- 유효한 초대코드를 잠그고 조회하여 동시성 경쟁 방지
  select *
    into v_invite
    from public.household_invites
   where code = invite_code
     and expires_at > now()
     and use_count < max_uses
   for update;

  if not found then
    raise exception using
      errcode = 'H0001',
      message = '유효하지 않거나 만료된 초대 코드입니다.',
      hint = 'HOUSEHOLD_INVITE_INVALID_OR_EXPIRED';
  end if;

  v_household_id := v_invite.household_id;

  if exists (
    select 1
      from public.household_members
     where household_id = v_household_id
       and user_id = v_user_id
  ) then
    raise exception using
      errcode = 'H0002',
      message = '이미 해당 가구의 구성원입니다.',
      hint = 'HOUSEHOLD_ALREADY_MEMBER';
  end if;

  -- 슬롯 확보 (max_uses 보장)
  update public.household_invites
     set use_count = use_count + 1
   where id = v_invite.id
     and use_count < max_uses;

  if not found then
    raise exception using
      errcode = 'H0003',
      message = '초대 코드 사용 횟수가 모두 소진되었습니다.',
      hint = 'HOUSEHOLD_INVITE_MAX_USES_REACHED';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'member');

  update public.profiles
     set household_id = v_household_id,
         updated_at = now()
   where user_id = v_user_id;

  return v_household_id;
end;
$$;

-- Source: supabase/sql/functions/public/household/leave_household.sql
-- Function: public.leave_household
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: 현재 사용자의 household 탈퇴를 처리합니다.
-- 동작:
-- 1. household_members에서 본인 멤버십을 제거합니다.
-- 2. profiles.household_id를 null로 정리합니다.
create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = 'A0001',
      message = '로그인이 필요합니다.',
      hint = 'AUTH_UNAUTHORIZED';
  end if;

  delete from public.household_members
  where household_id = p_household_id
    and user_id = v_user_id;

  update public.profiles
  set household_id = null,
      updated_at = now()
  where user_id = v_user_id
    and household_id = p_household_id;
end;
$$;

-- Source: supabase/sql/functions/public/ingredient/add_ingredient_with_fridge.sql
-- Function: public.add_ingredient_with_fridge
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 장보기 항목 생성과 냉장고 아이템/첫 배치를 한 트랜잭션으로 생성합니다.
-- 동작:
-- 1. ingredient를 생성하고 category_id를 정규화합니다.
-- 2. 연결 fridge_item + batch를 만들고 링크 컬럼을 업데이트합니다.
create or replace function public.add_ingredient_with_fridge(
  p_household_id uuid,
  p_name text,
  p_price integer default 0,
  p_store text default null,
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
    v_category_id,
    coalesce(p_count, 1),
    coalesce(p_unit, 'count')
  )
  returning * into v_ingredient;

  insert into public.fridge_items (
    household_id,
    name,
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
    v_ingredient.category_id,
    v_ingredient.unit,
    v_ingredient.count,
    v_ingredient.count,
    false,
    true
  )
  returning id into v_fridge_item_id;

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
    null,
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

-- Source: supabase/sql/functions/public/ingredient/delete_ingredient_with_cleanup.sql
-- Function: public.delete_ingredient_with_cleanup
-- Source: supabase/migrations/033_harden_remaining_consistency_paths.sql
-- 역할: 장보기 삭제 시 연결된 냉장고 리소스를 함께 정리합니다.
-- 동작:
-- 1. 연결 batch/item 상태를 확인해 soft delete를 연쇄 수행합니다.
-- 2. 마지막에 ingredient를 soft delete합니다.
create or replace function public.delete_ingredient_with_cleanup(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_active_batch_count bigint := 0;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  if not public.is_household_member(v_ingredient.household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if v_ingredient.linked_fridge_batch_id is not null then
    perform public.soft_delete_fridge_batch(v_ingredient.linked_fridge_batch_id);
  elsif v_ingredient.linked_fridge_item_id is not null then
    select count(*)
      into v_active_batch_count
    from public.fridge_item_batches
    where fridge_item_id = v_ingredient.linked_fridge_item_id
      and deleted_at is null;

    if v_active_batch_count = 0 then
      perform public.soft_delete_fridge_item(v_ingredient.linked_fridge_item_id);
    end if;
  end if;

  perform public.soft_delete_ingredient(p_ingredient_id);
end;
$$;

-- Source: supabase/sql/functions/public/ingredient/soft_delete_ingredient.sql
-- Function: public.soft_delete_ingredient
-- Source: supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql
-- 역할: 장보기 항목을 소프트 삭제합니다.
-- 동작:
-- 1. 권한/대상 존재를 검증합니다.
-- 2. deleted_at을 설정해 논리 삭제합니다.
create or replace function public.soft_delete_ingredient(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_linked_fridge_item_id uuid;
  v_linked_fridge_batch_id uuid;
  v_is_used_in_meal boolean := false;
begin
  select household_id, linked_fridge_item_id, linked_fridge_batch_id
    into v_household_id, v_linked_fridge_item_id, v_linked_fridge_batch_id
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  if v_linked_fridge_batch_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.batch_id = v_linked_fridge_batch_id
    )
    into v_is_used_in_meal;
  elsif v_linked_fridge_item_id is not null then
    select exists (
      select 1 from public.meal_batch_usages mbu where mbu.fridge_item_id = v_linked_fridge_item_id
    )
    into v_is_used_in_meal;
  end if;

  if v_is_used_in_meal then
    raise exception using
      errcode = 'C0001',
      message = '식단에 등록되어 있는 재료는 삭제할 수 없습니다.',
      hint = 'GROCERY_IN_USE_IN_MEAL';
  end if;

  update public.ingredients
  set deleted_at = now(),
      updated_at = now()
  where id = p_ingredient_id
    and deleted_at is null;
end;
$$;

-- Source: supabase/sql/functions/public/ingredient/update_ingredient_with_fridge.sql
-- Function: public.update_ingredient_with_fridge
-- Source: supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql
-- 역할: 장보기 항목 수정 시 연결 냉장고 재고를 정합성 있게 동기화합니다.
-- 동작:
-- 1. ingredient 업데이트 후 연결 item/batch 존재 상태를 분기 처리합니다.
-- 2. 식단 사용량보다 작은 수량 설정을 차단하고 배치 수량을 재계산합니다.
create or replace function public.update_ingredient_with_fridge(
  p_ingredient_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_household_id uuid;
  v_fridge_item_id uuid;
  v_batch_id uuid;
  v_used_amount numeric := 0;
begin
  select *
    into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'I0005',
      message = '재료를 찾을 수 없습니다.',
      hint = 'INGREDIENT_NOT_FOUND';
  end if;

  v_household_id := v_ingredient.household_id;
  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  update public.ingredients i
  set name = case
        when p_updates ? 'name' then coalesce(nullif(trim(p_updates->>'name'), ''), i.name)
        else i.name
      end,
      price = case
        when p_updates ? 'price' then coalesce((p_updates->>'price')::integer, i.price)
        else i.price
      end,
      store = case
        when p_updates ? 'store' then (p_updates->>'store')::text
        else i.store
      end,
      category_id = case
        when p_updates ? 'category_id' then public.normalize_ingredient_category_id(i.household_id, nullif(trim(p_updates->>'category_id'), '')::uuid)
        else i.category_id
      end,
      count = case
        when p_updates ? 'count' then coalesce((p_updates->>'count')::numeric, i.count)
        else i.count
      end,
      unit = case
        when p_updates ? 'unit' then coalesce(nullif(trim(p_updates->>'unit'), ''), i.unit)
        else i.unit
      end,
      date = case
        when p_updates ? 'date' then coalesce((p_updates->>'date')::date, i.date)
        else i.date
      end,
      updated_at = now()
  where i.id = p_ingredient_id
  returning * into v_ingredient;

  if v_ingredient.linked_fridge_item_id is null then
    insert into public.fridge_items (
      household_id,
      name,
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
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;

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
      null,
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
  end if;

  select f.id
    into v_fridge_item_id
  from public.fridge_items f
  where f.id = v_ingredient.linked_fridge_item_id
    and f.deleted_at is null
  for update;

  if not found then
    update public.ingredients
    set linked_fridge_item_id = null,
        linked_fridge_batch_id = null,
        updated_at = now()
    where id = v_ingredient.id
    returning * into v_ingredient;

    insert into public.fridge_items (
      household_id,
      name,
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
      v_ingredient.category_id,
      v_ingredient.unit,
      v_ingredient.count,
      v_ingredient.count,
      false,
      true
    )
    returning id into v_fridge_item_id;

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
      null,
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
  end if;

  update public.fridge_items
  set name = v_ingredient.name,
      category_id = v_ingredient.category_id,
      unit = v_ingredient.unit,
      max_count = v_ingredient.count,
      from_grocery = true,
      updated_at = now()
  where id = v_fridge_item_id;

  if v_ingredient.linked_fridge_batch_id is not null then
    select b.id
      into v_batch_id
    from public.fridge_item_batches b
    where b.id = v_ingredient.linked_fridge_batch_id
      and b.deleted_at is null
    for update;

    if found then
      select coalesce(sum(mbu.amount), 0)
        into v_used_amount
      from public.meal_batch_usages mbu
      where mbu.batch_id = v_batch_id;

      if v_ingredient.count < v_used_amount then
        raise exception using
          errcode = 'F0003',
          message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
          hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
      end if;

      update public.fridge_item_batches
      set quantity = v_ingredient.count - v_used_amount,
          purchased_date = v_ingredient.date,
          updated_at = now()
      where id = v_batch_id;

      return v_ingredient;
    end if;
  end if;

  select coalesce(sum(mbu.amount), 0)
    into v_used_amount
  from public.meal_batch_usages mbu
  where mbu.fridge_item_id = v_fridge_item_id;

  if v_ingredient.count < v_used_amount then
    raise exception using
      errcode = 'F0003',
      message = '식단에서 사용 중인 수량보다 작게 설정할 수 없습니다.',
      hint = 'FRIDGE_QUANTITY_BELOW_MEAL_USAGE';
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
    v_ingredient.count - v_used_amount,
    v_ingredient.date,
    null,
    null
  )
  returning id into v_batch_id;

  update public.ingredients
  set linked_fridge_batch_id = v_batch_id,
      updated_at = now()
  where id = v_ingredient.id
  returning * into v_ingredient;

  return v_ingredient;
end;
$$;

-- Source: supabase/sql/functions/public/meal/delete_meal_with_usage_restore.sql
-- Function: public.delete_meal_with_usage_restore
-- Source: supabase/migrations/032_add_transactional_app_rpcs.sql
-- 역할: 식단 삭제 시 차감됐던 배치 사용량을 복원합니다.
-- 동작:
-- 1. meal_batch_usages를 순회하며 batch quantity를 되돌립니다.
-- 2. 복원 후 meal 레코드를 삭제합니다.
create or replace function public.delete_meal_with_usage_restore(p_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_usage record;
begin
  select household_id
    into v_household_id
  from public.meals
  where id = p_meal_id
  for update;

  if v_household_id is null then
    raise exception using
      errcode = 'M0002',
      message = '식단을 찾을 수 없습니다.',
      hint = 'MEAL_NOT_FOUND';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception using
      errcode = 'A0002',
      message = '권한이 없습니다.',
      hint = 'COMMON_PERMISSION_DENIED';
  end if;

  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = p_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meals
  where id = p_meal_id;
end;
$$;

-- Source: supabase/sql/functions/public/meal/upsert_meal_with_usage.sql
-- Function: public.upsert_meal_with_usage
-- Source: supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql
-- 역할: 식단 저장 시 dish/ingredient와 배치 사용량 차감을 원자적으로 처리합니다.
-- 동작:
-- 1. 기존 meal usage를 롤백한 뒤 새 dishes/ingredients를 재저장합니다.
-- 2. FIFO 배치 차감 후 부족 시 도메인 예외를 발생시킵니다.
create or replace function public.upsert_meal_with_usage(
  p_household_id uuid,
  p_date date,
  p_type text,
  p_dishes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_dish jsonb;
  v_ingredient jsonb;
  v_dish_id uuid;
  v_name text;
  v_fridge_item_id uuid;
  v_amount numeric;
  v_remaining numeric;
  v_batch record;
  v_usage record;
begin
  if auth.uid() is null then
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

  perform pg_advisory_xact_lock(
    hashtextextended(format('meal:%s:%s:%s', p_household_id::text, p_date::text, p_type), 0)
  );

  insert into public.meals (household_id, date, type)
  values (p_household_id, p_date, p_type)
  on conflict (household_id, date, type)
  do update set updated_at = now()
  returning id into v_meal_id;

  for v_usage in
    select batch_id, amount
    from public.meal_batch_usages
    where meal_id = v_meal_id
  loop
    update public.fridge_item_batches
    set quantity = quantity + v_usage.amount,
        updated_at = now()
    where id = v_usage.batch_id
      and deleted_at is null;
  end loop;

  delete from public.meal_batch_usages where meal_id = v_meal_id;
  delete from public.dishes where meal_id = v_meal_id;

  if p_dishes is null or jsonb_typeof(p_dishes) <> 'array' then
    return v_meal_id;
  end if;

  for v_dish in
    select value from jsonb_array_elements(p_dishes)
  loop
    v_name := coalesce(nullif(trim(v_dish->>'name'), ''), '[이름 없음]');

    insert into public.dishes (meal_id, name, sort_order)
    values (
      v_meal_id,
      v_name,
      coalesce((v_dish->>'sort_order')::integer, 0)
    )
    returning id into v_dish_id;

    if jsonb_typeof(v_dish->'ingredients') = 'array' then
      for v_ingredient in
        select value from jsonb_array_elements(v_dish->'ingredients')
      loop
        v_fridge_item_id := (v_ingredient->>'fridge_item_id')::uuid;
        v_amount := coalesce((v_ingredient->>'amount')::numeric, 0);

        if v_fridge_item_id is null or v_amount <= 0 then
          continue;
        end if;

        insert into public.dish_ingredients (dish_id, fridge_item_id, amount)
        values (v_dish_id, v_fridge_item_id, v_amount);
      end loop;
    end if;
  end loop;

  for v_usage in
    select di.fridge_item_id, sum(di.amount) as total_amount
    from public.dish_ingredients di
    join public.dishes d on d.id = di.dish_id
    where d.meal_id = v_meal_id
    group by di.fridge_item_id
    order by di.fridge_item_id
  loop
    v_remaining := v_usage.total_amount;

    for v_batch in
      select b.id, b.quantity
      from public.fridge_item_batches b
      where b.fridge_item_id = v_usage.fridge_item_id
        and b.deleted_at is null
      order by b.purchased_date asc, b.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if coalesce(v_batch.quantity, 0) <= 0 then
        continue;
      end if;

      v_amount := least(v_batch.quantity, v_remaining);

      update public.fridge_item_batches
      set quantity = quantity - v_amount,
          updated_at = now()
      where id = v_batch.id;

      insert into public.meal_batch_usages (meal_id, fridge_item_id, batch_id, amount)
      values (v_meal_id, v_usage.fridge_item_id, v_batch.id, v_amount);

      v_remaining := v_remaining - v_amount;
    end loop;

    if v_remaining > 0 then
      raise exception using
        errcode = 'M0001',
        message = '냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.',
        hint = 'MEAL_STOCK_INSUFFICIENT';
    end if;
  end loop;

  return v_meal_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');
