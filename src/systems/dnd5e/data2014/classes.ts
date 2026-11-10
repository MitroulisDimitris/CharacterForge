// The 2014 classes (Player's Handbook; Artificer from Tasha's), level 1 for now.
// Numbers follow the books; feature text is summarized in our own words.
// Level-ups past 1 for these classes come in a later phase (maxLevel 1).
import { mod, type GrantedSpell, type SkillId } from "../data/core";
import { FULL_CASTER_SLOTS, sorcererClass, type ClassDef } from "../data/classes";
import type { KitItem } from "../data/equipment";
import type { LevelFeature, Subclass } from "../data/sorcerer";
import { METAMAGIC_2014, SORCERER_2014, SORCERER_FEATURES_2014, SUBCLASSES_2014 } from "./sorcerer";
import { LEVELS } from "./levels";
import { ARTIFICER_SPECIALISTS, BARBARIAN_PATHS, BARD_COLLEGES, DOMAIN_CHANNEL, DRUID_CIRCLES, FIGHTER_ARCHETYPES, MONK_TRADITIONS, PALADIN_OATHS, RANGER_ARCHETYPES, ROGUE_ARCHETYPES, WIZARD_TRADITIONS } from "./subclasses";

const K = (name: string, qty = 1): KitItem => ({ name, qty });
const F = (cls: string, name: string, text: string, uses?: string, book?: string): LevelFeature => ({ level: 1, name, source: `${cls} 1${book ? " (Tasha's optional)" : ""}`, text, uses, book });
const dom = (src: string, list: [string, number][]): GrantedSpell[] => list.map(([spell, minLevel]) => ({ spell, minLevel, source: src }));
const pack = (...names: string[]) => ({ id: "pack", options: names.map((n) => ({ label: n, items: [K(n)] })) });

const ALL_SKILLS: "any" = "any";

