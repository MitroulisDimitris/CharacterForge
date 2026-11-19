// What a roll is and how its result is worked out (REQUIREMENTS 4.6). No drawing here: the 3D
// table (`engine.ts`) throws the dice and hands back the face each die landed on; this file turns
// those faces into the result window's numbers and lines.

export type Tone = "monster" | "player" | "fire" | "tens";
export type RollKind = "attack" | "check" | "save" | "damage" | "heal" | "recharge" | "free";
export type Advantage = "normal" | "adv" | "dis";

export interface DiceGroup {
  n: number;
  sides: number;
  /** Colour of these dice (fire damage in fire colours); defaults to the roll's tone. */
  tone?: Tone;
}

/** One named part of the bonus ("+ 3 Dexterity", "+ 2 Proficiency"). */
export interface BonusPart {
  label: string;
  value: number;
}

export interface RollSpec {
  /** Shown at the top of the result window ("Dexterity check", "Bite · damage"). */
  label: string;
  kind: RollKind;
  groups: DiceGroup[];
  /** Flat bonus. When `parts` is given, it's their sum. */
  bonus?: number;
  parts?: BonusPart[];
  /** Word after the total ("piercing", "hit points back"). */
  unit?: string;
  /** Advantage / disadvantage on the d20 (attacks, checks, saves). */
  adv?: Advantage;
  /** A d20 at or above this is a critical hit (Champion: 19). */
  critOn?: number;
  /** "Half on a successful save" (damage). */
  half?: boolean;
  /** Recharge: the lowest d6 that recharges it. */
  need?: number;
  tone: "monster" | "player";
}

/** One die the table throws. `group` points back into `spec.groups`. */
export interface DieSpec {
  sides: number;
  group: number;
  /** d100 is thrown as a tens d10 and a units d10. */
  role: "" | "d10" | "tens" | "units";
  tone: Tone;
}

export interface ResultLine {
  k: string;
  v: string;
}

export interface RollResult {
  total: number;
  unit: string;
  /** "Critical hit!", "Natural 1.", "Recharged!"; empty when nothing special happened. */
  note: string;
  /** Gold note and glowing total (critical, natural 20, recharged). */
  gold: boolean;
  lines: ResultLine[];
  /** One more plain sentence ("Hits armour class 17 or lower."). */
  sub: string;
  /** Indexes of dice that don't count (the dropped d20 with advantage). */
  dropped: number[];
}

export const usesD20 = (k: RollKind) => k === "attack" || k === "check" || k === "save";
export const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);
export const bonusOf = (spec: Pick<RollSpec, "bonus" | "parts">) => (spec.parts ? spec.parts.reduce((s, p) => s + p.value, 0) : (spec.bonus ?? 0));

/** The dice to throw for a roll: advantage adds a second d20; d100 becomes tens + units. */
export function diceFor(spec: RollSpec): DieSpec[] {
  const two = usesD20(spec.kind) && (spec.adv === "adv" || spec.adv === "dis");
  const out: DieSpec[] = [];
  spec.groups.forEach((g, gi) => {
    const n = two && g.sides === 20 ? 2 : g.n;
    const tone: Tone = g.tone ?? spec.tone;
    for (let i = 0; i < n; i++) {
      if (g.sides === 100) {
        out.push({ sides: 10, group: gi, role: "tens", tone: "tens" });
        out.push({ sides: 10, group: gi, role: "units", tone });
      } else out.push({ sides: g.sides, group: gi, role: g.sides === 10 ? "d10" : "", tone });
    }
  });
  return out;
}

/** A face as a number: a d10 face "0" is 10; tens/units dice give 0–90 and 0–9. */
export function faceValue(d: DieSpec, face: number): number {
  if (d.role === "tens") return (face % 10) * 10;
  if (d.role === "units") return face % 10;
  return face;
}

