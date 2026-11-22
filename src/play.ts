// The player's own in-play tracker (user, 2026-11-22): current / temporary HP, conditions,
// exhaustion, concentration, death saves and spent hit dice. Private to the player: kept in the
// character's data as `play` and never copied into sessions (sessions.ts `sessionData`), where the
// DM keeps the session's own state (live.ts, D3). Rules: Player's Handbook, pages 196–198 (damage,
// dropping to 0, death saves, instant death) and 186 (short and long rests, Hit Dice).
import { concentrationDc } from "./combat";
import { applyDamage, applyHealing, currentHp, setTemp, type Live } from "./live";

export interface PlayState extends Live {
  /** The spell being concentrated on. */
  conc?: string;
  /** Death saving throws so far (reset when you regain HP or become stable). */
  saves?: { ok: number; fail: number };
  /** Stable at 0 HP (three successes). */
  stable?: boolean;
  /** Hit Dice spent since they last came back. */
  hdUsed?: number;
}

export interface PlayResult {
  play: PlayState;
  /** Plain-words notes to show ("Concentration: Constitution save, DC 10"). */
  notes: string[];
}

const withCondition = (p: PlayState, id: string, on: boolean): PlayState => {
  const has = p.conditions?.includes(id);
  if (on === !!has) return p;
  const conditions = on ? [...(p.conditions ?? []), id] : (p.conditions ?? []).filter((x) => x !== id);
  return { ...p, conditions: conditions.length ? conditions : undefined };
};
const clean = (p: PlayState): PlayState => {
  const out: PlayState = { ...p };
  for (const k of Object.keys(out) as (keyof PlayState)[]) if (out[k] === undefined) delete out[k];
  return out;
};

/** Take damage (after resistance: `halve` / `double`). Handles 0 HP, death saves and concentration. */
export function takeDamage(p: PlayState, max: number, amount: number, type: string, halve = false, double = false, crit = false): PlayResult {
  const notes: string[] = [];
  const before = currentHp(p, max);
  const dealt = Math.max(0, Math.floor(halve ? amount / 2 : double ? amount * 2 : amount));
  let next: PlayState = applyDamage(p, max, amount, type || "Untyped", halve, double);
  if (!dealt) return { play: next, notes };
  if (before === 0) {
    // Damage at 0 HP: a failed death save (two on a critical hit); as much as your max: dead.
    if (dealt >= max) notes.push("That much damage at 0 HP is instant death.");
    const fail = Math.min(3, (p.saves?.fail ?? 0) + (crit ? 2 : 1));
    next = { ...next, stable: undefined, saves: { ok: p.saves?.ok ?? 0, fail } };
    notes.push(fail >= 3 ? "Three failed death saves: your character dies." : `Damage at 0 HP counts as ${crit ? "two failed death saves" : "a failed death save"}.`);
    return { play: clean(next), notes };
  }
  const fromTemp = Math.min(p.temp ?? 0, dealt);
  const left = dealt - fromTemp - before;
  if (currentHp(next, max) === 0) {
    if (left >= max) notes.push(`${left} damage was left over after 0 HP, as much as your maximum: instant death.`);
    else notes.push("You drop to 0 HP and fall unconscious. Roll a death save at the start of each of your turns.");
    next = withCondition({ ...next, saves: { ok: 0, fail: 0 }, stable: undefined }, "unconscious", true);
    if (p.conc) {
      notes.push(`Your concentration on ${p.conc} ends.`);
      next = { ...next, conc: undefined };
    }
  } else if (p.conc) notes.push(`Concentrating on ${p.conc}: make a Constitution save, DC ${concentrationDc(dealt)}, or it ends.`);
  return { play: clean(next), notes };
}

/** Regain HP. Coming back from 0 ends unconsciousness and clears the death saves. */
export function heal(p: PlayState, max: number, amount: number): PlayResult {
  const wasDown = currentHp(p, max) === 0;
  let next: PlayState = applyHealing(p, max, amount);
  if (wasDown && amount > 0) next = withCondition({ ...next, saves: undefined, stable: undefined }, "unconscious", false);
  return { play: clean(next), notes: wasDown && amount > 0 ? ["You're back up: no longer unconscious."] : [] };
}

export const setTempHp = (p: PlayState, n: number): PlayState => clean(setTemp(p, n));

/** One death saving throw from the d20 face: 20 = 1 HP back; 1 = two failures; 10+ success. */
export function deathSave(p: PlayState, max: number, face: number): PlayResult {
  if (face === 20) {
    const r = heal(p, max, 1);
    return { play: r.play, notes: ["Natural 20: you regain 1 HP and wake up."] };
  }
  const s = p.saves ?? { ok: 0, fail: 0 };
  const saves = face === 1 ? { ...s, fail: Math.min(3, s.fail + 2) } : face >= 10 ? { ...s, ok: Math.min(3, s.ok + 1) } : { ...s, fail: Math.min(3, s.fail + 1) };
  if (saves.ok >= 3) return { play: clean({ ...p, saves: undefined, stable: true }), notes: ["Three successes: you're stable. You stay unconscious at 0 HP and regain 1 HP after 1d4 hours."] };
  if (saves.fail >= 3) return { play: clean({ ...p, saves }), notes: ["Three failures: your character dies."] };
  return { play: clean({ ...p, saves }), notes: [face === 1 ? "Natural 1: two failures." : face >= 10 ? "Success." : "Failure."] };
}

/** Spend one Hit Die on a short rest: heal the rolled amount (die + CON, at least 0). */
export function spendHitDie(p: PlayState, max: number, healed: number, total: number): PlayResult {
  if ((p.hdUsed ?? 0) >= total) return { play: p, notes: ["No Hit Dice left. A long rest brings back half of them."] };
  const r = heal({ ...p, hdUsed: (p.hdUsed ?? 0) + 1 }, max, Math.max(0, healed));
  return { play: r.play, notes: [`Healed ${Math.max(0, healed)}.`, ...r.notes] };
}

// The 2014 Player's Handbook says a long rest brings back half your Hit Dice; at level 1 that rounds
// to none, so at least one comes back (as in the book's later printings).
export const hitDiceBack = (total: number) => Math.max(1, Math.floor(total / 2));

/**
 * A long rest: all HP back, temporary HP gone, half the Hit Dice back. Exhaustion is only suggested
 * (one level less if you ate and drank), never lowered for you (user, 2026-11-22).
 */
export function longRest(p: PlayState, totalHitDice: number): PlayResult {
  const notes: string[] = ["All hit points back."];
  const used = Math.max(0, (p.hdUsed ?? 0) - hitDiceBack(totalHitDice));
  if (p.hdUsed) notes.push(`${(p.hdUsed ?? 0) - used} Hit ${(p.hdUsed ?? 0) - used === 1 ? "Die" : "Dice"} back.`);
  if (p.exhaustion) notes.push(`If you ate and drank, lower your exhaustion by one level (to ${p.exhaustion - 1}) with the − button.`);
  let next: PlayState = { ...p, hp: undefined, temp: undefined, saves: undefined, stable: undefined, hdUsed: used || undefined };
  next = withCondition(next, "unconscious", false);
  return { play: clean(next), notes };
}

export const toggleCond = (p: PlayState, id: string): PlayState => clean(withCondition(p, id, !p.conditions?.includes(id)));
export const setConc = (p: PlayState, spell: string): PlayState => clean({ ...p, conc: spell.trim() || undefined });
export const setExh = (p: PlayState, n: number): PlayState => clean({ ...p, exhaustion: Math.max(0, Math.min(6, n)) || undefined });