// ---------------------------------------------------------------- Cleric domains
const DOMAINS: Subclass[] = [
  {
    id: "knowledge",
    name: "Knowledge Domain",
    book: "PHB14",
    summary: "A seeker of lore: extra languages and expert knowledge skills.",
    extraLanguages: 2,
    skillChoice: { count: 2, from: ["arcana", "history", "nature", "religion"], expertise: true },
    features: [F("Knowledge Domain", "Blessings of Knowledge", "Learn two languages, and gain proficiency in two of Arcana, History, Nature or Religion. Your Proficiency Bonus is doubled for checks with them.")],
    spells: dom("Domain spell", [["Command", 1], ["Identify", 1], ["Augury", 3], ["Suggestion", 3], ["Nondetection", 5], ["Speak with Dead", 5]]),
  },
  {
    id: "life",
    name: "Life Domain",
    book: "PHB14",
    summary: "The classic healer, in heavy armor.",
    armor: ["heavy"],
    features: [
      F("Life Domain", "Bonus Proficiency", "You can wear heavy armor."),
      F("Life Domain", "Disciple of Life", "Your healing spells of 1st level or higher restore an extra 2 + the spell's level hit points."),
    ],
    spells: dom("Domain spell", [["Bless", 1], ["Cure Wounds", 1], ["Lesser Restoration", 3], ["Spiritual Weapon", 3], ["Beacon of Hope", 5], ["Revivify", 5]]),
  },
  {
    id: "light",
    name: "Light Domain",
    book: "PHB14",
    summary: "Radiance and fire: a blaster cleric that blinds attackers.",
    bonusCantrips: ["Light"],
    features: [
      F("Light Domain", "Bonus Cantrip", "You know the Light cantrip; it doesn't count against your cantrips known."),
      F("Light Domain", "Warding Flare", "Reaction when a creature within 30 ft that you can see attacks you: it has Disadvantage on the attack (unless it can't be blinded).", "WIS mod / Long Rest (min 1)"),
    ],
    spells: dom("Domain spell", [["Burning Hands", 1], ["Faerie Fire", 1], ["Flaming Sphere", 3], ["Scorching Ray", 3], ["Daylight", 5], ["Fireball", 5]]),
  },
  {
    id: "nature",
    name: "Nature Domain",
    book: "PHB14",
    summary: "A priest of the wild, with a druid cantrip and heavy armor.",
    armor: ["heavy"],
    cantripChoice: "druid",
    skillChoice: { count: 1, from: ["animalHandling", "nature", "survival"] },
    features: [
      F("Nature Domain", "Acolyte of Nature", "Learn one druid cantrip (it counts as a cleric cantrip but not against your limit) and gain proficiency in Animal Handling, Nature or Survival."),
      F("Nature Domain", "Bonus Proficiency", "You can wear heavy armor."),
    ],
    spells: dom("Domain spell", [["Animal Friendship", 1], ["Speak with Animals", 1], ["Barkskin", 3], ["Spike Growth", 3], ["Plant Growth", 5], ["Wind Wall", 5]]),
  },
  {
    id: "tempest",
    name: "Tempest Domain",
    book: "PHB14",
    summary: "Storm and thunder: a front-line cleric that punishes attackers.",
    armor: ["heavy"],
    martial: true,
    features: [
      F("Tempest Domain", "Bonus Proficiencies", "Martial weapons and heavy armor."),
      F("Tempest Domain", "Wrath of the Storm", "Reaction when a creature within 5 ft hits you: it takes 2d8 lightning or thunder damage (DEX save for half).", "WIS mod / Long Rest (min 1)"),
    ],
    spells: dom("Domain spell", [["Fog Cloud", 1], ["Thunderwave", 1], ["Gust of Wind", 3], ["Shatter", 3], ["Call Lightning", 5], ["Sleet Storm", 5]]),
  },
  {
    id: "trickery",
    name: "Trickery Domain",
    book: "PHB14",
    summary: "Deception and stealth: illusions, duplicates and blessings of sneakiness.",
    features: [F("Trickery Domain", "Blessing of the Trickster", "Action: a willing creature you touch (not you) has Advantage on Stealth checks for 1 hour, or until you use this again.")],
    spells: dom("Domain spell", [["Charm Person", 1], ["Disguise Self", 1], ["Mirror Image", 3], ["Pass without Trace", 3], ["Blink", 5], ["Dispel Magic", 5]]),
  },
  {
    id: "war",
    name: "War Domain",
    book: "PHB14",
    summary: "A warrior priest with extra attacks and heavy armor.",
    armor: ["heavy"],
    martial: true,
    features: [
      F("War Domain", "Bonus Proficiencies", "Martial weapons and heavy armor."),
      F("War Domain", "War Priest", "When you take the Attack action, you can make one weapon attack as a Bonus Action.", "WIS mod / Long Rest (min 1)"),
    ],
    spells: dom("Domain spell", [["Divine Favor", 1], ["Shield of Faith", 1], ["Magic Weapon", 3], ["Spiritual Weapon", 3], ["Crusader's Mantle", 5], ["Spirit Guardians", 5]]),
  },
  {
    id: "forge",
    name: "Forge Domain",
    book: "XGE",
    summary: "A smith-priest: heavy armor and blessed weapons or armor.",
    armor: ["heavy"],
    tools: ["Smith's Tools"],
    features: [
      F("Forge Domain", "Bonus Proficiencies", "Heavy armor and smith's tools."),
      F("Forge Domain", "Blessing of the Forge", "At the end of a Long Rest, touch a nonmagical weapon or suit of armor: it becomes a +1 weapon or +1 armor until your next Long Rest.", "1 / Long Rest"),
    ],
    spells: dom("Domain spell", [["Identify", 1], ["Searing Smite", 1], ["Heat Metal", 3], ["Magic Weapon", 3], ["Elemental Weapon", 5], ["Protection from Energy", 5]]),
  },
  {
    id: "grave",
    name: "Grave Domain",
    book: "XGE",
    summary: "Guardian of the line between life and death; strong healing for the dying.",
    bonusCantrips: ["Spare the Dying"],
    features: [
      F("Grave Domain", "Circle of Mortality", "Healing a creature at 0 HP uses the maximum of each die instead of rolling. You know Spare the Dying (not counted); for you it has a 30-ft range and takes a Bonus Action."),
      F("Grave Domain", "Eyes of the Grave", "Action: until the end of your next turn, sense undead within 60 ft that aren't behind total cover.", "WIS mod / Long Rest (min 1)"),
    ],
    spells: dom("Domain spell", [["Bane", 1], ["False Life", 1], ["Gentle Repose", 3], ["Ray of Enfeeblement", 3], ["Revivify", 5], ["Vampiric Touch", 5]]),
  },
  {
    id: "order",
    name: "Order Domain",
    book: "TCE",
    summary: "Law and command: your healing spells let allies strike.",
    armor: ["heavy"],
    skillChoice: { count: 1, from: ["intimidation", "persuasion"] },
    features: [
      F("Order Domain", "Bonus Proficiencies", "Heavy armor, and Intimidation or Persuasion."),
      F("Order Domain", "Voice of Authority", "When you cast a 1st-level+ spell on an ally, that ally can use its Reaction to make one weapon attack against a creature you choose that it can see."),
    ],
    spells: dom("Domain spell", [["Command", 1], ["Heroism", 1], ["Hold Person", 3], ["Zone of Truth", 3], ["Mass Healing Word", 5], ["Slow", 5]]),
  },
  {
    id: "peace",
    name: "Peace Domain",
    book: "TCE",
    summary: "Bonds of friendship that protect the whole party.",
    skillChoice: { count: 1, from: ["insight", "performance", "persuasion"] },
    features: [
      F("Peace Domain", "Implement of Peace", "Gain proficiency in Insight, Performance or Persuasion."),
      F("Peace Domain", "Emboldening Bond", "Action: bond up to PB willing creatures within 30 ft for 10 minutes. Once per turn, a bonded creature near another can add 1d4 to an attack, check or save.", "PB / Long Rest"),
    ],
    spells: dom("Domain spell", [["Heroism", 1], ["Sanctuary", 1], ["Aid", 3], ["Warding Bond", 3], ["Beacon of Hope", 5], ["Sending", 5]]),
  },
  {
    id: "twilight",
    name: "Twilight Domain",
    book: "TCE",
    summary: "Guardian against the dark: superb darkvision and initiative for the party.",
    armor: ["heavy"],
    martial: true,
    darkvision: 300,
    features: [
      F("Twilight Domain", "Bonus Proficiencies", "Martial weapons and heavy armor."),
      F("Twilight Domain", "Eyes of Night", "Darkvision 300 ft. Action: share it with up to WIS mod willing creatures within 10 ft for 1 hour (once per Long Rest, or spend a spell slot)."),
      F("Twilight Domain", "Vigilant Blessing", "Action: you or a creature you touch has Advantage on its next initiative roll."),
    ],
    spells: dom("Domain spell", [["Faerie Fire", 1], ["Sleep", 1], ["Moonbeam", 3], ["See Invisibility", 3], ["Aura of Vitality", 5], ["Leomund's Tiny Hut", 5]]),
  },
];

