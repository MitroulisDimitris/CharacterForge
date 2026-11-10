// Sorcerer class (2024 rules), levels 1-5, plus the shared types the 2014 data also uses.
// Text is summarized in our own words.
import { mod, type AbilityScores, type Feature, type GrantedSpell, type SkillId } from "./core";
import type { ArmorCategory } from "./equipment";

export const MAX_LEVEL = 5;

export interface SorcererTable {
  hitDie: number;
  saves: readonly ["CON", "CHA"];
  skillChoices: { count: number; from: SkillId[] };
  /** index = level */
  cantrips: number[];
  /** Prepared (2024) or known (2014) leveled spells, index = level. */
  spells: number[];
  spellsKind: "Prepared" | "Known";
  sorceryPoints: number[];
  metamagicKnown: number[];
  metamagicLevel: number;
  subclassLevel: number;
  slots: number[][];
}

export interface LevelFeature extends Feature {
  level: number;
  /** Only shown when this book is allowed (e.g. Tasha's optional features). */
  book?: string;
  /** Tasha's optional replacement: shown instead of this feature when the player opts in. */
  replaces?: string;
  /** Level-dependent detail put in front of the text (e.g. "3 rages, +2 damage"). */
  dyn?: (level: number) => string;
}

export interface Metamagic {
  id: string;
  name: string;
  cost: string;
  text: string;
  book: string;
}

export interface SubclassOption {
  id: string;
  name: string;
  text?: string;
  /** Spell always known/prepared because of this option. */
  spell?: string;
  /** Spells this option adds to the class list (Genie kind). */
  expanded?: [string, number][];
  /** Spells always prepared because of this option (Circle of the Land). */
  spells?: GrantedSpell[];
}

/** A multi-pick list a subclass offers (maneuvers, runes, arcane shots…). */
export interface SubclassPicks {
  label: string;
  /** How many picks at each level (index = level). */
  count: number[];
  options: { id: string; name: string; text: string }[];
  /** The picks are weapons: "weapon" = proficiency; "monkWeapon" = proficiency + counts as a monk weapon (Kensei). */
  grants?: "weapon" | "monkWeapon";
  /** Kensei: one melee and one ranged pick. */
  rule?: "meleeAndRanged";
}

export interface Subclass {
  id: string;
  name: string;
  book: string;
  summary: string;
  features: LevelFeature[];
  spells: GrantedSpell[];
  optionLabel?: string;
  options?: SubclassOption[];
  /** Extra max HP at a given sorcerer level. */
  hpBonus?: (level: number) => number;
  /** Unarmored AC formula when not wearing armor. */
  unarmoredAc?: (scores: AbilityScores) => number;
  acNote?: string;
  darkvision?: number;
  languages?: string[];
  // ----- used by other classes' subclasses (2014 cleric domains, warlock patrons) -----
  /** Extra armor proficiencies (e.g. heavy armor for some domains). */
  armor?: ArmorCategory[];
  /** Proficiency with martial weapons. */
  martial?: boolean;
  /** Proficiency with these weapons (College of Swords: scimitar). */
  weapons?: string[];
  tools?: string[];
  /** Pick skills (Knowledge domain gives expertise in them too). */
  skillChoice?: { count: number; from: SkillId[]; expertise?: boolean };
  /** Cantrips known for free (don't count against the class limit). */
  bonusCantrips?: string[];
  /** Learn one free cantrip from this class's list (e.g. "druid"). */
  cantripChoice?: string;
  /** Extra languages of your choice. */
  extraLanguages?: number;
  /** Spells added to the class list for this character: [spell, class level it unlocks]. */
  expanded?: [string, number][];
  /** Hexblade: use Charisma for weapon attacks (not two-handed). */
  weaponCha?: boolean;
  /** Choices like Battle Master maneuvers, stored in the character's subclassPicks. */
  picks?: SubclassPicks;
  /** Third-caster subclasses (Eldritch Knight, Arcane Trickster). */
  spell?: import("./classes").SpellConfig;
  /** Eldritch Knight / Arcane Trickster: schools most of their spells must come from. */
  spellSchools?: string[];
  /** Choose one of these cantrips for free (Arcane Archer: Prestidigitation or Druidcraft). */
  cantripOptions?: string[];
  /** Add this ability's modifier to initiative (War Magic, Swashbuckler, Gloom Stalker). */
  initiativeBonus?: "INT" | "WIS" | "CHA";
  /** Fixed skill proficiencies. */
  skills?: SkillId[];
  /** Those fixed skills also get expertise (Scout). */
  expertiseSkills?: boolean;
}

