-- Encounters (REQUIREMENTS §4.4, step 9): saved per session, host only (players never see them).
create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- [{ slug, name, cr, xp, count, ac, hp }]
  monsters jsonb not null default '[]',
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index encounters_session_idx on public.encounters(session_id);
alter table public.encounters enable row level security;
create policy "host reads" on public.encounters for select to authenticated using (public.is_session_host(session_id));
create policy "host adds" on public.encounters for insert to authenticated with check (public.is_session_host(session_id));
create policy "host changes" on public.encounters for update to authenticated using (public.is_session_host(session_id)) with check (public.is_session_host(session_id));
create policy "host deletes" on public.encounters for delete to authenticated using (public.is_session_host(session_id));
revoke all on public.encounters from anon;
