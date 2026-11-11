// "What changes" between two versions of a character: used for hover previews (race, background,
// equipment…) and for the "Just changed" note after any pick. Both sides come from deriveCharacter,
// so the preview is exactly what the sheet will show.
import { ABILITIES, ABILITY_NAMES, skillName } from "./data/core";
import type { Character } from "./character";
import { deriveCharacter, type Derived } from "./derive";
import type { ChangeLine } from "../types";

const sg = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function diffDerived(a: Derived, b: Derived, opts: { abilities?: boolean } = {}): ChangeLine[] {
  const out: ChangeLine[] = [];
  const num = (label: string, x: number, y: number, fmt: (v: number) => string = String, higherIsBetter = true) => {
    if (x === y) return;
    out.push({ label, from: fmt(x), to: fmt(y), tone: (y > x) === higherIsBetter ? "up" : "down" });
  };
  if (opts.abilities !== false) for (const ab of ABILITIES) num(ABILITY_NAMES[ab], a.scores[ab], b.scores[ab]);
  num("Hit points", a.hpMax, b.hpMax);
  num("Armor Class", a.ac, b.ac);
  num("Initiative", a.initiative, b.initiative, sg);
  num("Speed", a.speed, b.speed, (v) => `${v} ft`);
  if (a.darkvision !== b.darkvision) out.push({ label: "Darkvision", from: a.darkvision ? `${a.darkvision} ft` : "none", to: b.darkvision ? `${b.darkvision} ft` : "none", tone: b.darkvision > a.darkvision ? "up" : "down" });
  if (a.caster || b.caster) {
    num("Spell save DC", a.spellDc, b.spellDc);
    num("Spell attack", a.spellAttack, b.spellAttack, sg);
    num("Cantrips known", a.cantripLimit, b.cantripLimit);
    num(b.spellsKind === "Prepared" ? "Spells prepared" : "Spells known", a.preparedLimit, b.preparedLimit);
  }
  num("Passive Perception", a.passivePerception, b.passivePerception);
  // Proficiencies
  for (const s of b.skills) {
    const was = a.skills.find((x) => x.id === s.id)!;
    if (s.proficient && !was.proficient) out.push({ label: `New skill: ${skillName(s.id)}`, tone: "up" });
    else if (!s.proficient && was.proficient) out.push({ label: `Lose skill: ${skillName(s.id)}`, tone: "down" });
    if (s.expert && !was.expert) out.push({ label: `Expertise: ${skillName(s.id)}`, tone: "up" });
  }
  for (const s of b.saves) if (s.proficient && !a.saves.find((x) => x.ability === s.ability)!.proficient) out.push({ label: `Proficient in ${ABILITY_NAMES[s.ability]} saves`, tone: "up" });
  for (const r of b.resistances) if (!a.resistances.includes(r)) out.push({ label: `Resistance: ${r}`, tone: "up" });
  for (const r of a.resistances) if (!b.resistances.includes(r)) out.push({ label: `Lose resistance: ${r}`, tone: "down" });
  // Attacks
  for (const at of b.attacks) {
    const was = a.attacks.find((x) => x.name === at.name);
    if (!was) out.push({ label: `New attack: ${at.name}`, to: `${at.bonus} · ${at.damage}`, tone: "up" });
    else if (was.bonus !== at.bonus || was.damage !== at.damage) out.push({ label: at.name, from: `${was.bonus} · ${was.damage}`, to: `${at.bonus} · ${at.damage}`, tone: "info" });
  }
  for (const at of a.attacks) if (!b.attacks.some((x) => x.name === at.name)) out.push({ label: `Lose attack: ${at.name}`, tone: "down" });
  // New things to sort out (e.g. a skill you already had: pick another)
  const before = new Set(a.warnings.map((w) => w.text));
  for (const w of b.warnings) if (w.level !== "info" && !before.has(w.text) && !/^Choose a (race|background)\.?$/.test(w.text)) out.push({ label: w.text, tone: "info" });
  return out;
}

/** Derive the character with a patch applied (a hovered option). */
export const deriveWith = (c: Character, patch: Partial<Character>, books: string[]) => deriveCharacter({ ...c, ...patch }, books);

/** Is this ability one of the class's best (its first recommended ability)? */
export const mainAbility = (d: Derived) => d.cls.recommended[0];
