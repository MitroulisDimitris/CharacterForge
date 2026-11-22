// Combat tracker (host only): turn order by initiative, rounds, monster HP and conditions.
// Saved on the encounter row (`encounters.combat`). Players' HP and conditions stay in their own
// session_members.live (so each player sees their own); monsters keep theirs here.
import { supabase } from "./cloud";
import { currentHp, type Live } from "./live";
import { splitList } from "./lookup";
import type { EncounterMonster } from "./encounters";
import type { SpellMap } from "./monsterSpells";

export interface Fighter {
  /** A player's session member id, or a random id. */
  id: string;
  kind: "player" | "monster" | "other";
  name: string;
  /** The initiative roll result (d20 + bonus); null = not rolled yet. */
  init: number | null;
  /** Initiative bonus (Dexterity), also breaks ties. */
  bonus: number;
  /** Monsters of the same kind share one roll and act one after another. */
  group?: string;
  ac?: number;
  /** Monsters and others: their HP lives here (players use their sheet). */
  hpMax?: number;
  live?: Live;
  xp?: number;
  /** From the stat block, as written ("fire; bludgeoning … from nonmagical attacks"). */
  resist?: string;
  immune?: string;
  vulnerable?: string;
  /** Taken out of the fight (fled, dismissed). */
  out?: boolean;
  /** A build's spell list (REQUIREMENTS §4.9); missing = the book's. */
  spells?: SpellMap;
  /** Spell slots / daily uses spent, by spell line ("3", "1/day each:darkness"). */
  used?: Record<string, number>;
}

export interface Combat {
  started: boolean;
  round: number;
  /** Index in `fighters` of whose turn it is. */
  turn: number;
  fighters: Fighter[];
}

export interface MonsterDetails {
  dex: number;
  resist?: string;
  immune?: string;
  vulnerable?: string;
}

export const modOf = (score: number) => Math.floor((score - 10) / 2);
export const d20 = (rnd: () => number = Math.random) => 1 + Math.floor(rnd() * 20);
const newId = () => Math.random().toString(36).slice(2, 10);

/** Every monster in the encounter as its own fighter ("Goblin 1", "Goblin 2"), plus the players. */
export function newCombat(monsters: EncounterMonster[], details: Record<string, MonsterDetails | undefined>, players: { id: string; name: string; bonus: number }[]): Combat {
  const fighters: Fighter[] = players.map((p) => ({ id: p.id, kind: "player", name: p.name, init: null, bonus: p.bonus }));
  for (const m of monsters) {
    const d = details[m.slug];
    for (let i = 1; i <= m.count; i++)
      fighters.push({
        id: newId(),
        kind: "monster",
        name: m.count > 1 ? `${m.name} ${i}` : m.name,
        init: null,
        bonus: d ? modOf(d.dex) : 0,
        group: m.slug,
        ac: m.ac,
        hpMax: m.hp ?? 1,
        live: {},
        xp: m.xp,
        resist: d?.resist || undefined,
        immune: d?.immune || undefined,
        vulnerable: d?.vulnerable || undefined,
        ...(m.spells ? { spells: m.spells } : {}),
      });
  }
  return { started: false, round: 0, turn: 0, fighters };
}

/** Someone extra: an NPC, reinforcements, a summoned creature. */
export function extraFighter(name: string, init: number | null, hp: number | undefined, ac: number | undefined): Fighter {
  return { id: newId(), kind: "other", name: name.trim() || "Someone", init, bonus: 0, ac, hpMax: hp && hp > 0 ? hp : undefined, live: {} };
}

/** Roll for every monster (one roll per kind) and anyone else without a number. */
export function rollMonsters(c: Combat, rnd: () => number = Math.random, reroll = false): Combat {
  const groupRoll = new Map<string, number>();
  const fighters = c.fighters.map((f) => {
    if (f.kind === "player" || (f.init != null && (!reroll || f.kind === "other"))) return f;
    const key = f.group ?? f.id;
    if (!groupRoll.has(key)) groupRoll.set(key, d20(rnd) + f.bonus);
    return { ...f, init: groupRoll.get(key)! };
  });
  return { ...c, fighters };
}

/** Roll for players who haven't given a number (when the host rolls for them). */
export const rollPlayers = (c: Combat, rnd: () => number = Math.random): Combat => ({
  ...c,
  fighters: c.fighters.map((f) => (f.kind === "player" && f.init == null ? { ...f, init: d20(rnd) + f.bonus } : f)),
});

const kindRank = { player: 0, other: 1, monster: 2 };
/** Highest initiative first; ties: higher bonus, then players before monsters, kinds stay together. */
export function sortFighters(list: Fighter[]): Fighter[] {
  return list
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (b.f.init ?? -99) - (a.f.init ?? -99) || b.f.bonus - a.f.bonus || kindRank[a.f.kind] - kindRank[b.f.kind] || (a.f.group ?? "").localeCompare(b.f.group ?? "") || a.i - b.i)
    .map((x) => x.f);
}

