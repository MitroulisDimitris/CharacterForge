-- Per-session versions (user, 2026-11-24; REQUIREMENTS §4.2a). A seat in a session either follows
-- the character (the default: every change to the character shows in the session) or is the
-- character's own version for that session: its sheet (level, spells, items, books) changes only
-- there, and the player switches between versions at the top of the character page.
-- Joining asks "Join and make a copy" or "Make a version" only when the character already plays in
-- another session. Safe to run twice.

alter table public.session_members add column if not exists version boolean not null default false;

-- The player marks their own seat as a version (after joining or swapping) and edits a version's
-- books. Row rules stay as they are: "player updates own row".
grant update (version, books) on public.session_members to authenticated;
