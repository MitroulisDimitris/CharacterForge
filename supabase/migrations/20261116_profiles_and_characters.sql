-- Applied to Supabase project jyjnarwlylmpsjdnanrx on 2026-11-16 (migration "profiles_and_characters").

-- Accounts: one profile per login user.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Characters: owned by one account.
create table public.characters (
  id text primary key check (char_length(id) between 4 and 64),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  system text not null,
  books text[] not null default '{}',
  data jsonb not null,
  pending text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index characters_owner_idx on public.characters(owner_id);
alter table public.characters enable row level security;
create policy "owner reads" on public.characters for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner inserts" on public.characters for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owner updates" on public.characters for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner deletes" on public.characters for delete to authenticated using (owner_id = (select auth.uid()));

-- Advisor fix: a pre-existing helper must not be callable through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
