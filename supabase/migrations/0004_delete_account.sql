-- =====================================================================
-- Lectio — self-service account deletion
--
-- A user cannot delete their own row in auth.users through the normal
-- Supabase client: that table lives outside RLS's reach and the anon/
-- authenticated roles have no DELETE grant on it. SECURITY DEFINER is the
-- standard way around that — the function runs as the role that created
-- it (the migration owner, which on Supabase owns the auth schema), so it
-- can do what the caller alone cannot, while the auth.uid() check keeps a
-- caller confined to deleting only their own row.
--
-- No cleanup beyond that one delete is needed. Every table that carries a
-- user's data was already declared with `references public.profiles(id)
-- on delete cascade` (profiles itself references auth.users the same way),
-- so removing the auth.users row cascades through profiles, classrooms
-- they teach, their memberships, study_sessions and activity_stats in one
-- statement — the same guarantee the schema already gives a teacher who
-- deletes a classroom, extended one level up.
-- =====================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;