/** Work out the result from the faces the dice landed on (same order as `diceFor`). */
export function resultOf(spec: RollSpec, dice: DieSpec[], faces: number[]): RollResult {
  const lines: ResultLine[] = [];
  const dropped: number[] = [];
  const bonus = bonusOf(spec);
  const partLines = () => {
    if (spec.parts) for (const p of spec.parts) if (p.value) lines.push({ k: signed(p.value), v: p.label });
    if (!spec.parts && bonus) lines.push({ k: signed(bonus), v: "Bonus" });
  };
  // Values per group (d100 pairs combined; 00 + 0 is 100).
  const groups = spec.groups.map((g, gi) => {
    const idx = dice.map((d, i) => (d.group === gi ? i : -1)).filter((i) => i >= 0);
    if (g.sides !== 100) return { g, idx, vals: idx.map((i) => faceValue(dice[i], faces[i])) };
    const vals: number[] = [];
    for (let k = 0; k + 1 < idx.length; k += 2) {
      const v = faceValue(dice[idx[k]], faces[idx[k]]) + faceValue(dice[idx[k + 1]], faces[idx[k + 1]]);
      vals.push(v === 0 ? 100 : v);
    }
    return { g, idx, vals };
  });

  let total = 0;
  let note = "";
  let gold = false;
  let sub = "";
  if (usesD20(spec.kind)) {
    const d20 = groups.find((x) => x.g.sides === 20) ?? groups[0];
    let kept = d20.vals[0] ?? 0;
    if (d20.vals.length > 1) {
      const [a, b] = d20.vals;
      kept = spec.adv === "dis" ? Math.min(a, b) : Math.max(a, b);
      const keep = d20.vals.indexOf(kept);
      d20.idx.forEach((di, i) => i !== keep && dropped.push(di));
      lines.push({ k: "2d20", v: `${a} and ${b}, kept ${kept} (${spec.adv === "dis" ? "disadvantage" : "advantage"})` });
    } else lines.push({ k: "d20", v: String(kept) });
    // Other dice on a check (Bless's d4, Guidance) add on top.
    for (const x of groups) if (x !== d20) {
      const sum = x.vals.reduce((s, v) => s + v, 0);
      total += sum;
      lines.push({ k: `${x.vals.length}d${x.g.sides}`, v: x.vals.join(" + ") });
    }
    partLines();
    total += kept + bonus;
    if (spec.kind === "attack") {
      if (kept !== 1) sub = `Hits armour class ${total} or lower.`;
      if (kept >= (spec.critOn ?? 20)) {
        note = kept === 20 ? "Critical hit! Roll the damage dice twice." : `Critical hit on a ${kept}! Roll the damage dice twice.`;
        gold = true;
      } else if (kept === 1) note = "Natural 1: it misses.";
    } else if (kept === 20) {
      note = "Natural 20!";
      gold = true;
    } else if (kept === 1) note = "Natural 1.";
  } else if (spec.kind === "recharge") {
    total = groups[0]?.vals[0] ?? 0;
    const need = spec.need ?? 6;
    if (total >= need) {
      note = "Recharged! It can use it this turn.";
      gold = true;
    } else note = `Not yet. It needs a ${need}${need < 6 ? " or higher" : ""}.`;
  } else {
    for (const x of groups) {
      const sum = x.vals.reduce((s, v) => s + v, 0);
      total += sum;
      lines.push({ k: `${x.vals.length}d${x.g.sides}`, v: x.vals.length > 1 ? `${x.vals.join(" + ")} = ${sum}` : String(sum) });
    }
    partLines();
    total += bonus;
    if (spec.kind === "damage" || spec.kind === "heal") total = Math.max(spec.kind === "damage" ? 1 : 0, total);
    if (spec.half) sub = `Half on a successful save: ${Math.floor(total / 2)}.`;
  }
  return { total, unit: spec.unit ?? "", note, gold, lines, sub, dropped };
}

/** "2d10 + 6", "1d6", "d20", "17d10+85", "2d6 − 1" → dice and a flat bonus. */
export function parseDice(text: string): { groups: DiceGroup[]; bonus: number } | null {
  const t = text.replace(/[−–]/g, "-").replace(/\s+/g, "");
  const m = /^(\d*)d(\d+)((?:[+-]\d*d\d+)*)([+-]\d+)?$/i.exec(t);
  if (!m) return null;
  const groups: DiceGroup[] = [{ n: Number(m[1] || 1), sides: Number(m[2]) }];
  for (const x of m[3].matchAll(/\+(\d*)d(\d+)/gi)) groups.push({ n: Number(x[1] || 1), sides: Number(x[2]) });
  if (/-\d*d/i.test(m[3])) return null;
  if (groups.some((g) => !g.n || ![4, 6, 8, 10, 12, 20, 100].includes(g.sides))) return null;
  return { groups, bonus: m[4] ? Number(m[4]) : 0 };
}

/** A fair face for a die (used when motion is reduced: no physics to decide it). */
export const randomFace = (sides: number, rnd: () => number = Math.random) => 1 + Math.floor(rnd() * sides);
