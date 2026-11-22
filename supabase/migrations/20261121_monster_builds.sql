-- Monster builds (2026-11-21, REQUIREMENTS §4.9): a host's saved versions of a monster's spell list,
-- per session (made on the session Lookup's monster page, then added to encounters). Host only.
create table public.monster_builds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  slug text not null check (char_length(slug) between 1 and 80),
  name text not null check (char_length(name) between 1 and 40),
  -- { "0": ["mage hand", …], "1": [...], … }: the Spellcasting list by spell level
  spells jsonb not null default '{}' check (pg_column_size(spells) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index monster_builds_session_idx on public.monster_builds(session_id, slug);
alter table public.monster_builds enable row level security;
create policy "host reads" on public.monster_builds for select to authenticated using (public.is_session_host(session_id));
create policy "host adds" on public.monster_builds for insert to authenticated
  with check (public.is_session_host(session_id) and (select count(*) from public.monster_builds b where b.session_id = monster_builds.session_id) < 200);
create policy "host changes" on public.monster_builds for update to authenticated using (public.is_session_host(session_id)) with check (public.is_session_host(session_id));
create policy "host deletes" on public.monster_builds for delete to authenticated using (public.is_session_host(session_id));
revoke all on public.monster_builds from anon;
grant select, insert, update, delete on public.monster_builds to authenticated;

create trigger audit_monster_builds after insert or update or delete on public.monster_builds for each row execute function public.audit_row();
