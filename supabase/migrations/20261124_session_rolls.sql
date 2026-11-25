-- Dice at the table (user, 2026-11-24; REQUIREMENTS §4.6a). A player's rolls on the session page are
-- shared with the DM: one row per roll. No history is kept (user): every new roll in a session
-- removes that session's rolls older than 12 hours, so the DM sees tonight's rolls only.
-- Players read their own rows ("Your rolls tonight"); the host reads all rows of the session.
-- Safe to run twice.

create table if not exists public.session_rolls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.session_members(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  total integer not null,
  unit text not null default '' check (char_length(unit) <= 60),
  detail text not null default '' check (char_length(detail) <= 300),
  sub text not null default '' check (char_length(sub) <= 160),
  flag text check (flag in ('nat20', 'nat1', 'crit')),
  created_at timestamptz not null default now()
);
create index if not exists session_rolls_session_idx on public.session_rolls(session_id, created_at desc);

alter table public.session_rolls enable row level security;

drop policy if exists "player adds own rolls" on public.session_rolls;
create policy "player adds own rolls" on public.session_rolls for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.session_members m join public.sessions s on s.id = m.session_id
      where m.id = member_id and m.session_id = session_rolls.session_id and m.user_id = (select auth.uid()) and s.status = 'active'
    )
  );

drop policy if exists "own rolls or host reads" on public.session_rolls;
create policy "own rolls or host reads" on public.session_rolls for select to authenticated
  using (user_id = (select auth.uid()) or public.is_session_host(session_id));

revoke update, delete on public.session_rolls from authenticated;

-- Forget last night: a new roll clears the session's rolls older than 12 hours.
create or replace function public.session_rolls_forget() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.session_rolls where session_id = new.session_id and created_at < now() - interval '12 hours';
  return new;
end $$;
revoke execute on function public.session_rolls_forget() from public, anon, authenticated;

drop trigger if exists session_rolls_forget on public.session_rolls;
create trigger session_rolls_forget after insert on public.session_rolls
  for each row execute function public.session_rolls_forget();
