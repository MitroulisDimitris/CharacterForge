// Feats used by this build (2024 list; the 2014 list lives in data2014/feats.ts).
// Summaries are written for this app.
import type { Ability } from "./core";

export type FeatId =
  | "alert"
  | "crafter"
  | "healer"
  | "lucky"
  | "magicInitiate"
  | "musician"
  | "savageAttacker"
  | "skilled"
  | "tavernBrawler"
  | "tough"
  | "asi"
  | "resilient"
  | "warCaster"
  // 2014-only
  | "observant"
  | "mobile"
  | "elementalAdept"
  | "spellSniper"
  | "feyTouched"
  // any other 2014 feat id (see data2014/feats.ts)
  | (string & {});

export interface Feat {
  id: FeatId;
  name: string;
  book: string;
  category: "origin" | "general";
  text: string;
  /** Abilities that can get +1 from this feat. */
  plusOne?: Ability[];
  /** Prerequisites (2014), checked by the engine. */
  req?: {
    ability?: [Ability[], number];
    spellcasting?: boolean;
    armor?: "light" | "medium" | "heavy";
    martial?: boolean;
    species?: string[];
    lineage?: string[];
    small?: boolean;
  };
  /** Armor proficiency the feat grants. */
  armor?: "light" | "medium" | "heavy";
  /** Extra languages the feat grants. */
  languages?: number;
}

export const MAGIC_INITIATE_LISTS = ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"] as const;
export type MagicInitiateList = (typeof MAGIC_INITIATE_LISTS)[number];

export const FEATS_2024: Feat[] = [
  { id: "alert", name: "Alert", book: "PHB24", category: "origin", text: "Add your Proficiency Bonus to Initiative. After rolling Initiative you can swap results with a willing ally." },
  { id: "crafter", name: "Crafter", book: "PHB24", category: "origin", text: "Proficiency with three Artisan's Tools, 20% discount on nonmagical gear, and faster crafting of some items." },
  { id: "healer", name: "Healer", book: "PHB24", category: "origin", text: "Use a Healer's Kit to let a creature spend a Hit Point Die to heal (plus your Proficiency Bonus). Reroll 1s on healing dice." },
  { id: "lucky", name: "Lucky", book: "PHB24", category: "origin", text: "Luck Points equal to your Proficiency Bonus per Long Rest: give yourself Advantage on a D20 Test, or Disadvantage to an attack against you." },
  { id: "magicInitiate", name: "Magic Initiate", book: "PHB24", category: "origin", text: "Learn two cantrips and one 1st-level spell from the Cleric, Druid or Wizard list. Cast the 1st-level spell once per Long Rest without a slot (or with slots)." },
  { id: "musician", name: "Musician", book: "PHB24", category: "origin", text: "Proficiency with three Musical Instruments. After a rest, play a song to give Heroic Inspiration to allies equal to your Proficiency Bonus." },
  { id: "savageAttacker", name: "Savage Attacker", book: "PHB24", category: "origin", text: "Once per turn, roll a weapon's damage dice twice and use either roll." },
  { id: "skilled", name: "Skilled", book: "PHB24", category: "origin", text: "Gain proficiency in any combination of three skills or tools." },
  { id: "tavernBrawler", name: "Tavern Brawler", book: "PHB24", category: "origin", text: "Unarmed strikes deal 1d4 + STR, reroll 1s, push on a hit, and proficiency with improvised weapons." },
  { id: "tough", name: "Tough", book: "PHB24", category: "origin", text: "Your HP maximum increases by 2 for every character level." },
  { id: "asi", name: "Ability Score Improvement", book: "PHB24", category: "general", text: "Increase one ability score by 2, or two scores by 1 (max 20)." },
  { id: "resilient", name: "Resilient", book: "PHB24", category: "general", text: "+1 to one ability score and proficiency in that ability's saving throws.", plusOne: ["STR", "DEX", "CON", "INT", "WIS", "CHA"] },
  { id: "warCaster", name: "War Caster", book: "PHB24", category: "general", text: "+1 INT, WIS or CHA. Advantage on Concentration saves, cast with hands full, and cast a spell as an Opportunity Attack.", plusOne: ["INT", "WIS", "CHA"] },
];

/** Back-compat aliases for the 2024 lists. */
export const FEATS = FEATS_2024;
export const ORIGIN_FEATS = FEATS_2024.filter((f) => f.category === "origin");
/** Feats offered at Sorcerer level 4 in 2024 (any origin feat also qualifies). */
export const LEVEL4_FEATS = [...FEATS_2024.filter((f) => f.category === "general"), ...ORIGIN_FEATS];
