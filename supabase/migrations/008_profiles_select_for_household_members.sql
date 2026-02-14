-- ============================================================
-- Allow reading profiles within the same household
-- ============================================================

drop policy if exists "Users can read household member profiles" on public.profiles;
create policy "Users can read household member profiles"
  on public.profiles for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.household_members me
      join public.household_members target
        on target.household_id = me.household_id
      where me.user_id = auth.uid()
        and target.user_id = profiles.user_id
    )
  );
