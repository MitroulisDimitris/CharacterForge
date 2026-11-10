// Core rules vocabulary shared by every data file.

export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_NAMES: Record<Ability, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

export type AbilityScores = Record<Ability, number>;

export const SKILLS = [
  { id: "acrobatics", name: "Acrobatics", ability: "DEX" },
  { id: "animalHandling", name: "Animal Handling", ability: "WIS" },
  { id: "arcana", name: "Arcana", ability: "INT" },
  { id: "athletics", name: "Athletics", ability: "STR" },
  { id: "deception", name: "Deception", ability: "CHA" },
  { id: "history", name: "History", ability: "INT" },
  { id: "insight", name: "Insight", ability: "WIS" },
  { id: "intimidation", name: "Intimidation", ability: "CHA" },
  { id: "investigation", name: "Investigation", ability: "INT" },
  { id: "medicine", name: "Medicine", ability: "WIS" },
  { id: "nature", name: "Nature", ability: "INT" },
  { id: "perception", name: "Perception", ability: "WIS" },
  { id: "performance", name: "Performance", ability: "CHA" },
  { id: "persuasion", name: "Persuasion", ability: "CHA" },
  { id: "religion", name: "Religion", ability: "INT" },
  { id: "sleightOfHand", name: "Sleight of Hand", ability: "DEX" },
  { id: "stealth", name: "Stealth", ability: "DEX" },
  { id: "survival", name: "Survival", ability: "WIS" },
] as const satisfies readonly { id: string; name: string; ability: Ability }[];

export type SkillId = (typeof SKILLS)[number]["id"];
export const SKILL_IDS = SKILLS.map((s) => s.id) as SkillId[];
export const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)!.name;

export const STANDARD_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
];
export const RARE_LANGUAGES = [
  "Abyssal",
  "Celestial",
  "Deep Speech",
  "Druidic",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Thieves' Cant",
  "Undercommon",
];

export const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
] as const;

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const profBonus = (level: number) => 2 + Math.floor((level - 1) / 4);

/** A feature or trait shown on the sheet. Text is a short summary in our own words. */
export interface Feature {
  name: string;
  source: string;
  text: string;
  /** e.g. "2 / Long Rest" */
  uses?: string;
}

/** A spell granted outside the class's prepared list (always prepared / innate). */
export interface GrantedSpell {
  spell: string;
  minLevel: number;
  /** Shown in the spell table's Source column. */
  source: string;
  /** Innate casting note, e.g. "1 / Long Rest without a slot" */
  note?: string;
}
