-- Sessions overview (2026-11-17): for every session I host or play in, how many players, how many
-- encounters (host only) and when something last happened there. Read-only; no table changes.
-- Last activity = the latest of: the session starting, someone joining, a player's session copy
-- changing, and (for the host only, since players never see encounters) an encounter changing.
create or replace function public.my_sessions_overview()
returns table (session_id uuid, players int, encounters int, last_activity timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id,
         (select count(*)::int from public.session_members m where m.session_id = s.id),
         case when s.host_id = auth.uid() then (select count(*)::int from public.encounters e where e.session_id = s.id) end,
         greatest(
           s.created_at,
           (select max(greatest(m.joined_at, m.updated_at)) from public.session_members m where m.session_id = s.id),
           case when s.host_id = auth.uid() then (select max(e.updated_at) from public.encounters e where e.session_id = s.id) end
         )
  from public.sessions s
  where s.host_id = auth.uid()
     or exists (select 1 from public.session_members m where m.session_id = s.id and m.user_id = auth.uid());
$$;
revoke execute on function public.my_sessions_overview() from public, anon;
grant execute on function public.my_sessions_overview() to authenticated;
