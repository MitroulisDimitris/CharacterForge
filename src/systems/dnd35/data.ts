// D&D 3.5 rules data for a Sorcerer, levels 1-5 (from the 3.5 System Reference Document,
// open game content under the OGL 1.0a). Descriptions are short summaries in our own words.
import type { Ability } from "../dnd5e/data/core";

export const MAX_LEVEL_35 = 5;

// ---------------------------------------------------------------- class
export const SORCERER_35 = {
  hitDie: 4,
  bab: [0, 0, 1, 1, 2, 2],
  fort: [0, 0, 0, 1, 1, 1],
  ref: [0, 0, 0, 1, 1, 1],
  will: [0, 2, 3, 3, 4, 4],
  /** spells per day by level, index = spell level */
  perDay: [[], [5, 3], [6, 4], [6, 5], [6, 6, 3], [6, 6, 4]] as number[][],
  known: [[], [4, 2], [5, 2], [5, 3], [6, 3, 1], [6, 4, 2]] as number[][],
  skillPoints: 2,
  classSkills: ["bluff", "concentration", "craft", "knowledgeArcana", "profession", "spellcraft"],
};

export const CLASS_FEATURES_35 = [
  { level: 1, name: "Spells", text: "Cast arcane spells from the sorcerer/wizard list without preparing them; Charisma sets bonus spells and save DCs (10 + spell level + CHA)." },
  { level: 1, name: "Weapon and Armor Proficiency", text: "All simple weapons. No armor or shields (arcane spell failure applies if you wear them)." },
  { level: 1, name: "Summon Familiar", text: "You may gain a familiar (24 hours and 100 GP of materials). It grants a special bonus and Alertness while within arm's reach." },
];

/** Bonus spells per day for spell level `lvl` from an ability modifier. */
export const bonusSpells = (abilityMod: number, lvl: number) => (lvl === 0 || abilityMod < lvl ? 0 : Math.floor((abilityMod - lvl) / 4) + 1);

// ---------------------------------------------------------------- abilities
export const POINT_BUY_35: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
export const POINT_BUY_TOTALS = [
  { value: 15, label: "15 — low-powered" },
  { value: 22, label: "22 — challenging" },
  { value: 25, label: "25 — standard" },
  { value: 28, label: "28 — tougher" },
  { value: 32, label: "32 — high-powered" },
];
export const ELITE_ARRAY = [15, 14, 13, 12, 10, 8];

/** Maximum (heavy) load in lb by Strength 1-20; light = 1/3, medium = 2/3. */
const HEAVY = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230, 260, 300, 350, 400];
export function loads(str: number, small: boolean) {
  const s = Math.max(1, Math.min(20, str));
  const heavy = HEAVY[s] * (small ? 0.75 : 1);
  return { light: Math.floor(heavy / 3), medium: Math.floor((heavy * 2) / 3), heavy: Math.floor(heavy) };
}

// ---------------------------------------------------------------- skills
export interface Skill35 {
  id: string;
  name: string;
  ability: Ability;
  trainedOnly?: boolean;
}

export const SKILLS_35: Skill35[] = [
  { id: "appraise", name: "Appraise", ability: "INT" },
  { id: "balance", name: "Balance", ability: "DEX" },
  { id: "bluff", name: "Bluff", ability: "CHA" },
  { id: "climb", name: "Climb", ability: "STR" },
  { id: "concentration", name: "Concentration", ability: "CON" },
  { id: "craft", name: "Craft", ability: "INT" },
  { id: "decipherScript", name: "Decipher Script", ability: "INT", trainedOnly: true },
  { id: "diplomacy", name: "Diplomacy", ability: "CHA" },
  { id: "disableDevice", name: "Disable Device", ability: "INT", trainedOnly: true },
  { id: "disguise", name: "Disguise", ability: "CHA" },
  { id: "escapeArtist", name: "Escape Artist", ability: "DEX" },
  { id: "forgery", name: "Forgery", ability: "INT" },
  { id: "gatherInformation", name: "Gather Information", ability: "CHA" },
  { id: "handleAnimal", name: "Handle Animal", ability: "CHA", trainedOnly: true },
  { id: "heal", name: "Heal", ability: "WIS" },
  { id: "hide", name: "Hide", ability: "DEX" },
  { id: "intimidate", name: "Intimidate", ability: "CHA" },
  { id: "jump", name: "Jump", ability: "STR" },
  { id: "knowledgeArcana", name: "Knowledge (arcana)", ability: "INT", trainedOnly: true },
  { id: "knowledgeDungeoneering", name: "Knowledge (dungeoneering)", ability: "INT", trainedOnly: true },
  { id: "knowledgeHistory", name: "Knowledge (history)", ability: "INT", trainedOnly: true },
  { id: "knowledgeLocal", name: "Knowledge (local)", ability: "INT", trainedOnly: true },
  { id: "knowledgeNature", name: "Knowledge (nature)", ability: "INT", trainedOnly: true },
  { id: "knowledgePlanes", name: "Knowledge (the planes)", ability: "INT", trainedOnly: true },
  { id: "knowledgeReligion", name: "Knowledge (religion)", ability: "INT", trainedOnly: true },
  { id: "listen", name: "Listen", ability: "WIS" },
  { id: "moveSilently", name: "Move Silently", ability: "DEX" },
  { id: "openLock", name: "Open Lock", ability: "DEX", trainedOnly: true },
  { id: "perform", name: "Perform", ability: "CHA" },
  { id: "profession", name: "Profession", ability: "WIS", trainedOnly: true },
  { id: "ride", name: "Ride", ability: "DEX" },
  { id: "search", name: "Search", ability: "INT" },
  { id: "senseMotive", name: "Sense Motive", ability: "WIS" },
  { id: "sleightOfHand", name: "Sleight of Hand", ability: "DEX", trainedOnly: true },
  { id: "spellcraft", name: "Spellcraft", ability: "INT", trainedOnly: true },
  { id: "spot", name: "Spot", ability: "WIS" },
  { id: "survival", name: "Survival", ability: "WIS" },
  { id: "swim", name: "Swim", ability: "STR" },
  { id: "tumble", name: "Tumble", ability: "DEX", trainedOnly: true },
  { id: "useMagicDevice", name: "Use Magic Device", ability: "CHA", trainedOnly: true },
  { id: "useRope", name: "Use Rope", ability: "DEX" },
];

