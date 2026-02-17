-- Add RPC for ingredient soft-delete to avoid client-side RLS edge cases.

create or replace function public.soft_delete_ingredient(p_ingredient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id
    into v_household_id
  from public.ingredients
  where id = p_ingredient_id
    and deleted_at is null;

  if v_household_id is null then
    raise exception 'ingredient not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'permission denied';
  end if;

  update public.ingredients
  set deleted_at = now(),
      updated_at = now()
  where id = p_ingredient_id
    and deleted_at is null;
end;
$$;

grant execute on function public.soft_delete_ingredient(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
