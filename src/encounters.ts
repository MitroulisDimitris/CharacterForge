// Encounter difficulty with the 2014 rules (Dungeon Master's Guide, "Creating a Combat Encounter"):
// XP thresholds per character level, monster XP by challenge rating, and a multiplier for the
// number of monsters (shifted for parties under 3 or over 5). Saved encounters: table `encounters`.
import { supabase } from "./cloud";
import type { Combat } from "./combat";

/** Easy, Medium, Hard, Deadly XP threshold for one character of each level (index = level). */
export const THRESHOLDS: [number, number, number, number][] = [
  [0, 0, 0, 0],
  [25, 50, 75, 100],
  [50, 100, 150, 200],
  [75, 150, 225, 400],
  [125, 250, 375, 500],
  [250, 500, 750, 1100],
  [300, 600, 900, 1400],
  [350, 750, 1100, 1700],
  [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600],
  [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700],
  [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500],
  [2400, 4900, 7300, 10900],
  [2800, 5700, 8500, 12700],
];

const CR_XP: Record<string, number> = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
  "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
  "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

/** XP for a challenge rating ("1/4", "3", or 0.25). */
export function xpForCr(cr: string | number): number {
  const key = typeof cr === "number" ? (cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr)) : cr.trim();
  return CR_XP[key] ?? 0;
}

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
/** The multiplier for this many monsters, shifted one step for small (<3) or big (6+) parties. */
export function multiplier(monsterCount: number, partySize: number): number {
  if (monsterCount <= 0) return 1;
  let i = monsterCount === 1 ? 1 : monsterCount === 2 ? 2 : monsterCount <= 6 ? 3 : monsterCount <= 10 ? 4 : monsterCount <= 14 ? 5 : 6;
  if (partySize > 0 && partySize < 3) i += 1;
  else if (partySize >= 6) i -= 1;
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, i))];
}

export type Difficulty = "None" | "Trivial" | "Easy" | "Medium" | "Hard" | "Deadly";

export interface EncounterMonster {
  slug: string;
  name: string;
  cr: string;
  xp: number;
  count: number;
  ac?: number;
  hp?: number;
}

export interface Rating {
  difficulty: Difficulty;
  /** Sum of the monsters' XP (what the party earns). */
  totalXp: number;
  /** Total × multiplier (what decides difficulty). */
  adjustedXp: number;
  multiplier: number;
  perPlayer: number;
  /** The party's Easy / Medium / Hard / Deadly totals. */
  thresholds: [number, number, number, number];
  monsterCount: number;
}

export function rate(monsters: EncounterMonster[], partyLevels: number[]): Rating {
  const count = monsters.reduce((n, m) => n + m.count, 0);
  const totalXp = monsters.reduce((n, m) => n + m.xp * m.count, 0);
  const mult = multiplier(count, partyLevels.length);
  const adjustedXp = Math.round(totalXp * mult);
  const thresholds = partyLevels.reduce<[number, number, number, number]>(
    (t, lvl) => {
      const row = THRESHOLDS[Math.max(1, Math.min(20, lvl))];
      return [t[0] + row[0], t[1] + row[1], t[2] + row[2], t[3] + row[3]];
    },
    [0, 0, 0, 0],
  );
  let difficulty: Difficulty = "None";
  if (count && partyLevels.length) {
    difficulty = adjustedXp >= thresholds[3] ? "Deadly" : adjustedXp >= thresholds[2] ? "Hard" : adjustedXp >= thresholds[1] ? "Medium" : adjustedXp >= thresholds[0] ? "Easy" : "Trivial";
  }
  return { difficulty, totalXp, adjustedXp, multiplier: mult, perPlayer: partyLevels.length ? Math.floor(totalXp / partyLevels.length) : 0, thresholds, monsterCount: count };
}

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  None: "Add monsters to see how hard this is.",
  Trivial: "A walkover: hardly a threat.",
  Easy: "Uses few resources; no real danger.",
  Medium: "A scare or two, but nobody should go down.",
  Hard: "Could go badly: someone might drop.",
  Deadly: "Could kill a character. Plan an escape route.",
};

// ---------- saved encounters ----------

export interface Encounter {
  id: string;
  session_id: string;
  name: string;
  monsters: EncounterMonster[];
  notes: string;
  updated_at: string;
  /** The fight in progress, if any (combat tracker). */
  combat?: Combat | null;
}

const COLS = "id, session_id, name, monsters, notes, updated_at, combat";

export async function loadEncounters(sessionId: string): Promise<Encounter[]> {
  const { data, error } = await supabase.from("encounters").select(COLS).eq("session_id", sessionId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Encounter[];
}

export async function saveEncounter(e: Omit<Encounter, "id" | "updated_at"> & { id?: string }): Promise<Encounter> {
  const row = { session_id: e.session_id, name: e.name, monsters: e.monsters, notes: e.notes, updated_at: new Date().toISOString() };
  const q = e.id ? supabase.from("encounters").update(row).eq("id", e.id) : supabase.from("encounters").insert(row);
  const { data, error } = await q.select(COLS).single();
  if (error) throw error;
  return data as Encounter;
}

export async function deleteEncounter(id: string): Promise<void> {
  const { error } = await supabase.from("encounters").delete().eq("id", id);
  if (error) throw error;
}