/** 5+ ranks in the first skill gives +2 to each listed skill. */
export const SYNERGIES: [string, string[]][] = [
  ["bluff", ["diplomacy", "intimidate", "sleightOfHand"]],
  ["knowledgeArcana", ["spellcraft"]],
  ["senseMotive", ["diplomacy"]],
  ["handleAnimal", ["ride"]],
  ["tumble", ["balance", "jump"]],
  ["jump", ["tumble"]],
  ["knowledgeLocal", ["gatherInformation"]],
  ["knowledgeNature", ["survival"]],
  ["escapeArtist", ["useRope"]],
];

// ---------------------------------------------------------------- races
export interface Race35 {
  id: string;
  name: string;
  size: "Medium" | "Small";
  speed: number;
  adjust: Partial<Record<Ability, number>>;
  vision: string;
  skillBonus: Partial<Record<string, number>>;
  saveBonus?: number;
  bonusFeat?: boolean;
  bonusSkillPoints?: boolean;
  languages: string[];
  bonusLanguages: string;
  favored: string;
  traits: { name: string; text: string }[];
}

export const RACES_35: Race35[] = [
  {
    id: "human35",
    name: "Human",
    size: "Medium",
    speed: 30,
    adjust: {},
    vision: "Normal",
    skillBonus: {},
    bonusFeat: true,
    bonusSkillPoints: true,
    languages: ["Common"],
    bonusLanguages: "Any (other than secret languages)",
    favored: "Any",
    traits: [
      { name: "Bonus Feat", text: "One extra feat at 1st level." },
      { name: "Skilled", text: "4 extra skill points at 1st level and 1 extra at each level after." },
    ],
  },
  {
    id: "dwarf35",
    name: "Dwarf",
    size: "Medium",
    speed: 20,
    adjust: { CON: 2, CHA: -2 },
    vision: "Darkvision 60 ft.",
    skillBonus: { appraise: 2, craft: 2 },
    languages: ["Common", "Dwarven"],
    bonusLanguages: "Giant, Gnome, Goblin, Orc, Terran, Undercommon",
    favored: "Fighter",
    traits: [
      { name: "Stability", text: "+4 against bull rush and trip while standing on the ground." },
      { name: "Hardy", text: "+2 on saves against poison, spells and spell-like effects." },
      { name: "Stonecunning", text: "+2 Search for unusual stonework and a chance to notice it in passing." },
      { name: "Combat Training", text: "+1 attack against orcs and goblinoids; +4 dodge AC against giants." },
      { name: "Steady", text: "Speed 20 ft, not reduced by armor or load." },
    ],
  },
  {
    id: "elf35",
    name: "Elf",
    size: "Medium",
    speed: 30,
    adjust: { DEX: 2, CON: -2 },
    vision: "Low-light vision",
    skillBonus: { listen: 2, search: 2, spot: 2 },
    languages: ["Common", "Elven"],
    bonusLanguages: "Draconic, Gnoll, Gnome, Goblin, Orc, Sylvan",
    favored: "Wizard",
    traits: [
      { name: "Fey Blood", text: "Immune to magic sleep effects; +2 on saves against enchantment spells and effects." },
      { name: "Keen Senses", text: "+2 Listen, Search and Spot; a chance to notice secret doors just by passing nearby." },
      { name: "Elven Weapons", text: "Proficient with longsword, rapier, longbow and shortbow." },
    ],
  },
  {
    id: "gnome35",
    name: "Gnome",
    size: "Small",
    speed: 20,
    adjust: { CON: 2, STR: -2 },
    vision: "Low-light vision",
    skillBonus: { listen: 2, craft: 2 },
    languages: ["Common", "Gnome"],
    bonusLanguages: "Draconic, Dwarven, Elven, Giant, Goblin, Orc",
    favored: "Bard",
    traits: [
      { name: "Illusion Affinity", text: "+2 on saves against illusions; +1 to the DC of illusion spells you cast." },
      { name: "Combat Training", text: "+1 attack against kobolds and goblinoids; +4 dodge AC against giants." },
      { name: "Gnome Magic", text: "1/day speak with burrowing mammals; with CHA 10+, also dancing lights, ghost sound and prestidigitation 1/day each." },
    ],
  },
  {
    id: "halfElf35",
    name: "Half-Elf",
    size: "Medium",
    speed: 30,
    adjust: {},
    vision: "Low-light vision",
    skillBonus: { listen: 1, search: 1, spot: 1, diplomacy: 2, gatherInformation: 2 },
    languages: ["Common", "Elven"],
    bonusLanguages: "Any (other than secret languages)",
    favored: "Any",
    traits: [
      { name: "Elven Resistance", text: "Immune to magic sleep effects; +2 on saves against enchantment spells and effects." },
      { name: "Socialite", text: "+2 Diplomacy and Gather Information; +1 Listen, Search and Spot." },
      { name: "Elven Blood", text: "Counts as an elf for effects related to race." },
    ],
  },
  {
    id: "halfOrc35",
    name: "Half-Orc",
    size: "Medium",
    speed: 30,
    adjust: { STR: 2, INT: -2, CHA: -2 },
    vision: "Darkvision 60 ft.",
    skillBonus: {},
    languages: ["Common", "Orc"],
    bonusLanguages: "Draconic, Giant, Gnoll, Goblin, Abyssal",
    favored: "Barbarian",
    traits: [{ name: "Orc Blood", text: "Counts as an orc for effects related to race." }],
  },
  {
    id: "halfling35",
    name: "Halfling",
    size: "Small",
    speed: 20,
    adjust: { DEX: 2, STR: -2 },
    vision: "Normal",
    skillBonus: { climb: 2, jump: 2, moveSilently: 2, listen: 2 },
    saveBonus: 1,
    languages: ["Common", "Halfling"],
    bonusLanguages: "Dwarven, Elven, Gnome, Goblin, Orc",
    favored: "Rogue",
    traits: [
      { name: "Lucky", text: "+1 on all saving throws (included)." },
      { name: "Fearless", text: "+2 morale bonus on saves against fear." },
      { name: "Good Aim", text: "+1 attack with thrown weapons and slings." },
    ],
  },
];

