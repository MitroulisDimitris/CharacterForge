// Sorcerer (2014 rules: PHB 2014, Xanathar's, Tasha's), levels 1-5. Summaries in our own words.
import { mod, type GrantedSpell } from "../data/core";
import type { LevelFeature, Metamagic, SorcererTable, Subclass } from "../data/sorcerer";

export const SORCERER_2014: SorcererTable = {
  hitDie: 6,
  saves: ["CON", "CHA"],
  skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  cantrips: [0, 4, 4, 4, 5, 5],
  spells: [0, 2, 3, 4, 5, 6],
  spellsKind: "Known",
  sorceryPoints: [0, 0, 2, 3, 4, 5],
  metamagicKnown: [0, 0, 0, 2, 2, 2],
  metamagicLevel: 3,
  subclassLevel: 1,
  slots: [[], [2], [3], [4, 2], [4, 3], [4, 3, 2]],
};

export const SORCERER_FEATURES_2014: LevelFeature[] = [
  { level: 1, name: "Spellcasting", source: "Sorcerer 1", text: "Charisma is your spellcasting ability and you can use an arcane focus. You know a fixed set of spells; each time you gain a level you can swap one known spell for another of a level you can cast." },
  { level: 1, name: "Sorcerous Origin", source: "Sorcerer 1", text: "Choose the source of your magic; it grants features at 1st level and later." },
  { level: 2, name: "Font of Magic", source: "Sorcerer 2", text: "Sorcery Points equal to your Sorcerer level, regained on a Long Rest. Bonus Action: turn points into a slot (2 SP = 1st, 3 SP = 2nd, 5 SP = 3rd) or a slot into points equal to its level. Created slots vanish on a Long Rest." },
  { level: 3, name: "Metamagic", source: "Sorcerer 3", text: "Learn two Metamagic options (more at 10th and 17th). Normally only one per spell." },
  { level: 4, name: "Ability Score Improvement", source: "Sorcerer 4", text: "+2 to one ability or +1 to two (max 20), or take a feat if your DM uses feats." },
  { level: 4, name: "Sorcerous Versatility", source: "Sorcerer 4 (Tasha's optional)", book: "TCE", text: "At each Ability Score Improvement level, you can swap one Metamagic option or one sorcerer cantrip for another." },
  { level: 5, name: "Magical Guidance", source: "Sorcerer 5 (Tasha's optional)", book: "TCE", text: "When you fail an ability check, spend 1 Sorcery Point to reroll the d20 (you must use the new roll)." },
];

export const METAMAGIC_2014: Metamagic[] = [
  { id: "careful", name: "Careful Spell", cost: "1 SP", book: "PHB14", text: "Up to CHA-modifier creatures automatically succeed on the spell's saving throw." },
  { id: "distant", name: "Distant Spell", cost: "1 SP", book: "PHB14", text: "Double a spell's range of 5 ft or more, or make a Touch spell reach 30 ft." },
  { id: "empowered", name: "Empowered Spell", cost: "1 SP", book: "PHB14", text: "Reroll up to CHA-modifier damage dice. Can combine with another Metamagic." },
  { id: "extended", name: "Extended Spell", cost: "1 SP", book: "PHB14", text: "Double a spell's duration of 1 minute or more (max 24 hours)." },
  { id: "heightened", name: "Heightened Spell", cost: "3 SP", book: "PHB14", text: "One target has Disadvantage on its first saving throw against the spell." },
  { id: "quickened", name: "Quickened Spell", cost: "2 SP", book: "PHB14", text: "Cast a spell with a casting time of 1 action as a Bonus Action." },
  { id: "subtle", name: "Subtle Spell", cost: "1 SP", book: "PHB14", text: "Cast without Verbal or Somatic components." },
  { id: "twinned", name: "Twinned Spell", cost: "SP = spell level (1 for cantrips)", book: "PHB14", text: "A spell that targets only one creature (and not self) targets a second creature in range." },
  { id: "seeking", name: "Seeking Spell", cost: "2 SP", book: "TCE", text: "Reroll a missed spell attack roll. Can combine with another Metamagic." },
  { id: "transmuted", name: "Transmuted Spell", cost: "1 SP", book: "TCE", text: "Change a spell's acid, cold, fire, lightning, poison or thunder damage to another of those types." },
];

const sub = (src: string, list: [string, number][]): GrantedSpell[] => list.map(([spell, minLevel]) => ({ spell, minLevel, source: src }));

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

