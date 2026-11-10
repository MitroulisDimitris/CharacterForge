// Subclasses chosen at 2nd or 3rd level (2014: PHB, Xanathar's, Tasha's), features up to 5th
// level, plus the cleric domains' Channel Divinity. Summaries in our own words.
import type { GrantedSpell, SkillId } from "../data/core";
import type { LevelFeature, Subclass, SubclassPicks } from "../data/sorcerer";
import { WEAPONS } from "../data/equipment";

/** Weapons as pick options (id = weapon name). */
const weaponOpts = (f: (w: (typeof WEAPONS)[number]) => boolean): SubclassPicks["options"] =>
  WEAPONS.filter(f).map((w) => ({ id: w.name, name: w.name, text: `${w.damage} ${w.type}${w.properties !== "—" ? ` · ${w.properties}` : ""}` }));
const F = (src: string, level: number, name: string, text: string, uses?: string): LevelFeature => ({ level, name, source: `${src} ${level}`, text, uses });
const sp = (src: string, list: [string, number][]): GrantedSpell[] => list.map(([spell, minLevel]) => ({ spell, minLevel, source: src }));
const S = (id: string, name: string, book: string, summary: string, features: LevelFeature[], o: Partial<Subclass> = {}): Subclass => ({ id, name, book, summary, features, spells: [], ...o });
const ALL_SKILLS: SkillId[] = ["acrobatics", "animalHandling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleightOfHand", "stealth", "survival"];

// ---------------------------------------------------------------- Barbarian (3)
export const BARBARIAN_PATHS: Subclass[] = [
  S("berserker", "Path of the Berserker", "PHB14", "Pure fury: extra attacks while raging, at the cost of exhaustion.", [F("Berserker", 3, "Frenzy", "While raging you can frenzy: make one melee weapon attack as a Bonus Action each turn. When the rage ends you gain a level of exhaustion.")]),
  S("totemWarrior", "Path of the Totem Warrior", "PHB14", "A spirit animal guides you and shapes your rage.", [
    F("Totem Warrior", 3, "Spirit Seeker", "Cast Beast Sense and Speak with Animals as rituals."),
    F("Totem Warrior", 3, "Totem Spirit", "Your totem animal empowers your rage (see your choice)."),
  ], {
    optionLabel: "Totem animal",
    options: [
      { id: "bear", name: "Bear", text: "While raging, resistance to all damage except psychic." },
      { id: "eagle", name: "Eagle", text: "While raging (no heavy armor), opportunity attacks against you have Disadvantage and you can Dash as a Bonus Action." },
      { id: "elk", name: "Elk (Xanathar's/SCAG)", text: "While raging (no heavy armor), +15 ft walking speed." },
      { id: "tiger", name: "Tiger (Xanathar's/SCAG)", text: "While raging, +10 ft to long and high jumps." },
      { id: "wolf", name: "Wolf", text: "While raging, your friends have Advantage on melee attacks against hostile creatures within 5 ft of you." },
    ],
  }),
  S("ancestralGuardian", "Path of the Ancestral Guardian", "XGE", "Ancestor spirits protect your allies from the foe you strike.", [F("Ancestral Guardian", 3, "Ancestral Protectors", "While raging, the first creature you hit each turn has Disadvantage on attacks against anyone but you, and others take half damage from it, until your next turn.")]),
  S("stormHerald", "Path of the Storm Herald", "XGE", "Your rage becomes a storm aura of desert, sea or tundra.", [F("Storm Herald", 3, "Storm Aura", "While raging, a 10-ft aura: activate it as a Bonus Action for its effect (see your environment).")], {
    optionLabel: "Environment",
    options: [
      { id: "desert", name: "Desert", text: "Each other creature in the aura takes 2 fire damage." },
      { id: "sea", name: "Sea", text: "One creature in the aura makes a DEX save or takes 1d6 lightning damage (half on success)." },
      { id: "tundra", name: "Tundra", text: "Each creature of your choice in the aura gains 2 temporary HP." },
    ],
  }),
  S("zealot", "Path of the Zealot", "XGE", "Divine fury: extra radiant or necrotic damage, and hard to kill for good.", [
    F("Zealot", 3, "Divine Fury", "While raging, the first creature you hit each turn takes extra 1d6 + half your barbarian level radiant or necrotic damage."),
    F("Zealot", 3, "Warrior of the Gods", "Spells that bring you back from the dead need no material components."),
  ]),
  S("beast", "Path of the Beast", "TCE", "Your rage turns you partly beast: bite, claws or tail.", [F("Beast", 3, "Form of the Beast", "When you rage, grow a bite (1d8, heal PB on a hit once per turn when below half HP), claws (1d6, extra attack with them) or a tail (1d8, reach, Reaction +1d8 AC).")]),
  S("wildMagic", "Path of Wild Magic", "TCE", "Your rage unleashes random magical effects.", [
    F("Wild Magic", 3, "Magic Awareness", "Action: sense spells and magic items within 60 ft until the end of your next turn.", "PB / Long Rest"),
    F("Wild Magic", 3, "Wild Surge", "When you rage, roll on the Wild Magic table for a random effect (shadowy tendrils, teleport, exploding spirit, magic weapon, retribution, protective lights, flowers, bolt of light)."),
  ]),
];