export const SIZE_MODS = {
  Medium: { ac: 0, attack: 0, grapple: 0, hide: 0 },
  Small: { ac: 1, attack: 1, grapple: -4, hide: 4 },
};

// ---------------------------------------------------------------- feats
export interface Feat35 {
  id: string;
  name: string;
  type: "General" | "Metamagic" | "Item Creation";
  prereq?: string;
  /** Minimum caster level. */
  minLevel?: number;
  text: string;
  /** Needs an extra pick. */
  choice?: "skill" | "school";
  /** Simple numeric effects applied by the engine. */
  skillBonus?: Partial<Record<string, number>>;
}

export const SCHOOLS_35 = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];

export const FEATS_35: Feat35[] = [
  { id: "alertness", name: "Alertness", type: "General", text: "+2 on Listen and Spot checks.", skillBonus: { listen: 2, spot: 2 } },
  { id: "combatCasting", name: "Combat Casting", type: "General", text: "+4 on Concentration checks to cast defensively or while grappling." },
  { id: "dodge", name: "Dodge", type: "General", prereq: "DEX 13", text: "+1 dodge bonus to AC against one opponent you choose each turn." },
  { id: "eschewMaterials", name: "Eschew Materials", type: "General", text: "Cast spells without material components worth 1 GP or less." },
  { id: "greatFortitude", name: "Great Fortitude", type: "General", text: "+2 on Fortitude saves." },
  { id: "improvedInitiative", name: "Improved Initiative", type: "General", text: "+4 on initiative checks." },
  { id: "ironWill", name: "Iron Will", type: "General", text: "+2 on Will saves." },
  { id: "lightningReflexes", name: "Lightning Reflexes", type: "General", text: "+2 on Reflex saves." },
  { id: "pointBlankShot", name: "Point Blank Shot", type: "General", text: "+1 attack and damage with ranged attacks (including rays) within 30 ft." },
  { id: "preciseShot", name: "Precise Shot", type: "General", prereq: "Point Blank Shot", text: "No -4 penalty for shooting or casting rays into melee." },
  { id: "skillFocus", name: "Skill Focus", type: "General", choice: "skill", text: "+3 on checks with one skill." },
  { id: "spellFocus", name: "Spell Focus", type: "General", choice: "school", text: "+1 to the save DC of spells from one school." },
  { id: "greaterSpellFocus", name: "Greater Spell Focus", type: "General", choice: "school", prereq: "Spell Focus (same school)", text: "Another +1 to the save DC of spells from that school." },
  { id: "spellPenetration", name: "Spell Penetration", type: "General", text: "+2 on caster level checks to beat spell resistance." },
  { id: "toughness", name: "Toughness", type: "General", text: "+3 hit points." },
  { id: "weaponFinesse", name: "Weapon Finesse", type: "General", prereq: "BAB +1", text: "Use DEX instead of STR for attacks with light weapons." },
  { id: "persuasive", name: "Persuasive", type: "General", text: "+2 Bluff and Intimidate.", skillBonus: { bluff: 2, intimidate: 2 } },
  { id: "negotiator", name: "Negotiator", type: "General", text: "+2 Diplomacy and Sense Motive.", skillBonus: { diplomacy: 2, senseMotive: 2 } },
  { id: "deceitful", name: "Deceitful", type: "General", text: "+2 Disguise and Forgery.", skillBonus: { disguise: 2, forgery: 2 } },
  { id: "stealthy", name: "Stealthy", type: "General", text: "+2 Hide and Move Silently.", skillBonus: { hide: 2, moveSilently: 2 } },
  { id: "nimbleFingers", name: "Nimble Fingers", type: "General", text: "+2 Disable Device and Open Lock.", skillBonus: { disableDevice: 2, openLock: 2 } },
  { id: "magicalAptitude", name: "Magical Aptitude", type: "General", text: "+2 Spellcraft and Use Magic Device.", skillBonus: { spellcraft: 2, useMagicDevice: 2 } },
  { id: "investigator", name: "Investigator", type: "General", text: "+2 Gather Information and Search.", skillBonus: { gatherInformation: 2, search: 2 } },
  { id: "acrobatic", name: "Acrobatic", type: "General", text: "+2 Jump and Tumble.", skillBonus: { jump: 2, tumble: 2 } },
  { id: "agile", name: "Agile", type: "General", text: "+2 Balance and Escape Artist.", skillBonus: { balance: 2, escapeArtist: 2 } },
  { id: "athletic", name: "Athletic", type: "General", text: "+2 Climb and Swim.", skillBonus: { climb: 2, swim: 2 } },
  { id: "selfSufficient", name: "Self-Sufficient", type: "General", text: "+2 Heal and Survival.", skillBonus: { heal: 2, survival: 2 } },
  { id: "diligent", name: "Diligent", type: "General", text: "+2 Appraise and Decipher Script.", skillBonus: { appraise: 2, decipherScript: 2 } },
  { id: "run", name: "Run", type: "General", text: "Run at five times your speed; +4 on running jumps." },
  { id: "empowerSpell", name: "Empower Spell", type: "Metamagic", text: "Variable numeric effects ×1.5; uses a slot two levels higher (full-round action for a sorcerer)." },
  { id: "enlargeSpell", name: "Enlarge Spell", type: "Metamagic", text: "Double a spell's range; uses a slot one level higher." },
  { id: "extendSpell", name: "Extend Spell", type: "Metamagic", text: "Double a spell's duration; uses a slot one level higher." },
  { id: "silentSpell", name: "Silent Spell", type: "Metamagic", text: "Cast without verbal components; uses a slot one level higher." },
  { id: "stillSpell", name: "Still Spell", type: "Metamagic", text: "Cast without somatic components; uses a slot one level higher." },
  { id: "scribeScroll", name: "Scribe Scroll", type: "Item Creation", minLevel: 1, text: "Create scrolls of spells you know." },
  { id: "brewPotion", name: "Brew Potion", type: "Item Creation", minLevel: 3, text: "Create potions of spells of 3rd level or lower that target creatures." },
  { id: "craftWondrousItem", name: "Craft Wondrous Item", type: "Item Creation", minLevel: 3, text: "Create miscellaneous magic items." },
  { id: "craftWand", name: "Craft Wand", type: "Item Creation", minLevel: 5, text: "Create wands of spells of 4th level or lower." },
];

