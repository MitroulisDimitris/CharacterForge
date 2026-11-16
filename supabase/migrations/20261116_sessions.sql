-- Sessions (REQUIREMENTS §4): one host, an invite code, members who each bring a session copy
-- of one character (D2). Players see each other's summary only (D4): they read the roster through
-- session_roster(), never the other members' rows.

-- Invite codes look like K7P-2QX (no 0/O/1/I/L to avoid mix-ups).
create function public.new_invite_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      if i = 3 then code := code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.sessions s where s.invite_code = code);
  end loop;
  return code;
end $$;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  system text not null,
  books text[] not null default '{}',
  invite_code text not null unique,
  joining_locked boolean not null default false,
  status text not null default 'active' check (status in ('active', 'ended')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.sessions alter column invite_code set default public.new_invite_code();
create index sessions_host_idx on public.sessions(host_id);

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  books text[] not null default '{}',
  data jsonb not null,
  pending text[] not null default '{}',
  summary jsonb not null default '{}',
  live jsonb not null default '{}',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);
create index session_members_session_idx on public.session_members(session_id);
create index session_members_user_idx on public.session_members(user_id);
create index session_members_character_idx on public.session_members(character_id);

-- Helpers (security definer, so policies don't recurse).
create function public.is_session_host(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s where s.id = sid and s.host_id = (select auth.uid()));
$$;
create function public.is_session_member(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.session_members m where m.session_id = sid and m.user_id = (select auth.uid()));
$$;
create function public.shares_session(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where (s.host_id = other or exists (select 1 from public.session_members m where m.session_id = s.id and m.user_id = other))
      and (s.host_id = (select auth.uid()) or exists (select 1 from public.session_members m where m.session_id = s.id and m.user_id = (select auth.uid())))
  );
$$;
revoke execute on function public.is_session_host(uuid), public.is_session_member(uuid), public.shares_session(uuid) from public, anon;
grant execute on function public.is_session_host(uuid), public.is_session_member(uuid), public.shares_session(uuid) to authenticated;
revoke execute on function public.new_invite_code() from public, anon;
grant execute on function public.new_invite_code() to authenticated;

alter table public.sessions enable row level security;
create policy "host or member reads" on public.sessions for select to authenticated
  using (host_id = (select auth.uid()) or public.is_session_member(id));
create policy "anyone logged in creates as host" on public.sessions for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy "host updates" on public.sessions for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "host deletes" on public.sessions for delete to authenticated
  using (host_id = (select auth.uid()));
-- The invite code is the host's alone (§5): members read sessions through the columns below.
revoke select on public.sessions from authenticated;
grant select (id, host_id, name, system, books, joining_locked, status, created_at) on public.sessions to authenticated;
revoke update on public.sessions from authenticated;
grant update (name, books, joining_locked, status, notes) on public.sessions to authenticated;

alter table public.session_members enable row level security;
create policy "own row or host reads" on public.session_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_session_host(session_id));
create policy "player updates own row" on public.session_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "player leaves or host removes" on public.session_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_session_host(session_id));
-- Joining only through join_session(); players can't touch `live` (host-only, D3, later).
revoke insert on public.session_members from authenticated;
revoke update on public.session_members from authenticated;
grant update (data, pending, summary, updated_at) on public.session_members to authenticated;

-- Display names are visible to people you share a session with.
create policy "people in my sessions" on public.profiles for select to authenticated
  using (public.shares_session(id));

-- Host-only reads that hide the code from members.
create function public.session_code(sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.invite_code from public.sessions s where s.id = sid and s.host_id = (select auth.uid());
$$;
create function public.new_session_code(sid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not public.is_session_host(sid) then raise exception 'Only the host can do that.'; end if;
  code := public.new_invite_code();
  update public.sessions set invite_code = code where id = sid;
  return code;
end $$;

-- What a code shows before joining (name, host, rules, books).
create function public.session_preview(code text) returns table (
  id uuid, name text, system text, books text[], host_name text, joining_locked boolean, status text, is_host boolean, my_character text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.system, s.books, p.display_name, s.joining_locked, s.status,
         s.host_id = (select auth.uid()),
         (select m.character_id from public.session_members m where m.session_id = s.id and m.user_id = (select auth.uid()))
  from public.sessions s join public.profiles p on p.id = s.host_id
  where s.invite_code = upper(trim(code));
$$;

-- Join with one of my characters: same rules, books a subset of the session's (§4.2).
create function public.join_session(code text, char_id text, copy jsonb, copy_pending text[], copy_summary jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  c public.characters;
  mid uuid;
begin
  select * into s from public.sessions where invite_code = upper(trim(code));
  if s.id is null then raise exception 'No session has that code. Check it and try again.'; end if;
  if s.status <> 'active' then raise exception 'This session has ended.'; end if;
  if s.joining_locked then raise exception 'The host has locked joining for now.'; end if;
  if s.host_id = (select auth.uid()) then raise exception 'You host this session.'; end if;
  select * into c from public.characters where id = char_id and owner_id = (select auth.uid());
  if c.id is null then raise exception 'That character isn''t yours.'; end if;
  if c.system <> s.system then raise exception 'This character uses different rules.'; end if;
  if not (c.books <@ s.books) then raise exception 'This character uses a book the session doesn''t allow.'; end if;
  insert into public.session_members (session_id, user_id, character_id, books, data, pending, summary)
  values (s.id, (select auth.uid()), c.id, c.books, copy, coalesce(copy_pending, '{}'), coalesce(copy_summary, '{}'))
  on conflict (session_id, user_id) do nothing
  returning id into mid;
  if mid is null then raise exception 'You''re already in this session.'; end if;
  return mid;
end $$;

-- Swap character: same checks as joining; the new character's copy replaces the old one.
create function public.swap_character(sid uuid, char_id text, copy jsonb, copy_pending text[], copy_summary jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  c public.characters;
begin
  select * into s from public.sessions where id = sid;
  if s.id is null or not public.is_session_member(sid) then raise exception 'You''re not in this session.'; end if;
  select * into c from public.characters where id = char_id and owner_id = (select auth.uid());
  if c.id is null then raise exception 'That character isn''t yours.'; end if;
  if c.system <> s.system then raise exception 'This character uses different rules.'; end if;
  if not (c.books <@ s.books) then raise exception 'This character uses a book the session doesn''t allow.'; end if;
  update public.session_members
     set character_id = c.id, books = c.books, data = copy, pending = coalesce(copy_pending, '{}'),
         summary = coalesce(copy_summary, '{}'), live = '{}', updated_at = now()
   where session_id = sid and user_id = (select auth.uid());
end $$;

-- Who's playing: display name + summary only (D4). Members and the host can call it.
create function public.session_roster(sid uuid) returns table (
  member_id uuid, user_id uuid, display_name text, summary jsonb, joined_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id, p.display_name, m.summary, m.joined_at
  from public.session_members m join public.profiles p on p.id = m.user_id
  where m.session_id = sid and (public.is_session_host(sid) or public.is_session_member(sid))
  order by m.joined_at;
$$;

revoke execute on function public.session_code(uuid), public.new_session_code(uuid), public.session_preview(text),
  public.join_session(text, text, jsonb, text[], jsonb), public.swap_character(uuid, text, jsonb, text[], jsonb), public.session_roster(uuid) from public, anon;
grant execute on function public.session_code(uuid), public.new_session_code(uuid), public.session_preview(text),
  public.join_session(text, text, jsonb, text[], jsonb), public.swap_character(uuid, text, jsonb, text[], jsonb), public.session_roster(uuid) to authenticated;
