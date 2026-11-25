// Spells that don't affect a monster (feedback 2026-11-23: "this monster is immune to the spell
// Sleep… similarly to any other monster that has immunity to spells"). Every rule is the spell's own
// sentence (Player's Handbook / Xanathar's text, see public/spell-text-2014.json and the SRD file),
// or, for "cond", the book rule that a creature immune to a condition can't be given it (spells
// whose whole effect is that condition). Checked against the monster's type, size, condition
// immunities, Intelligence, languages, hit points and the Shapechanger trait.
import type { Monster } from "./lookup";

type Cond = "charmed" | "frightened" | "paralyzed" | "poisoned" | "prone" | "blinded" | "restrained";
interface Rule {
  spell: string;
  /** XGE: Xanathar's (page from the spell text); otherwise the Player's Handbook. */
  book?: "XGE";
  page?: number;
  /** Creature types the spell doesn't affect. */
  not?: string[];
  /** The only creature types it works on. */
  only?: string[];
  onlySize?: string;
  /** Spell text: creatures immune to this condition aren't affected / succeed automatically. */
  immune?: Cond;
  /** The book's condition rule: the spell's whole effect is this condition. */
  cond?: Cond;
  /** Not affected at this Intelligence or higher (the spell fails). */
  intAtLeast?: number;
  /** Not affected at this Intelligence or lower. */
  intAtMost?: number;
  /** Not affected when it understands no language. */
  noLanguage?: boolean;
  shapechanger?: "succeeds" | "no effect";
  /** No effect above this many hit points. */
  hpAbove?: number;
  /** "Creatures that … are immune to poison automatically succeed" (poison damage or the poisoned condition). */
  poisonImmune?: boolean;
}

const UNDEAD_CONSTRUCT = ["undead", "construct"];
export const SPELL_RULES: Rule[] = [
  { spell: "Sleep", not: ["undead"], immune: "charmed" },
  { spell: "Command", not: ["undead"], noLanguage: true },
  { spell: "Cure Wounds", not: UNDEAD_CONSTRUCT },
  { spell: "Healing Word", not: UNDEAD_CONSTRUCT },
  { spell: "Mass Cure Wounds", not: UNDEAD_CONSTRUCT },
  { spell: "Mass Healing Word", not: UNDEAD_CONSTRUCT },
  { spell: "Prayer of Healing", not: UNDEAD_CONSTRUCT },
  { spell: "Heal", not: UNDEAD_CONSTRUCT },
  { spell: "Mass Heal", not: UNDEAD_CONSTRUCT },
  { spell: "Spare the Dying", not: UNDEAD_CONSTRUCT },
  { spell: "Healing Spirit", book: "XGE", page: 157, not: UNDEAD_CONSTRUCT },
  { spell: "Blight", not: UNDEAD_CONSTRUCT },
  { spell: "Phantasmal Force", not: UNDEAD_CONSTRUCT },
  { spell: "Antilife Shell", not: UNDEAD_CONSTRUCT },
  { spell: "Cause Fear", book: "XGE", page: 151, not: UNDEAD_CONSTRUCT, cond: "frightened" },
  { spell: "Hold Monster", not: ["undead"], cond: "paralyzed" },
  { spell: "Hold Person", only: ["humanoid"], cond: "paralyzed" },
  { spell: "Charm Person", only: ["humanoid"], cond: "charmed" },
  { spell: "Dominate Person", only: ["humanoid"], cond: "charmed" },
  { spell: "Crown of Madness", only: ["humanoid"], cond: "charmed" },
  { spell: "Calm Emotions", only: ["humanoid"] },
  { spell: "Animal Friendship", only: ["beast"], intAtLeast: 4, cond: "charmed" },
  { spell: "Beast Bond", book: "XGE", page: 150, only: ["beast"], intAtLeast: 4 },
  { spell: "Dominate Beast", only: ["beast"], cond: "charmed" },
  { spell: "Animal Messenger", only: ["beast"], onlySize: "Tiny" },
  { spell: "Dominate Monster", cond: "charmed" },
  { spell: "Hypnotic Pattern", cond: "charmed" },
  { spell: "Modify Memory", cond: "charmed" },
  { spell: "Fear", cond: "frightened" },
  { spell: "Weird", cond: "frightened" },
  { spell: "Ensnaring Strike", cond: "restrained" },
  { spell: "Stinking Cloud", poisonImmune: true },
  { spell: "Compulsion", immune: "charmed" },
  { spell: "Enthrall", immune: "charmed" },
  { spell: "Irresistible Dance", immune: "charmed" },
  { spell: "Suggestion", immune: "charmed" },
  { spell: "Mass Suggestion", immune: "charmed" },
  { spell: "Enemies Abound", book: "XGE", page: 155, immune: "frightened" },
  { spell: "Hideous Laughter", intAtMost: 4 },
  { spell: "Tasha's Hideous Laughter", intAtMost: 4 },
  { spell: "Telepathic Bond", intAtMost: 2 },
  { spell: "Detect Thoughts", intAtMost: 3, noLanguage: true },
  { spell: "Geas", noLanguage: true, cond: "charmed" },
  { spell: "Polymorph", shapechanger: "succeeds" },
  { spell: "True Polymorph", shapechanger: "no effect" },
  { spell: "Power Word Kill", hpAbove: 100 },
  { spell: "Power Word Stun", hpAbove: 150 },
];

