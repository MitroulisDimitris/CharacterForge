// A D&D 3.5 Sorcerer: only the player's choices.
import type { Ability, AbilityScores } from "../dnd5e/data/core";
import { PARRY, clampLevel } from "../parry";

export interface FeatPick {
  id: string;
  /** Skill id or school, for Skill Focus / Spell Focus. */
  choice: string;
}

export interface Item35 {
  id: string;
  name: string;
  qty: number;
  weight: number;
}

export interface Character35 {
  schema: 1;
  name: string;
  playerName: string;
  level: number;
  race: string;
  abilityMethod: "rolled" | "pointbuy" | "elite" | "manual";
  pointBuyTotal: number;
  base: AbilityScores;
  /** +1 at 4th level. */
  level4Ability: Ability;
  hpMethod: "average" | "rolled";
  /** d4 rolls for levels 2..5. */
  hpRolls: number[];
  /** Skill points spent per skill (cross-class skills buy half a rank per point). */
  skillPoints: Record<string, number>;
  craftName: string;
  performName: string;
  professionName: string;
  feat1: FeatPick;
  featHuman: FeatPick;
  feat3: FeatPick;
  familiar: string;
  spellsKnown: string[];
  languages: string[];
  inventory: Item35[];
  coins: { cp: number; sp: number; gp: number; pp: number };
  details: {
    alignment: string;
    deity: string;
    gender: string;
    age: string;
    height: string;
    weight: string;
    eyes: string;
    hair: string;
    skin: string;
    personality: string;
    backstory: string;
    allies: string;
    notes: string;
  };
}

let n = 0;
export const newItemId = () => `j${Date.now().toString(36)}${(n++).toString(36)}`;
const item = (name: string, qty: number, weight: number): Item35 => ({ id: newItemId(), name, qty, weight });
const noFeat = (): FeatPick => ({ id: "", choice: "" });

export function blank35(): Character35 {
  return {
    schema: 1,
    name: "New Sorcerer",
    playerName: "",
    level: 1,
    race: "human35",
    abilityMethod: "elite",
    pointBuyTotal: 25,
    base: { STR: 8, DEX: 13, CON: 14, INT: 12, WIS: 10, CHA: 15 },
    level4Ability: "CHA",
    hpMethod: "average",
    hpRolls: [3, 3, 3, 3],
    skillPoints: {},
    craftName: "",
    performName: "",
    professionName: "",
    feat1: noFeat(),
    featHuman: noFeat(),
    feat3: noFeat(),
    familiar: "",
    spellsKnown: [],
    languages: ["Common"],
    inventory: [],
    coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    details: { alignment: "", deity: "", gender: "", age: "", height: "", weight: "", eyes: "", hair: "", skin: "", personality: "", backstory: "", allies: "", notes: "" },
  };
}

/** Parry Hotter as a 3.5 Half-Elf Sorcerer 5 (core rules have no draconic bloodline). */
export function parry35(): Character35 {
  return {
    ...blank35(),
    name: PARRY.name,
    playerName: PARRY.playerName,
    level: 5,
    race: "halfElf35",
    abilityMethod: "rolled",
    base: { STR: 12, DEX: 14, CON: 13, INT: 14, WIS: 12, CHA: 17 },
    level4Ability: "CHA",
    skillPoints: { bluff: 8, concentration: 8, spellcraft: 6, knowledgeArcana: 4, sleightOfHand: 4, moveSilently: 2 },
    feat1: { id: "improvedInitiative", choice: "" },
    feat3: { id: "spellFocus", choice: "Enchantment" },
    spellsKnown: ["Acid Splash", "Ray of Frost", "Prestidigitation", "Mage Hand", "Ghost Sound", "Daze", "Magic Missile", "Shield", "Charm Person", "Sleep", "Invisibility", "Scorching Ray"],
    languages: ["Common", "Elven", "Celestial", "Draconic"],
    inventory: [
      item("Dagger", 2, 1),
      item("Shortspear", 1, 3),
      item("Spell component pouch", 1, 2),
      item("Backpack", 1, 2),
      item("Oil (1-pint flask)", 2, 1),
      item("Trail rations (per day)", 10, 1),
      item("Rope, hemp (50 ft)", 1, 10),
      item("Flint and steel", 1, 0),
      item("Torch", 10, 1),
      item("Waterskin", 1, 4),
      item("Caltrops", 1, 2),
      item("Crowbar", 1, 5),
    ],
    details: {
      alignment: PARRY.alignment,
      deity: PARRY.faith,
      gender: PARRY.gender,
      age: PARRY.age,
      height: PARRY.height,
      weight: PARRY.weight,
      eyes: PARRY.eyes,
      hair: PARRY.hair,
      skin: PARRY.skin,
      personality: [PARRY.personality, PARRY.ideals, PARRY.bonds, PARRY.flaws].join("\n"),
      backstory: PARRY.backstory,
      allies: PARRY.allies,
      notes: PARRY.notes,
    },
  };
}

export function normalize35(raw: unknown): Character35 {
  const d = parry35();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<Character35>;
  return {
    ...d,
    ...r,
    schema: 1,
    base: { ...d.base, ...(r.base ?? {}) },
    coins: { ...d.coins, ...(r.coins ?? {}) },
    details: { ...d.details, ...(r.details ?? {}) },
    skillPoints: { ...(r.skillPoints ?? d.skillPoints) },
    feat1: { ...noFeat(), ...(r.feat1 ?? {}) },
    featHuman: { ...noFeat(), ...(r.featHuman ?? {}) },
    feat3: { ...noFeat(), ...(r.feat3 ?? {}) },
    inventory: Array.isArray(r.inventory) ? r.inventory.map((i) => ({ ...i, id: i.id || newItemId() })) : d.inventory,
    level: clampLevel(r.level, 5, d.level),
  };
}
