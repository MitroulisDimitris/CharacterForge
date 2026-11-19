// What equipped magic items do to a 5e character's numbers (REQUIREMENTS 4.5a). The engine reads
// the inventory item's name: "Longsword +1", "+2 Chain Mail", "Shield, +1", or a named item
// ("Cloak of Protection"); a magic weapon of "any sword" names its weapon in brackets:
// "Flame Tongue (Longsword)". Effects that only apply sometimes ("while lit", "against undead")
// are not added to the numbers; they show as an extra chip or a tip on that attack.
import type { Ability } from "./data/core";
import { armorByName, weaponByName } from "./data/equipment";

export interface ExtraDamage {
  dice: string;
  type: string;
  /** Empty when it always applies; else when ("while lit", "against undead"). */
  when: string;
}

export interface ItemEffect {
  /** Needs attunement to work. */
  attune?: boolean;
  /** +AC while worn. */
  ac?: number;
  /** +AC only with no armour and no shield (Bracers of Defense). */
  acUnarmored?: number;
  /** Base AC with no armour (Robe of the Archmagi: 15 + DEX). */
  acBase?: number;
  /** Most DEX that adds to `acBase` (Barrier Tattoo); 0 means none. */
  acDexMax?: number;
  saves?: number;
  /** Ability checks (skills and initiative too). */
  checks?: number;
  /** The score becomes this, if that's higher (Gauntlets of Ogre Power: STR 19). */
  setScore?: Partial<Record<Ability, number>>;
  /** Magic weapon: + to attack and damage rolls with it. */
  weapon?: number;
  /** Magic armour or shield: + to its AC. */
  armor?: number;
  /** Extra damage on hits with this weapon. */
  extra?: ExtraDamage[];
  /** + damage with these weapons (Bracers of Archery). */
  rangedDamage?: { weapons: string[]; bonus: number };
  spellAttack?: number;
  spellDc?: number;
  /** One plain sentence for the inventory row ("+1 to AC and saving throws"). */
  text: string;
}

const N = (s: string) => s.trim().toLowerCase();
const plus = (n: number) => `+${n}`;