export const featById35 = (id: string) => FEATS_35.find((f) => f.id === id);

// ---------------------------------------------------------------- familiars
export const FAMILIARS_35 = [
  { id: "", name: "No familiar", benefit: "" },
  { id: "bat", name: "Bat", benefit: "+3 Listen", skill: ["listen", 3] as const },
  { id: "cat", name: "Cat", benefit: "+3 Move Silently", skill: ["moveSilently", 3] as const },
  { id: "hawk", name: "Hawk", benefit: "+3 Spot in bright light" },
  { id: "lizard", name: "Lizard", benefit: "+3 Climb", skill: ["climb", 3] as const },
  { id: "owl", name: "Owl", benefit: "+3 Spot in shadows" },
  { id: "rat", name: "Rat", benefit: "+2 Fortitude saves" },
  { id: "raven", name: "Raven", benefit: "+3 Appraise (and it can speak one language)", skill: ["appraise", 3] as const },
  { id: "snake", name: "Snake (Tiny viper)", benefit: "+3 Bluff", skill: ["bluff", 3] as const },
  { id: "toad", name: "Toad", benefit: "+3 hit points" },
  { id: "weasel", name: "Weasel", benefit: "+2 Reflex saves" },
];

export const FAMILIAR_ABILITIES = [
  { level: 1, text: "Alertness (while within arm's reach), improved evasion, share spells, empathic link." },
  { level: 3, text: "Deliver touch spells." },
  { level: 5, text: "Speak with master." },
];

// ---------------------------------------------------------------- weapons & gear
export interface Weapon35 {
  name: string;
  dmgM: string;
  dmgS: string;
  crit: string;
  range?: number;
  type: string;
  weight: number;
  ranged?: boolean;
  thrown?: boolean;
  light?: boolean;
}

export const WEAPONS_35: Weapon35[] = [
  { name: "Dagger", dmgM: "1d4", dmgS: "1d3", crit: "19-20/×2", range: 10, type: "P or S", weight: 1, thrown: true, light: true },
  { name: "Club", dmgM: "1d6", dmgS: "1d4", crit: "×2", range: 10, type: "B", weight: 3, thrown: true },
  { name: "Quarterstaff", dmgM: "1d6/1d6", dmgS: "1d4/1d4", crit: "×2", type: "B", weight: 4 },
  { name: "Shortspear", dmgM: "1d6", dmgS: "1d4", crit: "×2", range: 20, type: "P", weight: 3, thrown: true },
  { name: "Spear", dmgM: "1d8", dmgS: "1d6", crit: "×3", range: 20, type: "P", weight: 6, thrown: true },
  { name: "Light mace", dmgM: "1d6", dmgS: "1d4", crit: "×2", type: "B", weight: 4, light: true },
  { name: "Sickle", dmgM: "1d6", dmgS: "1d4", crit: "×2", type: "S", weight: 2, light: true },
  { name: "Morningstar", dmgM: "1d8", dmgS: "1d6", crit: "×2", type: "B and P", weight: 6 },
  { name: "Javelin", dmgM: "1d6", dmgS: "1d4", crit: "×2", range: 30, type: "P", weight: 2, ranged: true, thrown: true },
  { name: "Dart", dmgM: "1d4", dmgS: "1d3", crit: "×2", range: 20, type: "P", weight: 0.5, ranged: true, thrown: true },
  { name: "Light crossbow", dmgM: "1d8", dmgS: "1d6", crit: "19-20/×2", range: 80, type: "P", weight: 4, ranged: true },
  { name: "Sling", dmgM: "1d4", dmgS: "1d3", crit: "×2", range: 50, type: "B", weight: 0, ranged: true },
];

export const weapon35 = (n: string) => WEAPONS_35.find((w) => w.name.toLowerCase() === n.trim().toLowerCase());

