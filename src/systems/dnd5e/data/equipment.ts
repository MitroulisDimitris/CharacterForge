// Weapons, armor, packs and common gear (Player's Handbook equipment chapter; same numbers in
// the 2014 SRD 5.1). Used for attacks, AC and the starting-equipment step.

export interface Weapon {
  name: string;
  damage: string;
  type: string;
  properties: string;
  finesse?: boolean;
  ranged?: boolean;
  /** Thrown melee weapons can also be thrown (uses the same ability). */
  thrown?: boolean;
  simple: boolean;
  weight: number;
}

const W = (name: string, damage: string, type: string, properties: string, weight: number, simple: boolean, o: Partial<Weapon> = {}): Weapon => ({
  name,
  damage,
  type,
  properties,
  weight,
  simple,
  finesse: /Finesse/.test(properties),
  thrown: /Thrown/.test(properties),
  ...o,
});

export const WEAPONS: Weapon[] = [
  // Simple melee
  W("Club", "1d4", "Bludgeoning", "Light", 2, true),
  W("Dagger", "1d4", "Piercing", "Finesse, Light, Thrown (20/60)", 1, true),
  W("Greatclub", "1d8", "Bludgeoning", "Two-Handed", 10, true),
  W("Handaxe", "1d6", "Slashing", "Light, Thrown (20/60)", 2, true),
  W("Javelin", "1d6", "Piercing", "Thrown (30/120)", 2, true),
  W("Light Hammer", "1d4", "Bludgeoning", "Light, Thrown (20/60)", 2, true),
  W("Mace", "1d6", "Bludgeoning", "—", 4, true),
  W("Quarterstaff", "1d6", "Bludgeoning", "Versatile (1d8)", 4, true),
  W("Sickle", "1d4", "Slashing", "Light", 2, true),
  W("Spear", "1d6", "Piercing", "Thrown (20/60), Versatile (1d8)", 3, true),
  // Simple ranged
  W("Light Crossbow", "1d8", "Piercing", "Ammunition (80/320), Loading, Two-Handed", 5, true, { ranged: true }),
  W("Dart", "1d4", "Piercing", "Finesse, Thrown (20/60)", 0.25, true, { ranged: true }),
  W("Shortbow", "1d6", "Piercing", "Ammunition (80/320), Two-Handed", 2, true, { ranged: true }),
  W("Sling", "1d4", "Bludgeoning", "Ammunition (30/120)", 0, true, { ranged: true }),
  // Martial melee
  W("Battleaxe", "1d8", "Slashing", "Versatile (1d10)", 4, false),
  W("Flail", "1d8", "Bludgeoning", "—", 2, false),
  W("Glaive", "1d10", "Slashing", "Heavy, Reach, Two-Handed", 6, false),
  W("Greataxe", "1d12", "Slashing", "Heavy, Two-Handed", 7, false),
  W("Greatsword", "2d6", "Slashing", "Heavy, Two-Handed", 6, false),
  W("Halberd", "1d10", "Slashing", "Heavy, Reach, Two-Handed", 6, false),
  W("Lance", "1d12", "Piercing", "Reach, Special", 6, false),
  W("Longsword", "1d8", "Slashing", "Versatile (1d10)", 3, false),
  W("Maul", "2d6", "Bludgeoning", "Heavy, Two-Handed", 10, false),
  W("Morningstar", "1d8", "Piercing", "—", 4, false),
  W("Pike", "1d10", "Piercing", "Heavy, Reach, Two-Handed", 18, false),
  W("Rapier", "1d8", "Piercing", "Finesse", 2, false),
  W("Scimitar", "1d6", "Slashing", "Finesse, Light", 3, false),
  W("Shortsword", "1d6", "Piercing", "Finesse, Light", 2, false),
  W("Trident", "1d6", "Piercing", "Thrown (20/60), Versatile (1d8)", 4, false),
  W("War Pick", "1d8", "Piercing", "—", 2, false),
  W("Warhammer", "1d8", "Bludgeoning", "Versatile (1d10)", 2, false),
  W("Whip", "1d4", "Slashing", "Finesse, Reach", 3, false),
  // Martial ranged
  W("Blowgun", "1", "Piercing", "Ammunition (25/100), Loading", 1, false, { ranged: true }),
  W("Hand Crossbow", "1d6", "Piercing", "Ammunition (30/120), Light, Loading", 3, false, { ranged: true }),
  W("Heavy Crossbow", "1d10", "Piercing", "Ammunition (100/400), Heavy, Loading, Two-Handed", 18, false, { ranged: true }),
  W("Longbow", "1d8", "Piercing", "Ammunition (150/600), Heavy, Two-Handed", 2, false, { ranged: true }),
];

export const weaponByName = (n: string) => WEAPONS.find((w) => w.name.toLowerCase() === n.trim().toLowerCase());
export const SIMPLE_WEAPONS = WEAPONS.filter((w) => w.simple).map((w) => w.name);
export const MARTIAL_WEAPONS = WEAPONS.filter((w) => !w.simple).map((w) => w.name);
export const SIMPLE_MELEE = WEAPONS.filter((w) => w.simple && !w.ranged).map((w) => w.name);
export const MARTIAL_MELEE = WEAPONS.filter((w) => !w.simple && !w.ranged).map((w) => w.name);

