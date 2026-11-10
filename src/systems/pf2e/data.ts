// Pathfinder 2e (Remaster: Player Core + Player Core 2) data for a Sorcerer, levels 1-5.
// Checked against Archives of Nethys (the official free rules site). Pathfinder 2e Remaster
// rules are under the ORC license. Descriptions are short summaries in our own words.

export const ATTRS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = { STR: "Strength", DEX: "Dexterity", CON: "Constitution", INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" };

export const MAX_LEVEL_PF2 = 5;
export type Tradition = "arcane" | "divine" | "occult" | "primal";
export type Rank = 0 | 1 | 2 | 3 | 4;
export const RANK_NAMES = ["Untrained", "Trained", "Expert", "Master", "Legendary"];
export const RANK_LETTER = ["U", "T", "E", "M", "L"];
export const profBonus = (rank: Rank, level: number) => (rank === 0 ? 0 : rank * 2 + level);

// ---------------------------------------------------------------- sorcerer
export const SORCERER_PF2 = {
  hp: 6,
  /** Slots per day by level, index = spell rank (0 = cantrips). Repertoire matches. */
  slots: [[], [5, 3], [5, 4], [5, 4, 3], [5, 4, 4], [5, 4, 4, 3]] as number[][],
  features: [
    { level: 1, name: "Bloodline", text: "Your bloodline sets your spell tradition, two trained skills, the spells it gifts you, your focus spell and your blood magic." },
    { level: 1, name: "Sorcerer Spellcasting", text: "Cast spells from your bloodline's tradition spontaneously using Charisma." },
    { level: 1, name: "Spell Repertoire", text: "You know a fixed set of spells: one per slot of each rank, including the spell your bloodline gifts at that rank." },
    { level: 1, name: "Sorcerous Potency", text: "A spell from a slot that deals damage or restores HP gets a status bonus equal to its rank (once per target)." },
    { level: 1, name: "Focus Spells", text: "You have a focus pool of 1 Focus Point, refilled by Refocusing for 10 minutes." },
    { level: 3, name: "Signature Spells", text: "Pick one spell of each rank in your repertoire; you can heighten it freely." },
    { level: 5, name: "Magical Fortitude", text: "Your Fortitude save proficiency becomes expert." },
  ],
};

// ---------------------------------------------------------------- skills
export const SKILLS_PF2: { id: string; name: string; attr: Attr }[] = [
  { id: "acrobatics", name: "Acrobatics", attr: "DEX" },
  { id: "arcana", name: "Arcana", attr: "INT" },
  { id: "athletics", name: "Athletics", attr: "STR" },
  { id: "crafting", name: "Crafting", attr: "INT" },
  { id: "deception", name: "Deception", attr: "CHA" },
  { id: "diplomacy", name: "Diplomacy", attr: "CHA" },
  { id: "intimidation", name: "Intimidation", attr: "CHA" },
  { id: "medicine", name: "Medicine", attr: "WIS" },
  { id: "nature", name: "Nature", attr: "WIS" },
  { id: "occultism", name: "Occultism", attr: "INT" },
  { id: "performance", name: "Performance", attr: "CHA" },
  { id: "religion", name: "Religion", attr: "WIS" },
  { id: "society", name: "Society", attr: "INT" },
  { id: "stealth", name: "Stealth", attr: "DEX" },
  { id: "survival", name: "Survival", attr: "WIS" },
  { id: "thievery", name: "Thievery", attr: "DEX" },
];
export const skillNamePF2 = (id: string) => SKILLS_PF2.find((s) => s.id === id)?.name ?? id;

// ---------------------------------------------------------------- ancestries
export interface Heritage {
  id: string;
  name: string;
  text: string;
  hp?: number;
  vision?: "low-light" | "darkvision";
  /** Versatile heritages that upgrade low-light to darkvision. */
  upgradesVision?: boolean;
  speedNote?: string;
  /** Trained in one skill of your choice (Skilled Human). */
  skillChoice?: boolean;
  trainedSkill?: string;
  /** Gains a general feat (Versatile Human). */
  generalFeat?: boolean;
  book?: "PC" | "PC2";
}

export interface Ancestry {
  id: string;
  name: string;
  book: "PC" | "PC2";
  hp: number;
  size: "Medium" | "Small";
  speed: number;
  boosts: Attr[];
  freeBoosts: number;
  flaw?: Attr;
  vision: "normal" | "low-light" | "darkvision";
  trait?: string;
  heritages: Heritage[];
}

const H = (id: string, name: string, text: string, extra: Partial<Heritage> = {}): Heritage => ({ id, name, text, ...extra });

export const ANCESTRIES: Ancestry[] = [
  {
    id: "dwarf", name: "Dwarf", book: "PC", hp: 10, size: "Medium", speed: 20, boosts: ["CON", "WIS"], freeBoosts: 1, flaw: "CHA", vision: "darkvision", trait: "Clan Dagger: you start with a free clan dagger.",
    heritages: [
      H("ancientBlooded", "Ancient-Blooded Dwarf", "Call on Ancient Blood reaction: +1 circumstance to a save against magic."),
      H("deathWarden", "Death Warden Dwarf", "Successful saves against void or undead effects become critical successes."),
      H("forge", "Forge Dwarf", "Fire resistance equal to half your level (min 1); heat is one step less extreme."),
      H("rock", "Rock Dwarf", "+2 to your Fortitude/Reflex DC against Reposition, Shove, Trip and forced movement; forced moves of 10+ ft are halved."),
      H("strongBlooded", "Strong-Blooded Dwarf", "Poison resistance equal to half your level (min 1); poison stages drop faster."),
    ],
  },
  {
    id: "elf", name: "Elf", book: "PC", hp: 6, size: "Medium", speed: 30, boosts: ["DEX", "INT"], freeBoosts: 1, flaw: "CON", vision: "low-light",
    heritages: [
      H("ancient", "Ancient Elf", "Gain a multiclass dedication feat, ignoring its level requirement."),
      H("arctic", "Arctic Elf", "Cold resistance equal to half your level (min 1); cold is one step less extreme."),
      H("cavern", "Cavern Elf", "You gain darkvision.", { vision: "darkvision" }),
      H("seer", "Seer Elf", "Detect magic as an arcane innate cantrip; +1 to Identify Magic and Decipher Writing on magic."),
      H("whisper", "Whisper Elf", "+2 to Seek hidden creatures within 30 ft; lower flat checks against concealed or hidden targets."),
      H("woodland", "Woodland Elf", "Climb trees and foliage at half Speed (full on a critical success); Take Cover in forests."),
    ],
  },
  {
    id: "gnome", name: "Gnome", book: "PC", hp: 8, size: "Small", speed: 25, boosts: ["CON", "CHA"], freeBoosts: 1, flaw: "STR", vision: "low-light",
    heritages: [
      H("chameleon", "Chameleon Gnome", "Shift your coloration for +2 to Stealth when blending in."),
      H("feyTouched", "Fey-touched Gnome", "Gain the fey trait and one primal cantrip as an innate spell (swappable daily)."),
      H("sensate", "Sensate Gnome", "Imprecise scent 30 ft; +2 Perception to locate undetected creatures within it."),
      H("umbral", "Umbral Gnome", "You gain darkvision.", { vision: "darkvision" }),
      H("wellspring", "Wellspring Gnome", "One arcane, divine or occult cantrip as an innate spell."),
    ],
  },
  {
    id: "goblin", name: "Goblin", book: "PC", hp: 6, size: "Small", speed: 25, boosts: ["DEX", "CHA"], freeBoosts: 1, flaw: "WIS", vision: "darkvision",
    heritages: [
      H("charhide", "Charhide Goblin", "Fire resistance equal to half your level (min 1); easier to end persistent fire."),
      H("irongut", "Irongut Goblin", "+2 against ingested afflictions and sickened; you can eat almost anything."),
      H("razortooth", "Razortooth Goblin", "Jaws unarmed attack: 1d6 piercing, finesse."),
      H("snow", "Snow Goblin", "Cold resistance equal to half your level (min 1); cold is one step less extreme."),
      H("unbreakable", "Unbreakable Goblin", "10 HP from your ancestry instead of 6; falls hurt as if half as far.", { hp: 10 }),
    ],
  },
  {
    id: "halfling", name: "Halfling", book: "PC", hp: 6, size: "Small", speed: 25, boosts: ["DEX", "WIS"], freeBoosts: 1, flaw: "STR", vision: "normal", trait: "Keen Eyes: +2 to Seek hidden or undetected creatures within 30 ft.",
    heritages: [
      H("gutsy", "Gutsy Halfling", "Successful saves against emotion effects become critical successes."),
      H("hillock", "Hillock Halfling", "Regain extra HP equal to your level from rest and from a snack during Treat Wounds."),
      H("jinxed", "Jinxed Halfling", "Gain Jinx (curse a foe with clumsy) instead of halfling luck."),
      H("nomadic", "Nomadic Halfling", "Two extra languages."),
      H("twilight", "Twilight Halfling", "You gain low-light vision.", { vision: "low-light" }),
      H("wildwood", "Wildwood Halfling", "Ignore difficult terrain from plants and fungi."),
    ],
  },
  {
    id: "human", name: "Human", book: "PC", hp: 8, size: "Medium", speed: 25, boosts: [], freeBoosts: 2, vision: "normal",
    heritages: [
      H("skilled", "Skilled Human", "Trained in one skill of your choice; it becomes expert at 5th level.", { skillChoice: true }),
      H("versatile", "Versatile Human", "Gain a general feat of your choice.", { generalFeat: true }),
    ],
  },
  {
    id: "leshy", name: "Leshy", book: "PC", hp: 8, size: "Small", speed: 25, boosts: ["CON", "WIS"], freeBoosts: 1, flaw: "INT", vision: "low-light", trait: "Plant Nourishment: you need sunlight instead of food.",
    heritages: [
      H("cactus", "Cactus Leshy", "Spines unarmed attack: 1d6 piercing, finesse."),
      H("fruit", "Fruit Leshy", "Grow a daily fruit that heals 1d8 HP (more at higher levels)."),
      H("fungus", "Fungus Leshy", "You gain darkvision (fungus instead of plant).", { vision: "darkvision" }),
      H("gourd", "Gourd Leshy", "Store up to 1 Bulk in your head."),
      H("leaf", "Leaf Leshy", "You take no falling damage."),
      H("lotus", "Lotus Leshy", "Walk on still water at half Speed."),
      H("root", "Root Leshy", "10 HP from your ancestry instead of 8; hard to move against your will.", { hp: 10 }),
      H("seaweed", "Seaweed Leshy", "Swim Speed 20 ft and breathe water, but land Speed -5 ft.", { speedNote: "Swim 20 ft; land Speed -5 ft" }),
      H("vine", "Vine Leshy", "Climb without hands; Climb successes become critical successes."),
    ],
  },
  {
    id: "orc", name: "Orc", book: "PC", hp: 10, size: "Medium", speed: 25, boosts: [], freeBoosts: 2, vision: "darkvision",
    heritages: [
      H("badlands", "Badlands Orc", "Hustle twice as long; heat is one step less extreme."),
      H("battleReady", "Battle-Ready Orc", "Trained in Intimidation and gain Intimidating Glare.", { trainedSkill: "intimidation" }),
      H("deep", "Deep Orc", "Gain Terrain Expertise (underground) and Combat Climber."),
      H("grave", "Grave Orc", "Void resistance equal to half your level (min 1); +1 against death and void effects."),
      H("holdScarred", "Hold-Scarred Orc", "12 HP from your ancestry instead of 10, and the Diehard feat.", { hp: 12 }),
      H("rainfall", "Rainfall Orc", "+2 Athletics to Climb or Swim; +1 against diseases."),
      H("winter", "Winter Orc", "Trained in Survival; cold is one step less extreme.", { trainedSkill: "survival" }),
    ],
  },
  {
    id: "catfolk", name: "Catfolk", book: "PC2", hp: 8, size: "Medium", speed: 25, boosts: ["DEX", "CHA"], freeBoosts: 1, flaw: "WIS", vision: "low-light", trait: "Land on Your Feet: half falling damage and you don't land prone.",
    heritages: [
      H("clawed", "Clawed Catfolk", "Claw unarmed attack: 1d6 slashing, agile, finesse."),
      H("hunting", "Hunting Catfolk", "Imprecise scent 30 ft; +2 to Track creatures you've smelled."),
      H("jungle", "Jungle Catfolk", "Ignore difficult terrain from undergrowth."),
      H("liminal", "Liminal Catfolk", "Detect magic as an occult innate cantrip."),
      H("nineLives", "Nine Lives Catfolk", "Gain Diehard; dying is less likely to kill you."),
      H("sharpEared", "Sharp-Eared Catfolk", "+2 to Seek creatures you hear within 30 ft."),
      H("winter", "Winter Catfolk", "Cold resistance equal to half your level (min 1)."),
    ],
  },
  {
    id: "hobgoblin", name: "Hobgoblin", book: "PC2", hp: 8, size: "Medium", speed: 25, boosts: ["CON", "INT"], freeBoosts: 1, flaw: "WIS", vision: "darkvision",
    heritages: [
      H("elfbane", "Elfbane Hobgoblin", "Resist Elf Magic reaction: +1 (or +2 vs arcane) to a save against magic."),
      H("runtboss", "Runtboss Hobgoblin", "Gain Group Coercion; extra success against goblins."),
      H("shortshanks", "Shortshanks Hobgoblin", "Gain Ride; not off-guard while climbing."),
      H("smokeworker", "Smokeworker Hobgoblin", "Fire resistance equal to half your level (min 1); see through smoke."),
      H("warmarch", "Warmarch Hobgoblin", "Hustle twice as long; better at subsisting."),
      H("warrenbred", "Warrenbred Hobgoblin", "Underground: lower flat checks; Squeeze successes become critical."),
    ],
  },
  {
    id: "kholo", name: "Kholo", book: "PC2", hp: 8, size: "Medium", speed: 25, boosts: ["STR", "INT"], freeBoosts: 1, flaw: "WIS", vision: "low-light", trait: "Bite: jaws unarmed attack, 1d6 piercing.",
    heritages: [
      H("ant", "Ant Kholo", "You're Small and trained in Deception.", { trainedSkill: "deception" }),
      H("cave", "Cave Kholo", "You gain darkvision.", { vision: "darkvision" }),
      H("dog", "Dog Kholo", "Speed 30 ft on all fours with both hands free.", { speedNote: "30 ft on all fours" }),
      H("great", "Great Kholo", "10 HP from your ancestry instead of 8.", { hp: 10 }),
      H("sweetbreath", "Sweetbreath Kholo", "Trained in Diplomacy; +1 to Make an Impression up close.", { trainedSkill: "diplomacy" }),
      H("winter", "Winter Kholo", "Cold resistance equal to half your level (min 1)."),
      H("witch", "Witch Kholo", "Figment as an occult innate cantrip."),
    ],
  },
  {
    id: "kobold", name: "Kobold", book: "PC2", hp: 6, size: "Small", speed: 25, boosts: ["DEX", "CHA"], freeBoosts: 1, flaw: "CON", vision: "darkvision",
    heritages: [
      H("dragonscaled", "Dragonscaled Kobold", "10 HP from your ancestry instead of 6; +1 against dragon breath, sleep and paralysis.", { hp: 10 }),
      H("elementheart", "Elementheart Kobold", "Resistance to one damage type equal to half your level (min 1)."),
      H("spellhorn", "Spellhorn Kobold", "One arcane cantrip as an innate spell (Charisma)."),
      H("strongjaw", "Strongjaw Kobold", "Jaws unarmed attack: 1d6 piercing, finesse."),
      H("tunnelflood", "Tunnelflood Kobold", "Swim Speed 15 ft.", { speedNote: "Swim 15 ft" }),
      H("venomtail", "Venomtail Kobold", "Once per day, add persistent poison equal to your level to a weapon hit."),
      H("cavernstalker", "Cavernstalker Kobold", "Climb stone at half Speed; Squeeze successes become critical."),
    ],
  },
  {
    id: "lizardfolk", name: "Lizardfolk", book: "PC2", hp: 8, size: "Medium", speed: 25, boosts: ["STR", "WIS"], freeBoosts: 1, flaw: "INT", vision: "normal", trait: "Aquatic Adaptation (Breath Control); Claws unarmed attack 1d4 slashing.",
    heritages: [
      H("cliffscale", "Cliffscale Lizardfolk", "Gain Combat Climber; climb hands-free when unshod."),
      H("cloudleaper", "Cloudleaper Lizardfolk", "Glide to avoid falling damage."),
      H("frilled", "Frilled Lizardfolk", "Visual Demoralize and Threatening Approach."),
      H("sandstrider", "Sandstrider Lizardfolk", "Fire resistance equal to half your level (min 1); heat is less extreme."),
      H("unseen", "Unseen Lizardfolk", "+2 Stealth when blending in."),
      H("wetlander", "Wetlander Lizardfolk", "Swim Speed 15 ft.", { speedNote: "Swim 15 ft" }),
      H("woodstalker", "Woodstalker Lizardfolk", "Take Cover in forests; gain Terrain Stalker (underbrush)."),
    ],
  },
  {
    id: "ratfolk", name: "Ratfolk", book: "PC2", hp: 6, size: "Small", speed: 25, boosts: ["DEX", "INT"], freeBoosts: 1, flaw: "STR", vision: "low-light", trait: "Sharp Teeth: jaws unarmed attack, 1d4 piercing.",
    heritages: [
      H("deep", "Deep Rat", "You gain darkvision.", { vision: "darkvision" }),
      H("desert", "Desert Rat", "Speed 30 ft on all fours with hands free; heat is less extreme.", { speedNote: "30 ft on all fours" }),
      H("longsnout", "Longsnout Rat", "Imprecise scent 30 ft; +2 to Seek within it."),
      H("shadow", "Shadow Rat", "Trained in Intimidation; Coerce and Demoralize animals.", { trainedSkill: "intimidation" }),
      H("sewer", "Sewer Rat", "+1 against diseases and poisons."),
      H("snow", "Snow Rat", "Cold resistance equal to half your level (min 1)."),
      H("tunnel", "Tunnel Rat", "Gain Quick Squeeze; tight spaces aren't difficult terrain."),
    ],
  },
  {
    id: "tengu", name: "Tengu", book: "PC2", hp: 6, size: "Medium", speed: 25, boosts: ["DEX"], freeBoosts: 1, vision: "low-light", trait: "Sharp Beak: beak unarmed attack, 1d6 piercing.",
    heritages: [
      H("dogtooth", "Dogtooth Tengu", "Your beak gains deadly d8."),
      H("jinxed", "Jinxed Tengu", "Saves against curses and misfortune improve; shed doom more easily."),
      H("mountainkeeper", "Mountainkeeper Tengu", "Vitality lash as a primal innate cantrip."),
      H("skyborn", "Skyborn Tengu", "You take no falling damage."),
      H("stormtossed", "Stormtossed Tengu", "Electricity resistance equal to half your level (min 1)."),
      H("taloned", "Taloned Tengu", "Talons unarmed attack: 1d4 slashing, agile, finesse."),
      H("wavediver", "Wavediver Tengu", "Swim Speed 15 ft.", { speedNote: "Swim 15 ft" }),
    ],
  },
  {
    id: "tripkee", name: "Tripkee", book: "PC2", hp: 6, size: "Small", speed: 25, boosts: ["DEX", "WIS"], freeBoosts: 1, flaw: "STR", vision: "low-light", trait: "Natural Climber: +2 Athletics to Climb.",
    heritages: [
      H("poisonhide", "Poisonhide Tripkee", "Toxic Skin reaction: poison an attacker."),
      H("riverside", "Riverside Tripkee", "Swim Speed 15 ft.", { speedNote: "Swim 15 ft" }),
      H("snaptongue", "Snaptongue Tripkee", "Deliver touch spells and simple Interacts with your tongue."),
      H("stickytoe", "Stickytoe Tripkee", "Harder to Disarm, Shove or Trip; better tree climbing."),
      H("thickskin", "Thickskin Tripkee", "8 HP from your ancestry instead of 6; +1 against diseases and poisons.", { hp: 8 }),
      H("windweb", "Windweb Tripkee", "No falling damage while a hand is free."),
    ],
  },
];

/** Versatile heritages: usable with any ancestry instead of its normal heritage. */
export const VERSATILE_HERITAGES: Heritage[] = [
  H("aiuvarin", "Aiuvarin (elf parent)", "Elf and aiuvarin traits and low-light vision; you can take elf and aiuvarin ancestry feats. (Replaces the half-elf.)", { vision: "low-light", book: "PC" }),
  H("dromaar", "Dromaar (orc parent)", "Orc and dromaar traits and low-light vision; you can take orc and dromaar ancestry feats. (Replaces the half-orc.)", { vision: "low-light", book: "PC" }),
  H("changeling", "Changeling", "Changeling trait; low-light vision, or darkvision if you already had low-light vision.", { vision: "low-light", upgradesVision: true, book: "PC" }),
  H("nephilim", "Nephilim", "Nephilim trait (celestial or fiendish heritage); low-light vision, or darkvision if you already had it.", { vision: "low-light", upgradesVision: true, book: "PC" }),
  H("dhampir", "Dhampir", "Dhampir trait and void healing; low-light vision, or darkvision if you already had it.", { vision: "low-light", upgradesVision: true, book: "PC2" }),
  H("dragonblood", "Dragonblood", "Dragonblood trait and Draconic language; successful saves against fear become critical successes.", { book: "PC2" }),
  H("duskwalker", "Duskwalker", "Duskwalker trait; low-light vision, or darkvision if you already had it; you can't become undead.", { vision: "low-light", upgradesVision: true, book: "PC2" }),
];

// ---------------------------------------------------------------- backgrounds
export interface BackgroundPF2 {
  id: string;
  name: string;
  boosts: [Attr, Attr];
  skills: string[];
  /** Choose one of these instead of a fixed skill. */
  skillChoice?: string[];
  lore: string;
  feat: string;
  featText?: string;
}

export const BACKGROUNDS_PF2: BackgroundPF2[] = [
  { id: "acolyte", name: "Acolyte", boosts: ["INT", "WIS"], skills: ["religion"], lore: "Scribing Lore", feat: "Student of the Canon" },
  { id: "acrobat", name: "Acrobat", boosts: ["STR", "DEX"], skills: ["acrobatics"], lore: "Circus Lore", feat: "Steady Balance" },
  { id: "artisan", name: "Artisan", boosts: ["STR", "INT"], skills: ["crafting"], lore: "Guild Lore", feat: "Specialty Crafting" },
  { id: "bountyHunter", name: "Bounty Hunter", boosts: ["STR", "WIS"], skills: ["survival"], lore: "Legal Lore", feat: "Experienced Tracker" },
  { id: "charlatan", name: "Charlatan", boosts: ["INT", "CHA"], skills: ["deception"], lore: "Underworld Lore", feat: "Charming Liar", featText: "Once per conversation, a critical success to Lie also improves the target's attitude by one step." },
  { id: "criminal", name: "Criminal", boosts: ["DEX", "INT"], skills: ["stealth"], lore: "Underworld Lore", feat: "Experienced Smuggler", featText: "Small items you conceal are harder to notice: observers use at least 10 on the roll (15 at master)." },
  { id: "emissary", name: "Emissary", boosts: ["INT", "CHA"], skills: ["society"], lore: "Lore of a city you visited often", feat: "Multilingual" },
  { id: "entertainer", name: "Entertainer", boosts: ["DEX", "CHA"], skills: ["performance"], lore: "Theater Lore", feat: "Fascinating Performance" },
  { id: "farmhand", name: "Farmhand", boosts: ["CON", "WIS"], skills: ["athletics"], lore: "Farming Lore", feat: "Assurance (Athletics)", featText: "Instead of rolling Athletics, take 10 + your proficiency bonus." },
  { id: "guard", name: "Guard", boosts: ["STR", "CHA"], skills: ["intimidation"], lore: "Legal or Warfare Lore", feat: "Quick Coercion" },
  { id: "herbalist", name: "Herbalist", boosts: ["CON", "WIS"], skills: ["nature"], lore: "Herbalism Lore", feat: "Natural Medicine" },
  { id: "hermit", name: "Hermit", boosts: ["CON", "INT"], skills: [], skillChoice: ["nature", "occultism"], lore: "Lore of the terrain you lived in", feat: "Dubious Knowledge" },
  { id: "merchant", name: "Merchant", boosts: ["INT", "CHA"], skills: ["diplomacy"], lore: "Mercantile Lore", feat: "Bargain Hunter" },
  { id: "noble", name: "Noble", boosts: ["INT", "CHA"], skills: ["society"], lore: "Genealogy or Heraldry Lore", feat: "Courtly Graces" },
  { id: "scholar", name: "Scholar", boosts: ["INT", "WIS"], skills: [], skillChoice: ["arcana", "nature", "occultism", "religion"], lore: "Academia Lore", feat: "Assurance (chosen skill)", featText: "Instead of rolling the chosen skill, take 10 + your proficiency bonus." },
  { id: "streetUrchin", name: "Street Urchin", boosts: ["DEX", "CON"], skills: ["thievery"], lore: "Lore of the city you grew up in", feat: "Pickpocket" },
  { id: "warrior", name: "Warrior", boosts: ["STR", "CON"], skills: ["intimidation"], lore: "Warfare Lore", feat: "Intimidating Glare" },
];

// ---------------------------------------------------------------- general feats
export const GENERAL_FEATS_PF2 = [
  { id: "", name: "Choose…", text: "" },
  { id: "toughness", name: "Toughness", text: "Max HP increases by your level; recovery check DCs are 1 lower." },
  { id: "fleet", name: "Fleet", text: "Your Speed increases by 5 ft." },
  { id: "incredibleInitiative", name: "Incredible Initiative", text: "+2 circumstance bonus to initiative rolls." },
  { id: "cannyAcumen", name: "Canny Acumen", text: "Become expert in Fortitude, Reflex, Will or Perception (master at 17th)." },
  { id: "shieldBlock", name: "Shield Block", text: "Reaction: your raised shield absorbs damage up to its Hardness." },
  { id: "diehard", name: "Diehard", text: "You die at dying 5 instead of dying 4." },
  { id: "other", name: "Other (type it in)", text: "" },
];

// ---------------------------------------------------------------- bloodlines
export interface BloodlineOption {
  id: string;
  name: string;
  tradition?: Tradition;
  skill?: string;
  /** Gift spells by rank that replace the bloodline's defaults. */
  gifts?: Partial<Record<0 | 1 | 2 | 3, string>>;
  damageType?: string;
}

export interface Bloodline {
  id: string;
  name: string;
  tradition?: Tradition;
  skills: string[];
  gifts: Partial<Record<0 | 1 | 2 | 3, string>>;
  focus: { name: string; actions: string; text: string };
  bloodMagic: string;
  optionLabel?: string;
  options?: BloodlineOption[];
}

export const BLOODLINES: Bloodline[] = [
  { id: "aberrant", name: "Aberrant", tradition: "occult", skills: ["intimidation", "occultism"], gifts: { 0: "Daze", 1: "Phantom Pain", 2: "Stupefy", 3: "Vampiric Feast" }, focus: { name: "Tentacular Limbs", actions: "1", text: "Your arms become tentacles: 10-ft unarmed reach, and you can extend touch spells to 20 ft." }, bloodMagic: "Eerie Veil: a target takes -1 status to Will, or you gain +2 status to Will, for 1 round." },
  { id: "angelic", name: "Angelic", tradition: "divine", skills: ["diplomacy", "religion"], gifts: { 0: "Light", 1: "Heal", 2: "Spiritual Armament", 3: "Holy Light" }, focus: { name: "Angelic Halo", actions: "1", text: "A 15-ft halo aura: allies healed by your heal spells regain extra HP." }, bloodMagic: "Divine Aura: you or a target gain +1 status to saves for 1 round." },
  { id: "demonic", name: "Demonic", tradition: "divine", skills: ["intimidation", "religion"], gifts: { 0: "Caustic Blast", 1: "Fear", 2: "Enlarge", 3: "Slow" }, focus: { name: "Glutton's Jaws", actions: "2", text: "Spell attack for 2d6 piercing; you gain 1d4 temporary HP on a hit." }, bloodMagic: "Corruption of Sin: a target takes -1 status to AC, or you gain +2 status to Intimidation, for 1 round." },
  { id: "diabolic", name: "Diabolic", tradition: "divine", skills: ["deception", "religion"], gifts: { 0: "Ignition", 1: "Charm", 2: "Floating Flame", 3: "Enthrall" }, focus: { name: "Diabolic Edict", actions: "1", text: "A willing creature gets +1 status to attacks and skill checks for a task you name (or -1 if it refuses)." }, bloodMagic: "Tongue of Flame: a target takes 1 fire damage per spell rank, or you gain +2 status to Deception, for 1 round." },
  {
    id: "draconic", name: "Draconic", skills: ["intimidation"], gifts: { 0: "Shield", 1: "Fear", 3: "Haste" },
    focus: { name: "Flurry of Claws", actions: "2", text: "Two spell attacks against creatures within 10 ft of each other: 1d8 slashing plus 1d4 of your tradition's damage type each." },
    bloodMagic: "Scaly Hide: you or a target gain +1 status to AC for 1 round.",
    optionLabel: "Draconic exemplar",
    options: [
      { id: "arcane", name: "Arcane dragon", tradition: "arcane", skill: "arcana", gifts: { 2: "Blazing Bolt" }, damageType: "force" },
      { id: "divine", name: "Divine dragon", tradition: "divine", skill: "religion", gifts: { 2: "Augury" }, damageType: "spirit" },
      { id: "occult", name: "Occult dragon", tradition: "occult", skill: "occultism", gifts: { 2: "Blood Vendetta" }, damageType: "mental" },
      { id: "primal", name: "Primal dragon", tradition: "primal", skill: "nature", gifts: { 2: "Shatter" }, damageType: "fire" },
    ],
  },
  {
    id: "elemental", name: "Elemental", tradition: "primal", skills: ["intimidation", "nature"], gifts: { 2: "Resist Energy" },
    focus: { name: "Elemental Toss", actions: "1", text: "Spell attack for 1d8 damage of your elemental influence's type." },
    bloodMagic: "Elemental Fury: you gain +2 status to Intimidation, or a target takes 1 damage per spell rank of your influence's type.",
    optionLabel: "Elemental influence",
    options: [
      { id: "air", name: "Air", gifts: { 0: "Gale Blast", 1: "Tailwind", 3: "Wall of Wind" }, damageType: "slashing" },
      { id: "earth", name: "Earth", gifts: { 0: "Scatter Scree", 1: "Pummeling Rubble", 3: "Earthbind" }, damageType: "bludgeoning" },
      { id: "fire", name: "Fire", gifts: { 0: "Ignition", 1: "Breathe Fire", 3: "Fireball" }, damageType: "fire" },
      { id: "metal", name: "Metal", gifts: { 0: "Electric Arc", 1: "Thunderstrike", 3: "Lightning Bolt" }, damageType: "piercing" },
      { id: "water", name: "Water", gifts: { 0: "Frostbite", 1: "Hydraulic Push", 3: "Aqueous Orb" }, damageType: "bludgeoning" },
      { id: "wood", name: "Wood", gifts: { 0: "Tangle Vine", 1: "Cleanse Cuisine", 3: "Wall of Thorns" }, damageType: "bludgeoning" },
    ],
  },
  { id: "fey", name: "Fey", tradition: "primal", skills: ["deception", "nature"], gifts: { 0: "Figment", 1: "Charm", 2: "Laughing Fit", 3: "Enthrall" }, focus: { name: "Faerie Dust", actions: "1-3", text: "A burst of dust (bigger with more actions): failures lose reactions and take -2 to Perception and Will." }, bloodMagic: "Cloak of Ribbons: +2 status to Performance, or you become concealed, for 1 round." },
  { id: "hag", name: "Hag", tradition: "occult", skills: ["deception", "occultism"], gifts: { 0: "Daze", 1: "Illusory Disguise", 2: "Stupefy", 3: "Blindness" }, focus: { name: "Jealous Hex", actions: "1", text: "Curse a creature with a condition based on its best attribute (enfeebled, clumsy, drained or stupefied)." }, bloodMagic: "Retributive Spite: the next creature to damage you takes 4 mental damage per spell rank (basic Will)." },
  { id: "imperial", name: "Imperial", tradition: "arcane", skills: ["arcana", "society"], gifts: { 0: "Detect Magic", 1: "Force Barrage", 2: "Dispel Magic", 3: "Haste" }, focus: { name: "Ancestral Memories", actions: "1", text: "+1 status to your next spell attack this turn, or -1 status to an enemy's next save against your spell." }, bloodMagic: "Imperious Defense: +1 status to AC or saves until your next turn." },
  { id: "undead", name: "Undead", tradition: "divine", skills: ["intimidation", "religion"], gifts: { 0: "Void Warp", 1: "Harm", 2: "See the Unseen", 3: "Bind Undead" }, focus: { name: "Undeath's Blessing", actions: "1", text: "A living creature is treated as undead by heal and harm for 1 minute." }, bloodMagic: "Stolen Life: you gain temp HP equal to the spell's rank, or a target takes 1 void damage per rank." },
];

// ---------------------------------------------------------------- spells
export interface SpellPF2 {
  name: string;
  rank: 0 | 1 | 2 | 3;
  traditions: Tradition[];
  actions: string;
  range: string;
  defense: string;
  duration?: string;
  /** Damage dice at base rank and how many more dice per rank heightened. */
  dmg?: { count: number; die: number; per: number; type: string; flat?: number };
  /** Heightening step size in ranks (default 1). */
  step?: number;
  desc: string;
}

const ALL: Tradition[] = ["arcane", "divine", "occult", "primal"];

export const SPELLS_PF2: SpellPF2[] = [
  // cantrips
  { name: "Electric Arc", rank: 0, traditions: ["arcane", "primal"], actions: "2", range: "30 ft.; 1 or 2 creatures", defense: "basic Reflex", dmg: { count: 2, die: 4, per: 1, type: "electricity" }, desc: "Lightning jumps between one or two targets." },
  { name: "Ignition", rank: 0, traditions: ["arcane", "primal"], actions: "2", range: "30 ft.; 1 creature", defense: "AC", dmg: { count: 2, die: 4, per: 1, type: "fire" }, desc: "Spell attack that sets the target smoldering (d6s in melee); crits add persistent fire." },
  { name: "Shield", rank: 0, traditions: ["arcane", "divine", "occult"], actions: "1", range: "self", defense: "—", duration: "until your next turn", desc: "A force shield: +1 AC, and you can Shield Block magic and other damage." },
  { name: "Detect Magic", rank: 0, traditions: ALL, actions: "2", range: "30-ft. emanation", defense: "—", desc: "Learn whether magic is present nearby." },
  { name: "Light", rank: 0, traditions: ALL, actions: "2", range: "120 ft.", defense: "—", duration: "until daily preparations", desc: "An orb of light (20 ft bright) you can attach to a willing creature." },
  { name: "Prestidigitation", rank: 0, traditions: ALL, actions: "2", range: "10 ft.", defense: "—", duration: "sustained", desc: "Minor tricks: cook, clean, lift light objects, make tiny temporary objects." },
  { name: "Telekinetic Projectile", rank: 0, traditions: ["arcane", "occult"], actions: "2", range: "30 ft.; 1 creature", defense: "AC", dmg: { count: 2, die: 6, per: 1, type: "B, P or S" }, desc: "Hurl a loose object at a target with a spell attack." },
  { name: "Frostbite", rank: 0, traditions: ["arcane", "primal"], actions: "2", range: "60 ft.; 1 creature", defense: "basic Fortitude", dmg: { count: 2, die: 4, per: 1, type: "cold" }, desc: "Freezing cold; a critical failure adds weakness 1 to bludgeoning." },
  { name: "Daze", rank: 0, traditions: ["arcane", "divine", "occult"], actions: "2", range: "60 ft.; 1 creature", defense: "Will", dmg: { count: 1, die: 6, per: 1, type: "mental" }, step: 2, desc: "Mental jolt; a critical failure also stuns 1." },
  { name: "Void Warp", rank: 0, traditions: ["arcane", "divine", "occult"], actions: "2", range: "30 ft.; 1 living creature", defense: "basic Fortitude", dmg: { count: 2, die: 4, per: 1, type: "void" }, desc: "Harms life force; a critical failure enfeebles 1." },
  { name: "Vitality Lash", rank: 0, traditions: ["divine", "primal"], actions: "2", range: "30 ft.; 1 undead", defense: "basic Fortitude", dmg: { count: 2, die: 6, per: 1, type: "vitality" }, desc: "Damages undead and creatures with void healing." },
  { name: "Divine Lance", rank: 0, traditions: ["divine"], actions: "2", range: "60 ft.; 1 creature", defense: "AC", dmg: { count: 2, die: 4, per: 1, type: "spirit" }, desc: "A beam of divine energy." },
  { name: "Guidance", rank: 0, traditions: ["divine", "occult", "primal"], actions: "1", range: "30 ft.; 1 creature", defense: "—", desc: "+1 status bonus to one check before your next turn." },
  { name: "Message", rank: 0, traditions: ["arcane", "divine", "occult"], actions: "1", range: "120 ft.; 1 creature", defense: "—", desc: "Whisper to a creature, which can reply." },
  { name: "Telekinetic Hand", rank: 0, traditions: ["arcane", "occult"], actions: "2", range: "30 ft.", defense: "—", duration: "sustained", desc: "A floating hand moves a light object." },
  { name: "Read Aura", rank: 0, traditions: ALL, actions: "1 minute", range: "30 ft.; 1 object", defense: "—", desc: "Tell whether an object is magical." },
  { name: "Stabilize", rank: 0, traditions: ["divine", "primal"], actions: "2", range: "30 ft.; 1 dying creature", defense: "—", desc: "End the dying condition." },
  // rank 1
  { name: "Force Barrage", rank: 1, traditions: ["arcane", "occult"], actions: "1-3", range: "120 ft.", defense: "auto-hit", dmg: { count: 1, die: 4, per: 0, type: "force per shard", flat: 1 }, desc: "One shard per action (1d4+1 force each) that never misses." },
  { name: "Fear", rank: 1, traditions: ALL, actions: "2", range: "30 ft.; 1 creature", defense: "Will", desc: "Frightened 1 (success) to frightened 3 and fleeing (critical failure)." },
  { name: "Heal", rank: 1, traditions: ["divine", "primal"], actions: "1-3", range: "touch to 30-ft. emanation", defense: "basic Fortitude (undead)", dmg: { count: 1, die: 8, per: 1, type: "healing" }, desc: "Heal the living or damage undead; more actions reach farther." },
  { name: "Harm", rank: 1, traditions: ["divine"], actions: "1-3", range: "touch to 30-ft. emanation", defense: "basic Fortitude", dmg: { count: 1, die: 8, per: 1, type: "void" }, desc: "Damage the living or heal undead." },
  { name: "Sure Strike", rank: 1, traditions: ["arcane", "occult"], actions: "1", range: "self", defense: "—", desc: "Roll your next attack twice and take the better result." },
  { name: "Breathe Fire", rank: 1, traditions: ["arcane", "primal"], actions: "2", range: "15-ft. cone", defense: "basic Reflex", dmg: { count: 2, die: 6, per: 2, type: "fire" }, desc: "A gout of flame from your mouth." },
  { name: "Bless", rank: 1, traditions: ["divine", "occult"], actions: "2", range: "15-ft. emanation", defense: "—", duration: "1 minute", desc: "You and allies get +1 status to attack rolls." },
  { name: "Command", rank: 1, traditions: ["arcane", "divine", "occult"], actions: "2", range: "30 ft.; 1 creature", defense: "Will", desc: "A one-word command the target must obey on its turn." },
  { name: "Charm", rank: 1, traditions: ["arcane", "occult", "primal"], actions: "2", range: "30 ft.; 1 creature", defense: "Will", duration: "1 hour", desc: "The target becomes friendly (helpful on a critical failure)." },
  { name: "Grease", rank: 1, traditions: ["arcane", "primal"], actions: "2", range: "30 ft.", defense: "Reflex/Acrobatics", duration: "1 minute", desc: "Slippery ground or object; creatures may fall prone." },
  { name: "Sleep", rank: 1, traditions: ["arcane", "occult"], actions: "2", range: "30 ft.; 5-ft. burst", defense: "Will", desc: "Creatures fall unconscious for a minute (an hour on a critical failure)." },
  { name: "Mystic Armor", rank: 1, traditions: ALL, actions: "2", range: "self", defense: "—", duration: "until daily preparations", desc: "+1 item bonus to AC (dex cap +5) using unarmored proficiency." },
  { name: "Gust of Wind", rank: 1, traditions: ["arcane", "primal"], actions: "2", range: "60-ft. line", defense: "Fortitude", desc: "Wind knocks creatures prone and can push them." },
  { name: "Mending", rank: 1, traditions: ALL, actions: "10 minutes", range: "touch", defense: "—", desc: "Repair a non-magical item." },
  { name: "Sanctuary", rank: 1, traditions: ["divine", "occult"], actions: "2", range: "touch", defense: "Will (attackers)", duration: "1 minute", desc: "Attackers must pass a Will save to target the creature." },
  { name: "Soothe", rank: 1, traditions: ["occult"], actions: "2", range: "30 ft.; 1 willing creature", defense: "—", duration: "1 minute", dmg: { count: 1, die: 10, per: 1, type: "healing", flat: 4 }, desc: "Heal and grant +2 status to saves against mental effects." },
  { name: "Protection", rank: 1, traditions: ["divine", "occult"], actions: "2", range: "touch", defense: "—", duration: "1 minute", desc: "+1 status bonus to AC and saves." },
  // rank 2
  { name: "Invisibility", rank: 2, traditions: ["arcane", "occult"], actions: "2", range: "touch", defense: "—", duration: "10 minutes", desc: "The target is invisible until it acts hostile." },
  { name: "Resist Energy", rank: 2, traditions: ALL, actions: "2", range: "touch", defense: "—", duration: "10 minutes", desc: "Resistance 5 to acid, cold, electricity, fire or sonic." },
  { name: "Blazing Bolt", rank: 2, traditions: ["arcane", "primal"], actions: "1-3", range: "60 ft.", defense: "AC", dmg: { count: 4, die: 6, per: 2, type: "fire per ray (2-3 actions)" }, desc: "Rays of fire: 2d6 with 1 action, 4d6 each with 2-3 actions (up to 3 targets)." },
  { name: "Calm", rank: 2, traditions: ["divine", "occult"], actions: "2", range: "120 ft.; 10-ft. burst", defense: "Will", duration: "sustained up to 1 minute", desc: "Creatures can't use hostile actions or emotion effects." },
  { name: "See the Unseen", rank: 2, traditions: ["arcane", "divine", "occult"], actions: "2", range: "self", defense: "—", duration: "10 minutes", desc: "See invisible and incorporeal creatures." },
  { name: "Darkness", rank: 2, traditions: ALL, actions: "3", range: "120 ft.; 20-ft. burst", defense: "—", duration: "1 minute", desc: "Magical darkness that blocks light." },
  { name: "Revealing Light", rank: 2, traditions: ALL, actions: "2", range: "120 ft.; 10-ft. burst", defense: "Reflex", desc: "Dazzle creatures; invisible ones become merely concealed." },
  { name: "Blur", rank: 2, traditions: ["arcane", "occult"], actions: "2", range: "touch", defense: "—", duration: "1 minute", desc: "The target becomes concealed." },
  { name: "Darkvision", rank: 2, traditions: ALL, actions: "2", range: "self", defense: "—", duration: "1 hour", desc: "You gain darkvision." },
  { name: "Shatter", rank: 2, traditions: ["occult", "primal"], actions: "2", range: "30 ft.; 1 object", defense: "—", dmg: { count: 2, die: 10, per: 1, type: "sonic" }, desc: "Break an unattended object, ignoring some Hardness." },
  { name: "Mist", rank: 2, traditions: ["arcane", "primal"], actions: "3", range: "120 ft.; 20-ft. burst", defense: "—", duration: "1 minute", desc: "Mist conceals creatures inside it." },
  { name: "Enlarge", rank: 2, traditions: ["arcane", "primal"], actions: "2", range: "30 ft.; 1 willing creature", defense: "—", duration: "5 minutes", desc: "The target becomes Large: more reach and +2 melee damage, but clumsy 1." },
  { name: "Dispel Magic", rank: 2, traditions: ALL, actions: "2", range: "120 ft.", defense: "counteract", desc: "Counteract a spell or suppress a magic item." },
  { name: "Shrink", rank: 2, traditions: ["arcane", "primal"], actions: "2", range: "30 ft.; 1 willing creature", defense: "—", duration: "5 minutes", desc: "The target becomes Tiny." },
  { name: "Laughing Fit", rank: 2, traditions: ["arcane", "occult"], actions: "2", range: "30 ft.; 1 creature", defense: "Will", duration: "sustained", desc: "The target can't react, and may be slowed or knocked prone." },
  // rank 3
  { name: "Fireball", rank: 3, traditions: ["arcane", "primal"], actions: "2", range: "500 ft.; 20-ft. burst", defense: "basic Reflex", dmg: { count: 6, die: 6, per: 2, type: "fire" }, desc: "A roaring blast of fire." },
  { name: "Haste", rank: 3, traditions: ["arcane", "occult", "primal"], actions: "2", range: "30 ft.; 1 creature", defense: "—", duration: "1 minute", desc: "The target is quickened (extra Strike or Stride each turn)." },
  { name: "Slow", rank: 3, traditions: ["arcane", "occult", "primal"], actions: "2", range: "30 ft.; 1 creature", defense: "Fortitude", desc: "The target is slowed 1 (slowed 2 on a critical failure)." },
  { name: "Lightning Bolt", rank: 3, traditions: ["arcane", "primal"], actions: "2", range: "120-ft. line", defense: "basic Reflex", dmg: { count: 4, die: 12, per: 1, type: "electricity" }, desc: "A bolt of lightning." },
  { name: "Vampiric Feast", rank: 3, traditions: ["arcane", "divine", "occult"], actions: "2", range: "touch", defense: "basic Fortitude", dmg: { count: 6, die: 6, per: 2, type: "void" }, desc: "Drain life and gain temporary HP equal to half the damage dealt." },
  { name: "Heroism", rank: 3, traditions: ["divine", "occult"], actions: "2", range: "touch", defense: "—", duration: "10 minutes", desc: "+1 status bonus to attacks, Perception, saves and skill checks." },
  { name: "Paralyze", rank: 3, traditions: ["arcane", "occult"], actions: "2", range: "30 ft.; 1 creature", defense: "Will", desc: "Stunned 1, or paralyzed for 1 or more rounds." },
  { name: "Holy Light", rank: 3, traditions: ["divine", "primal"], actions: "2", range: "120 ft.; 1 creature", defense: "AC", dmg: { count: 5, die: 6, per: 2, type: "fire (+5d6 spirit vs unholy)" }, desc: "A ray of holy light." },
  { name: "Enthrall", rank: 3, traditions: ["arcane", "occult"], actions: "2", range: "120 ft.", defense: "Will", duration: "sustained", desc: "Fascinate creatures that notice your speech or song." },
];

export const spellPF2 = (n: string) => SPELLS_PF2.find((s) => s.name === n);

/** Damage text for a spell cast at a given rank. */
export function dmgAt(s: SpellPF2, rank: number) {
  if (!s.dmg) return undefined;
  const base = Math.max(1, s.rank);
  const steps = Math.floor((rank - base) / (s.step ?? 1));
  const n = s.dmg.count + Math.max(0, steps) * s.dmg.per;
  return `${n}d${s.dmg.die}${s.dmg.flat ? `+${s.dmg.flat}` : ""} ${s.dmg.type}`;
}

// ---------------------------------------------------------------- weapons & gear
export interface WeaponPF2 {
  name: string;
  damage: string;
  type: string;
  bulk: number;
  traits: string;
  finesse?: boolean;
  ranged?: boolean;
  thrown?: boolean;
}

export const WEAPONS_PF2: WeaponPF2[] = [
  { name: "Dagger", damage: "1d4", type: "P", bulk: 0.1, traits: "agile, finesse, thrown 10 ft., versatile S", finesse: true, thrown: true },
  { name: "Staff", damage: "1d4", type: "B", bulk: 1, traits: "two-hand d8" },
  { name: "Club", damage: "1d6", type: "B", bulk: 1, traits: "thrown 10 ft.", thrown: true },
  { name: "Spear", damage: "1d6", type: "P", bulk: 1, traits: "thrown 20 ft.", thrown: true },
  { name: "Sickle", damage: "1d4", type: "S", bulk: 0.1, traits: "agile, finesse, trip", finesse: true },
  { name: "Mace", damage: "1d6", type: "B", bulk: 1, traits: "shove" },
  { name: "Morningstar", damage: "1d6", type: "B", bulk: 1, traits: "versatile P" },
  { name: "Javelin", damage: "1d6", type: "P", bulk: 0.1, traits: "thrown 30 ft.", ranged: true, thrown: true },
  { name: "Sling", damage: "1d6", type: "B", bulk: 0.1, traits: "range 50 ft., propulsive", ranged: true },
  { name: "Crossbow", damage: "1d8", type: "P", bulk: 1, traits: "range 120 ft., reload 1", ranged: true },
];

export const weaponPF2 = (n: string) => WEAPONS_PF2.find((w) => w.name.toLowerCase() === n.trim().toLowerCase());

export const GEAR_PF2: { name: string; bulk: number }[] = [
  ...WEAPONS_PF2.map((w) => ({ name: w.name, bulk: w.bulk })),
  { name: "Backpack", bulk: 0.1 },
  { name: "Bedroll", bulk: 0.1 },
  { name: "Chalk (10 pieces)", bulk: 0 },
  { name: "Flint and steel", bulk: 0 },
  { name: "Rope (50 ft.)", bulk: 0.1 },
  { name: "Rations (1 week)", bulk: 0.1 },
  { name: "Torch", bulk: 0.1 },
  { name: "Waterskin", bulk: 0.1 },
  { name: "Healer's toolkit", bulk: 1 },
  { name: "Thieves' toolkit", bulk: 0.1 },
  { name: "Minor healing potion", bulk: 0.1 },
  { name: "Caltrops", bulk: 0.1 },
  { name: "Crowbar", bulk: 0.1 },
];

export const LANGUAGES_PF2 = ["Common", "Draconic", "Dwarven", "Elven", "Empyrean", "Fey", "Gnomish", "Goblin", "Halfling", "Jotun", "Orcish", "Sakvroth", "Chthonian", "Diabolic", "Necril", "Petran", "Pyric", "Sussuran", "Thalassic", "Amurrun", "Iruxi", "Kholo", "Tengu", "Tripkee", "Ysoki"];