export const GEAR_35: { name: string; weight: number }[] = [
  ...WEAPONS_35.map((w) => ({ name: w.name, weight: w.weight })),
  { name: "Spell component pouch", weight: 2 },
  { name: "Backpack", weight: 2 },
  { name: "Bedroll", weight: 5 },
  { name: "Caltrops", weight: 2 },
  { name: "Crowbar", weight: 5 },
  { name: "Flint and steel", weight: 0 },
  { name: "Hooded lantern", weight: 2 },
  { name: "Oil (1-pint flask)", weight: 1 },
  { name: "Potion of cure light wounds", weight: 0 },
  { name: "Rope, hemp (50 ft)", weight: 10 },
  { name: "Rope, silk (50 ft)", weight: 5 },
  { name: "Scroll case", weight: 0.5 },
  { name: "Torch", weight: 1 },
  { name: "Trail rations (per day)", weight: 1 },
  { name: "Traveler's outfit", weight: 5 },
  { name: "Waterskin", weight: 4 },
  { name: "Thieves' tools", weight: 1 },
];

// ---------------------------------------------------------------- spells
export type Range35 = "close" | "medium" | "long" | "touch" | "personal" | string;

export interface Spell35 {
  name: string;
  level: number;
  school: string;
  components: string;
  time?: string;
  range: Range35;
  duration: string;
  save: string;
  sr: string;
  /** Damage/effect at a caster level. */
  effect?: (cl: number) => string;
  /** Rolls a ranged or melee touch attack. */
  touch?: "ranged" | "melee";
  costly?: string;
  desc: string;
}

const dice = (n: number, d: number) => `${n}d${d}`;