export const SUBCLASSES_2014: Subclass[] = [
  {
    id: "draconic",
    name: "Draconic Bloodline",
    book: "PHB14",
    summary: "Your magic comes from dragon blood: tougher body and natural armor.",
    optionLabel: "Dragon Ancestor",
    options: DRAGONS.map(([d, t]) => ({ id: d.toLowerCase(), name: `${d} (${t})`, text: `Your ancestry damage type is ${t} (matters for Elemental Affinity at 6th level).` })),
    hpBonus: (level) => level,
    unarmoredAc: (s) => 13 + mod(s.DEX),
    acNote: "Draconic Resilience (13 + DEX)",
    languages: ["Draconic"],
    features: [
      { level: 1, name: "Dragon Ancestor", source: "Draconic Bloodline 1", text: "Choose a dragon type. You speak, read and write Draconic, and double your Proficiency Bonus on Charisma checks with dragons." },
      { level: 1, name: "Draconic Resilience", source: "Draconic Bloodline 1", text: "Your HP maximum increases by 1 per Sorcerer level. Without armor, your AC is 13 + DEX modifier." },
    ],
    spells: [],
  },
  {
    id: "wild",
    name: "Wild Magic",
    book: "PHB14",
    summary: "Chaotic magic that can surge unpredictably.",
    features: [
      { level: 1, name: "Wild Magic Surge", source: "Wild Magic 1", text: "After you cast a 1st-level+ sorcerer spell, the DM can have you roll a d20; on a 1, roll on the Wild Magic Surge table." },
      { level: 1, name: "Tides of Chaos", source: "Wild Magic 1", uses: "1 / Long Rest", text: "Gain Advantage on one attack roll, ability check or saving throw. The DM may trigger a surge to restore it." },
    ],
    spells: [],
  },
  {
    id: "divineSoul",
    name: "Divine Soul",
    book: "XGE",
    summary: "A divine spark lets you draw on cleric magic.",
    optionLabel: "Divine Affinity",
    options: [
      { id: "good", name: "Good", spell: "Cure Wounds" },
      { id: "evil", name: "Evil", spell: "Inflict Wounds" },
      { id: "law", name: "Law", spell: "Bless" },
      { id: "chaos", name: "Chaos", spell: "Bane" },
      { id: "neutrality", name: "Neutrality", spell: "Protection from Evil and Good" },
    ],
    features: [
      { level: 1, name: "Divine Magic", source: "Divine Soul 1", text: "You can pick sorcerer spells from the cleric spell list too, and you learn your affinity's spell (it doesn't count against spells known). Type cleric picks into the spell notes if they aren't in this app." },
      { level: 1, name: "Favored by the Gods", source: "Divine Soul 1", uses: "1 / Short Rest", text: "When you fail a saving throw or miss with an attack, add 2d4 to the roll, possibly changing the outcome." },
    ],
    spells: [],
  },
  {
    id: "shadow",
    name: "Shadow Magic",
    book: "XGE",
    summary: "Magic of the Shadowfell: darkness and grim resilience.",
    darkvision: 120,
    features: [
      { level: 1, name: "Eyes of the Dark", source: "Shadow Magic 1", text: "Darkvision 120 ft. At 3rd level you learn Darkness (not counted against spells known); you can cast it by spending 2 Sorcery Points and see through it." },
      { level: 1, name: "Strength of the Grave", source: "Shadow Magic 1", uses: "1 / Long Rest", text: "When damage (not radiant or a critical hit) drops you to 0 HP, make a CHA save (DC 5 + damage taken) to drop to 1 HP instead." },
    ],
    spells: [{ spell: "Darkness", minLevel: 3, source: "Eyes of the Dark", note: "Or spend 2 SP" }],
  },
  {
    id: "storm",
    name: "Storm Sorcery",
    book: "XGE",
    summary: "Elemental air magic: winds and storms.",
    languages: ["Primordial"],
    features: [
      { level: 1, name: "Wind Speaker", source: "Storm Sorcery 1", text: "You speak, read and write Primordial (and understand its dialects Aquan, Auran, Ignan and Terran)." },
      { level: 1, name: "Tempestuous Magic", source: "Storm Sorcery 1", text: "Bonus Action right before or after casting a 1st-level+ spell: fly up to 10 ft without provoking Opportunity Attacks." },
    ],
    spells: [],
  },
  {
    id: "aberrant",
    name: "Aberrant Mind",
    book: "TCE",
    summary: "Alien influence grants you psionic powers.",
    features: [
      { level: 1, name: "Psionic Spells", source: "Aberrant Mind 1", text: "You learn extra spells that don't count against spells known. Each can be swapped for a divination or enchantment spell of the same level from the sorcerer, warlock or wizard list." },
      { level: 1, name: "Telepathic Speech", source: "Aberrant Mind 1", text: "Bonus Action: link telepathically with a creature within 30 ft; you can talk mind-to-mind within CHA-modifier miles for minutes equal to your Sorcerer level." },
    ],
    spells: sub("Psionic Spells", [["Arms of Hadar", 1], ["Dissonant Whispers", 1], ["Mind Sliver", 1], ["Calm Emotions", 3], ["Detect Thoughts", 3], ["Hunger of Hadar", 5], ["Sending", 5]]),
  },
  {
    id: "clockwork",
    name: "Clockwork Soul",
    book: "TCE",
    summary: "The cosmic force of order flows through you.",
    features: [
      { level: 1, name: "Clockwork Magic", source: "Clockwork Soul 1", text: "You learn extra spells that don't count against spells known; each can be swapped for an abjuration or transmutation spell of the same level." },
      { level: 1, name: "Restore Balance", source: "Clockwork Soul 1", uses: "CHA mod / Long Rest", text: "Reaction: when a creature within 60 ft is about to roll with Advantage or Disadvantage, cancel it." },
    ],
    spells: sub("Clockwork Magic", [["Alarm", 1], ["Protection from Evil and Good", 1], ["Aid", 3], ["Lesser Restoration", 3], ["Dispel Magic", 5], ["Protection from Energy", 5]]),
  },
];