// ---------------------------------------------------------------- Bard (3)
export const BARD_COLLEGES: Subclass[] = [
  S("lore", "College of Lore", "PHB14", "Masters of knowledge: more skills and words that cut down foes' rolls.", [
    F("Lore", 3, "Bonus Proficiencies", "Proficiency in three skills of your choice."),
    F("Lore", 3, "Cutting Words", "Reaction: spend a Bardic Inspiration to subtract the die from a creature's attack roll, ability check or damage roll."),
  ], { skillChoice: { count: 3, from: ALL_SKILLS } }),
  S("valor", "College of Valor", "PHB14", "Warrior-skalds: armor, weapons and inspiration for damage and AC.", [
    F("Valor", 3, "Bonus Proficiencies", "Medium armor, shields and martial weapons."),
    F("Valor", 3, "Combat Inspiration", "A creature with your inspiration can add the die to a weapon damage roll, or to its AC against one attack as a Reaction."),
  ], { armor: ["medium", "shield"], martial: true }),
  S("glamour", "College of Glamour", "XGE", "Feywild charm: inspire temporary HP and captivate crowds.", [
    F("Glamour", 3, "Mantle of Inspiration", "Bonus Action, spend a Bardic Inspiration: up to CHA mod creatures within 60 ft gain temporary HP and can use a Reaction to move without provoking."),
    F("Glamour", 3, "Enthralling Performance", "After performing for 1 minute, up to CHA mod listeners make a WIS save or are charmed by you for an hour.", "1 / Short Rest"),
  ]),
  S("swords", "College of Swords", "XGE", "Blade-dancing entertainers with flourishes.", [
    F("Swords", 3, "Bonus Proficiencies", "Medium armor and the scimitar; a weapon you're proficient with can be your spellcasting focus."),
    F("Swords", 3, "Fighting Style", "Dueling or Two-Weapon Fighting (see your choice)."),
    F("Swords", 3, "Blade Flourish", "When you attack, +10 ft speed; on a hit, spend a Bardic Inspiration for a flourish: Defensive (add to AC), Slashing (hit a second creature) or Mobile (push the target)."),
  ], {
    armor: ["medium"],
    weapons: ["Scimitar"],
    optionLabel: "Fighting style",
    options: [
      { id: "dueling", name: "Dueling", text: "+2 damage with a one-handed melee weapon and no other weapon." },
      { id: "twoWeapon", name: "Two-Weapon Fighting", text: "Add your ability modifier to the off-hand attack's damage." },
    ],
  }),
  S("whispers", "College of Whispers", "XGE", "Spies and blackmailers: psychic blades and words of terror.", [
    F("Whispers", 3, "Psychic Blades", "Once per turn when you hit with a weapon, spend a Bardic Inspiration to deal extra 2d6 psychic damage."),
    F("Whispers", 3, "Words of Terror", "Talk with a creature alone for 1 minute: it makes a WIS save or is frightened of you or a creature of your choice for an hour.", "1 / Short Rest"),
  ]),
  S("creation", "College of Creation", "TCE", "The Song of Creation: animate objects and conjure items.", [
    F("Creation", 3, "Mote of Potential", "Your Bardic Inspiration dice create a mote with an extra effect on ability checks (roll twice), attacks (thunder burst) or saves (temporary HP)."),
    F("Creation", 3, "Performance of Creation", "Action: create a nonmagical item worth up to 20 × bard level GP that lasts PB hours.", "1 / Long Rest"),
  ]),
  S("eloquence", "College of Eloquence", "TCE", "Masters of persuasion whose words weaken enemies.", [
    F("Eloquence", 3, "Silver Tongue", "Treat a d20 roll of 9 or lower as a 10 on Persuasion and Deception checks."),
    F("Eloquence", 3, "Unsettling Words", "Bonus Action: spend a Bardic Inspiration to subtract the die from a creature's next saving throw."),
  ]),
];

// ---------------------------------------------------------------- Druid (2)
const land = (id: string, name: string, l3: [string, string], l5: [string, string]) => ({ id, name, spells: sp(`Circle spell (${name})`, [[l3[0], 3], [l3[1], 3], [l5[0], 5], [l5[1], 5]]) });
export const DRUID_CIRCLES: Subclass[] = [
  S("land", "Circle of the Land", "PHB14", "A keeper of the land: extra spells tied to your terrain and slot recovery.", [
    F("Land", 2, "Bonus Cantrip", "Learn one extra druid cantrip."),
    F("Land", 2, "Natural Recovery", "Once per day after a Short Rest, recover spell slots with combined level up to half your druid level (round up)."),
    F("Land", 3, "Circle Spells", "Your land grants spells that are always prepared."),
  ], {
    cantripChoice: "druid",
    optionLabel: "Land",
    options: [
      land("arctic", "Arctic", ["Hold Person", "Spike Growth"], ["Sleet Storm", "Slow"]),
      land("coast", "Coast", ["Mirror Image", "Misty Step"], ["Water Breathing", "Water Walk"]),
      land("desert", "Desert", ["Blur", "Silence"], ["Create Food and Water", "Protection from Energy"]),
      land("forest", "Forest", ["Barkskin", "Spider Climb"], ["Call Lightning", "Plant Growth"]),
      land("grassland", "Grassland", ["Invisibility", "Pass without Trace"], ["Daylight", "Haste"]),
      land("mountain", "Mountain", ["Spider Climb", "Spike Growth"], ["Lightning Bolt", "Meld into Stone"]),
      land("swamp", "Swamp", ["Darkness", "Melf's Acid Arrow"], ["Water Walk", "Stinking Cloud"]),
      land("underdark", "Underdark", ["Spider Climb", "Web"], ["Gaseous Form", "Stinking Cloud"]),
    ],
  }),
  S("moon", "Circle of the Moon", "PHB14", "Shapeshifting warriors: tougher beasts, as a Bonus Action.", [
    F("Moon", 2, "Combat Wild Shape", "Wild Shape as a Bonus Action; while transformed, spend a spell slot as a Bonus Action to heal 1d8 per slot level."),
    F("Moon", 2, "Circle Forms", "Wild Shape into beasts of CR 1 (no flying or swimming limits still apply by level)."),
  ]),
  S("dreams", "Circle of Dreams", "XGE", "Touched by the Feywild: healing magic and safe rest.", [F("Dreams", 2, "Balm of the Summer Court", "A pool of d6s equal to your druid level. Bonus Action: heal a creature within 120 ft with up to half your level in dice; it also gains 1 temporary HP per die.", "Pool refills on a Long Rest")]),
  S("shepherd", "Circle of the Shepherd", "XGE", "Friend of beasts and summoner of spirit totems.", [
    F("Shepherd", 2, "Speech of the Woods", "You speak Sylvan, and beasts can understand you."),
    F("Shepherd", 2, "Spirit Totem", "Bonus Action: summon a bear (temp HP, STR advantage), hawk (advantage on attacks) or unicorn (better healing) spirit aura for 1 minute.", "1 / Short Rest"),
  ], { languages: ["Sylvan"] }),
  S("spores", "Circle of Spores", "TCE", "Decay and fungi: necrotic spores and a symbiotic shell.", [
    F("Spores", 2, "Halo of Spores", "Reaction: a creature you can see within 10 ft makes a CON save or takes 1d4 necrotic damage."),
    F("Spores", 2, "Symbiotic Entity", "Spend a Wild Shape use: gain 4 temp HP per druid level; while they last, Halo of Spores rolls twice and your melee hits deal +1d6 necrotic."),
    F("Spores", 2, "Circle Spells", "Chill Touch is a bonus cantrip; more spells are always prepared at 3rd and 5th level."),
  ], { bonusCantrips: ["Chill Touch"], spells: sp("Circle spell", [["Blindness/Deafness", 3], ["Gentle Repose", 3], ["Animate Dead", 5], ["Gaseous Form", 5]]) }),
  S("stars", "Circle of Stars", "TCE", "A star map and constellation forms.", [
    F("Stars", 2, "Star Map", "You know Guidance, and can cast Guiding Bolt without a slot a number of times equal to your PB per Long Rest."),
    F("Stars", 2, "Starry Form", "Spend a Wild Shape use to take a starry form for 10 minutes: Archer (Bonus Action radiant attack), Chalice (extra healing) or Dragon (minimum 10 on concentration and INT/WIS checks)."),
  ], { bonusCantrips: ["Guidance"], spells: [{ spell: "Guiding Bolt", minLevel: 2, source: "Star Map", note: "PB times per Long Rest without a slot" }] }),
  S("wildfire", "Circle of Wildfire", "TCE", "Destruction and renewal: a wildfire spirit companion.", [
    F("Wildfire", 2, "Summon Wildfire Spirit", "Spend a Wild Shape use to summon a wildfire spirit that fights beside you and can teleport allies."),
    F("Wildfire", 2, "Circle Spells", "Spells always prepared from 2nd level on."),
  ], { spells: sp("Circle spell", [["Burning Hands", 2], ["Cure Wounds", 2], ["Flaming Sphere", 3], ["Scorching Ray", 3], ["Plant Growth", 5], ["Revivify", 5]]) }),
];