export interface NoEffect {
  spell: string;
  why: string;
  /** "Player's Handbook" / "Xanathar's Guide to Everything, page 157" */
  ref: string;
}

const plural: Record<string, string> = { undead: "Undead", construct: "Constructs", humanoid: "humanoids", beast: "beasts" };
const lower = (s: string) => s.trim().toLowerCase();
/** "—", "", or nothing: it speaks and understands no language. */
export const noLanguage = (m: Pick<Monster, "languages">) => !m.languages || /^[\s—–-]*$/.test(m.languages);
const isShapechanger = (m: Monster) => /shapechanger/i.test(m.subtype ?? "") || (m.special_abilities ?? []).some((a) => /^shapechanger/i.test(a.name));
const condImmune = (m: Monster, c: Cond) => lower(m.condition_immunities ?? "").includes(c);

/** Why `r` doesn't affect `m` (null: it can). The first reason that applies. */
function why(r: Rule, m: Monster): string | null {
  const type = lower(m.type);
  if (r.not?.includes(type)) return `${plural[type] ?? type} aren't affected.`;
  if (r.only && !r.only.includes(type)) return `Works only on ${r.only.map((t) => plural[t] ?? t).join(" or ")}.`;
  if (r.onlySize && m.size !== r.onlySize) return `Works only on ${r.onlySize} ${r.only?.map((t) => plural[t] ?? t).join(" or ") ?? "creatures"}.`;
  if (r.immune && condImmune(m, r.immune)) return `Creatures immune to being ${r.immune} aren't affected.`;
  if (r.cond && condImmune(m, r.cond)) return `It's immune to being ${r.cond}, the spell's whole effect.`;
  if (r.intAtLeast != null && m.intelligence >= r.intAtLeast) return `Fails on an Intelligence of ${r.intAtLeast} or higher (it has ${m.intelligence}).`;
  if (r.intAtMost != null && m.intelligence <= r.intAtMost) return `No effect on an Intelligence of ${r.intAtMost} or lower (it has ${m.intelligence}).`;
  if (r.noLanguage && noLanguage(m)) return "It understands no language.";
  if (r.shapechanger && isShapechanger(m)) return r.shapechanger === "succeeds" ? "A shapechanger succeeds on the save automatically." : "No effect on a shapechanger.";
  if (r.poisonImmune && (condImmune(m, "poisoned") || /\bpoison\b/i.test(m.damage_immunities ?? ""))) return "Creatures immune to poison succeed on the save automatically.";
  if (r.hpAbove != null && m.hit_points > r.hpAbove) return `No effect above ${r.hpAbove} hit points (it has ${m.hit_points} when unhurt).`;
  return null;
}

/** Spells with no effect on this monster, in the order above (the common ones first). */
export function spellsWithNoEffect(m: Monster): NoEffect[] {
  const out: NoEffect[] = [];
  for (const r of SPELL_RULES) {
    const w = why(r, m);
    if (w) out.push({ spell: r.spell, why: w, ref: r.book === "XGE" ? `Xanathar's Guide to Everything, page ${r.page}` : "Player's Handbook" });
  }
  return out;
}

/** Spells a condition immunity only weakens: the condition is lost, the rest still happens. */
export const PARTLY_RULES: { spell: string; cond: Cond; still: string }[] = [
  { spell: "Wrathful Smite", cond: "frightened", still: "the extra 1d6 psychic damage still lands" },
  { spell: "Phantasmal Killer", cond: "frightened", still: "it still saves against the 4d10 psychic damage each turn" },
  { spell: "Ray of Sickness", cond: "poisoned", still: "the 2d8 poison damage still lands" },
  { spell: "Thunderous Smite", cond: "prone", still: "the extra damage and the 10-foot push still happen" },
  { spell: "Earth Tremor", cond: "prone", still: "the damage still lands" },
  { spell: "Tidal Wave", cond: "prone", still: "the damage still lands" },
  { spell: "Sunbeam", cond: "blinded", still: "the damage still lands" },
  { spell: "Sunburst", cond: "blinded", still: "the damage still lands" },
  { spell: "Black Tentacles", cond: "restrained", still: "the first 3d6 bludgeoning damage still lands" },
  { spell: "Maximilian's Earthen Grasp", cond: "restrained", still: "the first 2d6 bludgeoning damage still lands" },
];

export interface PartlyWorks {
  spell: string;
  /** "It can't be frightened; the extra 1d6 psychic damage still lands." */
  why: string;
}

/** Spells whose condition this monster is immune to, while the rest of the spell still works. */
export function spellsPartly(m: Monster): PartlyWorks[] {
  const none = new Set(spellsWithNoEffect(m).map((x) => x.spell));
  const damageImmune = lower(m.damage_immunities ?? "");
  return PARTLY_RULES.filter((r) => condImmune(m, r.cond) && !none.has(r.spell) && !(r.cond === "poisoned" && /\bpoison\b/.test(damageImmune))).map((r) => ({
    spell: r.spell,
    why: `It can't be ${r.cond === "prone" ? "knocked prone" : r.cond}; ${r.still}.`,
  }));
}
