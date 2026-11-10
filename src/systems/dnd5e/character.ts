// The saved character: only the player's choices. Everything else is derived.
import type { Ability, AbilityScores, SkillId } from "./data/core";
import type { FeatId, MagicInitiateList } from "./data/feats";
import type { Edition } from "./rules";
import { PARRY, clampLevel } from "../parry";

export const SCHEMA_VERSION = 2;

export type AbilityMethod = "standard" | "pointbuy" | "rolled" | "manual";
export type CasterAbility = "INT" | "WIS" | "CHA";

/** Extra picks some feats need. */
export interface FeatChoices {
  skills: SkillId[];
  miList: MagicInitiateList;
  miAbility: CasterAbility;
  miCantrips: [string, string];
  miSpell: string;
  /** Skill Expert / Prodigy: the skill that gets expertise. */
  expertise?: SkillId | "";
  /** Fighting Initiate: the style id. */
  style?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  /** Weight of one item, in lb. */
  weight: number;
  notes?: string;
}

export interface Coins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface Details {
  alignment: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  eyes: string;
  hair: string;
  skin: string;
  faith: string;
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  backstory: string;
  allies: string;
  notes: string;
}

export interface Character {
  schema: number;
  /** Fixed by the game system chosen at creation. */
  edition: Edition;
  name: string;
  playerName: string;
  level: number;
  /** Class id ("sorcerer", "wizard", …). 2024 characters are always Sorcerers. */
  cls: string;
  subclass: string;
  /** Dragon ancestor (2014 Draconic), divine affinity, etc. */
  subclassOption: string;

  hpMethod: "average" | "rolled";
  /** Hit die rolls for levels 2..5 (index 0 = level 2). */
  hpRolls: number[];

  species: string;
  lineage: string;
  size: "Medium" | "Small";
  speciesSpellAbility: CasterAbility;
  speciesSkills: SkillId[];
  /** Species with chosen +1s (Half-Elf, Variant Human): which abilities. */
  legacyAsi: Ability[];
  /** 2014 + Tasha's: move species ability increases freely. */
  customOrigin: boolean;
  /** Abilities receiving the species bonuses, largest bonus first. */
  customAsi: Ability[];
  /** 2014 High Elf extra wizard cantrip. */
  speciesCantrip: string;
  humanFeat: FeatId;
  /** +1 ability for a species feat that grants one (e.g. Resilient, Fey Touched). */
  humanFeatPlusOne: Ability;
  humanFeatChoices: FeatChoices;

  background: string;
  bgAsiMode: "2-1" | "1-1-1";
  bgPlus2: Ability;
  bgPlus1: Ability;
  bgFeatChoices: FeatChoices;

  abilityMethod: AbilityMethod;
  base: AbilityScores;

  level4Feat: FeatId;
  level4AsiMode: "+2" | "+1+1";
  level4A: Ability;
  level4B: Ability;
  level4PlusOne: Ability;
  level4Choices: FeatChoices;

  classSkills: SkillId[];
  languages: string[];
  extraTools: string;

  cantrips: string[];
  prepared: string[];
  /** Wizard: spells copied in the spellbook (prepared ones are a subset). */
  spellbook: string[];
  metamagic: string[];

  // ----- level-1 class choices (2014) -----
  fightingStyle: string;
  /** Rogue Expertise: skill ids, or "thieves" for thieves' tools. */
  expertise: string[];
  favoredEnemy: string;
  favoredTerrain: string;
  /** Ranger: use Tasha's Favored Foe and Deft Explorer instead. */
  rangerTasha: boolean;
  /** Deft Explorer (Canny): skill with expertise. */
  deftExpertise: string;
  /** Instruments / artisan's tools the class lets you pick. */
  classTools: string[];
  /** Skills picked from the subclass (Knowledge, Nature, Order, Peace). */
  subclassSkills: SkillId[];
  /** Cantrip picked through the subclass (Nature domain: a druid cantrip). */
  subclassCantrip: string;
  /** Subclass multi-picks: maneuvers, runes, arcane shots, disciplines. */
  subclassPicks: string[];
  /** Warlock. */
  invocations: string[];
  pactBoon: string;
  /** Pact of the Tome: three cantrips from any list. */
  tomeCantrips: string[];
  /** Artificer infusions known. */
  infusions: string[];
  /** Blessed Warrior / Druidic Warrior fighting style: two cantrips. */
  styleCantrips: string[];