// ---------------------------------------------------------------- Fighter (3)
const MANEUVERS: SubclassPicks["options"] = [
  ["commander", "Commander's Strike", "Forgo an attack; an ally makes a weapon attack with its Reaction, adding the superiority die to damage."],
  ["disarming", "Disarming Attack", "Add the die to damage; the target makes a STR save or drops an item."],
  ["distracting", "Distracting Strike", "Add the die to damage; the next attack by someone else against the target has Advantage."],
  ["evasive", "Evasive Footwork", "When you move, add the die to your AC until you stop."],
  ["feinting", "Feinting Attack", "Bonus Action: Advantage on your next attack against a creature within 5 ft; add the die to damage."],
  ["goading", "Goading Attack", "Add the die to damage; the target makes a WIS save or has Disadvantage attacking anyone but you."],
  ["lunging", "Lunging Attack", "+5 ft reach for one melee attack; add the die to damage."],
  ["maneuvering", "Maneuvering Attack", "Add the die to damage; an ally can move half its speed without provoking from the target."],
  ["menacing", "Menacing Attack", "Add the die to damage; the target makes a WIS save or is frightened of you."],
  ["parry", "Parry", "Reaction when hit in melee: reduce the damage by the die + DEX."],
  ["precision", "Precision Attack", "Add the die to an attack roll."],
  ["pushing", "Pushing Attack", "Add the die to damage; a Large or smaller target makes a STR save or is pushed 15 ft."],
  ["rally", "Rally", "Bonus Action: an ally gains temporary HP equal to the die + CHA."],
  ["riposte", "Riposte", "Reaction when a creature misses you in melee: attack it, adding the die to damage."],
  ["sweeping", "Sweeping Attack", "On a hit, damage a second creature next to the target by the die."],
  ["trip", "Trip Attack", "Add the die to damage; a Large or smaller target makes a STR save or falls Prone."],
  ["ambush", "Ambush (Tasha's)", "Add the die to a Stealth check or initiative roll."],
  ["baitAndSwitch", "Bait and Switch (Tasha's)", "Swap places with an ally within 5 ft; one of you adds the die to AC."],
  ["brace", "Brace (Tasha's)", "Reaction when a creature enters your reach: attack it, adding the die to damage."],
  ["commandingPresence", "Commanding Presence (Tasha's)", "Add the die to an Intimidation, Performance or Persuasion check."],
  ["grapplingStrike", "Grappling Strike (Tasha's)", "After hitting, grapple as a Bonus Action, adding the die to the check."],
  ["quickToss", "Quick Toss (Tasha's)", "Bonus Action: throw a weapon, adding the die to damage."],
  ["tacticalAssessment", "Tactical Assessment (Tasha's)", "Add the die to an Investigation, History or Insight check."],
].map(([id, name, text]) => ({ id, name, text }));

const THIRD_CASTER = { ability: "INT" as const, label: "Known" as const, list: "wizard", cantrips: [0, 0, 0, 2, 2, 2], table: [0, 0, 0, 3, 4, 4], slots: [[], [], [], [2], [3], [3]], focus: "Arcane focus", startLevel: 3 };