/** Named items (SRD 5.1 / DMG; Amulet of the Devout from Tasha's). */
const NAMED: Record<string, ItemEffect> = {
  "cloak of protection": { attune: true, ac: 1, saves: 1, text: "+1 to AC and saving throws" },
  "ring of protection": { attune: true, ac: 1, saves: 1, text: "+1 to AC and saving throws" },
  "ioun stone of protection": { attune: true, ac: 1, text: "+1 to AC" },
  "ioun stone (protection)": { attune: true, ac: 1, text: "+1 to AC" },
  "stone of good luck": { attune: true, checks: 1, saves: 1, text: "+1 to ability checks and saving throws" },
  "stone of good luck (luckstone)": { attune: true, checks: 1, saves: 1, text: "+1 to ability checks and saving throws" },
  luckstone: { attune: true, checks: 1, saves: 1, text: "+1 to ability checks and saving throws" },
  "gauntlets of ogre power": { attune: true, setScore: { STR: 19 }, text: "Strength becomes 19" },
  "headband of intellect": { attune: true, setScore: { INT: 19 }, text: "Intelligence becomes 19" },
  "amulet of health": { attune: true, setScore: { CON: 19 }, text: "Constitution becomes 19" },
  "belt of hill giant strength": { attune: true, setScore: { STR: 21 }, text: "Strength becomes 21" },
  "belt of stone giant strength": { attune: true, setScore: { STR: 23 }, text: "Strength becomes 23" },
  "belt of frost giant strength": { attune: true, setScore: { STR: 23 }, text: "Strength becomes 23" },
  "belt of fire giant strength": { attune: true, setScore: { STR: 25 }, text: "Strength becomes 25" },
  "belt of cloud giant strength": { attune: true, setScore: { STR: 27 }, text: "Strength becomes 27" },
  "belt of storm giant strength": { attune: true, setScore: { STR: 29 }, text: "Strength becomes 29" },
  "bracers of defense": { attune: true, acUnarmored: 2, text: "+2 to AC with no armour and no shield" },
  "bracers of archery": { attune: true, rangedDamage: { weapons: ["Longbow", "Shortbow"], bonus: 2 }, text: "+2 damage with longbows and shortbows" },
  "robe of the archmagi": { attune: true, acBase: 15, spellAttack: 2, spellDc: 2, text: "AC 15 + DEX with no armour; +2 to spell attacks and spell save DC" },
  "flame tongue": { attune: true, extra: [{ dice: "2d6", type: "fire", when: "while the flames are lit" }], text: "+2d6 fire damage while lit (a bonus action)" },
  "frost brand": { attune: true, extra: [{ dice: "1d6", type: "cold", when: "" }], text: "+1d6 cold damage on every hit" },
  "sun blade": { attune: true, weapon: 2, extra: [{ dice: "1d8", type: "radiant", when: "against undead" }], text: "+2 to attack and damage; +1d8 radiant against undead" },
  "holy avenger": { attune: true, weapon: 3, extra: [{ dice: "2d10", type: "radiant", when: "against fiends and undead" }], text: "+3 to attack and damage; +2d10 radiant against fiends and undead" },
  defender: { attune: true, weapon: 3, text: "+3 to attack and damage (can be moved to AC each turn)" },
  "vorpal sword": { attune: true, weapon: 3, text: "+3 to attack and damage" },
  "luck blade": { attune: true, weapon: 1, saves: 1, text: "+1 to attack, damage and saving throws" },
  "nine lives stealer": { attune: true, weapon: 2, text: "+2 to attack and damage" },
  "scimitar of speed": { attune: true, weapon: 2, text: "+2 to attack and damage" },
  "dragon slayer": { weapon: 1, extra: [{ dice: "3d6", type: "damage", when: "against dragons" }], text: "+1 to attack and damage; +3d6 against dragons" },
  "giant slayer": { weapon: 1, extra: [{ dice: "2d6", type: "damage", when: "against giants" }], text: "+1 to attack and damage; +2d6 against giants" },
  "mace of smiting": { weapon: 1, text: "+1 to attack and damage (+3 against constructs)" },
  "dagger of venom": { weapon: 1, text: "+1 to attack and damage" },
  "berserker axe": { attune: true, weapon: 1, text: "+1 to attack and damage" },
  "dwarven plate": { armor: 2, text: "+2 to AC" },
  // Dungeon Master's Guide (not in the SRD)
  "efreeti chain": { attune: true, armor: 3, text: "+3 to AC; immune to fire" },
  "sword of answering": { attune: true, weapon: 3, text: "+3 to attack and damage" },
  "sword of vengeance": { attune: true, weapon: 1, text: "+1 to attack and damage (cursed)" },
  blackrazor: { attune: true, weapon: 3, text: "+3 to attack and damage" },
  moonblade: { attune: true, weapon: 1, text: "+1 to attack and damage (more with extra runes)" },
  wave: { attune: true, weapon: 3, text: "+3 to attack and damage" },
  whelm: { attune: true, weapon: 3, text: "+3 to attack and damage" },
  "axe of the dwarvish lords": { attune: true, weapon: 3, text: "+3 to attack and damage" },
  "sword of kas": { attune: true, weapon: 3, text: "+3 to attack and damage; +2d10 slashing against undead" },
  "wand of orcus": { attune: true, weapon: 3, extra: [{ dice: "2d12", type: "necrotic", when: "" }], text: "+3 to attack and damage; +2d12 necrotic on every hit" },
  // Tasha's
  "devotee's censer": { attune: true, extra: [{ dice: "1d8", type: "radiant", when: "" }], text: "+1d8 radiant damage on every hit" },
  "reveler's concertina": { attune: true, spellDc: 2, text: "+2 to your bard spell save DC" },
  "barrier tattoo (uncommon)": { attune: true, acBase: 12, text: "AC 12 + DEX with no armour" },
  "barrier tattoo (rare)": { attune: true, acBase: 15, acDexMax: 2, text: "AC 15 + DEX (max 2) with no armour" },
  "barrier tattoo (very rare)": { attune: true, acBase: 18, acDexMax: 0, text: "AC 18 with no armour" },
  "elven chain": { armor: 1, text: "+1 to AC" },
};
/** "Rod of the Pact Keeper, +2" style items: + to spell attack (and DC). */
const SCALED: [RegExp, (n: number) => ItemEffect][] = [
  [/^rod of the pact keeper,?\s*\+([123])$/, (n) => ({ attune: true, spellAttack: n, spellDc: n, text: `${plus(n)} to spell attacks and warlock spell save DC` })],
  [/^wand of the war mage,?\s*\+([123])$/, (n) => ({ attune: true, spellAttack: n, text: `${plus(n)} to spell attack rolls` })],
  [/^amulet of the devout,?\s*\+([123])$/, (n) => ({ attune: true, spellAttack: n, spellDc: n, text: `${plus(n)} to spell attacks and spell save DC` })],
  [/^(?:all-purpose tool|arcane grimoire|bloodwell vial|rhythm-maker's drum),?\s*\+([123])$/, (n) => ({ attune: true, spellAttack: n, spellDc: n, text: `${plus(n)} to spell attacks and spell save DC` })],
  [/^moon sickle,?\s*\+([123])$/, (n) => ({ attune: true, weapon: n, spellAttack: n, spellDc: n, text: `${plus(n)} to attack and damage, spell attacks and spell save DC` })],
];
/** Named weapons whose base is fixed. */
const FIXED_BASE: Record<string, string> = { "efreeti chain": "Chain Mail", "sword of answering": "Longsword", blackrazor: "Greatsword", moonblade: "Longsword", wave: "Trident", whelm: "Warhammer", "axe of the dwarvish lords": "Battleaxe", "sword of kas": "Longsword", "wand of orcus": "Mace", "devotee's censer": "Flail", "sun blade": "Longsword", "scimitar of speed": "Scimitar", "dagger of venom": "Dagger", "mace of smiting": "Mace", "dwarven plate": "Plate", "elven chain": "Chain Shirt", "holy avenger": "", "berserker axe": "" };

export interface ReadItem {
  /** The weapon or armour underneath ("Longsword"), if known. */
  base?: string;
  effect: ItemEffect | null;
}

/** Read an inventory item's name: its base weapon/armour and what the magic does. */
export function readItem(name: string): ReadItem {
  let n = N(name);
  // "Flame Tongue (Longsword)": the base in brackets.
  let bracket = "";
  const br = /^(.*?)\s*\(([^)]+)\)$/.exec(n);
  if (br && (weaponByName(br[2]) || armorByName(br[2])) && !NAMED[n]) {
    n = br[1];
    bracket = br[2];
  }
  // "+1 Longsword", "Longsword +1", "Longsword, +1", "Weapon, +2", "Shield, +1", "+3 Plate Armor".
  const pre = /^\+([123])\s+(.+)$/.exec(n);
  const post = /^(.+?),?\s*\+([123])$/.exec(n);
  const bonus = pre ? Number(pre[1]) : post ? Number(post[2]) : 0;
  const rest = pre ? pre[2] : post ? post[1] : n;
  for (const [re, f] of SCALED) {
    const m = re.exec(n);
    if (m) return { base: n.startsWith("moon sickle") ? "Sickle" : undefined, effect: f(Number(m[1])) };
  }
  if (NAMED[rest]) {
    const fixed = FIXED_BASE[rest];
    const named = bracket ? (weaponByName(bracket)?.name ?? armorByName(bracket)?.name) : fixed;
    return { base: named || undefined, effect: NAMED[rest] };
  }
  if (bonus) {
    const base = bracket || rest;
    if (/^(weapon|armor|armour|shield)$/.test(base)) {
      if (base === "weapon") return { effect: { weapon: bonus, text: `${plus(bonus)} to attack and damage` } };
      if (base === "shield") return { base: "Shield", effect: { armor: bonus, text: `${plus(bonus)} to AC` } };
      return { effect: { armor: bonus, text: `${plus(bonus)} to AC` } };
    }
    const w = weaponByName(base);
    if (w) return { base: w.name, effect: { weapon: bonus, text: `${plus(bonus)} to attack and damage` } };
    const a = armorByName(base);
    if (a) return { base: a.name, effect: { armor: bonus, text: `${plus(bonus)} to AC` } };
  }
  const w = weaponByName(n);
  if (w) return { base: w.name, effect: null };
  const a = armorByName(n);
  if (a) return { base: a.name, effect: null };
  return { effect: null };
}

/** Magic weapons and armour without a known base ("Flame Tongue", "Weapon, +1"). */
export const needsBase = (r: ReadItem) => !!r.effect && !r.base && (!!r.effect.weapon || !!r.effect.extra || (!!r.effect.armor && !r.effect.ac));

export const MAX_ATTUNED = 3;
