-- Session level (user, 2026-11-22): the DM sets the level the session plays at when creating it.
-- Joining with a character of another level leaves a suggestion on that membership (level_award:
-- "Level up to N" or "Lower to N"); nothing changes the character by itself.
alter table public.sessions add column if not exists level smallint check (level between 1 and 20);
grant select (level) on public.sessions to authenticated;
grant update (level) on public.sessions to authenticated;

-- The preview a joining player sees now includes the level (return type changed: drop + create).
drop function if exists public.session_preview(text);
create function public.session_preview(code text) returns table (
  id uuid, name text, system text, books text[], host_name text, joining_locked boolean, status text, is_host boolean, my_character text, level smallint
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.system, s.books, p.display_name, s.joining_locked, s.status,
         s.host_id = (select auth.uid()),
         (select m.character_id from public.session_members m where m.session_id = s.id and m.user_id = (select auth.uid())),
         s.level
  from public.sessions s join public.profiles p on p.id = s.host_id
  where s.invite_code = upper(trim(code));
$$;
revoke execute on function public.session_preview(text) from public, anon;
grant execute on function public.session_preview(text) to authenticated;

create or replace function public.join_session(code text, char_id text, copy jsonb, copy_pending text[], copy_summary jsonb) returns uuid
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
  insert into public.session_members (session_id, user_id, character_id, books, data, pending, summary, level_award)
  values (s.id, (select auth.uid()), c.id, c.books, copy, coalesce(copy_pending, '{}'), coalesce(copy_summary, '{}'),
          case when s.level is not null and coalesce((copy->>'level')::int, 1) <> s.level then s.level end)
  on conflict (session_id, user_id) do nothing
  returning id into mid;
  if mid is null then raise exception 'You''re already in this session.'; end if;
  return mid;
end $$;

create or replace function public.swap_character(sid uuid, char_id text, copy jsonb, copy_pending text[], copy_summary jsonb) returns void
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
         summary = coalesce(copy_summary, '{}'), live = '{}', updated_at = now(),
         level_award = case when s.level is not null and coalesce((copy->>'level')::int, 1) <> s.level then s.level end
   where session_id = sid and user_id = (select auth.uid());
end $$;
