// Species (2024 rules) plus the legacy 2014 Half-Elf. Summaries written for this app.
import type { Ability, Feature, GrantedSpell, SkillId } from "./core";

export interface Lineage {
  id: string;
  name: string;
  text: string;
  speed?: number;
  darkvision?: number;
  resistances?: string[];
  spells?: GrantedSpell[];
  /** 2014 subraces: extra ability increases. */
  asi?: Partial<Record<Ability, number>>;
  hpPerLevel?: number;
  skills?: SkillId[];
  extraLanguages?: number;
  /** 2014 High Elf: one wizard cantrip of your choice. */
  cantripChoice?: string;
  /** Fixed spellcasting ability for this lineage's spells (2014). */
  spellAbility?: Ability;
  /** Pick this many skills (Custom Lineage's skill option). */
  skillChoiceCount?: number;
}

export interface Species {
  id: string;
  name: string;
  book: string;
  legacy?: boolean;
  sizes: ("Medium" | "Small")[];
  speed: number;
  darkvision: number;
  resistances: string[];
  traits: (Feature & { minLevel?: number })[];
  lineageLabel?: string;
  lineages?: Lineage[];
  spells?: GrantedSpell[];
  /** Species spells use a spellcasting ability you choose (INT, WIS or CHA). */
  spellAbilityChoice?: boolean;
  /** Fixed spellcasting ability for species spells (2014). */
  spellAbility?: Ability;
  skills?: SkillId[];
  skillChoice?: { count: number; from?: SkillId[] };
  /** Ability increases from the species itself (2014 races and legacy species). */
  asi?: { fixed: Partial<Record<Ability, number>>; chooseCount?: number; exclude?: Ability[]; /** Custom Lineage: the chosen ability gets +2 instead of +1. */ chooseAmount?: number };
  languages?: string[];
  extraLanguages?: number;
  hpPerLevel?: number;
  originFeat?: boolean;
  savingThrowNote?: string;
  immunities?: string[];
}

const L = (spell: string, minLevel: number, source: string, note = "1 / Long Rest without a slot"): GrantedSpell => ({
  spell,
  minLevel,
  source,
  note,
});

const DRAGONS: [string, string][] = [
  ["Black", "Acid"],
  ["Blue", "Lightning"],
  ["Brass", "Fire"],
  ["Bronze", "Lightning"],
  ["Copper", "Acid"],
  ["Gold", "Fire"],
  ["Green", "Poison"],
  ["Red", "Fire"],
  ["Silver", "Cold"],
  ["White", "Cold"],
];

