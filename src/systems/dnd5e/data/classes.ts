// The shape every class shares, so the engine can handle any class. The Sorcerer tables
// (2014 and 2024) are adapted into it here; the other 2014 classes live in data2014/classes.ts.
import type { Ability, AbilityScores, SkillId } from "./core";
import type { ArmorCategory, KitItem } from "./equipment";
import type { LevelFeature, Metamagic, SorcererTable, Subclass } from "./sorcerer";

export type WeaponPool = "simple" | "martial" | "simpleMelee" | "martialMelee" | "instrument";

export interface EquipOption {
  label: string;
  items: KitItem[];
  /** "Any simple weapon" etc.: the player picks `count` items from the pool. */
  pick?: { pool: WeaponPool; count: number };
  /** Only if proficient (e.g. the cleric's warhammer and chain mail). */
  needs?: "martial" | "heavy";
}

export interface EquipChoice {
  id: string;
  options: EquipOption[];
}

export interface SpellConfig {
  ability: Ability;
  /** How the class keeps its spells. */
  label: "Known" | "Prepared";
  /** Class spell list id. */
  list: string;
  /** Cantrips known, index = level. */
  cantrips: number[];
  /** Fixed count of known/prepared spells, index = level. */
  table?: number[];
  /** Prepared = ability modifier + level ("full") or half level ("half"), minimum 1. */
  formula?: "full" | "half";
  /** Spell slots by level, index = level; each entry lists slots per spell level. */
  slots: number[][];
  /** Warlock Pact Magic: all slots are of the highest level and refill on a short rest. */
  pact?: boolean;
  /** Wizard: spells in the spellbook, index = level. */
  spellbook?: number[];
  focus: string;
  /** First level with spellcasting. */
  startLevel: number;
}

export type LevelOneChoice = "favoredEnemy" | "naturalExplorer";

export interface ClassDef {
  id: string;
  name: string;
  book: string;
  /** One line in plain words. */
  summary: string;
  /** What to raise first, in plain words. */
  primary: string;
  /** Standard array placement suggestion: abilities from highest to lowest. */
  recommended: Ability[];
  hitDie: number;
  saves: Ability[];
  armor: ArmorCategory[];
  weapons: { simple?: boolean; martial?: boolean; list?: string[] };
  weaponText: string;
  tools: string[];
  toolChoice?: { count: number; pool: "instrument" | "artisanOrInstrument" | "artisan"; label: string };
  skills: { count: number; from: SkillId[] | "any" };
  features: LevelFeature[];
  subclassLevel: number;
  subclassLabel: string;
  subclasses: Subclass[];
  spell?: SpellConfig;
  sorcery?: { points: number[]; metamagicKnown: number[]; metamagicLevel: number; metamagic: Metamagic[] };
  equipment: { choices: EquipChoice[]; fixed: KitItem[] };
  /** Starting gold instead of the kit: dice d4 × mult GP. */
  gold: { dice: number; mult: number };
  unarmored?: { ac: (s: AbilityScores) => number; note: string; shieldOk: boolean };
  /** Languages the class teaches (Druidic, Thieves' Cant). */
  languages?: string[];
  /** Ranger level-1 choices. */
  choices?: LevelOneChoice[];
  /** Fighting Style: the level it comes at, and which styles the class may take (all if omitted). */
  fightingStyle?: { level: number; styles?: string[] };
  /** Expertise: level, how many, whether thieves' tools can be picked. */
  expertise?: { level: number; count: number; thieves: boolean };
  /** Warlock: invocations known by level (index = level), and the level of the Pact Boon. */
  invocations?: number[];
  pactBoonLevel?: number;
  /** Artificer: infusions known by level. */
  infusions?: number[];
  /** Extra speed by level (Monk Unarmored Movement, Barbarian Fast Movement). */
  speedBonus?: (level: number, armored: "none" | "light" | "medium" | "heavy", shield: boolean) => number;
  /** Martial Arts die by level (Monk), e.g. "1d4". */
  martialArts?: (level: number) => string;
  /** Highest level this app supports for the class (others come with level-up support). */
  maxLevel: number;
}

export const FULL_CASTER_SLOTS = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2]];

const K = (name: string, qty = 1): KitItem => ({ name, qty });

/** Sorcerer starting equipment (2014 PHB). */
const SORCERER_EQUIPMENT_2014: ClassDef["equipment"] = {
  choices: [
    { id: "weapon", options: [{ label: "Light crossbow and 20 bolts", items: [K("Light Crossbow"), K("Crossbow Bolts", 20)] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
    { id: "focus", options: [{ label: "Component pouch", items: [K("Component Pouch")] }, { label: "Arcane focus", items: [K("Arcane Focus (Crystal)")] }] },
    { id: "pack", options: [{ label: "Dungeoneer's pack", items: [K("Dungeoneer's Pack")] }, { label: "Explorer's pack", items: [K("Explorer's Pack")] }] },
  ],
  fixed: [K("Dagger", 2)],
};

export function sorcererClass(t: SorcererTable, features: LevelFeature[], subclasses: Subclass[], metamagic: Metamagic[], edition: "2014" | "2024"): ClassDef {
  return {
    id: "sorcerer",
    name: "Sorcerer",
    book: edition === "2014" ? "PHB14" : "PHB24",
    summary: "An innate spellcaster whose magic comes from within, shaped with Sorcery Points and Metamagic.",
    primary: "Charisma, then Constitution",
    recommended: ["CHA", "CON", "DEX", "WIS", "INT", "STR"],
    hitDie: t.hitDie,
    saves: [...t.saves],
    armor: [],
    weapons: edition === "2014" ? { list: ["Dagger", "Dart", "Sling", "Quarterstaff", "Light Crossbow"] } : { simple: true },
    weaponText: edition === "2014" ? "Daggers, darts, slings, quarterstaffs, light crossbows" : "Simple weapons",
    tools: [],
    skills: t.skillChoices,
    features,
    subclassLevel: t.subclassLevel,
    subclassLabel: edition === "2014" ? "Sorcerous Origin" : "Sorcerer Subclass",
    subclasses,
    spell: {
      ability: "CHA",
      label: t.spellsKind,
      list: "sorcerer",
      cantrips: t.cantrips,
      table: t.spells,
      slots: t.slots,
      focus: "Arcane focus",
      startLevel: 1,
    },
    sorcery: { points: t.sorceryPoints, metamagicKnown: t.metamagicKnown, metamagicLevel: t.metamagicLevel, metamagic },
    equipment: SORCERER_EQUIPMENT_2014,
    gold: { dice: 3, mult: 10 },
    maxLevel: 5,
  };
}

/** Prepared/known limit at a level. */
export function spellLimit(s: SpellConfig, level: number, abilityMod: number) {
  if (level < s.startLevel) return 0;
  if (s.table) return s.table[level] ?? 0;
  const lv = s.formula === "half" ? Math.floor(level / 2) : level;
  return Math.max(1, abilityMod + lv);
}