export const FIGHTER_ARCHETYPES: Subclass[] = [
  S("champion", "Champion", "PHB14", "Simple, reliable power: more critical hits.", [F("Champion", 3, "Improved Critical", "Your weapon attacks score a critical hit on a 19 or 20.")]),
  S("battleMaster", "Battle Master", "PHB14", "A tactician with combat maneuvers fueled by superiority dice.", [
    F("Battle Master", 3, "Combat Superiority", "Learn three maneuvers; you have four superiority dice (d8), regained on a Short Rest. Save DC 8 + PB + STR or DEX.", "4 d8 / Short Rest"),
    F("Battle Master", 3, "Student of War", "Proficiency with one type of artisan's tools (add it under Other tools)."),
  ], { picks: { label: "Maneuvers", count: [0, 0, 0, 3, 3, 3], options: MANEUVERS } }),
  S("eldritchKnight", "Eldritch Knight", "PHB14", "A warrior-mage with wizard spells (mostly abjuration and evocation).", [
    F("Eldritch Knight", 3, "Spellcasting", "Intelligence-based wizard spells: two cantrips and three 1st-level spells (all but one must be abjuration or evocation)."),
    F("Eldritch Knight", 3, "Weapon Bond", "Bond with up to two weapons: they can't be disarmed and you can summon one to your hand as a Bonus Action."),
  ], { spell: { ...THIRD_CASTER, focus: "Arcane focus" }, spellSchools: ["Abjuration", "Evocation"] }),
  S("arcaneArcher", "Arcane Archer", "XGE", "Elven-style archery infused with magic.", [
    F("Arcane Archer", 3, "Arcane Archer Lore", "Proficiency in Arcana or Nature, and learn Prestidigitation or Druidcraft."),
    F("Arcane Archer", 3, "Arcane Shot", "Learn two Arcane Shot options; twice per Short Rest, apply one when you hit with an arrow.", "2 / Short Rest"),
  ], {
    skillChoice: { count: 1, from: ["arcana", "nature"] },
    cantripOptions: ["Prestidigitation", "Druidcraft"],
    picks: {
      label: "Arcane Shots",
      count: [0, 0, 0, 2, 2, 2],
      options: [
        ["banishing", "Banishing Arrow", "CHA save or banished to the Feywild until the end of its next turn."],
        ["beguiling", "Beguiling Arrow", "+2d6 psychic; WIS save or charmed by an ally of your choice."],
        ["bursting", "Bursting Arrow", "Explodes for 2d6 force damage to creatures within 10 ft."],
        ["enfeebling", "Enfeebling Arrow", "+2d6 necrotic; CON save or its weapon damage is halved."],
        ["grasping", "Grasping Arrow", "+2d6 poison; brambles slow the target and hurt it when it moves."],
        ["piercing", "Piercing Arrow", "Passes through objects, hitting each creature in a 30-ft line (DEX save) for weapon damage + 1d6 piercing."],
        ["seeking", "Seeking Arrow", "Fire at a creature you've seen in the past minute, ignoring cover; DEX save for half damage, +1d6 force."],
        ["shadow", "Shadow Arrow", "+2d6 psychic; WIS save or it can't see beyond 5 ft."],
      ].map(([id, name, text]) => ({ id, name, text })),
    },
  }),
  S("cavalier", "Cavalier", "XGE", "A mounted defender who marks foes.", [
    F("Cavalier", 3, "Bonus Proficiency", "One skill from Animal Handling, History, Insight, Performance or Persuasion (or a language)."),
    F("Cavalier", 3, "Born to the Saddle", "Advantage on saves to avoid falling off a mount; mounting costs only 5 ft of movement."),
    F("Cavalier", 3, "Unwavering Mark", "Melee hits mark the target: it has Disadvantage attacking others, and you can punish it with a Bonus Action attack.", "STR mod / Long Rest"),
  ], { skillChoice: { count: 1, from: ["animalHandling", "history", "insight", "performance", "persuasion"] } }),
  S("samurai", "Samurai", "XGE", "Indomitable fighting spirit.", [
    F("Samurai", 3, "Bonus Proficiency", "One skill from History, Insight, Performance or Persuasion (or a language)."),
    F("Samurai", 3, "Fighting Spirit", "Bonus Action: Advantage on weapon attacks this turn and 5 temporary HP.", "3 / Long Rest"),
  ], { skillChoice: { count: 1, from: ["history", "insight", "performance", "persuasion"] } }),
  S("psiWarrior", "Psi Warrior", "TCE", "Psionic power to protect, strike and move objects.", [F("Psi Warrior", 3, "Psionic Power", "Psionic Energy dice (2 × PB d6s): Protective Field (Reaction: reduce damage), Psionic Strike (+die + INT force damage), Telekinetic Movement (move an object or ally).", "2 × PB d6 / Long Rest")]),
  S("runeKnight", "Rune Knight", "TCE", "Giant runes and the power to grow large.", [
    F("Rune Knight", 3, "Bonus Proficiencies", "Smith's tools, and you learn Giant."),
    F("Rune Knight", 3, "Rune Carver", "Inscribe two runes on your gear; each gives a passive benefit and an activated effect once per Short Rest."),
    F("Rune Knight", 3, "Giant's Might", "Bonus Action for 1 minute: become Large, Advantage on STR checks and saves, +1d6 weapon damage once per turn.", "PB / Long Rest"),
  ], {
    tools: ["Smith's Tools"],
    languages: ["Giant"],
    picks: {
      label: "Runes",
      count: [0, 0, 0, 2, 2, 2],
      options: [
        ["cloud", "Cloud Rune", "Advantage on Sleight of Hand and Deception; Reaction: redirect an attack to another creature."],
        ["fire", "Fire Rune", "Double PB with tools; on a hit, the target takes 2d6 fire per turn and is Restrained (STR save)."],
        ["frost", "Frost Rune", "Advantage on Animal Handling and Intimidation; Bonus Action: +2 to STR and CON checks and saves for 10 minutes."],
        ["stone", "Stone Rune", "Advantage on Insight, darkvision 120 ft; Reaction: charm a creature into a dreamy stupor (WIS save)."],
      ].map(([id, name, text]) => ({ id, name, text })),
    },
  }),
];