export const SPECIES: Species[] = [
  {
    id: "aasimar",
    book: "PHB24",
    name: "Aasimar",
    sizes: ["Medium", "Small"],
    speed: 30,
    darkvision: 60,
    resistances: ["Necrotic", "Radiant"],
    spellAbilityChoice: false,
    spells: [{ spell: "Light", minLevel: 1, source: "Aasimar", note: "Cantrip (CHA)" }],
    traits: [
      { name: "Celestial Resistance", source: "Aasimar", text: "Resistance to Necrotic and Radiant damage." },
      { name: "Healing Hands", source: "Aasimar", uses: "1 / Long Rest", text: "Magic action: touch a creature and heal it a number of d4s equal to your Proficiency Bonus." },
      { name: "Light Bearer", source: "Aasimar", text: "You know the Light cantrip (Charisma)." },
      { name: "Celestial Revelation", source: "Aasimar 3", minLevel: 3, uses: "1 / Long Rest", text: "Bonus Action for 1 minute: wings (Fly Speed = Speed), inner radiance, or a necrotic shroud. Once per turn deal extra damage equal to your Proficiency Bonus." },
    ],
  },
  {
    id: "dragonborn",
    book: "PHB24",
    name: "Dragonborn",
    sizes: ["Medium"],
    speed: 30,
    darkvision: 60,
    resistances: [],
    lineageLabel: "Draconic Ancestry",
    lineages: DRAGONS.map(([d, t]) => ({ id: d.toLowerCase(), name: `${d} Dragon (${t})`, text: `Breath weapon and resistance use ${t} damage.`, resistances: [t] })),
    traits: [
      { name: "Breath Weapon", source: "Dragonborn", uses: "PB / Long Rest", text: "Replace one attack with a 15-ft cone or 30-ft line. DEX save (DC 8 + CON mod + PB): 1d10 damage, 2d10 at level 5; half on a success." },
      { name: "Damage Resistance", source: "Dragonborn", text: "Resistance to your ancestry's damage type." },
      { name: "Draconic Flight", source: "Dragonborn 5", minLevel: 5, uses: "1 / Long Rest", text: "Bonus Action: spectral wings give you a Fly Speed equal to your Speed for 10 minutes." },
    ],
  },
  {
    id: "dwarf",
    book: "PHB24",
    name: "Dwarf",
    sizes: ["Medium"],
    speed: 30,
    darkvision: 120,
    resistances: ["Poison"],
    hpPerLevel: 1,
    savingThrowNote: "Advantage on saves to avoid or end the Poisoned condition",
    traits: [
      { name: "Dwarven Resilience", source: "Dwarf", text: "Resistance to Poison damage and Advantage on saves against being Poisoned." },
      { name: "Dwarven Toughness", source: "Dwarf", text: "Your HP maximum increases by 1 for every level." },
      { name: "Stonecunning", source: "Dwarf", uses: "PB / Long Rest", text: "Bonus Action: gain Tremorsense 60 ft for 10 minutes while on or touching stone." },
    ],
  },
  {
    id: "elf",
    book: "PHB24",
    name: "Elf",
    sizes: ["Medium"],
    speed: 30,
    darkvision: 60,
    resistances: [],
    spellAbilityChoice: true,
    skillChoice: { count: 1, from: ["insight", "perception", "survival"] },
    savingThrowNote: "Advantage on saves to avoid or end the Charmed condition",
    lineageLabel: "Elven Lineage",
    lineages: [
      { id: "drow", name: "Drow", darkvision: 120, text: "Darkvision 120 ft. Dancing Lights; Faerie Fire at 3; Darkness at 5.", spells: [L("Dancing Lights", 1, "Drow", "Cantrip"), L("Faerie Fire", 3, "Drow"), L("Darkness", 5, "Drow")] },
      { id: "high", name: "High Elf", text: "Prestidigitation (swap for another Wizard cantrip on a Long Rest); Detect Magic at 3; Misty Step at 5.", spells: [L("Prestidigitation", 1, "High Elf", "Cantrip"), L("Detect Magic", 3, "High Elf"), L("Misty Step", 5, "High Elf")] },
      { id: "wood", name: "Wood Elf", speed: 35, text: "Speed 35 ft. Druidcraft; Longstrider at 3; Pass without Trace at 5.", spells: [L("Druidcraft", 1, "Wood Elf", "Cantrip"), L("Longstrider", 3, "Wood Elf"), L("Pass without Trace", 5, "Wood Elf")] },
    ],
    traits: [
      { name: "Elven Lineage", source: "Elf", text: "Your lineage grants spells; choose INT, WIS or CHA as their spellcasting ability." },
      { name: "Fey Ancestry", source: "Elf", text: "Advantage on saves to avoid or end the Charmed condition." },
      { name: "Keen Senses", source: "Elf", text: "Proficiency in Insight, Perception or Survival." },
      { name: "Trance", source: "Elf", text: "You don't need sleep; a Long Rest takes 4 hours of meditation." },
    ],
  },
  {
    id: "gnome",
    book: "PHB24",
    name: "Gnome",
    sizes: ["Small"],
    speed: 30,
    darkvision: 60,
    resistances: [],
    spellAbilityChoice: true,
    savingThrowNote: "Advantage on INT, WIS and CHA saving throws",
    lineageLabel: "Gnomish Lineage",
    lineages: [
      { id: "forest", name: "Forest Gnome", text: "Minor Illusion; Speak with Animals PB times per Long Rest without a slot.", spells: [L("Minor Illusion", 1, "Forest Gnome", "Cantrip"), L("Speak with Animals", 1, "Forest Gnome", "PB / Long Rest without a slot")] },
      { id: "rock", name: "Rock Gnome", text: "Mending and Prestidigitation; build tiny clockwork devices.", spells: [L("Mending", 1, "Rock Gnome", "Cantrip"), L("Prestidigitation", 1, "Rock Gnome", "Cantrip")] },
    ],
    traits: [
      { name: "Gnomish Cunning", source: "Gnome", text: "Advantage on Intelligence, Wisdom and Charisma saving throws." },
      { name: "Gnomish Lineage", source: "Gnome", text: "Your lineage grants spells; choose INT, WIS or CHA as their spellcasting ability." },
    ],
  },
  {
    id: "goliath",
    book: "PHB24",
    name: "Goliath",
    sizes: ["Medium"],
    speed: 35,
    darkvision: 0,
    resistances: [],
    lineageLabel: "Giant Ancestry",
    lineages: [
      { id: "cloud", name: "Cloud's Jaunt", text: "Bonus Action: teleport up to 30 ft." },
      { id: "fire", name: "Fire's Burn", text: "On a hit, deal an extra 1d10 Fire." },
      { id: "frost", name: "Frost's Chill", text: "On a hit, deal an extra 1d6 Cold and reduce Speed by 10 ft." },
      { id: "hill", name: "Hill's Tumble", text: "On a hit, knock a Large or smaller target Prone." },
      { id: "stone", name: "Stone's Endurance", text: "Reaction: reduce damage taken by 1d12 + CON modifier." },
      { id: "storm", name: "Storm's Thunder", text: "Reaction when damaged by a creature within 60 ft: deal 1d8 Thunder to it." },
    ],
    traits: [
      { name: "Giant Ancestry", source: "Goliath", uses: "PB / Long Rest", text: "A boon from your giant ancestry (see your choice)." },
      { name: "Powerful Build", source: "Goliath", text: "Advantage on checks to end the Grappled condition; count as one size larger for carrying capacity." },
      { name: "Large Form", source: "Goliath 5", minLevel: 5, uses: "1 / Long Rest", text: "Bonus Action: become Large for 10 minutes, with Advantage on STR checks and +10 ft Speed." },
    ],
  },
  {
    id: "halfling",
    book: "PHB24",
    name: "Halfling",
    sizes: ["Small"],
    speed: 30,
    darkvision: 0,
    resistances: [],
    savingThrowNote: "Advantage on saves to avoid or end the Frightened condition",
    traits: [
      { name: "Brave", source: "Halfling", text: "Advantage on saves to avoid or end the Frightened condition." },
      { name: "Halfling Nimbleness", source: "Halfling", text: "Move through the space of any creature a size larger than you." },
      { name: "Luck", source: "Halfling", text: "When you roll a 1 on a D20 Test, reroll it and use the new roll." },
      { name: "Naturally Stealthy", source: "Halfling", text: "Take the Hide action even when only obscured by a creature at least one size larger." },
    ],
  },
  {
    id: "human",
    book: "PHB24",
    name: "Human",
    sizes: ["Medium", "Small"],
    speed: 30,
    darkvision: 0,
    resistances: [],
    skillChoice: { count: 1 },
    originFeat: true,
    traits: [
      { name: "Resourceful", source: "Human", text: "You gain Heroic Inspiration whenever you finish a Long Rest." },
      { name: "Skillful", source: "Human", text: "Proficiency in one skill of your choice." },
      { name: "Versatile", source: "Human", text: "Gain an Origin feat of your choice." },
    ],
  },
  {
    id: "orc",
    book: "PHB24",
    name: "Orc",
    sizes: ["Medium"],
    speed: 30,
    darkvision: 120,
    resistances: [],
    traits: [
      { name: "Adrenaline Rush", source: "Orc", uses: "PB / Short Rest", text: "Dash as a Bonus Action and gain Temporary HP equal to your Proficiency Bonus." },
      { name: "Relentless Endurance", source: "Orc", uses: "1 / Long Rest", text: "When reduced to 0 HP but not killed, drop to 1 HP instead." },
    ],
  },
  {
    id: "tiefling",
    book: "PHB24",
    name: "Tiefling",
    sizes: ["Medium", "Small"],
    speed: 30,
    darkvision: 60,
    resistances: [],
    spellAbilityChoice: true,
    spells: [{ spell: "Thaumaturgy", minLevel: 1, source: "Tiefling", note: "Cantrip" }],
    lineageLabel: "Fiendish Legacy",
    lineages: [
      { id: "abyssal", name: "Abyssal", resistances: ["Poison"], text: "Poison resistance. Poison Spray; Ray of Sickness at 3; Hold Person at 5.", spells: [L("Poison Spray", 1, "Abyssal Legacy", "Cantrip"), L("Ray of Sickness", 3, "Abyssal Legacy"), L("Hold Person", 5, "Abyssal Legacy")] },
      { id: "chthonic", name: "Chthonic", resistances: ["Necrotic"], text: "Necrotic resistance. Chill Touch; False Life at 3; Ray of Enfeeblement at 5.", spells: [L("Chill Touch", 1, "Chthonic Legacy", "Cantrip"), L("False Life", 3, "Chthonic Legacy"), L("Ray of Enfeeblement", 5, "Chthonic Legacy")] },
      { id: "infernal", name: "Infernal", resistances: ["Fire"], text: "Fire resistance. Fire Bolt; Hellish Rebuke at 3; Darkness at 5.", spells: [L("Fire Bolt", 1, "Infernal Legacy", "Cantrip"), L("Hellish Rebuke", 3, "Infernal Legacy"), L("Darkness", 5, "Infernal Legacy")] },
    ],
    traits: [
      { name: "Fiendish Legacy", source: "Tiefling", text: "Your legacy grants a resistance and spells; choose INT, WIS or CHA as their spellcasting ability." },
      { name: "Otherworldly Presence", source: "Tiefling", text: "You know the Thaumaturgy cantrip." },
    ],
  },
  {
    id: "halfElf",
    book: "PHB14",
    name: "Half-Elf (2014 legacy)",
    legacy: true,
    sizes: ["Medium"],
    speed: 30,
    darkvision: 60,
    resistances: [],
    immunities: ["Magical Sleep"],
    skillChoice: { count: 2 },
    asi: { fixed: { CHA: 2 }, chooseCount: 2, exclude: ["CHA"] },
    languages: ["Common", "Elvish"],
    extraLanguages: 1,
    savingThrowNote: "Advantage against being charmed, and magic can't put you to sleep",
    traits: [
      { name: "Ability Score Increase", source: "Half-Elf (2014)", text: "Charisma +2 and two other ability scores of your choice +1." },
      { name: "Darkvision", source: "Half-Elf (2014)", text: "See in dim light within 60 ft as if bright, and in darkness as dim light (shades of gray)." },
      { name: "Fey Ancestry", source: "Half-Elf (2014)", text: "Advantage on saves against being charmed, and magic can't put you to sleep." },
      { name: "Skill Versatility", source: "Half-Elf (2014)", text: "Proficiency in two skills of your choice." },
      { name: "Languages", source: "Half-Elf (2014)", text: "Common, Elvish and one extra language of your choice." },
    ],
  },
];

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
