-- Accounts whose email was never verified (user, 2026-11-24): remove them, and keep doing it.
-- A sign-up with a mistyped or abandoned email leaves an account nobody can log in to. Every night
-- at 03:00 UTC, accounts still unverified 3 days after sign-up are deleted (their profile goes with
-- them: profiles.id references auth.users on delete cascade). An account that owns characters or
-- sessions is never touched. Safe to run again.

create extension if not exists pg_cron;

create or replace function public.delete_unverified_accounts(older_than interval default interval '3 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.users u
   where u.email_confirmed_at is null
     and u.created_at < now() - older_than
     and not exists (select 1 from public.characters c where c.owner_id = u.id)
     and not exists (select 1 from public.sessions s where s.host_id = u.id);
  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.delete_unverified_accounts(interval) from public, anon, authenticated;

-- Now: the accounts already waiting (2026-11-24: one, created 2026-11-20, never logged in).
select public.delete_unverified_accounts(interval '3 days') as deleted_now;

-- Every night.
select cron.unschedule(jobid) from cron.job where jobname = 'delete-unverified-accounts';
select cron.schedule('delete-unverified-accounts', '0 3 * * *', $$select public.delete_unverified_accounts(interval '3 days')$$);