// ---------------------------------------------------------------- Monk (3)
export const MONK_TRADITIONS: Subclass[] = [
  S("openHand", "Way of the Open Hand", "PHB14", "The master of unarmed combat.", [F("Open Hand", 3, "Open Hand Technique", "When you hit with a Flurry of Blows attack, also: knock the target Prone (DEX save), push it 15 ft (STR save), or deny it reactions until your next turn.")]),
  S("shadow", "Way of Shadow", "PHB14", "Ninja-like stealth and shadow magic.", [F("Shadow", 3, "Shadow Arts", "Spend 2 ki to cast Darkness, Darkvision, Pass without Trace or Silence without components. You know Minor Illusion.")], { bonusCantrips: ["Minor Illusion"] }),
  S("fourElements", "Way of the Four Elements", "PHB14", "Channel ki into elemental disciplines.", [F("Four Elements", 3, "Disciple of the Elements", "You know Elemental Attunement and one more discipline (more at 6th, 11th, 17th). Spend ki to use them.")], {
    picks: {
      label: "Elemental disciplines",
      count: [0, 0, 0, 1, 1, 1],
      options: [
        ["fangs", "Fangs of the Fire Snake", "1 ki: unarmed strikes reach 10 ft and deal fire; +1 ki for +1d10 fire."],
        ["thunders", "Fist of Four Thunders", "2 ki: cast Thunderwave."],
        ["unbrokenAir", "Fist of Unbroken Air", "2 ki: blast of air, 3d10 bludgeoning, push 20 ft and Prone (STR save)."],
        ["galeSpirits", "Rush of the Gale Spirits", "2 ki: cast Gust of Wind."],
        ["flowingRiver", "Shape the Flowing River", "1 ki: shape water and ice within 120 ft."],
        ["cinderStrike", "Sweeping Cinder Strike", "2 ki: cast Burning Hands."],
        ["waterWhip", "Water Whip", "2 ki: 3d10 bludgeoning whip, pull or knock Prone (DEX save)."],
      ].map(([id, name, text]) => ({ id, name, text })),
    },
  }),
  S("drunkenMaster", "Way of the Drunken Master", "XGE", "Unpredictable, swaying moves.", [
    F("Drunken Master", 3, "Bonus Proficiencies", "Performance and brewer's supplies."),
    F("Drunken Master", 3, "Drunken Technique", "Flurry of Blows also gives you Disengage and +10 ft speed this turn."),
  ], { skills: ["performance"], tools: ["Brewer's Supplies"] }),
  S("kensei", "Way of the Kensei", "XGE", "Mastery of chosen weapons as an art form.", [F("Kensei", 3, "Path of the Kensei", "Choose two kensei weapons (one melee, one ranged) that count as monk weapons; Agile Parry (+2 AC after an unarmed strike), Kensei's Shot (+1d4 ranged damage), and calligrapher's or painter's supplies.")], {
    picks: {
      label: "Kensei weapons",
      count: [0, 0, 0, 2, 2, 2],
      grants: "monkWeapon",
      rule: "meleeAndRanged",
      options: weaponOpts((w) => w.name === "Longbow" || !/Heavy|Special/.test(w.properties)),
    },
  }),
  S("sunSoul", "Way of the Sun Soul", "XGE", "Ki turned into radiant bolts.", [F("Sun Soul", 3, "Radiant Sun Bolt", "Ranged spell attack, 30 ft, 1d4 + DEX radiant (martial arts die); 1 ki for two more as a Bonus Action.")]),
  S("mercy", "Way of Mercy", "TCE", "Healer and harbinger of death in a plague mask.", [
    F("Mercy", 3, "Implements of Mercy", "Insight, Medicine and the herbalism kit."),
    F("Mercy", 3, "Hand of Healing", "Spend 1 ki to heal a creature by a martial arts roll + WIS (can replace a Flurry of Blows strike)."),
    F("Mercy", 3, "Hand of Harm", "Once per turn when you hit with an unarmed strike, spend 1 ki for extra necrotic damage equal to a martial arts roll + WIS."),
  ], { skills: ["insight", "medicine"], tools: ["Herbalism Kit"] }),
  S("astralSelf", "Way of the Astral Self", "TCE", "Summon spectral arms of your astral self.", [F("Astral Self", 3, "Arms of the Astral Self", "Bonus Action, 1 ki: astral arms for 10 minutes; creatures within 10 ft take 2 martial arts dice of force (DEX save). Your unarmed strikes reach 5 ft further and can use WIS.")]),
];

// ---------------------------------------------------------------- Paladin (3)
const oath = (name: string, l3: [string, string], l5: [string, string]) => sp("Oath spell", [[l3[0], 3], [l3[1], 3], [l5[0], 5], [l5[1], 5]]).map((g) => ({ ...g, source: `Oath spell (${name})` }));
const CD = (src: string, a: string, at: string, b: string, bt: string) => [F(src, 3, `Channel Divinity: ${a}`, at), F(src, 3, `Channel Divinity: ${b}`, bt)];
export const PALADIN_OATHS: Subclass[] = [
  S("devotion", "Oath of Devotion", "PHB14", "The classic knight in shining armor.", CD("Devotion", "Sacred Weapon", "For 1 minute, add CHA to attack rolls with a weapon, which sheds light.", "Turn the Unholy", "Fiends and undead within 30 ft that fail a WIS save are turned."), { spells: oath("Devotion", ["Protection from Evil and Good", "Sanctuary"], ["Lesser Restoration", "Zone of Truth"]) }),
  S("ancients", "Oath of the Ancients", "PHB14", "Green knights who defend light and life.", CD("Ancients", "Nature's Wrath", "Spectral vines restrain a creature within 10 ft (STR or DEX save).", "Turn the Faithless", "Fey and fiends within 30 ft that fail a WIS save are turned."), { spells: oath("Ancients", ["Ensnaring Strike", "Speak with Animals"], ["Misty Step", "Moonbeam"]) }),
  S("vengeance", "Oath of Vengeance", "PHB14", "Avengers who hunt the wicked.", CD("Vengeance", "Abjure Enemy", "One creature within 60 ft makes a WIS save or is frightened and can't move (fiends and undead have Disadvantage).", "Vow of Enmity", "Bonus Action: Advantage on attacks against one creature for 1 minute."), { spells: oath("Vengeance", ["Bane", "Hunter's Mark"], ["Hold Person", "Misty Step"]) }),
  S("conquest", "Oath of Conquest", "XGE", "Rule through fear and strength.", CD("Conquest", "Conquering Presence", "Creatures of your choice within 30 ft make a WIS save or are frightened for 1 minute.", "Guided Strike", "Add +10 to one attack roll."), { spells: oath("Conquest", ["Armor of Agathys", "Command"], ["Hold Person", "Spiritual Weapon"]) }),
  S("redemption", "Oath of Redemption", "XGE", "Peace first; violence as a last resort.", CD("Redemption", "Emissary of Peace", "+5 to Persuasion checks for 10 minutes.", "Rebuke the Violent", "Reaction when a creature damages another: it takes radiant damage equal to that damage (WIS save for half)."), { spells: oath("Redemption", ["Sanctuary", "Sleep"], ["Calm Emotions", "Hold Person"]) }),
  S("glory", "Oath of Glory", "TCE", "Heroes destined for legendary deeds.", CD("Glory", "Peerless Athlete", "For 10 minutes, Advantage on Athletics and Acrobatics, carry and jump more.", "Inspiring Smite", "After a Divine Smite, share 2d8 + level temporary HP among creatures within 30 ft."), { spells: oath("Glory", ["Guiding Bolt", "Heroism"], ["Enhance Ability", "Magic Weapon"]) }),
  S("watchers", "Oath of the Watchers", "TCE", "Guardians against extraplanar threats.", CD("Watchers", "Watcher's Will", "For 1 minute, up to CHA mod creatures within 30 ft have Advantage on INT, WIS and CHA saves.", "Abjure the Extraplanar", "Aberrations, celestials, elementals, fey and fiends within 30 ft are turned (WIS save)."), { spells: oath("Watchers", ["Alarm", "Detect Magic"], ["Moonbeam", "See Invisibility"]) }),
];