  // ----- custom background (2014 PHB) -----
  bgCustomSkills: SkillId[];
  bgCustomLanguages: number;
  bgCustomTools: string;
  bgCustomFeature: string;

  // ----- starting equipment -----
  equipMode: "kit" | "gold";
  /** Per class equipment choice: option index and any picked items. */
  equipPicks: Record<string, { option: number; picks: string[] }>;
  /** Starting gold rolled (or typed) when taking gold instead of the kit. */
  startGold: number;

  inventory: InventoryItem[];
  coins: Coins;

  details: Details;
}

let idCounter = 0;
export const newId = () => `i${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const emptyFeatChoices = (): FeatChoices => ({
  skills: [],
  miList: "Wizard",
  miAbility: "INT",
  miCantrips: ["", ""],
  miSpell: "",
});

const item = (name: string, qty: number, weight: number): InventoryItem => ({ id: newId(), name, qty, weight });

const PARRY_INVENTORY = (): InventoryItem[] => [
  item("Dagger", 2, 1),
  item("Spear", 1, 3),
  item("Arcane Focus (Crystal)", 1, 1),
  item("Backpack", 1, 5),
  item("Oil (flask)", 2, 1),
  item("Rations (1 day)", 10, 2),
  item("Rope (50 ft)", 1, 5),
  item("Tinderbox", 1, 1),
  item("Torch", 10, 1),
  item("Waterskin", 1, 5),
  item("Caltrops", 20, 0.1),
  item("Crowbar", 1, 5),
];

const parryDetails = (): Details => {
  const { alignment, gender, age, height, weight, eyes, hair, skin, faith, personality, ideals, bonds, flaws, appearance, backstory, allies, notes } = PARRY;
  return { alignment, gender, age, height, weight, eyes, hair, skin, faith, personality, ideals, bonds, flaws, appearance, backstory, allies, notes };
};

const emptyDetails = (): Details => ({
  alignment: "",
  gender: "",
  age: "",
  height: "",
  weight: "",
  eyes: "",
  hair: "",
  skin: "",
  faith: "",
  personality: "",
  ideals: "",
  bonds: "",
  flaws: "",
  appearance: "",
  backstory: "",
  allies: "",
  notes: "",
});

/** A level 1 character with nothing chosen yet. */
export function blankCharacter(edition: Edition): Character {
  return {
    schema: SCHEMA_VERSION,
    edition,
    name: "New Sorcerer",
    playerName: "",
    level: 1,
    cls: "sorcerer",
    subclass: "draconic",
    subclassOption: "",
    hpMethod: "average",
    hpRolls: [4, 4, 4, 4],
    species: edition === "2014" ? "human14" : "human",
    lineage: "",
    size: "Medium",
    speciesSpellAbility: "CHA",
    speciesSkills: [],
    legacyAsi: [],
    customOrigin: false,
    customAsi: [],
    speciesCantrip: "",
    humanFeat: "alert",
    humanFeatPlusOne: "CHA",
    humanFeatChoices: emptyFeatChoices(),
    background: edition === "2014" ? "acolyte14" : "acolyte",
    bgAsiMode: "2-1",
    bgPlus2: "CHA",
    bgPlus1: "WIS",
    bgFeatChoices: emptyFeatChoices(),
    abilityMethod: "standard",
    base: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 15 },
    level4Feat: "asi",
    level4AsiMode: "+2",
    level4A: "CHA",
    level4B: "CON",
    level4PlusOne: "CHA",
    level4Choices: emptyFeatChoices(),
    classSkills: [],
    languages: ["Common"],
    extraTools: "",
    cantrips: [],
    prepared: [],
    spellbook: [],
    metamagic: [],
    fightingStyle: "",
    expertise: [],
    favoredEnemy: "",
    favoredTerrain: "",
    rangerTasha: false,
    deftExpertise: "",
    classTools: [],
    subclassSkills: [],
    subclassCantrip: "",
    subclassPicks: [],
    invocations: [],
    pactBoon: "",
    tomeCantrips: [],
    infusions: [],
    styleCantrips: [],
    bgCustomSkills: [],
    bgCustomLanguages: 2,
    bgCustomTools: "",
    bgCustomFeature: "",
    equipMode: "kit",
    equipPicks: {},
    startGold: 0,
    inventory: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    details: emptyDetails(),
  };
}

/** Parry Hotter, the level 5 version from the corrected sheet (2024 rules). */
export function defaultCharacter(): Character {
  return {
    ...blankCharacter("2024"),
    name: PARRY.name,
    playerName: PARRY.playerName,
    level: 5,
    subclass: "draconic",
    species: "halfElf",
    speciesSkills: ["perception", "sleightOfHand"],
    legacyAsi: ["STR", "CON"],
    background: "criminalSpy2014",
    bgPlus2: "DEX",
    bgPlus1: "CON",
    abilityMethod: "rolled",
    base: { STR: 12, DEX: 14, CON: 12, INT: 14, WIS: 12, CHA: 16 },
    classSkills: ["insight", "persuasion"],
    languages: ["Common", "Elvish", "Celestial"],
    cantrips: ["Fire Bolt", "Minor Illusion", "Shocking Grasp", "Mage Hand", "Chill Touch"],
    prepared: ["Shield", "Magic Missile", "Invisibility", "Suggestion", "Misty Step", "Hold Person", "Fireball", "Counterspell", "Melf's Minute Meteors"],
    metamagic: ["quickened", "twinned"],
    inventory: PARRY_INVENTORY(),
    details: parryDetails(),
  };
}

/** Parry under the 2014 rules: Half-Elf, Criminal (Spy), Draconic Bloodline (green dragon). */
export function parry2014(): Character {
  return {
    ...defaultCharacter(),
    edition: "2014",
    subclass: "draconic",
    subclassOption: "green",
    background: "criminalSpy2014",
    languages: ["Common", "Elvish", "Celestial", "Draconic"],
    prepared: ["Shield", "Magic Missile", "Misty Step", "Hold Person", "Fireball", "Counterspell"],
  };
}

/** A 2014 character built from scratch: nothing chosen yet (the creation steps fill it in). */
export function freshCharacter2014(): Character {
  return {
    ...blankCharacter("2014"),
    name: "",
    cls: "",
    subclass: "",
    species: "",
    background: "",
    abilityMethod: "standard",
    base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    languages: ["Common"],
  };
}

/** Fill in any fields missing from an older or hand-edited save. */
export function normalizeCharacter(raw: unknown, edition: Edition = "2024"): Character {
  const d = edition === "2014" ? parry2014() : defaultCharacter();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<Character>;
  return {
    ...d,
    ...r,
    edition,
    base: { ...d.base, ...(r.base ?? {}) },
    coins: { ...d.coins, ...(r.coins ?? {}) },
    details: { ...d.details, ...(r.details ?? {}) },
    humanFeatChoices: { ...emptyFeatChoices(), ...(r.humanFeatChoices ?? {}) },
    bgFeatChoices: { ...emptyFeatChoices(), ...(r.bgFeatChoices ?? {}) },
    level4Choices: { ...emptyFeatChoices(), ...(r.level4Choices ?? {}) },
    cls: edition === "2024" ? "sorcerer" : typeof r.cls === "string" ? r.cls : "sorcerer",
    equipPicks: r.equipPicks && typeof r.equipPicks === "object" ? r.equipPicks : {},
    inventory: Array.isArray(r.inventory) ? r.inventory.map((i) => ({ ...i, id: i.id || newId() })) : d.inventory,
    level: clampLevel(r.level, 5, d.level),
    schema: SCHEMA_VERSION,
  };
}

export type SetChar = (patch: Partial<Character>) => void;
