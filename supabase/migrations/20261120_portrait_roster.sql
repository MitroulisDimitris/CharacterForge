-- Character portraits (2026-11-20): the roster also passes the small picture from the summary,
-- so players see each other's portraits (still the summary only, D4).
create or replace function public.session_roster(sid uuid) returns table (
  member_id uuid, user_id uuid, display_name text, summary jsonb, joined_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id, p.display_name,
         jsonb_strip_nulls(jsonb_build_object('name', m.summary->'name', 'identity', m.summary->'identity', 'level', m.summary->'level',
                            'system', m.summary->'system', 'portrait', m.summary->'portrait')),
         m.joined_at
  from public.session_members m join public.profiles p on p.id = m.user_id
  where m.session_id = sid and (public.is_session_host(sid) or public.is_session_member(sid))
  order by m.joined_at;
$$;