export const SORCERER_2024: SorcererTable = {
  hitDie: 6,
  saves: ["CON", "CHA"],
  skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  cantrips: [0, 4, 4, 4, 5, 5],
  spells: [0, 2, 4, 6, 7, 9],
  spellsKind: "Prepared",
  sorceryPoints: [0, 0, 2, 3, 4, 5],
  metamagicKnown: [0, 0, 2, 2, 2, 2],
  metamagicLevel: 2,
  subclassLevel: 3,
  slots: [[], [2], [3], [4, 2], [4, 3], [4, 3, 2]],
};

export const SORCERER_FEATURES_2024: LevelFeature[] = [
  { level: 1, name: "Spellcasting", source: "Sorcerer 1", text: "Charisma is your spellcasting ability. You can use an Arcane Focus. You can swap one cantrip and one prepared spell whenever you gain a level." },
  { level: 1, name: "Innate Sorcery", source: "Sorcerer 1", uses: "2 / Long Rest", text: "Bonus Action for 1 minute: your sorcerer spell save DC goes up by 1 and you have Advantage on sorcerer spell attack rolls." },
  { level: 2, name: "Font of Magic", source: "Sorcerer 2", text: "You regain all Sorcery Points on a Long Rest. Expend a spell slot to gain points equal to its level, or spend points as a Bonus Action to make a slot: 2 SP = 1st, 3 SP = 2nd, 5 SP = 3rd (needs level 5). Created slots vanish on a Long Rest." },
  { level: 2, name: "Metamagic", source: "Sorcerer 2", text: "You know 2 Metamagic options and can use one per spell by spending Sorcery Points. Swap one option whenever you gain a level." },
  { level: 3, name: "Sorcerer Subclass", source: "Sorcerer 3", text: "Choose your sorcerous origin." },
  { level: 4, name: "Ability Score Improvement", source: "Sorcerer 4", text: "Gain the Ability Score Improvement feat or another feat you qualify for." },
  { level: 5, name: "Sorcerous Restoration", source: "Sorcerer 5", uses: "1 / Long Rest", text: "When you finish a Short Rest, regain Sorcery Points up to half your Sorcerer level (round down)." },
];

export const METAMAGIC_2024: Metamagic[] = [
  { id: "careful", name: "Careful Spell", cost: "1 SP", book: "PHB24", text: "Up to CHA-modifier creatures automatically succeed on the spell's save and take no damage on a success." },
  { id: "distant", name: "Distant Spell", cost: "1 SP", book: "PHB24", text: "Double a spell's range, or make a Touch spell reach 30 ft." },
  { id: "empowered", name: "Empowered Spell", cost: "1 SP", book: "PHB24", text: "Reroll up to CHA-modifier damage dice. Can combine with other Metamagic." },
  { id: "extended", name: "Extended Spell", cost: "1 SP", book: "PHB24", text: "Double a spell's duration (max 24 hours) and gain Advantage on its Concentration saves." },
  { id: "heightened", name: "Heightened Spell", cost: "2 SP", book: "PHB24", text: "One target has Disadvantage on saves against the spell." },
  { id: "quickened", name: "Quickened Spell", cost: "2 SP", book: "PHB24", text: "Cast an Action spell as a Bonus Action. Not if you've already cast a 1st-level+ spell this turn, and you can't cast one after." },
  { id: "seeking", name: "Seeking Spell", cost: "1 SP", book: "PHB24", text: "Reroll a missed spell attack roll. Can combine with other Metamagic." },
  { id: "subtle", name: "Subtle Spell", cost: "1 SP", book: "PHB24", text: "Cast without Verbal, Somatic or non-costly Material components." },
  { id: "transmuted", name: "Transmuted Spell", cost: "1 SP", book: "PHB24", text: "Change a spell's damage type among acid, cold, fire, lightning, poison and thunder." },
  { id: "twinned", name: "Twinned Spell", cost: "1 SP", book: "PHB24", text: "Raise a spell's effective level by 1 when it gains an extra target that way (e.g. Hold Person on two foes)." },
];

