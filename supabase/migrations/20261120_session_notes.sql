-- Session notes in tabs (REQUIREMENTS §4.8): the host's notes become several named, coloured tabs.
-- Host only, like encounters. Bodies are rich text (HTML from the notes editor).
-- The old single note (`sessions.notes`) is NOT touched: it stays as a backup. The first time a
-- session's notes open, ensure_session_notes() makes "Notes 1" from it, so nothing is lost.

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  color text not null default 'parchment'
    check (color in ('parchment', 'crimson', 'gold', 'green', 'blue', 'violet', 'teal', 'stone')),
  body text not null default '' check (char_length(body) <= 1000000),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_notes_session_idx on public.session_notes(session_id, position);
alter table public.session_notes enable row level security;
create policy "host reads" on public.session_notes for select to authenticated using (public.is_session_host(session_id));
-- At most 30 tabs per session.
create policy "host adds" on public.session_notes for insert to authenticated
  with check (public.is_session_host(session_id)
    and (select count(*) from public.session_notes n where n.session_id = session_notes.session_id) < 30);
create policy "host changes" on public.session_notes for update to authenticated using (public.is_session_host(session_id)) with check (public.is_session_host(session_id));
create policy "host deletes" on public.session_notes for delete to authenticated using (public.is_session_host(session_id));
revoke all on public.session_notes from anon;

create trigger audit_session_notes after insert or update or delete on public.session_notes for each row execute function public.audit_row();

-- Plain text (the old notes) → editor HTML: one paragraph per line, text escaped, nothing dropped.
create function public.notes_to_html(t text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg('<p>' || replace(replace(replace(x.line, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>', '' order by x.n), '')
  from regexp_split_to_table(coalesce(t, ''), E'\r?\n') with ordinality as x(line, n)
  where coalesce(t, '') <> '';
$$;

-- The host's tabs for a session. If there are none yet, the old notes become the first tab
-- ("Notes 1"); the lock stops two tabs being made when the page opens twice at once.
create function public.ensure_session_notes(sid uuid) returns setof public.session_notes
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_session_host(sid) then raise exception 'Only the host can do that.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('session_notes:' || sid::text, 0));
  if not exists (select 1 from public.session_notes where session_id = sid) then
    insert into public.session_notes (session_id, title, color, body, position)
    select sid, 'Notes 1', 'parchment', public.notes_to_html(s.notes), 0 from public.sessions s where s.id = sid;
  end if;
  return query select * from public.session_notes where session_id = sid order by position, created_at;
end $$;

revoke execute on function public.ensure_session_notes(uuid), public.notes_to_html(text) from public, anon;
grant execute on function public.ensure_session_notes(uuid) to authenticated;