export type ArmorCategory = "light" | "medium" | "heavy" | "shield";

export interface Armor {
  name: string;
  category: ArmorCategory;
  /** Base AC (shield: the bonus). */
  ac: number;
  /** Max DEX bonus added (undefined = full DEX, 0 = none). */
  maxDex?: number;
  strength?: number;
  stealthDisadvantage?: boolean;
  weight: number;
}

export const ARMOR: Armor[] = [
  { name: "Padded Armor", category: "light", ac: 11, stealthDisadvantage: true, weight: 8 },
  { name: "Leather Armor", category: "light", ac: 11, weight: 10 },
  { name: "Studded Leather Armor", category: "light", ac: 12, weight: 13 },
  { name: "Hide Armor", category: "medium", ac: 12, maxDex: 2, weight: 12 },
  { name: "Chain Shirt", category: "medium", ac: 13, maxDex: 2, weight: 20 },
  { name: "Scale Mail", category: "medium", ac: 14, maxDex: 2, stealthDisadvantage: true, weight: 45 },
  { name: "Breastplate", category: "medium", ac: 14, maxDex: 2, weight: 20 },
  { name: "Half Plate", category: "medium", ac: 15, maxDex: 2, stealthDisadvantage: true, weight: 40 },
  { name: "Ring Mail", category: "heavy", ac: 14, maxDex: 0, stealthDisadvantage: true, weight: 40 },
  { name: "Chain Mail", category: "heavy", ac: 16, maxDex: 0, strength: 13, stealthDisadvantage: true, weight: 55 },
  { name: "Splint Armor", category: "heavy", ac: 17, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 60 },
  { name: "Plate Armor", category: "heavy", ac: 18, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 65 },
  { name: "Shield", category: "shield", ac: 2, weight: 6 },
];

export const armorByName = (n: string) => {
  const k = n.trim().toLowerCase();
  return ARMOR.find((a) => a.name.toLowerCase() === k || a.name.toLowerCase() === `${k} armor` || (a.category === "shield" && /shield/.test(k)));
};

export const ARTISAN_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];
export const MUSICAL_INSTRUMENTS = ["Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Horn", "Pan Flute", "Shawm", "Viol"];
export const GAMING_SETS = ["Dice Set", "Dragonchess Set", "Playing Card Set", "Three-Dragon Ante Set"];
export const OTHER_TOOLS = ["Disguise Kit", "Forgery Kit", "Herbalism Kit", "Navigator's Tools", "Poisoner's Kit", "Thieves' Tools", "Vehicles (land)", "Vehicles (water)"];
export const ALL_TOOLS = [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS, ...GAMING_SETS, ...OTHER_TOOLS];

export interface ItemPreset {
  name: string;
  weight: number;
}

/** Weights (lb) for gear that packs and starting kits contain. */
const GEAR_WEIGHTS: [string, number][] = [
  ["Arcane Focus (Crystal)", 1],
  ["Arcane Focus (Orb)", 3],
  ["Arcane Focus (Rod)", 2],
  ["Arcane Focus (Staff)", 4],
  ["Arcane Focus (Wand)", 1],
  ["Druidic Focus (Sprig of Mistletoe)", 0],
  ["Druidic Focus (Wooden Staff)", 4],
  ["Druidic Focus (Yew Wand)", 1],
  ["Holy Symbol (Amulet)", 1],
  ["Holy Symbol (Emblem)", 0],
  ["Holy Symbol (Reliquary)", 2],
  ["Component Pouch", 2],
  ["Spellbook", 3],
  ["Diamond (50 GP)", 0],
  ["Arrows", 0.05],
  ["Crossbow Bolts", 0.075],
  ["Quiver", 1],
  ["Crossbow Bolt Case", 1],
  ["Backpack", 5],
  ["Bedroll", 7],
  ["Blanket", 3],
  ["Mess Kit", 1],
  ["Tinderbox", 1],
  ["Torch", 1],
  ["Rations (1 day)", 2],
  ["Waterskin", 5],
  ["Hempen Rope (50 ft)", 10],
  ["Silk Rope (50 ft)", 5],
  ["Crowbar", 5],
  ["Hammer", 3],
  ["Piton", 0.25],
  ["Ball Bearings (bag of 1,000)", 2],
  ["String (10 ft)", 0],
  ["Bell", 0],
  ["Candle", 0],
  ["Hooded Lantern", 2],
  ["Lamp", 1],
  ["Oil (flask)", 1],
  ["Chest", 25],
  ["Map or Scroll Case", 1],
  ["Fine Clothes", 6],
  ["Common Clothes", 3],
  ["Traveler's Clothes", 4],
  ["Costume", 4],
  ["Vestments", 4],
  ["Robes", 4],
  ["Ink (1 ounce bottle)", 0],
  ["Ink Pen", 0],
  ["Paper (sheet)", 0],
  ["Parchment (sheet)", 0],
  ["Perfume (vial)", 0],
  ["Sealing Wax", 0],
  ["Soap", 0],
  ["Alms Box", 1],
  ["Incense (block)", 0],
  ["Censer", 1],
  ["Book", 5],
  ["Bag of Sand", 1],
  ["Small Knife", 0.5],
  ["Pouch", 1],
  ["Caltrops (bag of 20)", 2],
  ["Healer's Kit", 3],
  ["Potion of Healing", 0.5],
  ["Disguise Kit", 3],
  ["Forgery Kit", 5],
  ["Herbalism Kit", 3],
  ["Thieves' Tools", 1],
  ["Navigator's Tools", 2],
  ["Poisoner's Kit", 2],
  ["Shovel", 5],
  ["Iron Pot", 10],
  ["Hunting Trap", 25],
  ["Lute", 2],
];

