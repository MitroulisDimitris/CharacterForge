-- Party tools (REQUIREMENTS §4.4, D3): the host changes a member's in-play state (`live`: HP,
-- temporary HP, damage log, conditions, exhaustion), awards levels, and keeps private notes.
-- Players see their own row (incl. live); other players still get the summary only (D4).

alter table public.session_members add column level_award int check (level_award between 1 and 20);
-- The player clears the award once they've leveled up.
grant update (level_award) on public.session_members to authenticated;

create function public.set_live(mid uuid, new_live jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  select session_id into sid from public.session_members where id = mid;
  if sid is null or not public.is_session_host(sid) then raise exception 'Only the host can do that.'; end if;
  if pg_column_size(new_live) > 20000 then raise exception 'Too much data.'; end if;
  update public.session_members set live = coalesce(new_live, '{}') where id = mid;
end $$;

-- Award one more level to one member (mid) or to everyone in the session (mid null).
create function public.award_level(sid uuid, mid uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_session_host(sid) then raise exception 'Only the host can do that.'; end if;
  update public.session_members m
     set level_award = least(20, greatest(coalesce(m.level_award, 0), coalesce((m.data->>'level')::int, 1)) + 1)
   where m.session_id = sid and (mid is null or m.id = mid);
end $$;

create function public.session_notes(sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.notes from public.sessions s where s.id = sid and s.host_id = (select auth.uid());
$$;

-- Roster: the host also gets the level award; players never see the others' details.
create or replace function public.session_roster(sid uuid) returns table (
  member_id uuid, user_id uuid, display_name text, summary jsonb, joined_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id, p.display_name,
         jsonb_build_object('name', m.summary->'name', 'identity', m.summary->'identity', 'level', m.summary->'level', 'system', m.summary->'system'),
         m.joined_at
  from public.session_members m join public.profiles p on p.id = m.user_id
  where m.session_id = sid and (public.is_session_host(sid) or public.is_session_member(sid))
  order by m.joined_at;
$$;

revoke execute on function public.set_live(uuid, jsonb), public.award_level(uuid, uuid), public.session_notes(uuid), public.session_roster(uuid) from public, anon;
grant execute on function public.set_live(uuid, jsonb), public.award_level(uuid, uuid), public.session_notes(uuid), public.session_roster(uuid) to authenticated;
