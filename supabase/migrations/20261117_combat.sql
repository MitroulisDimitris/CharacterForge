-- Combat tracker (2026-11-17): the fight in progress for an encounter (turn order, round, monster HP,
-- conditions). Host only, like the rest of the encounter (same row, same security rules).
-- Players' HP during a fight still lives in session_members.live, so they see their own.
alter table public.encounters add column if not exists combat jsonb;
