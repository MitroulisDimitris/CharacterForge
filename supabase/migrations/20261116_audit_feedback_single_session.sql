-- 1. Activity log: who changed what, when (debugging + traceback). Written by triggers, so the app
--    can't skip it; only the admin can read it. Deletes keep the full old row (to restore it).
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  action text not null,           -- insert / update / delete
  table_name text not null,
  row_id text not null,
  info jsonb not null default '{}' -- name, level, changed fields; full old row on delete
);
create index audit_log_at_idx on public.audit_log(at desc);
create index audit_log_row_idx on public.audit_log(table_name, row_id);
alter table public.audit_log enable row level security;
create policy "admin reads" on public.audit_log for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));
revoke insert, update, delete on public.audit_log from anon, authenticated;

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  info jsonb := '{}';
  changed text[];
begin
  if tg_table_name in ('characters', 'session_members') then
    info := jsonb_build_object('name', r->'data'->>'name', 'level', r->'data'->'level');
  elsif tg_table_name = 'sessions' then
    info := jsonb_build_object('name', r->>'name', 'status', r->>'status');
  elsif tg_table_name = 'profiles' then
    info := jsonb_build_object('display_name', r->>'display_name');
  end if;
  if tg_op = 'UPDATE' then
    -- Skip no-op saves and the login-session bookkeeping column.
    select array_agg(k) into changed from jsonb_object_keys(n) k
     where k not in ('updated_at', 'active_session') and n->k is distinct from o->k;
    if changed is null then return null; end if;
    if 'data' = any(changed) then
      info := info || jsonb_build_object('data_fields',
        (select jsonb_agg(k) from jsonb_object_keys(n->'data') k where n->'data'->k is distinct from o->'data'->k));
      if (o->'data'->'level') is distinct from (n->'data'->'level') then
        info := info || jsonb_build_object('level_from', o->'data'->'level');
      end if;
    end if;
    info := info || jsonb_build_object('fields', to_jsonb(changed));
  elsif tg_op = 'DELETE' then
    info := info || jsonb_build_object('old_row', o);
  end if;
  insert into public.audit_log (action, table_name, row_id, info)
  values (lower(tg_op), tg_table_name, coalesce(r->>'id', ''), info);
  return null;
end $$;
revoke execute on function public.audit_row() from public, anon, authenticated;

create trigger audit_characters after insert or update or delete on public.characters for each row execute function public.audit_row();
create trigger audit_sessions after insert or update or delete on public.sessions for each row execute function public.audit_row();
create trigger audit_session_members after insert or update or delete on public.session_members for each row execute function public.audit_row();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_row();

-- 2. Feedback (REQUIREMENTS §6.1): saved online by everyone (also logged out, on the login page);
--    the sender reads their own, the admin reads and updates all. Screenshots in a private bucket.
create table public.feedback (
  id text primary key check (char_length(id) between 4 and 40),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  sender_name text not null default '' check (char_length(sender_name) <= 60),
  note text not null default '' check (char_length(note) <= 5000),
  context text not null default '' check (char_length(context) <= 500),
  target jsonb,
  images text[] not null default '{}',
  details jsonb not null default '{}', -- page address, window size, browser, app version
  status text not null default 'open' check (status in ('open', 'fixed')),
  fix_note text not null default '',
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback(created_at desc);
alter table public.feedback enable row level security;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin);
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create policy "anyone sends" on public.feedback for insert to anon, authenticated
  with check (user_id is not distinct from (select auth.uid()) and status = 'open' and fix_note = '');
create policy "sender or admin reads" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "admin updates" on public.feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "sender or admin deletes" on public.feedback for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
-- Files go to <user id>/... (or anon/... when logged out).
create policy "feedback upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = coalesce((select auth.uid())::text, 'anon'));
create policy "feedback read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "feedback delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- 3. One active login per account: a fresh login claims the account; other devices notice and log out.
alter table public.profiles add column active_session uuid;
grant update (active_session) on public.profiles to authenticated;

-- The admin sees every display name (activity log, feedback).
create policy "admin reads all profiles" on public.profiles for select to authenticated using (public.is_admin());