// ---------------------------------------------------------------- Warlock patrons
const ex = (list: [string, number][]) => list;
const PATRONS: Subclass[] = [
  {
    id: "archfey",
    name: "The Archfey",
    book: "PHB14",
    summary: "A lord or lady of the fey: charm, fear and slipping away.",
    expanded: ex([["Faerie Fire", 1], ["Sleep", 1], ["Calm Emotions", 3], ["Phantasmal Force", 3], ["Blink", 5], ["Plant Growth", 5]]),
    features: [F("The Archfey", "Fey Presence", "Action: each creature in a 10-ft cube from you makes a WIS save or is Charmed or Frightened (your choice) by you until the end of your next turn.", "1 / Short Rest")],
    spells: [],
  },
  {
    id: "fiend",
    name: "The Fiend",
    book: "PHB14",
    summary: "A pact with a devil or demon: fire, and toughness from your kills.",
    expanded: ex([["Burning Hands", 1], ["Command", 1], ["Blindness/Deafness", 3], ["Scorching Ray", 3], ["Fireball", 5], ["Stinking Cloud", 5]]),
    features: [F("The Fiend", "Dark One's Blessing", "When you reduce a hostile creature to 0 HP, gain temporary HP equal to your CHA modifier + warlock level (minimum 1).")],
    spells: [],
  },
  {
    id: "greatOldOne",
    name: "The Great Old One",
    book: "PHB14",
    summary: "An alien entity beyond the stars: telepathy and madness.",
    expanded: ex([["Dissonant Whispers", 1], ["Tasha's Hideous Laughter", 1], ["Detect Thoughts", 3], ["Phantasmal Force", 3], ["Clairvoyance", 5], ["Sending", 5]]),
    features: [F("The Great Old One", "Awakened Mind", "Speak telepathically to any creature you can see within 30 ft (it needs to know a language to understand).")],
    spells: [],
  },
  {
    id: "celestial",
    name: "The Celestial",
    book: "XGE",
    summary: "A being of the Upper Planes: a warlock that heals.",
    bonusCantrips: ["Light", "Sacred Flame"],
    expanded: ex([["Cure Wounds", 1], ["Guiding Bolt", 1], ["Flaming Sphere", 3], ["Lesser Restoration", 3], ["Daylight", 5], ["Revivify", 5]]),
    features: [
      F("The Celestial", "Bonus Cantrips", "You know Light and Sacred Flame; they count as warlock cantrips but not against your limit."),
      F("The Celestial", "Healing Light", "A pool of d6s equal to 1 + warlock level. Bonus Action: heal a creature within 60 ft by spending up to CHA-modifier dice (min 1) from the pool.", "Pool refills on a Long Rest"),
    ],
    spells: [],
  },
  {
    id: "hexblade",
    name: "The Hexblade",
    book: "XGE",
    summary: "A sentient weapon from the Shadowfell: a melee warlock that curses foes.",
    armor: ["medium", "shield"],
    martial: true,
    weaponCha: true,
    expanded: ex([["Shield", 1], ["Wrathful Smite", 1], ["Blur", 3], ["Branding Smite", 3], ["Blink", 5], ["Elemental Weapon", 5]]),
    features: [
      F("The Hexblade", "Hexblade's Curse", "Bonus Action: curse a creature within 30 ft for 1 minute. You add PB to damage against it, crit it on 19-20, and regain HP (warlock level + CHA mod) if it dies.", "1 / Short Rest"),
      F("The Hexblade", "Hex Warrior", "Medium armor, shields and martial weapons. With a weapon you're proficient with (not two-handed), you can use Charisma instead of Strength or Dexterity for attack and damage rolls."),
    ],
    spells: [],
  },
  {
    id: "fathomless",
    name: "The Fathomless",
    book: "TCE",
    summary: "A power of the deep ocean: a spectral tentacle and a life at sea.",
    expanded: ex([["Create or Destroy Water", 1], ["Thunderwave", 1], ["Gust of Wind", 3], ["Silence", 3], ["Lightning Bolt", 5], ["Sleet Storm", 5]]),
    features: [
      F("The Fathomless", "Tentacle of the Deeps", "Bonus Action: summon a 10-ft spectral tentacle within 60 ft for 1 minute. Bonus Action: it makes a melee spell attack for 1d8 cold damage and reduces the target's speed by 10 ft.", "PB / Long Rest"),
      F("The Fathomless", "Gift of the Sea", "Swimming speed 40 ft, and you can breathe underwater."),
    ],
    spells: [],
  },
  {
    id: "genie",
    name: "The Genie",
    book: "TCE",
    summary: "A noble genie's patronage: a magic vessel and elemental fury.",
    expanded: ex([["Detect Evil and Good", 1], ["Phantasmal Force", 3], ["Create Food and Water", 5]]),
    optionLabel: "Genie Kind",
    options: [
      { id: "dao", name: "Dao (earth, bludgeoning)", expanded: [["Sanctuary", 1], ["Spike Growth", 3], ["Meld into Stone", 5]] },
      { id: "djinni", name: "Djinni (air, thunder)", expanded: [["Thunderwave", 1], ["Gust of Wind", 3], ["Wind Wall", 5]] },
      { id: "efreeti", name: "Efreeti (fire, fire)", expanded: [["Burning Hands", 1], ["Scorching Ray", 3], ["Fireball", 5]] },
      { id: "marid", name: "Marid (water, cold)", expanded: [["Fog Cloud", 1], ["Blur", 3], ["Sleet Storm", 5]] },
    ],
    features: [
      F("The Genie", "Genie's Vessel", "A Tiny object is your focus. Bottled Respite: as an Action, vanish into it for up to twice your PB in hours (1 / Long Rest). Genie's Wrath: once per turn, a hit deals extra damage equal to your PB of your genie's type."),
    ],
    spells: [],
  },
];