const sub = (src: string, list: [string, number][]): GrantedSpell[] => list.map(([spell, minLevel]) => ({ spell, minLevel, source: src }));

export const SUBCLASSES_2024: Subclass[] = [
  {
    id: "draconic",
    name: "Draconic Sorcery",
    book: "PHB24",
    summary: "Dragon blood toughens your body and gives you draconic magic.",
    hpBonus: (level) => (level >= 3 ? level : 0),
    unarmoredAc: (s) => 10 + mod(s.DEX) + mod(s.CHA),
    acNote: "Draconic Resilience (10 + DEX + CHA)",
    features: [
      { level: 3, name: "Draconic Resilience", source: "Draconic Sorcery 3", text: "Your HP maximum increases by 3, plus 1 more for every Sorcerer level after 3rd. Without armor, your AC is 10 + DEX modifier + CHA modifier." },
      { level: 3, name: "Draconic Spells", source: "Draconic Sorcery 3", text: "You always have certain spells prepared (listed in your spells) and they don't count against your prepared total." },
    ],
    spells: sub("Draconic Spells", [["Alter Self", 3], ["Chromatic Orb", 3], ["Command", 3], ["Dragon's Breath", 3], ["Fear", 5], ["Fly", 5]]),
  },
  {
    id: "aberrant",
    name: "Aberrant Sorcery",
    book: "PHB24",
    summary: "Alien influence grants you psionic powers.",
    features: [
      { level: 3, name: "Psionic Spells", source: "Aberrant Sorcery 3", text: "You always have certain psionic spells prepared; they don't count against your prepared total." },
      { level: 3, name: "Telepathic Speech", source: "Aberrant Sorcery 3", text: "Bonus Action: form a telepathic link with a creature within 30 ft. You can speak mind-to-mind within CHA-modifier miles for minutes equal to your Sorcerer level." },
    ],
    spells: sub("Psionic Spells", [["Arms of Hadar", 3], ["Calm Emotions", 3], ["Detect Thoughts", 3], ["Dissonant Whispers", 3], ["Mind Sliver", 3], ["Hunger of Hadar", 5], ["Sending", 5]]),
  },
  {
    id: "clockwork",
    name: "Clockwork Sorcery",
    book: "PHB24",
    summary: "The cosmic force of order flows through you.",
    features: [
      { level: 3, name: "Clockwork Spells", source: "Clockwork Sorcery 3", text: "You always have certain spells of order prepared; they don't count against your prepared total." },
      { level: 3, name: "Restore Balance", source: "Clockwork Sorcery 3", uses: "CHA mod / Long Rest", text: "Reaction: when a creature within 60 ft is about to roll with Advantage or Disadvantage, cancel it." },
    ],
    spells: sub("Clockwork Spells", [["Aid", 3], ["Alarm", 3], ["Lesser Restoration", 3], ["Protection from Evil and Good", 3], ["Dispel Magic", 5], ["Protection from Energy", 5]]),
  },
  {
    id: "wild",
    name: "Wild Magic Sorcery",
    book: "PHB24",
    summary: "Chaotic magic surges unpredictably from you.",
    features: [
      { level: 3, name: "Wild Magic Surge", source: "Wild Magic Sorcery 3", text: "Once per turn when you cast a spell with a slot, roll a d20. On a 20, roll on the Wild Magic Surge table (ask your DM)." },
      { level: 3, name: "Tides of Chaos", source: "Wild Magic Sorcery 3", uses: "1 / Long Rest", text: "Give yourself Advantage on one D20 Test. Casting a slotted spell before a Long Rest may trigger an automatic surge that restores this use." },
    ],
    spells: [],
  },
];