export const hpOf = (f: Fighter) => (f.hpMax ? currentHp(f.live ?? {}, f.hpMax) : null);
/** Down = a monster or extra at 0 HP. Players at 0 HP still get turns (death saves). */
export const isDown = (f: Fighter) => f.kind !== "player" && hpOf(f) === 0;
/** Skipped in the turn order. */
export const skipped = (f: Fighter) => !!f.out || isDown(f);

export const ready = (c: Combat) => c.fighters.filter((f) => !f.out && f.init != null).length;

export function startCombat(c: Combat): Combat {
  const fighters = sortFighters(c.fighters);
  const first = fighters.findIndex((f) => !skipped(f));
  return { ...c, started: true, round: 1, turn: Math.max(0, first), fighters };
}

/** The next fighter who can act; past the end, a new round. */
export function nextTurn(c: Combat): Combat {
  const n = c.fighters.length;
  if (!n || c.fighters.every(skipped)) return c;
  let i = c.turn;
  let round = c.round;
  do {
    i++;
    if (i >= n) {
      i = 0;
      round++;
    }
  } while (skipped(c.fighters[i]));
  return { ...c, turn: i, round };
}

/** Undo a "Next turn" pressed by mistake. */
export function prevTurn(c: Combat): Combat {
  const n = c.fighters.length;
  if (!n || c.fighters.every(skipped)) return c;
  let i = c.turn;
  let round = c.round;
  do {
    i--;
    if (i < 0) {
      if (round <= 1) return c;
      i = n - 1;
      round--;
    }
  } while (skipped(c.fighters[i]));
  return { ...c, turn: i, round };
}

/** Change one fighter; the order is re-sorted if the initiative changed, keeping whose turn it is. */
export function updateFighter(c: Combat, id: string, change: (f: Fighter) => Fighter): Combat {
  const current = c.fighters[c.turn]?.id;
  let fighters = c.fighters.map((f) => (f.id === id ? change(f) : f));
  const before = c.fighters.find((f) => f.id === id);
  const after = fighters.find((f) => f.id === id);
  if (c.started && before && after && before.init !== after.init) fighters = sortFighters(fighters);
  let turn = Math.max(0, fighters.findIndex((f) => f.id === current));
  // If it was this fighter's turn and they're now out or down, move on.
  const next = { ...c, fighters, turn };
  if (c.started && fighters[turn] && skipped(fighters[turn]) && !fighters.every(skipped)) return nextTurn(next);
  return next;
}

export const addFighter = (c: Combat, f: Fighter): Combat => {
  if (!c.started) return { ...c, fighters: [...c.fighters, f] };
  const current = c.fighters[c.turn]?.id;
  const fighters = sortFighters([...c.fighters, f]);
  return { ...c, fighters, turn: Math.max(0, fighters.findIndex((x) => x.id === current)) };
};

/** Every monster still standing is down or gone. */
export const monstersBeaten = (c: Combat) => c.fighters.some((f) => f.kind === "monster") && c.fighters.filter((f) => f.kind === "monster").every((f) => f.out || isDown(f));

/** XP for the monsters brought to 0 HP, and per player. */
export function xpEarned(c: Combat, players: number): { total: number; each: number; defeated: { name: string; count: number }[] } {
  const beaten = c.fighters.filter((f) => f.kind === "monster" && isDown(f));
  const total = beaten.reduce((n, f) => n + (f.xp ?? 0), 0);
  const byName = new Map<string, number>();
  for (const f of beaten) {
    const base = f.name.replace(/ \d+$/, "");
    byName.set(base, (byName.get(base) ?? 0) + 1);
  }
  return { total, each: players ? Math.floor(total / players) : total, defeated: [...byName].map(([name, count]) => ({ name, count })) };
}

export type DamageRule = { kind: "immune" | "resist" | "vulnerable"; conditional: boolean; text: string } | null;

/**
 * Does this monster ignore, halve or double this damage type? `conditional` when the stat block
 * adds a condition ("…from nonmagical attacks"), so the host decides.
 */
export function damageRule(f: Fighter, type: string): DamageRule {
  const t = type.toLowerCase();
  for (const [kind, text] of [
    ["immune", f.immune],
    ["resist", f.resist],
    ["vulnerable", f.vulnerable],
  ] as const) {
    for (const entry of splitList(text ?? "")) {
      const e = entry.toLowerCase();
      if (e === t) return { kind, conditional: false, text: entry };
      if (new RegExp(`\\b${t}\\b`).test(e)) return { kind, conditional: true, text: entry };
    }
  }
  return null;
}

/** The DC to keep concentrating after taking this much damage. */
export const concentrationDc = (damage: number) => Math.max(10, Math.floor(damage / 2));

// ---------- saving ----------

export async function saveCombat(encounterId: string, combat: Combat | null): Promise<void> {
  const { error } = await supabase.from("encounters").update({ combat }).eq("id", encounterId);
  if (error) throw error;
}