// ---------------------------------------------------------------- Ranger (3)
const rsp = (name: string, l3: string, l5: string) => sp(`${name} Magic`, [[l3, 3], [l5, 5]]);
export const RANGER_ARCHETYPES: Subclass[] = [
  S("hunter", "Hunter", "PHB14", "A monster hunter with a chosen technique.", [F("Hunter", 3, "Hunter's Prey", "Your hunting technique (see your choice).")], {
    optionLabel: "Hunter's Prey",
    options: [
      { id: "colossus", name: "Colossus Slayer", text: "Once per turn, +1d8 damage to a creature below its HP maximum." },
      { id: "giantKiller", name: "Giant Killer", text: "Reaction: attack a Large or larger creature within 5 ft that attacks you." },
      { id: "hordeBreaker", name: "Horde Breaker", text: "Once per turn, attack a second creature within 5 ft of the first." },
    ],
  }),
  S("beastMaster", "Beast Master", "PHB14", "Fight alongside an animal companion.", [F("Beast Master", 3, "Ranger's Companion", "Gain a beast companion (CR 1/4 or lower) that obeys your commands; with Tasha's you can use the Primal Companion (beast of the land, sea or sky) instead.")]),
  S("gloomStalker", "Gloom Stalker", "XGE", "Ambusher of the dark places.", [
    F("Gloom Stalker", 3, "Dread Ambusher", "+WIS to initiative; on your first turn, +10 ft speed and one extra attack that deals +1d8 if it hits."),
    F("Gloom Stalker", 3, "Umbral Sight", "Darkvision 60 ft (or +30 ft if you have it), and you're invisible to creatures relying on darkvision."),
    F("Gloom Stalker", 3, "Gloom Stalker Magic", "Extra spells always known: Disguise Self (3rd), Rope Trick (5th)."),
  ], { darkvision: 60, initiativeBonus: "WIS", spells: rsp("Gloom Stalker", "Disguise Self", "Rope Trick") }),
  S("horizonWalker", "Horizon Walker", "XGE", "Guardian of the planes.", [
    F("Horizon Walker", 3, "Detect Portal", "Action: sense the nearest planar portal within 1 mile.", "1 / Short Rest"),
    F("Horizon Walker", 3, "Planar Warrior", "Bonus Action: your next hit this turn on a creature within 30 ft deals force damage and +1d8 force."),
    F("Horizon Walker", 3, "Horizon Walker Magic", "Extra spells always known: Protection from Evil and Good (3rd), Misty Step (5th)."),
  ], { spells: rsp("Horizon Walker", "Protection from Evil and Good", "Misty Step") }),
  S("monsterSlayer", "Monster Slayer", "XGE", "Hunter of supernatural threats.", [
    F("Monster Slayer", 3, "Hunter's Sense", "Action: learn a creature's immunities, resistances and vulnerabilities.", "WIS mod / Long Rest"),
    F("Monster Slayer", 3, "Slayer's Prey", "Bonus Action: mark a creature; the first hit each turn deals +1d6."),
    F("Monster Slayer", 3, "Monster Slayer Magic", "Extra spells always known: Protection from Evil and Good (3rd), Zone of Truth (5th)."),
  ], { spells: rsp("Monster Slayer", "Protection from Evil and Good", "Zone of Truth") }),
  S("feyWanderer", "Fey Wanderer", "TCE", "Feywild-touched charmer.", [
    F("Fey Wanderer", 3, "Dreadful Strikes", "Once per turn, a weapon hit deals +1d4 psychic."),
    F("Fey Wanderer", 3, "Otherworldly Glamour", "Add WIS to CHA checks, and gain one skill from Deception, Performance or Persuasion."),
    F("Fey Wanderer", 3, "Fey Wanderer Magic", "Extra spells always known: Charm Person (3rd), Misty Step (5th)."),
  ], { skillChoice: { count: 1, from: ["deception", "performance", "persuasion"] }, spells: rsp("Fey Wanderer", "Charm Person", "Misty Step") }),
  S("swarmkeeper", "Swarmkeeper", "TCE", "A swarm of nature spirits fights with you.", [
    F("Swarmkeeper", 3, "Gathered Swarm", "Once per turn on a hit: +1d6 piercing, push 15 ft, or move yourself 5 ft."),
    F("Swarmkeeper", 3, "Swarmkeeper Magic", "You know Mage Hand; extra spells always known: Faerie Fire (3rd), Web (5th)."),
  ], { bonusCantrips: ["Mage Hand"], spells: rsp("Swarmkeeper", "Faerie Fire", "Web") }),
];

