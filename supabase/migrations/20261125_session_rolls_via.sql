-- How a damage roll was dealt (user, 2026-11-25): "ranged", "melee" or "area" (a saving throw or an area
-- effect). The DM's roll list opens each damage animation with it (an arrow flies in, a blade thrusts, a
-- hail of points falls). Empty for older rolls and anything that doesn't say: those play as "area".
-- Safe to run twice. Until it runs, the app sends and reads rolls without it.

alter table public.session_rolls add column if not exists via text;

alter table public.session_rolls drop constraint if exists session_rolls_via_check;
alter table public.session_rolls add constraint session_rolls_via_check
  check (via is null or via in ('ranged', 'melee', 'area'));