const ARMOR_PRESETS: ItemPreset[] = ARMOR.map((a) => ({ name: a.name, weight: a.weight }));

export const GEAR: ItemPreset[] = [
  ...WEAPONS.map((w) => ({ name: w.name, weight: w.weight })),
  ...ARMOR_PRESETS,
  ...GEAR_WEIGHTS.map(([name, weight]) => ({ name, weight })),
];

/** Best-known weight of an item name (0 if unknown). */
export const weightOf = (name: string) => {
  const k = name.trim().toLowerCase();
  return GEAR.find((g) => g.name.toLowerCase() === k)?.weight ?? (MUSICAL_INSTRUMENTS.some((i) => i.toLowerCase() === k) ? 3 : ARTISAN_TOOLS.some((i) => i.toLowerCase() === k) ? 5 : 0);
};

export interface KitItem {
  name: string;
  qty: number;
}
const K = (name: string, qty = 1): KitItem => ({ name, qty });

/** Equipment packs (PHB): contents. */
export const PACKS: Record<string, KitItem[]> = {
  "Burglar's Pack": [K("Backpack"), K("Ball Bearings (bag of 1,000)"), K("String (10 ft)"), K("Bell"), K("Candle", 5), K("Crowbar"), K("Hammer"), K("Piton", 10), K("Hooded Lantern"), K("Oil (flask)", 2), K("Rations (1 day)", 5), K("Tinderbox"), K("Waterskin"), K("Hempen Rope (50 ft)")],
  "Diplomat's Pack": [K("Chest"), K("Map or Scroll Case", 2), K("Fine Clothes"), K("Ink (1 ounce bottle)"), K("Ink Pen"), K("Lamp"), K("Oil (flask)", 2), K("Paper (sheet)", 5), K("Perfume (vial)"), K("Sealing Wax"), K("Soap")],
  "Dungeoneer's Pack": [K("Backpack"), K("Crowbar"), K("Hammer"), K("Piton", 10), K("Torch", 10), K("Tinderbox"), K("Rations (1 day)", 10), K("Waterskin"), K("Hempen Rope (50 ft)")],
  "Entertainer's Pack": [K("Backpack"), K("Bedroll"), K("Costume", 2), K("Candle", 5), K("Rations (1 day)", 5), K("Waterskin"), K("Disguise Kit")],
  "Explorer's Pack": [K("Backpack"), K("Bedroll"), K("Mess Kit"), K("Tinderbox"), K("Torch", 10), K("Rations (1 day)", 10), K("Waterskin"), K("Hempen Rope (50 ft)")],
  "Priest's Pack": [K("Backpack"), K("Blanket"), K("Candle", 10), K("Tinderbox"), K("Alms Box"), K("Incense (block)", 2), K("Censer"), K("Vestments"), K("Rations (1 day)", 2), K("Waterskin")],
  "Scholar's Pack": [K("Backpack"), K("Book"), K("Ink (1 ounce bottle)"), K("Ink Pen"), K("Parchment (sheet)", 10), K("Bag of Sand"), K("Small Knife")],
};

/** Sorcerer starting equipment, option A (2024). */
export const SORCERER_KIT = {
  items: [
    { name: "Spear", qty: 1, weight: 3 },
    { name: "Dagger", qty: 2, weight: 1 },
    { name: "Arcane Focus (Crystal)", qty: 1, weight: 1 },
    { name: "Backpack", qty: 1, weight: 5 },
    { name: "Caltrops", qty: 20, weight: 0.1 },
    { name: "Crowbar", qty: 1, weight: 5 },
    { name: "Oil (flask)", qty: 2, weight: 1 },
    { name: "Rations (1 day)", qty: 10, weight: 2 },
    { name: "Rope (50 ft)", qty: 1, weight: 5 },
    { name: "Tinderbox", qty: 1, weight: 1 },
    { name: "Torch", qty: 10, weight: 1 },
    { name: "Waterskin", qty: 1, weight: 5 },
  ],
  gp: 28,
};
