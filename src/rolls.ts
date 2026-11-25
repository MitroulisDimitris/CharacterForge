// Dice at the table (user, 2026-11-24; REQUIREMENTS §4.6a): rolls made on a player's session page go to
// the DM. Table + rules: supabase/migrations/20261124_session_rolls.sql. No history is kept: only the
// last 12 hours (tonight) are shown, and the database forgets older rolls.
import { supabase } from "./cloud";
import { usesD20, type RollResult, type RollSpec, type Via } from "./dice/roll";

export const TONIGHT_MS = 12 * 60 * 60 * 1000;

export interface TableRoll {
  id: string;
  session_id: string;
  member_id: string;
  user_id: string;
  label: string;
  total: number;
  unit: string;
  /** How it was worked out: "d20 14 + 3 + 2". */
  detail: string;
  /** "Half on a successful save: 7." */
  sub: string;
  flag: "nat20" | "nat1" | "crit" | null;
  /** How the damage was dealt (its animation opens with it). Missing before 20261125_session_rolls_via.sql. */
  via?: Via | null;
  created_at: string;
}

const isDice = (k: string) => /^\d*d\d+$/.test(k);

/** What the DM sees of a roll: label, total, the dice and bonuses in one line, natural 20 / 1. */
export function tableRollOf(spec: RollSpec, res: RollResult): Pick<TableRoll, "label" | "total" | "unit" | "detail" | "sub" | "flag" | "via"> {
  const detail = res.lines.map((l) => (isDice(l.k) ? `${l.k} ${l.v}` : l.k)).join(" ");
  let flag: TableRoll["flag"] = null;
  if (usesD20(spec.kind)) {
    if (/^Natural 20|^Critical hit!/.test(res.note)) flag = "nat20";
    else if (/^Critical hit on/.test(res.note)) flag = "crit";
    else if (/^Natural 1/.test(res.note)) flag = "nat1";
  }
  return { label: spec.label.slice(0, 120), total: res.total, unit: res.unit.slice(0, 60), detail: detail.slice(0, 300), sub: res.sub.slice(0, 160), flag, via: spec.via ?? null };
}

export async function addTableRoll(sessionId: string, memberId: string, roll: ReturnType<typeof tableRollOf>): Promise<void> {
  const { error } = await supabase.from("session_rolls").insert({ session_id: sessionId, member_id: memberId, ...roll });
  if (!error) return;
  // Before 20261125_session_rolls_via.sql the column isn't there: send the roll without it.
  if (error.code !== "42703" && error.code !== "PGRST204") throw error;
  const { via: _via, ...rest } = roll;
  const again = await supabase.from("session_rolls").insert({ session_id: sessionId, member_id: memberId, ...rest });
  if (again.error) throw again.error;
}

/** Tonight's rolls, newest first: all of them for the host, your own for a player (row rules). */
export async function loadTableRolls(sessionId: string): Promise<TableRoll[]> {
  const since = new Date(Date.now() - TONIGHT_MS).toISOString();
  const cols = "id, session_id, member_id, user_id, label, total, unit, detail, sub, flag, created_at";
  const read = (withVia: boolean) =>
    supabase
      .from("session_rolls")
      .select(withVia ? `${cols}, via` : cols)
      .eq("session_id", sessionId)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
  let { data, error } = await read(true);
  // Before 20261125_session_rolls_via.sql the column isn't there.
  if (error?.code === "42703") ({ data, error } = await read(false));
  if (error) throw error;
  return (data ?? []) as unknown as TableRoll[];
}

/** "21:42" in the viewer's time. */
export const rollTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The words after a total: "Natural 20", "Natural 1", "Critical hit", else the unit ("piercing"). */
export const rollTag = (r: Pick<TableRoll, "flag" | "unit">) => (r.flag === "nat20" ? "Natural 20" : r.flag === "nat1" ? "Natural 1" : r.flag === "crit" ? "Critical hit" : r.unit);