// ---------------------------------------------------------------- Classes
const barbarian: ClassDef = {
  id: "barbarian",
  name: "Barbarian",
  book: "PHB14",
  summary: "A fierce warrior who fights in a rage: tough, hard-hitting and hard to put down.",
  primary: "Strength, then Constitution",
  recommended: ["STR", "CON", "DEX", "WIS", "CHA", "INT"],
  hitDie: 12,
  saves: ["STR", "CON"],
  armor: ["light", "medium", "shield"],
  weapons: { simple: true, martial: true },
  weaponText: "Simple and martial weapons",
  tools: [],
  skills: { count: 2, from: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
  features: [
    F("Barbarian", "Rage", "Bonus Action, 1 minute (no heavy armor): Advantage on STR checks and saves, +2 damage on STR melee weapon attacks, and resistance to bludgeoning, piercing and slashing damage. You can't cast or concentrate on spells while raging. It ends early if you neither attack nor take damage for a turn.", "2 / Long Rest"),
    F("Barbarian", "Unarmored Defense", "Without armor, your AC is 10 + DEX modifier + CON modifier. You can still use a shield."),
  ],
  subclassLevel: 3,
  subclassLabel: "Primal Path",
  subclasses: [],
  equipment: {
    choices: [
      { id: "weapon1", options: [{ label: "Greataxe", items: [K("Greataxe")] }, { label: "Any martial melee weapon", items: [], pick: { pool: "martialMelee", count: 1 } }] },
      { id: "weapon2", options: [{ label: "Two handaxes", items: [K("Handaxe", 2)] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
    ],
    fixed: [K("Explorer's Pack"), K("Javelin", 4)],
  },
  gold: { dice: 2, mult: 10 },
  unarmored: { ac: (s) => 10 + mod(s.DEX) + mod(s.CON), note: "Unarmored Defense (10 + DEX + CON)", shieldOk: true },
  maxLevel: 1,
};

const bard: ClassDef = {
  id: "bard",
  name: "Bard",
  book: "PHB14",
  summary: "A performer whose music is magic: inspires allies, heals, and knows a bit of everything.",
  primary: "Charisma, then Dexterity",
  recommended: ["CHA", "DEX", "CON", "WIS", "INT", "STR"],
  hitDie: 8,
  saves: ["DEX", "CHA"],
  armor: ["light"],
  weapons: { simple: true, list: ["Hand Crossbow", "Longsword", "Rapier", "Shortsword"] },
  weaponText: "Simple weapons, hand crossbows, longswords, rapiers, shortswords",
  tools: [],
  toolChoice: { count: 3, pool: "instrument", label: "Three musical instruments" },
  skills: { count: 3, from: ALL_SKILLS },
  features: [
    F("Bard", "Spellcasting", "Charisma is your spellcasting ability; a musical instrument can be your focus. You know a fixed set of spells and can swap one when you gain a level. You can cast bard rituals you know."),
    F("Bard", "Bardic Inspiration", "Bonus Action: give a creature within 60 ft that can hear you a d6. Within 10 minutes it can add the die to one attack roll, ability check or saving throw.", "CHA mod / Long Rest (min 1)"),
  ],
  subclassLevel: 3,
  subclassLabel: "Bard College",
  subclasses: [],
  spell: { ability: "CHA", label: "Known", list: "bard", cantrips: [0, 2, 2, 2, 3, 3], table: [0, 4, 5, 6, 7, 8], slots: FULL_CASTER_SLOTS, focus: "Musical instrument", startLevel: 1 },
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Rapier", items: [K("Rapier")] }, { label: "Longsword", items: [K("Longsword")] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
      pack("Diplomat's Pack", "Entertainer's Pack"),
      { id: "instrument", options: [{ label: "Lute", items: [K("Lute")] }, { label: "Another musical instrument", items: [], pick: { pool: "instrument", count: 1 } }] },
    ],
    fixed: [K("Leather Armor"), K("Dagger")],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

const cleric: ClassDef = {
  id: "cleric",
  name: "Cleric",
  book: "PHB14",
  summary: "A priest who channels a god's power: healing, protection and divine wrath, shaped by your domain.",
  primary: "Wisdom, then Constitution or Strength",
  recommended: ["WIS", "CON", "STR", "DEX", "CHA", "INT"],
  hitDie: 8,
  saves: ["WIS", "CHA"],
  armor: ["light", "medium", "shield"],
  weapons: { simple: true },
  weaponText: "Simple weapons",
  tools: [],
  skills: { count: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
  features: [
    F("Cleric", "Spellcasting", "Wisdom is your spellcasting ability; a holy symbol can be your focus. After a Long Rest you prepare WIS modifier + cleric level spells from the whole cleric list. You can cast prepared cleric rituals as rituals."),
    F("Cleric", "Divine Domain", "Choose the domain of your deity. It gives domain spells (always prepared, not counted) and features at 1st level and later."),
  ],
  subclassLevel: 1,
  subclassLabel: "Divine Domain",
  subclasses: DOMAINS,
  spell: { ability: "WIS", label: "Prepared", list: "cleric", cantrips: [0, 3, 3, 3, 4, 4], formula: "full", slots: FULL_CASTER_SLOTS, focus: "Holy symbol", startLevel: 1 },
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Mace", items: [K("Mace")] }, { label: "Warhammer (if proficient)", items: [K("Warhammer")], needs: "martial" }] },
      { id: "armor", options: [{ label: "Scale mail", items: [K("Scale Mail")] }, { label: "Leather armor", items: [K("Leather Armor")] }, { label: "Chain mail (if proficient)", items: [K("Chain Mail")], needs: "heavy" }] },
      { id: "ranged", options: [{ label: "Light crossbow and 20 bolts", items: [K("Light Crossbow"), K("Crossbow Bolts", 20)] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
      pack("Priest's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Shield"), K("Holy Symbol (Amulet)")],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

const druid: ClassDef = {
  id: "druid",
  name: "Druid",
  book: "PHB14",
  summary: "A priest of nature: plant and weather magic, and later the power to turn into beasts.",
  primary: "Wisdom, then Constitution",
  recommended: ["WIS", "CON", "DEX", "INT", "STR", "CHA"],
  hitDie: 8,
  saves: ["INT", "WIS"],
  armor: ["light", "medium", "shield"],
  weapons: { list: ["Club", "Dagger", "Dart", "Javelin", "Mace", "Quarterstaff", "Scimitar", "Sickle", "Sling", "Spear"] },
  weaponText: "Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears",
  tools: ["Herbalism Kit"],
  skills: { count: 2, from: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
  languages: ["Druidic"],
  features: [
    F("Druid", "Druidic", "You know Druidic, the secret language of druids, and can leave hidden messages in it. Druids won't wear armor or use shields made of metal."),
    F("Druid", "Spellcasting", "Wisdom is your spellcasting ability; a druidic focus can be your focus. After a Long Rest you prepare WIS modifier + druid level spells from the whole druid list. You can cast prepared druid rituals as rituals."),
  ],
  subclassLevel: 2,
  subclassLabel: "Druid Circle",
  subclasses: [],
  spell: { ability: "WIS", label: "Prepared", list: "druid", cantrips: [0, 2, 2, 2, 3, 3], formula: "full", slots: FULL_CASTER_SLOTS, focus: "Druidic focus", startLevel: 1 },
  equipment: {
    choices: [
      { id: "shield", options: [{ label: "Wooden shield", items: [K("Shield")] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
      { id: "weapon", options: [{ label: "Scimitar", items: [K("Scimitar")] }, { label: "Any simple melee weapon", items: [], pick: { pool: "simpleMelee", count: 1 } }] },
    ],
    fixed: [K("Leather Armor"), K("Explorer's Pack"), K("Druidic Focus (Wooden Staff)")],
  },
  gold: { dice: 2, mult: 10 },
  maxLevel: 1,
};

const fighter: ClassDef = {
  id: "fighter",
  name: "Fighter",
  book: "PHB14",
  summary: "A master of weapons and armor: the most flexible warrior, sturdy and reliable.",
  primary: "Strength or Dexterity, then Constitution",
  recommended: ["STR", "CON", "DEX", "WIS", "CHA", "INT"],
  hitDie: 10,
  saves: ["STR", "CON"],
  armor: ["light", "medium", "heavy", "shield"],
  weapons: { simple: true, martial: true },
  weaponText: "Simple and martial weapons",
  tools: [],
  skills: { count: 2, from: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
  fightingStyle: { level: 1 },
  features: [
    F("Fighter", "Fighting Style", "Choose a fighting style (see below). You can't take the same style twice."),
    F("Fighter", "Second Wind", "Bonus Action: regain 1d10 + fighter level hit points.", "1 / Short Rest"),
  ],
  subclassLevel: 3,
  subclassLabel: "Martial Archetype",
  subclasses: [],
  equipment: {
    choices: [
      { id: "armor", options: [{ label: "Chain mail", items: [K("Chain Mail")] }, { label: "Leather armor, longbow and 20 arrows", items: [K("Leather Armor"), K("Longbow"), K("Arrows", 20)] }] },
      { id: "weapons", options: [{ label: "A martial weapon and a shield", items: [K("Shield")], pick: { pool: "martial", count: 1 } }, { label: "Two martial weapons", items: [], pick: { pool: "martial", count: 2 } }] },
      { id: "ranged", options: [{ label: "Light crossbow and 20 bolts", items: [K("Light Crossbow"), K("Crossbow Bolts", 20)] }, { label: "Two handaxes", items: [K("Handaxe", 2)] }] },
      pack("Dungeoneer's Pack", "Explorer's Pack"),
    ],
    fixed: [],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

const monk: ClassDef = {
  id: "monk",
  name: "Monk",
  book: "PHB14",
  summary: "A martial artist who fights unarmed and unarmored, fast and precise.",
  primary: "Dexterity, then Wisdom",
  recommended: ["DEX", "WIS", "CON", "STR", "INT", "CHA"],
  hitDie: 8,
  saves: ["STR", "DEX"],
  armor: [],
  weapons: { simple: true, list: ["Shortsword"] },
  weaponText: "Simple weapons, shortswords",
  tools: [],
  toolChoice: { count: 1, pool: "artisanOrInstrument", label: "One type of artisan's tools or one musical instrument" },
  skills: { count: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
  features: [
    F("Monk", "Unarmored Defense", "Without armor or a shield, your AC is 10 + DEX modifier + WIS modifier."),
    F("Monk", "Martial Arts", "Unarmed and with monk weapons (shortswords and simple melee weapons that aren't two-handed or heavy): use DEX instead of STR, roll a d4 instead of low damage, and after the Attack action make one unarmed strike as a Bonus Action."),
  ],
  subclassLevel: 3,
  subclassLabel: "Monastic Tradition",
  subclasses: [],
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Shortsword", items: [K("Shortsword")] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
      pack("Dungeoneer's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Dart", 10)],
  },
  gold: { dice: 5, mult: 1 },
  unarmored: { ac: (s) => 10 + mod(s.DEX) + mod(s.WIS), note: "Unarmored Defense (10 + DEX + WIS)", shieldOk: false },
  maxLevel: 1,
};

const paladin: ClassDef = {
  id: "paladin",
  name: "Paladin",
  book: "PHB14",
  summary: "A holy warrior bound by an oath: heavy armor, healing hands and divine smites.",
  primary: "Strength, then Charisma",
  recommended: ["STR", "CHA", "CON", "WIS", "DEX", "INT"],
  hitDie: 10,
  saves: ["WIS", "CHA"],
  armor: ["light", "medium", "heavy", "shield"],
  weapons: { simple: true, martial: true },
  weaponText: "Simple and martial weapons",
  tools: [],
  skills: { count: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
  features: [
    F("Paladin", "Divine Sense", "Action: until the end of your next turn, know the location of any celestial, fiend or undead within 60 ft that isn't behind total cover, and of consecrated or desecrated places.", "1 + CHA mod / Long Rest"),
    F("Paladin", "Lay on Hands", "A pool of healing equal to 5 × paladin level, refilled on a Long Rest. Action: touch a creature to restore HP from the pool, or spend 5 points to cure one disease or neutralize one poison."),
  ],
  subclassLevel: 3,
  subclassLabel: "Sacred Oath",
  subclasses: [],
  spell: { ability: "CHA", label: "Prepared", list: "paladin", cantrips: [0, 0, 0, 0, 0, 0], formula: "half", slots: [[], [], [2], [3], [3], [4, 2]], focus: "Holy symbol", startLevel: 2 },
  equipment: {
    choices: [
      { id: "weapons", options: [{ label: "A martial weapon and a shield", items: [K("Shield")], pick: { pool: "martial", count: 1 } }, { label: "Two martial weapons", items: [], pick: { pool: "martial", count: 2 } }] },
      { id: "second", options: [{ label: "Five javelins", items: [K("Javelin", 5)] }, { label: "Any simple melee weapon", items: [], pick: { pool: "simpleMelee", count: 1 } }] },
      pack("Priest's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Chain Mail"), K("Holy Symbol (Amulet)")],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

export const FAVORED_ENEMIES = ["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid races (e.g. gnolls and orcs)"];
export const FAVORED_TERRAINS = ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"];

const ranger: ClassDef = {
  id: "ranger",
  name: "Ranger",
  book: "PHB14",
  summary: "A hunter and scout of the wilds: bow or blades, tracking, and nature magic from 2nd level.",
  primary: "Dexterity, then Wisdom",
  recommended: ["DEX", "WIS", "CON", "STR", "INT", "CHA"],
  hitDie: 10,
  saves: ["STR", "DEX"],
  armor: ["light", "medium", "shield"],
  weapons: { simple: true, martial: true },
  weaponText: "Simple and martial weapons",
  tools: [],
  skills: { count: 3, from: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
  choices: ["favoredEnemy", "naturalExplorer"],
  features: [
    F("Ranger", "Favored Enemy", "Choose a type of creature (or two humanoid races). Advantage on Survival checks to track them and on INT checks to recall facts about them, and you learn one language they speak."),
    F("Ranger", "Natural Explorer", "Choose a favored terrain. There you double your Proficiency Bonus on INT and WIS checks about it, difficult terrain doesn't slow your group, you can't get lost by non-magical means, and you forage, track and travel more effectively."),
    { ...F("Ranger", "Favored Foe", "Replaces Favored Enemy. When you hit a creature, mark it (like concentration, 1 minute): the first hit each turn against it deals an extra 1d4 damage.", "PB / Long Rest", "TCE"), replaces: "Favored Enemy" },
    { ...F("Ranger", "Deft Explorer", "Replaces Natural Explorer. Canny: choose one skill you're proficient in to gain expertise (double PB), and learn two languages.", undefined, "TCE"), replaces: "Natural Explorer" },
  ],
  subclassLevel: 3,
  subclassLabel: "Ranger Archetype",
  subclasses: [],
  spell: { ability: "WIS", label: "Known", list: "ranger", cantrips: [0, 0, 0, 0, 0, 0], table: [0, 0, 2, 3, 3, 4], slots: [[], [], [2], [3], [3], [4, 2]], focus: "None (components)", startLevel: 2 },
  equipment: {
    choices: [
      { id: "armor", options: [{ label: "Scale mail", items: [K("Scale Mail")] }, { label: "Leather armor", items: [K("Leather Armor")] }] },
      { id: "weapons", options: [{ label: "Two shortswords", items: [K("Shortsword", 2)] }, { label: "Two simple melee weapons", items: [], pick: { pool: "simpleMelee", count: 2 } }] },
      pack("Dungeoneer's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Longbow"), K("Quiver"), K("Arrows", 20)],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

const rogue: ClassDef = {
  id: "rogue",
  name: "Rogue",
  book: "PHB14",
  summary: "A skilled expert in stealth and precision: sneak attacks, many skills and expertise.",
  primary: "Dexterity, then Intelligence or Charisma",
  recommended: ["DEX", "CON", "WIS", "INT", "CHA", "STR"],
  hitDie: 8,
  saves: ["DEX", "INT"],
  armor: ["light"],
  weapons: { simple: true, list: ["Hand Crossbow", "Longsword", "Rapier", "Shortsword"] },
  weaponText: "Simple weapons, hand crossbows, longswords, rapiers, shortswords",
  tools: ["Thieves' Tools"],
  skills: { count: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"] },
  languages: ["Thieves' Cant"],
  expertise: { level: 1, count: 2, thieves: true },
  features: [
    F("Rogue", "Expertise", "Choose two of your skill proficiencies, or one skill and thieves' tools: your Proficiency Bonus is doubled for them."),
    F("Rogue", "Sneak Attack", "Once per turn, deal an extra 1d6 damage when you hit with a finesse or ranged weapon and you have Advantage, or an ally of the target is within 5 ft of it (and you don't have Disadvantage)."),
    F("Rogue", "Thieves' Cant", "A secret mix of slang and signs that lets you hide messages in normal conversation."),
  ],
  subclassLevel: 3,
  subclassLabel: "Roguish Archetype",
  subclasses: [],
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Rapier", items: [K("Rapier")] }, { label: "Shortsword", items: [K("Shortsword")] }] },
      { id: "second", options: [{ label: "Shortbow and 20 arrows", items: [K("Shortbow"), K("Quiver"), K("Arrows", 20)] }, { label: "Shortsword", items: [K("Shortsword")] }] },
      pack("Burglar's Pack", "Dungeoneer's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Leather Armor"), K("Dagger", 2), K("Thieves' Tools")],
  },
  gold: { dice: 4, mult: 10 },
  maxLevel: 1,
};

const warlock: ClassDef = {
  id: "warlock",
  name: "Warlock",
  book: "PHB14",
  summary: "A spellcaster who made a pact with a powerful patron: few spell slots that refill on a short rest, and Eldritch Blast.",
  primary: "Charisma, then Constitution",
  recommended: ["CHA", "CON", "DEX", "WIS", "INT", "STR"],
  hitDie: 8,
  saves: ["WIS", "CHA"],
  armor: ["light"],
  weapons: { simple: true },
  weaponText: "Simple weapons",
  tools: [],
  skills: { count: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
  features: [
    F("Warlock", "Otherworldly Patron", "Choose your patron. It adds spells to your warlock list (you still pick them) and gives features at 1st level and later."),
    F("Warlock", "Pact Magic", "Charisma is your spellcasting ability; an arcane focus can be your focus. Your few spell slots are always of your highest slot level and all come back on a Short or Long Rest."),
  ],
  subclassLevel: 1,
  subclassLabel: "Otherworldly Patron",
  subclasses: PATRONS,
  spell: { ability: "CHA", label: "Known", list: "warlock", cantrips: [0, 2, 2, 2, 3, 3], table: [0, 2, 3, 4, 5, 6], slots: [[], [1], [2], [0, 2], [0, 2], [0, 0, 2]], pact: true, focus: "Arcane focus", startLevel: 1 },
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Light crossbow and 20 bolts", items: [K("Light Crossbow"), K("Crossbow Bolts", 20)] }, { label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
      { id: "focus", options: [{ label: "Component pouch", items: [K("Component Pouch")] }, { label: "Arcane focus", items: [K("Arcane Focus (Rod)")] }] },
      pack("Scholar's Pack", "Dungeoneer's Pack"),
      { id: "simple", options: [{ label: "Any simple weapon", items: [], pick: { pool: "simple", count: 1 } }] },
    ],
    fixed: [K("Leather Armor"), K("Dagger", 2)],
  },
  gold: { dice: 4, mult: 10 },
  maxLevel: 1,
};

const wizard: ClassDef = {
  id: "wizard",
  name: "Wizard",
  book: "PHB14",
  summary: "A scholar of magic with a spellbook: the widest choice of spells, prepared each day.",
  primary: "Intelligence, then Constitution or Dexterity",
  recommended: ["INT", "CON", "DEX", "WIS", "CHA", "STR"],
  hitDie: 6,
  saves: ["INT", "WIS"],
  armor: [],
  weapons: { list: ["Dagger", "Dart", "Sling", "Quarterstaff", "Light Crossbow"] },
  weaponText: "Daggers, darts, slings, quarterstaffs, light crossbows",
  tools: [],
  skills: { count: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
  features: [
    F("Wizard", "Spellcasting", "Intelligence is your spellcasting ability; an arcane focus can be your focus. Your spellbook starts with six 1st-level wizard spells. After a Long Rest you prepare INT modifier + wizard level of them. You can cast any ritual in your spellbook as a ritual without preparing it, and copy new spells you find into your book."),
    F("Wizard", "Arcane Recovery", "Once per day after a Short Rest, recover spell slots whose combined level is up to half your wizard level (rounded up), none of 6th level or higher.", "1 / day"),
  ],
  subclassLevel: 2,
  subclassLabel: "Arcane Tradition",
  subclasses: [],
  spell: { ability: "INT", label: "Prepared", list: "wizard", cantrips: [0, 3, 3, 3, 4, 4], formula: "full", slots: FULL_CASTER_SLOTS, spellbook: [0, 6, 8, 10, 12, 14], focus: "Arcane focus", startLevel: 1 },
  equipment: {
    choices: [
      { id: "weapon", options: [{ label: "Quarterstaff", items: [K("Quarterstaff")] }, { label: "Dagger", items: [K("Dagger")] }] },
      { id: "focus", options: [{ label: "Component pouch", items: [K("Component Pouch")] }, { label: "Arcane focus", items: [K("Arcane Focus (Wand)")] }] },
      pack("Scholar's Pack", "Explorer's Pack"),
    ],
    fixed: [K("Spellbook")],
  },
  gold: { dice: 4, mult: 10 },
  maxLevel: 1,
};

const artificer: ClassDef = {
  id: "artificer",
  name: "Artificer",
  book: "TCE",
  summary: "An inventor who channels magic through tools and objects: spells, gadgets and (from 2nd level) magic infusions.",
  primary: "Intelligence, then Constitution",
  recommended: ["INT", "CON", "DEX", "WIS", "STR", "CHA"],
  hitDie: 8,
  saves: ["CON", "INT"],
  armor: ["light", "medium", "shield"],
  weapons: { simple: true },
  weaponText: "Simple weapons",
  tools: ["Thieves' Tools", "Tinker's Tools"],
  toolChoice: { count: 1, pool: "artisan", label: "One type of artisan's tools" },
  skills: { count: 2, from: ["arcana", "history", "investigation", "medicine", "nature", "perception", "sleightOfHand"] },
  features: [
    F("Artificer", "Magical Tinkering", "Action, with thieves' or artisan's tools in hand: give a Tiny object a light, a recorded message, a smell or sound, or a still image. Up to INT modifier objects at once (min 1)."),
    F("Artificer", "Spellcasting", "Intelligence is your spellcasting ability; you cast through thieves' tools, artisan's tools or an infused item (you must hold one). After a Long Rest you prepare INT modifier + half your artificer level (round down, min 1) spells from the artificer list. You can cast prepared artificer rituals as rituals."),
  ],
  subclassLevel: 3,
  subclassLabel: "Artificer Specialist",
  subclasses: [],
  spell: { ability: "INT", label: "Prepared", list: "artificer", cantrips: [0, 2, 2, 2, 2, 2], formula: "half", slots: [[], [2], [2], [3], [3], [4, 2]], focus: "Thieves' tools or artisan's tools", startLevel: 1 },
  equipment: {
    choices: [
      { id: "simple", options: [{ label: "Any two simple weapons", items: [], pick: { pool: "simple", count: 2 } }] },
      { id: "armor", options: [{ label: "Studded leather armor", items: [K("Studded Leather Armor")] }, { label: "Scale mail", items: [K("Scale Mail")] }] },
    ],
    fixed: [K("Light Crossbow"), K("Crossbow Bolts", 20), K("Thieves' Tools"), K("Dungeoneer's Pack")],
  },
  gold: { dice: 5, mult: 10 },
  maxLevel: 1,
};

/** Artificer prepares INT + half level, minimum 1 — same as "half" (with min 1 in spellLimit). */
export const SORCERER_CLASS_2014 = sorcererClass(SORCERER_2014, SORCERER_FEATURES_2014, SUBCLASSES_2014, METAMAGIC_2014, "2014");

const SUBCLASSES: Record<string, Subclass[]> = {
  barbarian: BARBARIAN_PATHS,
  bard: BARD_COLLEGES,
  druid: DRUID_CIRCLES,
  fighter: FIGHTER_ARCHETYPES,
  monk: MONK_TRADITIONS,
  paladin: PALADIN_OATHS,
  ranger: RANGER_ARCHETYPES,
  rogue: ROGUE_ARCHETYPES,
  wizard: WIZARD_TRADITIONS,
  artificer: ARTIFICER_SPECIALISTS,
};
// Cleric domains gain their Channel Divinity option at 2nd level.
DOMAINS.forEach((d) => DOMAIN_CHANNEL[d.id] && d.features.push(DOMAIN_CHANNEL[d.id]));

/** Level 1 definition + levels 2-5 (levels.ts) + subclasses (subclasses.ts). */
function complete(k: ClassDef): ClassDef {
  const L = LEVELS[k.id];
  if (!L || k.id === "sorcerer") return k;
  const features = [...k.features, ...L.features].map((f) => (L.dyn?.[f.name] && !f.dyn ? { ...f, dyn: L.dyn[f.name] } : f));
  return { ...k, ...L.extra, features, subclasses: SUBCLASSES[k.id] ?? k.subclasses, maxLevel: 5 };
}

export const CLASSES_2014: ClassDef[] = [barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, SORCERER_CLASS_2014, warlock, wizard, artificer].map(complete);

export const FIGHTING_STYLES: { id: string; name: string; book: string; text: string; only?: string }[] = [
  { id: "archery", name: "Archery", book: "PHB14", text: "+2 to attack rolls with ranged weapons." },
  { id: "defense", name: "Defense", book: "PHB14", text: "+1 AC while wearing armor." },
  { id: "dueling", name: "Dueling", book: "PHB14", text: "+2 damage with a melee weapon held in one hand when you hold no other weapon." },
  { id: "greatWeapon", name: "Great Weapon Fighting", book: "PHB14", text: "Reroll 1s and 2s on damage dice with two-handed or versatile melee weapons held in two hands." },
  { id: "protection", name: "Protection", book: "PHB14", text: "With a shield, use your Reaction to give Disadvantage to an attack against a creature within 5 ft of you." },
  { id: "twoWeapon", name: "Two-Weapon Fighting", book: "PHB14", text: "Add your ability modifier to the damage of your off-hand attack." },
  { id: "blindFighting", name: "Blind Fighting", book: "TCE", text: "Blindsight 10 ft." },
  { id: "interception", name: "Interception", book: "TCE", text: "With a shield or weapon, Reaction: reduce damage to a creature within 5 ft by 1d10 + PB." },
  { id: "superiorTechnique", name: "Superior Technique", book: "TCE", text: "Learn one Battle Master maneuver and gain one d6 superiority die (regained on a Short Rest)." },
  { id: "thrownWeapon", name: "Thrown Weapon Fighting", book: "TCE", text: "Draw a thrown weapon as part of the attack, and +2 damage with thrown weapons." },
  { id: "unarmedFighting", name: "Unarmed Fighting", book: "TCE", text: "Unarmed strikes deal 1d6 + STR (1d8 with both hands free), and 1d4 to a creature you grapple at the start of your turn." },
  { id: "blessedWarrior", name: "Blessed Warrior", book: "TCE", only: "paladin", text: "Learn two cleric cantrips; they count as paladin spells and use Charisma." },
  { id: "druidicWarrior", name: "Druidic Warrior", book: "TCE", only: "ranger", text: "Learn two druid cantrips; they count as ranger spells and use Wisdom." },
];

/** Styles a class can take (Fighter: all but the paladin/ranger-only ones). */
export const stylesFor = (cls: ClassDef) => FIGHTING_STYLES.filter((s) => (cls.fightingStyle?.styles ? cls.fightingStyle.styles.includes(s.id) : !s.only));

export const classById = (id: string) => CLASSES_2014.find((c) => c.id === id);
export const SKILLS_ANY = ALL_SKILLS;
export type { SkillId };
