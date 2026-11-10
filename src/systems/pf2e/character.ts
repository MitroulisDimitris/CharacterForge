// A Pathfinder 2e (Remaster) Sorcerer: only the player's choices.
import { PARRY, clampLevel } from "../parry";
import type { Attr } from "./data";

export interface ItemPF2 {
  id: string;
  name: string;
  qty: number;
  /** Bulk of one item (L = 0.1). */
  bulk: number;
}

export interface CharacterPF2 {
  schema: 1;
  name: string;
  playerName: string;
  level: number;
  ancestry: string;
  /** Ancestry heritage id or versatile heritage id. */
  heritage: string;
  /** Take two free boosts (and no flaw) instead of the ancestry's normal boosts. */
  altBoosts: boolean;
  ancestryFree: Attr[];
  heritageSkill: string;
  heritageFeat: string;
  background: string;
  bgBoost: Attr;
  bgFree: Attr;
  bgSkill: string;
  bgLore: string;
  boosts1: Attr[];
  boosts5: Attr[];
  bloodline: string;
  bloodlineOption: string;
  classSkills: string[];
  skillIncrease3: string;
  skillIncrease5: string;
  cantrips: string[];
  spells: string[];
  signature: string[];
  ancestryFeat1: string;
  ancestryFeat5: string;
  classFeat2: string;
  classFeat4: string;
  skillFeat2: string;
  skillFeat4: string;
  generalFeat3: string;
  generalFeatOther: string;
  cannyAcumen: "fort" | "ref" | "will" | "perception";
  languages: string[];
  inventory: ItemPF2[];
  coins: { cp: number; sp: number; gp: number; pp: number };
  details: {
    deity: string;
    edicts: string;
    anathema: string;
    gender: string;
    age: string;
    height: string;
    weight: string;
    appearance: string;
    personality: string;
    backstory: string;
    allies: string;
    notes: string;
  };
}

let n = 0;
export const newItemIdPF2 = () => `p${Date.now().toString(36)}${(n++).toString(36)}`;
const item = (name: string, qty: number, bulk: number): ItemPF2 => ({ id: newItemIdPF2(), name, qty, bulk });

export function blankPF2(): CharacterPF2 {
  return {
    schema: 1,
    name: "New Sorcerer",
    playerName: "",
    level: 1,
    ancestry: "human",
    heritage: "versatile",
    altBoosts: false,
    ancestryFree: [],
    heritageSkill: "",
    heritageFeat: "",
    background: "acolyte",
    bgBoost: "WIS",
    bgFree: "CHA",
    bgSkill: "",
    bgLore: "",
    boosts1: [],
    boosts5: [],
    bloodline: "imperial",
    bloodlineOption: "",
    classSkills: [],
    skillIncrease3: "",
    skillIncrease5: "",
    cantrips: [],
    spells: [],
    signature: [],
    ancestryFeat1: "",
    ancestryFeat5: "",
    classFeat2: "",
    classFeat4: "",
    skillFeat2: "",
    skillFeat4: "",
    generalFeat3: "",
    generalFeatOther: "",
    cannyAcumen: "will",
    languages: ["Common"],
    inventory: [],
    coins: { cp: 0, sp: 0, gp: 15, pp: 0 },
    details: { deity: "", edicts: "", anathema: "", gender: "", age: "", height: "", weight: "", appearance: "", personality: "", backstory: "", allies: "", notes: "" },
  };
}

/** Parry as a Pathfinder 2e Human (Aiuvarin) Criminal with the Draconic bloodline. */
export function parryPF2(): CharacterPF2 {
  return {
    ...blankPF2(),
    name: PARRY.name,
    playerName: PARRY.playerName,
    level: 5,
    ancestry: "human",
    heritage: "aiuvarin",
    ancestryFree: ["CHA", "DEX"],
    background: "criminal",
    bgBoost: "INT",
    bgFree: "CHA",
    boosts1: ["CHA", "DEX", "CON", "WIS"],
    boosts5: ["CHA", "DEX", "CON", "WIS"],
    bloodline: "draconic",
    bloodlineOption: "arcane",
    classSkills: ["deception", "diplomacy", "thievery"],
    skillIncrease3: "deception",
    skillIncrease5: "stealth",
    cantrips: ["Electric Arc", "Ignition", "Telekinetic Projectile", "Prestidigitation"],
    spells: ["Force Barrage", "Sleep", "Charm", "Invisibility", "Resist Energy", "Dispel Magic", "Fireball", "Paralyze"],
    signature: ["Force Barrage", "Invisibility", "Fireball"],
    skillFeat2: "Charming Liar",
    generalFeat3: "toughness",
    languages: ["Common", "Elven", "Draconic"],
    inventory: [
      item("Dagger", 2, 0.1),
      item("Spear", 1, 1),
      item("Backpack", 1, 0.1),
      item("Bedroll", 1, 0.1),
      item("Rope (50 ft.)", 1, 0.1),
      item("Rations (1 week)", 1, 0.1),
      item("Torch", 5, 0.1),
      item("Waterskin", 1, 0.1),
      item("Flint and steel", 1, 0),
      item("Caltrops", 1, 0.1),
      item("Crowbar", 1, 0.1),
    ],
    coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    details: {
      deity: PARRY.faith,
      edicts: "Break chains; steal from the powerful",
      anathema: "Following a plan",
      gender: PARRY.gender,
      age: PARRY.age,
      height: PARRY.height,
      weight: PARRY.weight,
      appearance: `Eyes ${PARRY.eyes}, hair ${PARRY.hair}, skin ${PARRY.skin}.`,
      personality: [PARRY.personality, PARRY.ideals, PARRY.bonds, PARRY.flaws].join("\n"),
      backstory: PARRY.backstory,
      allies: PARRY.allies,
      notes: PARRY.notes,
    },
  };
}

export function normalizePF2(raw: unknown): CharacterPF2 {
  const d = parryPF2();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<CharacterPF2>;
  return {
    ...d,
    ...r,
    schema: 1,
    coins: { ...d.coins, ...(r.coins ?? {}) },
    details: { ...d.details, ...(r.details ?? {}) },
    inventory: Array.isArray(r.inventory) ? r.inventory.map((i) => ({ ...i, id: i.id || newItemIdPF2() })) : d.inventory,
    level: clampLevel(r.level, 5, d.level),
  };
}