export const SPELLS_35: Spell35[] = [
  // 0 level
  { name: "Acid Splash", level: 0, school: "Conjuration", components: "V,S", range: "close", duration: "Instantaneous", save: "None", sr: "No", touch: "ranged", effect: () => "1d3 acid", desc: "An orb of acid hits a target with a ranged touch attack." },
  { name: "Arcane Mark", level: 0, school: "Universal", components: "V,S", range: "touch", duration: "Permanent", save: "None", sr: "No", desc: "Inscribe your personal rune, visible or invisible." },
  { name: "Dancing Lights", level: 0, school: "Evocation", components: "V,S", range: "medium", duration: "1 minute (D)", save: "None", sr: "No", desc: "Up to four torch-like lights you can move." },
  { name: "Daze", level: 0, school: "Enchantment", components: "V,S,M", range: "close", duration: "1 round", save: "Will negates", sr: "Yes", desc: "A humanoid of 4 HD or less loses its next action." },
  { name: "Detect Magic", level: 0, school: "Divination", components: "V,S", range: "60 ft. cone", duration: "Concentration, up to 1 min/level", save: "None", sr: "No", desc: "Sense magical auras; more detail the longer you concentrate." },
  { name: "Detect Poison", level: 0, school: "Divination", components: "V,S", range: "close", duration: "Instantaneous", save: "None", sr: "No", desc: "Detect poison in one creature or a small object." },
  { name: "Disrupt Undead", level: 0, school: "Necromancy", components: "V,S", range: "close", duration: "Instantaneous", save: "None", sr: "Yes", touch: "ranged", effect: () => "1d6 to undead", desc: "A ray of positive energy that harms undead." },
  { name: "Flare", level: 0, school: "Evocation", components: "V", range: "close", duration: "Instantaneous", save: "Fort negates", sr: "Yes", desc: "A burst of light dazzles one creature for 1 minute." },
  { name: "Ghost Sound", level: 0, school: "Illusion", components: "V,S,M", range: "close", duration: "1 round/level (D)", save: "Will disbelief", sr: "No", desc: "Illusory sounds, from whispers to a crowd." },
  { name: "Light", level: 0, school: "Evocation", components: "V,M", range: "touch", duration: "10 min/level (D)", save: "None", sr: "No", desc: "An object shines like a torch." },
  { name: "Mage Hand", level: 0, school: "Transmutation", components: "V,S", range: "close", duration: "Concentration", save: "None", sr: "No", desc: "Telekinetically move an object of up to 5 lb." },
  { name: "Mending", level: 0, school: "Transmutation", components: "V,S", range: "10 ft.", duration: "Instantaneous", save: "Will negates (object)", sr: "Yes (object)", desc: "Repair minor damage (1d4 points) to an object." },
  { name: "Message", level: 0, school: "Transmutation", components: "V,S,F", range: "medium", duration: "10 min/level", save: "None", sr: "No", desc: "Whispered conversation at a distance." },
  { name: "Open/Close", level: 0, school: "Transmutation", components: "V,S,F", range: "close", duration: "Instantaneous", save: "Will negates (object)", sr: "Yes (object)", desc: "Open or close a small or light thing." },
  { name: "Prestidigitation", level: 0, school: "Universal", components: "V,S", range: "10 ft.", duration: "1 hour", save: "None", sr: "No", desc: "Minor tricks: clean, color, warm, flavor, small illusions." },
  { name: "Ray of Frost", level: 0, school: "Evocation", components: "V,S", range: "close", duration: "Instantaneous", save: "None", sr: "Yes", touch: "ranged", effect: () => "1d3 cold", desc: "A ray of freezing cold." },
  { name: "Read Magic", level: 0, school: "Divination", components: "V,S,F", range: "personal", duration: "10 min/level", save: "None", sr: "No", desc: "Read scrolls and spellbooks." },
  { name: "Resistance", level: 0, school: "Abjuration", components: "V,S,M", range: "touch", duration: "1 minute", save: "Will negates (harmless)", sr: "Yes (harmless)", desc: "+1 resistance bonus on saving throws." },
  { name: "Touch of Fatigue", level: 0, school: "Necromancy", components: "V,S,M", range: "touch", duration: "1 round/level", save: "Fort negates", sr: "Yes", touch: "melee", desc: "A touch that makes the target fatigued." },
  // 1st level
  { name: "Alarm", level: 1, school: "Abjuration", components: "V,S,F", range: "close", duration: "2 hours/level (D)", save: "None", sr: "No", desc: "Ward an area; you're alerted when it's entered." },
  { name: "Burning Hands", level: 1, school: "Evocation", components: "V,S", range: "15 ft. cone", duration: "Instantaneous", save: "Reflex half", sr: "Yes", effect: (cl) => `${dice(Math.min(cl, 5), 4)} fire`, desc: "A cone of searing flame." },
  { name: "Cause Fear", level: 1, school: "Necromancy", components: "V,S", range: "close", duration: "1d4 rounds or 1 round", save: "Will partial", sr: "Yes", desc: "A creature of 5 HD or less flees (shaken for 1 round on a save)." },
  { name: "Charm Person", level: 1, school: "Enchantment", components: "V,S", range: "close", duration: "1 hour/level", save: "Will negates", sr: "Yes", desc: "A humanoid regards you as a trusted friend." },
  { name: "Chill Touch", level: 1, school: "Necromancy", components: "V,S", range: "touch", duration: "Instantaneous", save: "Fort partial", sr: "Yes", touch: "melee", effect: (cl) => `1d6 + 1 Str damage; ${cl} touch${cl > 1 ? "es" : ""}`, desc: "Negative energy hurts and weakens; undead flee instead." },
  { name: "Color Spray", level: 1, school: "Illusion", components: "V,S,M", range: "15 ft. cone", duration: "Instantaneous", save: "Will negates", sr: "Yes", desc: "Creatures are knocked unconscious, blinded or stunned, depending on their HD." },
  { name: "Comprehend Languages", level: 1, school: "Divination", components: "V,S,M", range: "personal", duration: "10 min/level", save: "None", sr: "No", desc: "Understand all spoken and written languages." },
  { name: "Disguise Self", level: 1, school: "Illusion", components: "V,S", range: "personal", duration: "10 min/level (D)", save: "None", sr: "No", desc: "Change your appearance, gear included." },
  { name: "Endure Elements", level: 1, school: "Abjuration", components: "V,S", range: "touch", duration: "24 hours", save: "Will negates (harmless)", sr: "Yes (harmless)", desc: "Exist comfortably in hot or cold environments." },
  { name: "Enlarge Person", level: 1, school: "Transmutation", components: "V,S,M", range: "close", duration: "1 min/level (D)", save: "Fort negates", sr: "Yes", desc: "A humanoid grows one size category: +2 STR, -2 DEX, -1 attack and AC." },
  { name: "Expeditious Retreat", level: 1, school: "Transmutation", components: "V,S", range: "personal", duration: "1 min/level (D)", save: "None", sr: "No", desc: "Your base land speed increases by 30 ft." },
  { name: "Feather Fall", level: 1, school: "Transmutation", components: "V", time: "Immediate", range: "close", duration: "Until landing or 1 round/level", save: "Will negates (harmless)", sr: "Yes", desc: "Falling creatures drift down safely." },
  { name: "Grease", level: 1, school: "Conjuration", components: "V,S,M", range: "close", duration: "1 round/level (D)", save: "Reflex", sr: "No", desc: "A 10-ft square or an object becomes slippery." },
  { name: "Hold Portal", level: 1, school: "Abjuration", components: "V", range: "medium", duration: "1 min/level", save: "None", sr: "No", desc: "Magically hold a door shut." },
  { name: "Identify", level: 1, school: "Divination", components: "V,S,M", time: "1 hour", range: "touch", duration: "Instantaneous", save: "None", sr: "No", costly: "a pearl worth 100+ GP", desc: "Learn the properties of one magic item." },
  { name: "Jump", level: 1, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level (D)", save: "Will negates (harmless)", sr: "Yes", effect: (cl) => `+${cl >= 9 ? 30 : cl >= 5 ? 20 : 10} on Jump checks`, desc: "Enhancement bonus on Jump checks." },
  { name: "Mage Armor", level: 1, school: "Conjuration", components: "V,S,F", range: "touch", duration: "1 hour/level (D)", save: "Will negates (harmless)", sr: "No", effect: () => "+4 armor bonus to AC", desc: "An invisible field of force protects the subject." },
  { name: "Magic Missile", level: 1, school: "Evocation", components: "V,S", range: "medium", duration: "Instantaneous", save: "None", sr: "Yes", effect: (cl) => {
    const n = Math.min(5, 1 + Math.floor((cl - 1) / 2));
    return `${n} missile${n > 1 ? "s" : ""}, 1d4+1 force each`;
  }, desc: "Unerring darts of force." },
  { name: "Magic Weapon", level: 1, school: "Transmutation", components: "V,S,F", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes (harmless)", desc: "A weapon gains a +1 enhancement bonus." },
  { name: "Obscuring Mist", level: 1, school: "Conjuration", components: "V,S", range: "20 ft.", duration: "1 min/level", save: "None", sr: "No", desc: "Fog surrounds you and gives concealment." },
  { name: "Protection from Evil", level: 1, school: "Abjuration", components: "V,S,M", range: "touch", duration: "1 min/level (D)", save: "Will negates (harmless)", sr: "No", desc: "+2 AC and saves against evil creatures; blocks mental control." },
  { name: "Ray of Enfeeblement", level: 1, school: "Necromancy", components: "V,S", range: "close", duration: "1 min/level", save: "None", sr: "Yes", touch: "ranged", effect: (cl) => `1d6+${Math.min(5, Math.floor(cl / 2))} Str penalty`, desc: "A ray that saps Strength." },
  { name: "Reduce Person", level: 1, school: "Transmutation", components: "V,S,M", range: "close", duration: "1 min/level (D)", save: "Fort negates", sr: "Yes", desc: "A humanoid shrinks one size category." },
  { name: "Shield", level: 1, school: "Abjuration", components: "V,S", range: "personal", duration: "1 min/level (D)", save: "None", sr: "No", effect: () => "+4 shield bonus to AC", desc: "An invisible shield of force; blocks magic missile." },
  { name: "Shocking Grasp", level: 1, school: "Evocation", components: "V,S", range: "touch", duration: "Instantaneous", save: "None", sr: "Yes", touch: "melee", effect: (cl) => `${dice(Math.min(cl, 5), 6)} electricity`, desc: "Touch delivers electricity; +3 to hit against metal armor." },
  { name: "Silent Image", level: 1, school: "Illusion", components: "V,S,F", range: "long", duration: "Concentration", save: "Will disbelief", sr: "No", desc: "A visual illusion of your design." },
  { name: "Sleep", level: 1, school: "Enchantment", components: "V,S,M", time: "1 round", range: "medium", duration: "1 min/level", save: "Will negates", sr: "Yes", effect: () => "4 HD of creatures", desc: "Creatures in a 10-ft burst fall into magical slumber." },
  { name: "Summon Monster I", level: 1, school: "Conjuration", components: "V,S,F", time: "1 round", range: "close", duration: "1 round/level (D)", save: "None", sr: "No", desc: "Call a weak extraplanar creature to fight for you." },
  { name: "True Strike", level: 1, school: "Divination", components: "V,F", range: "personal", duration: "See text", save: "None", sr: "No", effect: () => "+20 on your next attack", desc: "Insight bonus on your next single attack roll." },
  { name: "Unseen Servant", level: 1, school: "Conjuration", components: "V,S,M", range: "close", duration: "1 hour/level", save: "None", sr: "No", desc: "An invisible force obeys simple commands." },
  { name: "Ventriloquism", level: 1, school: "Illusion", components: "V,F", range: "close", duration: "1 min/level (D)", save: "Will disbelief", sr: "No", desc: "Throw your voice." },
  // 2nd level
  { name: "Acid Arrow", level: 2, school: "Conjuration", components: "V,S,M,F", range: "long", duration: "1 round + 1 round per 3 levels", save: "None", sr: "No", touch: "ranged", effect: (cl) => `2d4 acid for ${1 + Math.floor(cl / 3)} round(s)`, desc: "An arrow of acid that keeps burning." },
  { name: "Alter Self", level: 2, school: "Transmutation", components: "V,S", range: "personal", duration: "10 min/level (D)", save: "None", sr: "No", desc: "Take the form of a similar creature." },
  { name: "Bear's Endurance", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 CON", desc: "The subject gains +4 to Constitution." },
  { name: "Blindness/Deafness", level: 2, school: "Necromancy", components: "V", range: "medium", duration: "Permanent (D)", save: "Fort negates", sr: "Yes", desc: "Make a creature blinded or deafened." },
  { name: "Blur", level: 2, school: "Illusion", components: "V", range: "touch", duration: "1 min/level (D)", save: "Will negates (harmless)", sr: "Yes", desc: "Attacks against the subject have a 20% miss chance." },
  { name: "Bull's Strength", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 STR", desc: "The subject gains +4 to Strength." },
  { name: "Cat's Grace", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 DEX", desc: "The subject gains +4 to Dexterity." },
  { name: "Continual Flame", level: 2, school: "Evocation", components: "V,S,M", range: "touch", duration: "Permanent", save: "None", sr: "No", costly: "ruby dust worth 50 GP", desc: "A heatless flame that lasts forever." },
  { name: "Darkness", level: 2, school: "Evocation", components: "V,M", range: "touch", duration: "10 min/level (D)", save: "None", sr: "No", desc: "Supernatural shadow in a 20-ft radius." },
  { name: "Darkvision", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 hour/level", save: "Will negates (harmless)", sr: "Yes", desc: "See 60 ft in total darkness." },
  { name: "Daze Monster", level: 2, school: "Enchantment", components: "V,S,M", range: "medium", duration: "1 round", save: "Will negates", sr: "Yes", desc: "A creature of 6 HD or less loses its next action." },
  { name: "Eagle's Splendor", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 CHA", desc: "The subject gains +4 to Charisma." },
  { name: "False Life", level: 2, school: "Necromancy", components: "V,S,M", range: "personal", duration: "1 hour/level or until discharged", save: "None", sr: "No", effect: (cl) => `1d10+${Math.min(10, cl)} temporary HP`, desc: "Gain temporary hit points." },
  { name: "Flaming Sphere", level: 2, school: "Evocation", components: "V,S,M", range: "medium", duration: "1 round/level", save: "Reflex negates", sr: "Yes", effect: () => "2d6 fire", desc: "A rolling ball of fire you move each round." },
  { name: "Fox's Cunning", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 INT", desc: "The subject gains +4 to Intelligence." },
  { name: "Glitterdust", level: 2, school: "Conjuration", components: "V,S,M", range: "medium", duration: "1 round/level", save: "Will negates (blindness only)", sr: "No", desc: "Blinds creatures in a 10-ft burst and outlines invisible things." },
  { name: "Gust of Wind", level: 2, school: "Evocation", components: "V,S", range: "60 ft. line", duration: "1 round", save: "Fort negates", sr: "Yes", desc: "A blast of wind knocks down or pushes smaller creatures." },
  { name: "Hideous Laughter", level: 2, school: "Enchantment", components: "V,S,M", range: "close", duration: "1 round/level", save: "Will negates", sr: "Yes", desc: "The target falls prone laughing and can't act." },
  { name: "Hypnotic Pattern", level: 2, school: "Illusion", components: "S,M", range: "medium", duration: "Concentration + 2 rounds", save: "Will negates", sr: "Yes", effect: (cl) => `2d4+${Math.min(10, cl)} HD fascinated`, desc: "Twisting colors fascinate creatures." },
  { name: "Invisibility", level: 2, school: "Illusion", components: "V,S,M", range: "touch", duration: "1 min/level (D)", save: "Will negates (harmless)", sr: "Yes (harmless)", desc: "The subject is invisible until it attacks." },
  { name: "Knock", level: 2, school: "Transmutation", components: "V", range: "medium", duration: "Instantaneous", save: "None", sr: "No", desc: "Opens locked or magically sealed doors." },
  { name: "Levitate", level: 2, school: "Transmutation", components: "V,S,F", range: "close", duration: "1 min/level (D)", save: "None", sr: "No", desc: "Move a subject up or down at your direction." },
  { name: "Locate Object", level: 2, school: "Divination", components: "V,S,F", range: "long", duration: "1 min/level", save: "None", sr: "No", desc: "Sense the direction of a known or familiar object." },
  { name: "Minor Image", level: 2, school: "Illusion", components: "V,S,F", range: "long", duration: "Concentration + 2 rounds", save: "Will disbelief", sr: "No", desc: "Like silent image, with some sound." },
  { name: "Mirror Image", level: 2, school: "Illusion", components: "V,S", range: "personal", duration: "1 min/level (D)", save: "None", sr: "No", effect: (cl) => `1d4+${Math.min(4, Math.floor(cl / 3))} images`, desc: "Illusory duplicates of you confuse attackers." },
  { name: "Owl's Wisdom", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 min/level", save: "Will negates (harmless)", sr: "Yes", effect: () => "+4 WIS", desc: "The subject gains +4 to Wisdom." },
  { name: "Protection from Arrows", level: 2, school: "Abjuration", components: "V,S,F", range: "touch", duration: "1 hour/level or until discharged", save: "Will negates (harmless)", sr: "Yes", desc: "Damage reduction 10/magic against ranged weapons." },
  { name: "Pyrotechnics", level: 2, school: "Transmutation", components: "V,S,M", range: "long", duration: "1d4+1 rounds", save: "Will or Fort negates", sr: "Yes", desc: "Turn a fire into blinding fireworks or choking smoke." },
  { name: "Resist Energy", level: 2, school: "Abjuration", components: "V,S", range: "touch", duration: "10 min/level", save: "Fort negates (harmless)", sr: "Yes", effect: () => "Resist 10", desc: "Ignore the first 10 points of one energy type per attack." },
  { name: "Rope Trick", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "1 hour/level (D)", save: "None", sr: "No", desc: "Up to eight creatures hide in an extradimensional space." },
  { name: "Scare", level: 2, school: "Necromancy", components: "V,S,M", range: "medium", duration: "1 round/level or 1 round", save: "Will partial", sr: "Yes", desc: "Creatures of fewer than 6 HD become frightened." },
  { name: "Scorching Ray", level: 2, school: "Evocation", components: "V,S", range: "close", duration: "Instantaneous", save: "None", sr: "Yes", touch: "ranged", effect: (cl) => `${cl >= 11 ? 3 : cl >= 7 ? 2 : 1} ray(s), 4d6 fire each`, desc: "Rays of fire, each a ranged touch attack." },
  { name: "See Invisibility", level: 2, school: "Divination", components: "V,S,M", range: "personal", duration: "10 min/level (D)", save: "None", sr: "No", desc: "Reveals invisible creatures and objects." },
  { name: "Shatter", level: 2, school: "Evocation", components: "V,S,M", range: "close", duration: "Instantaneous", save: "Will negates (object) or Fort half", sr: "Yes", desc: "Sonic vibration breaks brittle objects or hurts crystalline creatures." },
  { name: "Spectral Hand", level: 2, school: "Necromancy", components: "V,S", range: "medium", duration: "1 min/level (D)", save: "None", sr: "No", desc: "A ghostly hand delivers your touch spells at range." },
  { name: "Spider Climb", level: 2, school: "Transmutation", components: "V,S,M", range: "touch", duration: "10 min/level", save: "Will negates (harmless)", sr: "Yes", desc: "Walk on walls and ceilings." },
  { name: "Touch of Idiocy", level: 2, school: "Enchantment", components: "V,S", range: "touch", duration: "10 min/level", save: "None", sr: "Yes", touch: "melee", effect: () => "1d6 penalty to INT, WIS and CHA", desc: "Dulls the target's mind." },
  { name: "Web", level: 2, school: "Conjuration", components: "V,S,M", range: "medium", duration: "10 min/level (D)", save: "Reflex negates", sr: "No", desc: "Sticky webs fill a 20-ft-radius spread." },
  { name: "Whispering Wind", level: 2, school: "Transmutation", components: "V,S", range: "1 mile/level", duration: "Up to 1 hour/level", save: "None", sr: "No", desc: "Send a short message or sound on the wind." },
];

export const spell35 = (n: string) => SPELLS_35.find((s) => s.name === n);

/** Range text at a caster level. */
export function rangeAt(r: Range35, cl: number): string {
  if (r === "close") return `Close (${25 + 5 * Math.floor(cl / 2)} ft.)`;
  if (r === "medium") return `Medium (${100 + 10 * cl} ft.)`;
  if (r === "long") return `Long (${400 + 40 * cl} ft.)`;
  if (r === "touch") return "Touch";
  if (r === "personal") return "Personal";
  return r;
}

export const LANGUAGES_35 = ["Common", "Abyssal", "Aquan", "Auran", "Celestial", "Draconic", "Dwarven", "Elven", "Giant", "Gnoll", "Gnome", "Goblin", "Halfling", "Ignan", "Infernal", "Orc", "Sylvan", "Terran", "Undercommon"];