// ---------------------------------------------------------------- Rogue (3)
export const ROGUE_ARCHETYPES: Subclass[] = [
  S("thief", "Thief", "PHB14", "Burglar and treasure hunter.", [
    F("Thief", 3, "Fast Hands", "Cunning Action also lets you make a Sleight of Hand check, use thieves' tools, or Use an Object."),
    F("Thief", 3, "Second-Story Work", "Climbing costs no extra movement; running jumps go DEX mod feet further."),
  ]),
  S("assassin", "Assassin", "PHB14", "Killer from the shadows.", [
    F("Assassin", 3, "Bonus Proficiencies", "Disguise kit and poisoner's kit."),
    F("Assassin", 3, "Assassinate", "Advantage against creatures that haven't acted yet; hits on surprised creatures are critical hits."),
  ], { tools: ["Disguise Kit", "Poisoner's Kit"] }),
  S("arcaneTrickster", "Arcane Trickster", "PHB14", "A thief with wizard spells (mostly enchantment and illusion).", [
    F("Arcane Trickster", 3, "Spellcasting", "Intelligence-based wizard spells: Mage Hand plus two cantrips, and three 1st-level spells (all but one enchantment or illusion)."),
    F("Arcane Trickster", 3, "Mage Hand Legerdemain", "Your Mage Hand is invisible and can stow or retrieve items, pick locks and disarm traps at range."),
  ], { spell: { ...THIRD_CASTER }, spellSchools: ["Enchantment", "Illusion"], bonusCantrips: ["Mage Hand"] }),
  S("inquisitive", "Inquisitive", "XGE", "A detective with insight into lies and weaknesses.", [
    F("Inquisitive", 3, "Ear for Deceit", "Treat a d20 roll of 7 or lower as an 8 on Insight checks to detect lies."),
    F("Inquisitive", 3, "Eye for Detail", "Bonus Action: Perception to spot a hidden creature or Investigation to find clues."),
    F("Inquisitive", 3, "Insightful Fighting", "Bonus Action: Insight vs the target's Deception; on a success you can Sneak Attack it without Advantage for 1 minute."),
  ]),
  S("mastermind", "Mastermind", "XGE", "Schemer and master of intrigue.", [
    F("Mastermind", 3, "Master of Intrigue", "Disguise kit, forgery kit, one gaming set and two languages; you can mimic accents."),
    F("Mastermind", 3, "Master of Tactics", "Help as a Bonus Action, from up to 30 ft away."),
  ], { tools: ["Disguise Kit", "Forgery Kit"], extraLanguages: 2 }),
  S("scout", "Scout", "XGE", "Skirmisher and wilderness expert.", [
    F("Scout", 3, "Skirmisher", "Reaction when an enemy ends its turn within 5 ft: move half your speed without provoking."),
    F("Scout", 3, "Survivalist", "Proficiency and expertise in Nature and Survival."),
  ], { skills: ["nature", "survival"], expertiseSkills: true }),
  S("swashbuckler", "Swashbuckler", "XGE", "A dashing duelist.", [
    F("Swashbuckler", 3, "Fancy Footwork", "Creatures you attack in melee can't make Opportunity Attacks against you this turn."),
    F("Swashbuckler", 3, "Rakish Audacity", "+CHA to initiative, and Sneak Attack works against a lone creature within 5 ft even without Advantage."),
  ], { initiativeBonus: "CHA" }),
  S("phantom", "Phantom", "TCE", "Touched by death: borrow the skills of the dead.", [
    F("Phantom", 3, "Whispers of the Dead", "After a rest, gain proficiency in one skill or tool of your choice until you change it."),
    F("Phantom", 3, "Wails from the Grave", "After a Sneak Attack, a second creature within 30 ft takes half the Sneak Attack dice as necrotic.", "PB / Long Rest"),
  ], { skillChoice: { count: 1, from: ALL_SKILLS } }),
  S("soulknife", "Soulknife", "TCE", "Psychic blades and telepathic whispers.", [
    F("Soulknife", 3, "Psionic Power", "Psionic Energy dice (2 × PB d6s): add one to a failed ability check (Psi-Bolstered Knack), or speak telepathically (Psychic Whispers).", "2 × PB d6 / Long Rest"),
    F("Soulknife", 3, "Psychic Blades", "Manifest a blade of psychic energy: 1d6 + DEX/STR psychic, finesse, thrown 60 ft; a second one as a Bonus Action (1d4)."),
  ]),
];

// ---------------------------------------------------------------- Wizard (2)
const savant = (school: string) => F(`School of ${school}`, 2, `${school} Savant`, `Copying ${school.toLowerCase()} spells into your spellbook costs half the gold and time.`);
export const WIZARD_TRADITIONS: Subclass[] = [
  S("abjuration", "School of Abjuration", "PHB14", "Protective magic and a magical ward.", [savant("Abjuration"), F("Abjuration", 2, "Arcane Ward", "Casting an abjuration spell creates a ward with HP = 2 × wizard level + INT that absorbs damage; abjuration spells recharge it.")]),
  S("conjuration", "School of Conjuration", "PHB14", "Summoning and creating objects.", [savant("Conjuration"), F("Conjuration", 2, "Minor Conjuration", "Action: conjure a small nonmagical object (up to 3 ft, 10 lb) that lasts an hour.")]),
  S("divination", "School of Divination", "PHB14", "Foresight: replace rolls with Portent.", [savant("Divination"), F("Divination", 2, "Portent", "After a Long Rest, roll two d20s; replace any attack, save or check you can see with one of them.")]),
  S("enchantment", "School of Enchantment", "PHB14", "Charm and control minds.", [savant("Enchantment"), F("Enchantment", 2, "Hypnotic Gaze", "Action: a creature within 5 ft makes a WIS save or is charmed and incapacitated while you keep it up.")]),
  S("evocation", "School of Evocation", "PHB14", "Raw elemental damage that spares allies.", [savant("Evocation"), F("Evocation", 2, "Sculpt Spells", "Choose 1 + spell level creatures to automatically succeed on your evocation spell's save and take no damage.")]),
  S("illusion", "School of Illusion", "PHB14", "Deception and phantoms.", [savant("Illusion"), F("Illusion", 2, "Improved Minor Illusion", "You know Minor Illusion and can make a sound and an image at the same time.")], { bonusCantrips: ["Minor Illusion"] }),
  S("necromancy", "School of Necromancy", "PHB14", "Death magic that feeds on the life you take.", [savant("Necromancy"), F("Necromancy", 2, "Grim Harvest", "Once per turn when a spell kills a creature, regain HP equal to twice the spell's level (three times for necromancy).")]),
  S("transmutation", "School of Transmutation", "PHB14", "Changing matter and form.", [savant("Transmutation"), F("Transmutation", 2, "Minor Alchemy", "Temporarily turn an object of wood, stone, iron, copper or silver into another of those materials.")]),
  S("warMagic", "War Magic", "XGE", "A battle mage blending abjuration and evocation.", [
    F("War Magic", 2, "Arcane Deflection", "Reaction when hit or failing a save: +2 AC or +4 to the save (then only cantrips next turn)."),
    F("War Magic", 2, "Tactical Wit", "Add your INT modifier to initiative."),
  ], { initiativeBonus: "INT" }),
  S("bladesinging", "Bladesinging", "TCE", "Elven sword-dance magic.", [
    F("Bladesinging", 2, "Training in War and Song", "Light armor, one one-handed melee weapon, and Performance."),
    F("Bladesinging", 2, "Bladesong", "Bonus Action, 1 minute (no medium/heavy armor or shield): +INT to AC and concentration saves, +10 ft speed, Advantage on Acrobatics.", "PB / Long Rest"),
  ], {
    armor: ["light"],
    skills: ["performance"],
    picks: { label: "Bladesinging weapon", count: [0, 0, 1, 1, 1, 1], grants: "weapon", options: weaponOpts((w) => !w.ranged && !/Two-Handed/.test(w.properties)) },
  }),
  S("scribes", "Order of Scribes", "TCE", "Your spellbook is awake.", [
    F("Scribes", 2, "Wizardly Quill", "A magic quill that copies spells into your book at 2 minutes per spell level."),
    F("Scribes", 2, "Awakened Spellbook", "Your spellbook is your focus; swap a spell's damage type for another from your book, and cast a ritual at normal speed once per Long Rest."),
  ]),
];

