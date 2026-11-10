// Backgrounds (2024 rules) plus the legacy 2014 Criminal / Spy.
import type { KitItem } from "./equipment";
import type { Ability, Feature, SkillId } from "./core";
import type { FeatId } from "./feats";

export interface Background {
  id: string;
  name: string;
  book: string;
  legacy?: boolean;
  /** 2014 backgrounds: number of extra languages. */
  languages?: number;
  /** 2024 backgrounds: the three abilities you can raise (+2/+1 or +1/+1/+1). */
  abilities?: [Ability, Ability, Ability];
  feat?: FeatId;
  /** For Magic Initiate: which class list it uses. */
  featList?: "Cleric" | "Druid" | "Wizard";
  skills: SkillId[];
  tools: string;
  feature?: Feature;
  equipment: string;
  /** 2014: starting items and gold. */
  kit?: KitItem[];
  gp?: number;
  /** 2014 PHB variant of another background (e.g. Knight of Noble). */
  variantOf?: string;
  /** The PHB's custom background: pick any two skills and two tools/languages. */
  custom?: boolean;
}

export const BACKGROUNDS: Background[] = [
  { id: "acolyte", book: "PHB24", name: "Acolyte", abilities: ["INT", "WIS", "CHA"], feat: "magicInitiate", featList: "Cleric", skills: ["insight", "religion"], tools: "Calligrapher's Supplies", equipment: "Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP — or 50 GP" },
  { id: "artisan", book: "PHB24", name: "Artisan", abilities: ["STR", "DEX", "INT"], feat: "crafter", skills: ["investigation", "persuasion"], tools: "One kind of Artisan's Tools", equipment: "Artisan's Tools, 2 Pouches, Traveler's Clothes, 32 GP — or 50 GP" },
  { id: "charlatan", book: "PHB24", name: "Charlatan", abilities: ["DEX", "CON", "CHA"], feat: "skilled", skills: ["deception", "sleightOfHand"], tools: "Forgery Kit", equipment: "Forgery Kit, Costume, Fine Clothes, 15 GP — or 50 GP" },
  { id: "criminal", book: "PHB24", name: "Criminal", abilities: ["DEX", "CON", "INT"], feat: "alert", skills: ["sleightOfHand", "stealth"], tools: "Thieves' Tools", equipment: "2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP — or 50 GP" },
  { id: "entertainer", book: "PHB24", name: "Entertainer", abilities: ["STR", "DEX", "CHA"], feat: "musician", skills: ["acrobatics", "performance"], tools: "One kind of Musical Instrument", equipment: "Musical Instrument, 2 Costumes, Mirror, Perfume, Traveler's Clothes, 11 GP — or 50 GP" },
  { id: "farmer", book: "PHB24", name: "Farmer", abilities: ["STR", "CON", "WIS"], feat: "tough", skills: ["animalHandling", "nature"], tools: "Carpenter's Tools", equipment: "Sickle, Carpenter's Tools, Healer's Kit, Iron Pot, Shovel, Traveler's Clothes, 30 GP — or 50 GP" },
  { id: "guard", book: "PHB24", name: "Guard", abilities: ["STR", "INT", "WIS"], feat: "alert", skills: ["athletics", "perception"], tools: "One kind of Gaming Set", equipment: "Spear, Light Crossbow, 20 Bolts, Gaming Set, Hooded Lantern, Manacles, Quiver, Traveler's Clothes, 12 GP — or 50 GP" },
  { id: "guide", book: "PHB24", name: "Guide", abilities: ["DEX", "CON", "WIS"], feat: "magicInitiate", featList: "Druid", skills: ["stealth", "survival"], tools: "Cartographer's Tools", equipment: "Shortbow, 20 Arrows, Cartographer's Tools, Bedroll, Quiver, Tent, Traveler's Clothes, 3 GP — or 50 GP" },
  { id: "hermit", book: "PHB24", name: "Hermit", abilities: ["CON", "WIS", "CHA"], feat: "healer", skills: ["medicine", "religion"], tools: "Herbalism Kit", equipment: "Quarterstaff, Herbalism Kit, Book (philosophy), Bedroll, Lamp, Oil (3 flasks), Traveler's Clothes, 16 GP — or 50 GP" },
  { id: "merchant", book: "PHB24", name: "Merchant", abilities: ["CON", "INT", "CHA"], feat: "lucky", skills: ["animalHandling", "persuasion"], tools: "Navigator's Tools", equipment: "Navigator's Tools, 2 Pouches, Traveler's Clothes, 22 GP — or 50 GP" },
  { id: "noble", book: "PHB24", name: "Noble", abilities: ["STR", "INT", "CHA"], feat: "skilled", skills: ["history", "persuasion"], tools: "One kind of Gaming Set", equipment: "Gaming Set, Fine Clothes, Perfume, 29 GP — or 50 GP" },
  { id: "sage", book: "PHB24", name: "Sage", abilities: ["CON", "INT", "WIS"], feat: "magicInitiate", featList: "Wizard", skills: ["arcana", "history"], tools: "Calligrapher's Supplies", equipment: "Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP — or 50 GP" },
  { id: "sailor", book: "PHB24", name: "Sailor", abilities: ["STR", "DEX", "WIS"], feat: "tavernBrawler", skills: ["acrobatics", "perception"], tools: "Navigator's Tools", equipment: "Dagger, Navigator's Tools, Rope, Traveler's Clothes, 20 GP — or 50 GP" },
  { id: "scribe", book: "PHB24", name: "Scribe", abilities: ["DEX", "INT", "WIS"], feat: "skilled", skills: ["investigation", "perception"], tools: "Calligrapher's Supplies", equipment: "Calligrapher's Supplies, Fine Clothes, Lamp, Oil (3 flasks), Parchment (12 sheets), 23 GP — or 50 GP" },
  { id: "soldier", book: "PHB24", name: "Soldier", abilities: ["STR", "DEX", "CON"], feat: "savageAttacker", skills: ["athletics", "intimidation"], tools: "One kind of Gaming Set", equipment: "Spear, Shortbow, 20 Arrows, Gaming Set, Healer's Kit, Quiver, Traveler's Clothes, 14 GP — or 50 GP" },
  { id: "wayfarer", book: "PHB24", name: "Wayfarer", abilities: ["DEX", "WIS", "CHA"], feat: "lucky", skills: ["insight", "stealth"], tools: "Thieves' Tools", equipment: "2 Daggers, Thieves' Tools, Gaming Set, Bedroll, 2 Pouches, Traveler's Clothes, 16 GP — or 50 GP" },
  {
    id: "criminalSpy2014",
    book: "PHB14",
    languages: 0,
    name: "Criminal / Spy (2014 legacy)",
    legacy: true,
    skills: ["deception", "stealth"],
    tools: "Thieves' Tools, one kind of Gaming Set",
    feature: { name: "Criminal Contact", source: "Criminal / Spy (2014)", text: "You have a reliable contact who links you to a network of criminals and passes messages for you." },
    equipment: "Crowbar, dark common clothes with a hood, belt pouch with 15 GP",
  },
];

export const backgroundById = (id: string) => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