// ---------------------------------------------------------------- Artificer (3)
const asp = (name: string, l3: [string, string], l5: [string, string]) => sp(`${name} spell`, [[l3[0], 3], [l3[1], 3], [l5[0], 5], [l5[1], 5]]);
export const ARTIFICER_SPECIALISTS: Subclass[] = [
  S("alchemist", "Alchemist", "TCE", "Potions and elixirs that heal and harm.", [
    F("Alchemist", 3, "Tool Proficiency", "Alchemist's supplies."),
    F("Alchemist", 3, "Experimental Elixir", "After a Long Rest, create a random elixir (healing, swiftness, resilience, boldness, flight or transformation); more by spending slots."),
    F("Alchemist", 5, "Alchemical Savant", "Spells cast through alchemist's supplies add INT to one roll of healing or acid, fire, necrotic or poison damage."),
  ], { tools: ["Alchemist's Supplies"], spells: asp("Alchemist", ["Healing Word", "Ray of Sickness"], ["Flaming Sphere", "Melf's Acid Arrow"]) }),
  S("armorer", "Armorer", "TCE", "Magic power armor.", [
    F("Armorer", 3, "Tools of the Trade", "Heavy armor and smith's tools."),
    F("Armorer", 3, "Arcane Armor", "Turn a suit of armor into arcane armor: no STR requirement, covers your body, and serves as your focus."),
    F("Armorer", 3, "Armor Model", "Guardian (thunder gauntlets, defensive field) or Infiltrator (lightning launcher, +5 ft speed, Advantage on Stealth)."),
    F("Armorer", 5, "Extra Attack", "You attack twice when you take the Attack action."),
  ], { armor: ["heavy"], tools: ["Smith's Tools"], spells: asp("Armorer", ["Magic Missile", "Thunderwave"], ["Mirror Image", "Shatter"]) }),
  S("artillerist", "Artillerist", "TCE", "Magical cannons and explosive spells.", [
    F("Artillerist", 3, "Tool Proficiency", "Woodcarver's tools."),
    F("Artillerist", 3, "Eldritch Cannon", "Create a small cannon (flamethrower, force ballista or protector) that you command with a Bonus Action.", "1 / Long Rest (or a spell slot)"),
    F("Artillerist", 5, "Arcane Firearm", "Carve a wand, staff or rod into an arcane firearm: your artificer spells through it add 1d8 damage."),
  ], { tools: ["Woodcarver's Tools"], spells: asp("Artillerist", ["Shield", "Thunderwave"], ["Scorching Ray", "Shatter"]) }),
  S("battleSmith", "Battle Smith", "TCE", "A soldier-inventor with a steel defender.", [
    F("Battle Smith", 3, "Tool Proficiency", "Smith's tools."),
    F("Battle Smith", 3, "Battle Ready", "Martial weapons; you can use INT for attack and damage rolls with magic weapons."),
    F("Battle Smith", 3, "Steel Defender", "A mechanical companion that fights beside you and can protect allies."),
    F("Battle Smith", 5, "Extra Attack", "You attack twice when you take the Attack action."),
  ], { martial: true, tools: ["Smith's Tools"], spells: asp("Battle Smith", ["Heroism", "Shield"], ["Branding Smite", "Warding Bond"]) }),
];

/** Channel Divinity option each cleric domain adds at 2nd level. */
export const DOMAIN_CHANNEL: Record<string, LevelFeature> = Object.fromEntries(
  (
    [
      ["knowledge", "Knowledge of the Ages", "For 10 minutes, gain proficiency with one skill or tool of your choice."],
      ["life", "Preserve Life", "Restore HP equal to 5 × cleric level, split among creatures within 30 ft (up to half each one's maximum)."],
      ["light", "Radiance of the Dawn", "Dispel magical darkness within 30 ft; hostile creatures there take 2d10 + cleric level radiant (CON save for half)."],
      ["nature", "Charm Animals and Plants", "Beasts and plant creatures within 30 ft make a WIS save or are charmed for 1 minute."],
      ["tempest", "Destructive Wrath", "When you roll lightning or thunder damage, deal the maximum instead."],
      ["trickery", "Invoke Duplicity", "Create an illusory duplicate within 30 ft for 1 minute; cast spells from it and gain Advantage when you both are near a target."],
      ["war", "Guided Strike", "Add +10 to an attack roll you make."],
      ["forge", "Artisan's Blessing", "In a 1-hour ritual, create a metal item worth up to 100 GP."],
      ["grave", "Path to the Grave", "Curse a creature within 30 ft: the next attack that hits it deals double damage."],
      ["order", "Order's Demand", "Creatures of your choice within 30 ft make a WIS save or are charmed until your next turn and drop what they hold."],
      ["peace", "Balm of Peace", "Move without provoking and heal each creature you pass within 5 ft for 2d6 + WIS."],
      ["twilight", "Twilight Sanctuary", "A 30-ft sphere of twilight for 1 minute: creatures ending their turn in it gain 1d6 + cleric level temp HP or end a charm or fright."],
    ] as [string, string, string][]
  ).map(([id, name, text]) => [id, F("Domain", 2, `Channel Divinity: ${name}`, text)]),
);
