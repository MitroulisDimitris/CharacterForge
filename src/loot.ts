/**
 * Suggested loot for monsters (user, 2026-11-17: "just coins, a magic item once in a while, and
 * magic items should be rarer"). Our own simple scheme, not the DMG treasure tables:
 * - Coins grow with challenge rating. Animals, oozes, plants, constructs, elementals and mindless
 *   creatures carry none.
 * - Once in a while (one roll per fight, a few percent) a magic item from the SRD 5.1 list, its
 *   rarity matched to the toughest creature. Names: SRD 5.1 (CC-BY-4.0); notes in our own words.
 * Later: hand the loot out to players after a fight (CHECKLIST).
 */

export interface Coins {
  cp: number;
  sp: number;
  gp: number;
  pp: number;
}
export type Rarity = "common" | "uncommon" | "rare" | "very rare" | "legendary";
export interface MagicItem {
  name: string;
  rarity: Rarity;
  note: string;
}
/** One kind of monster that was beaten (or is being looked at). */
export interface Foe {
  name: string;
  count: number;
  cr: number;
  /** "Humanoid", "Beast", … as the stat block says. */
  type: string;
  intelligence: number;
}
export interface LootLine {
  name: string;
  count: number;
  /** null = carries nothing; `why` says so in plain words. */
  coins: Coins | null;
  why?: string;
}
export interface Loot {
  lines: LootLine[];
  item: { item: MagicItem; from: string } | null;
  /** Worth of all the coins, in gp. */
  total: number;
}

type Rng = () => number;

const die = (rng: Rng, n: number, sides = 6) => {
  let t = 0;
  for (let i = 0; i < n; i++) t += 1 + Math.floor(rng() * sides);
  return t;
};

/** 0: CR below 1 · 1: CR 1–4 · 2: CR 5–10 · 3: CR 11–16 · 4: CR 17+. */
export function tierOf(cr: number): 0 | 1 | 2 | 3 | 4 {
  if (cr < 1) return 0;
  if (cr <= 4) return 1;
  if (cr <= 10) return 2;
  if (cr <= 16) return 3;
  return 4;
}

const NO_COINS: Record<string, string> = {
  beast: "Animals carry no coins.",
  ooze: "Oozes carry nothing of their own.",
  plant: "Plants carry nothing of their own.",
  construct: "Constructs carry nothing of their own.",
  elemental: "Elementals carry nothing of their own.",
};

/** Why this creature carries no coins, or null when it does. */
export function noCoinsWhy(f: Pick<Foe, "type" | "intelligence">): string | null {
  const type = f.type.toLowerCase();
  if (NO_COINS[type]) return NO_COINS[type];
  if (type.includes("swarm")) return NO_COINS.beast;
  if (f.intelligence < (type === "undead" ? 8 : 6)) return "Too mindless to keep coins.";
  return null;
}

/** Coins one creature carries. */
export function rollCoins(cr: number, rng: Rng = Math.random): Coins {
  const c = Math.max(0, Math.ceil(cr));
  switch (tierOf(cr)) {
    case 0:
      return { cp: die(rng, 3), sp: die(rng, 1), gp: 0, pp: 0 };
    case 1:
      return { cp: 0, sp: die(rng, 2), gp: die(rng, c + 1), pp: 0 };
    case 2:
      return { cp: 0, sp: die(rng, 3), gp: die(rng, c) * 5, pp: 0 };
    case 3:
      return { cp: 0, sp: 0, gp: die(rng, c - 6) * 10, pp: die(rng, 1) };
    default:
      return { cp: 0, sp: 0, gp: die(rng, 6) * 25, pp: die(rng, c - 14) * 2 };
  }
}

export const addCoins = (a: Coins, b: Coins): Coins => ({ cp: a.cp + b.cp, sp: a.sp + b.sp, gp: a.gp + b.gp, pp: a.pp + b.pp });
export const coinValue = (c: Coins) => c.cp / 100 + c.sp / 10 + c.gp + c.pp * 10;
export function coinText(c: Coins): string {
  const parts = (["pp", "gp", "sp", "cp"] as const).filter((k) => c[k] > 0).map((k) => `${c[k].toLocaleString("en")} ${k}`);
  return parts.join(", ") || "No coins";
}
/** "about 38 gp", "under 1 gp". */
export function gpText(v: number): string {
  if (v <= 0) return "0 gp";
  if (v < 1) return "under 1 gp";
  return `${Math.round(v).toLocaleString("en")} gp`;
}

/** Chance of one magic item per fight, by the toughest coin-carrier's tier. Kept low on purpose. */
export const ITEM_CHANCE = [0.02, 0.04, 0.07, 0.1, 0.15] as const;
/** Rarity by tier: [usual rarity, its chance, the other rarity]. */
const RARITY: [Rarity, number, Rarity][] = [
  ["common", 0.85, "uncommon"],
  ["common", 0.6, "uncommon"],
  ["uncommon", 0.65, "rare"],
  ["rare", 0.65, "very rare"],
  ["very rare", 0.7, "legendary"],
];

export const MAGIC_ITEMS: MagicItem[] = [
  { name: "Potion of Healing", rarity: "common", note: "Drink it to regain 2d4 + 2 hit points." },
  { name: "Potion of Climbing", rarity: "common", note: "For an hour you climb as fast as you walk, and climbing is easier." },
  { name: "Spell Scroll (1st level)", rarity: "common", note: "Holds one 1st-level spell; reading it casts the spell once." },
  { name: "Spell Scroll (cantrip)", rarity: "common", note: "Holds one cantrip; reading it casts the spell once." },
  { name: "Potion of Greater Healing", rarity: "uncommon", note: "Drink it to regain 4d4 + 4 hit points." },
  { name: "Potion of Water Breathing", rarity: "uncommon", note: "Breathe underwater for an hour." },
  { name: "Bag of Holding", rarity: "uncommon", note: "A small bag that holds far more than it looks: up to 500 pounds." },
  { name: "Cloak of Protection", rarity: "uncommon", note: "+1 to AC and saving throws while you wear it. Needs attunement." },
  { name: "Boots of Elvenkind", rarity: "uncommon", note: "Your steps make no sound; sneaking is easier." },
  { name: "Goggles of Night", rarity: "uncommon", note: "See in the dark out to 60 feet." },
  { name: "Immovable Rod", rarity: "uncommon", note: "Press its button and it stays fixed in the air, holding up to 8,000 pounds." },
  { name: "Wand of Magic Missiles", rarity: "uncommon", note: "Has charges to cast magic missile; it recharges each dawn." },
  { name: "Weapon, +1", rarity: "uncommon", note: "+1 to attack and damage rolls with it. You pick what kind of weapon." },
  { name: "Shield, +1", rarity: "uncommon", note: "+1 to AC on top of the shield's usual +2." },
  { name: "Spell Scroll (2nd level)", rarity: "uncommon", note: "Holds one 2nd-level spell; reading it casts the spell once." },
  { name: "Sending Stones", rarity: "uncommon", note: "A pair of stones: each lets you send a short message to whoever holds the other." },
  { name: "Potion of Superior Healing", rarity: "rare", note: "Drink it to regain 8d4 + 8 hit points." },
  { name: "Ring of Protection", rarity: "rare", note: "+1 to AC and saving throws while you wear it. Needs attunement." },
  { name: "Armor, +1", rarity: "rare", note: "+1 to AC on top of the armor. You pick what kind of armor." },
  { name: "Weapon, +2", rarity: "rare", note: "+2 to attack and damage rolls with it. You pick what kind of weapon." },
  { name: "Flame Tongue", rarity: "rare", note: "A sword that bursts into flame on command and deals extra fire damage. Needs attunement." },
  { name: "Cloak of Displacement", rarity: "rare", note: "You seem to stand a little to one side; attacks against you are harder. Needs attunement." },
  { name: "Boots of Speed", rarity: "rare", note: "Click the heels to double your speed for a short time. Needs attunement." },
  { name: "Necklace of Fireballs", rarity: "rare", note: "Throw a bead to set off a fireball. It has a handful of beads." },
  { name: "Wand of Lightning Bolts", rarity: "rare", note: "Has charges to cast lightning bolt. Needs attunement by a spellcaster." },
  { name: "Portable Hole", rarity: "rare", note: "A black cloth that unfolds into a 10-foot-deep hole you can carry." },
  { name: "Potion of Supreme Healing", rarity: "very rare", note: "Drink it to regain 10d4 + 20 hit points." },
  { name: "Weapon, +3", rarity: "very rare", note: "+3 to attack and damage rolls with it. You pick what kind of weapon." },
  { name: "Armor, +2", rarity: "very rare", note: "+2 to AC on top of the armor. You pick what kind of armor." },
  { name: "Carpet of Flying", rarity: "very rare", note: "A rug that flies with its riders on command." },
  { name: "Ring of Regeneration", rarity: "very rare", note: "Slowly heals you and even regrows lost limbs. Needs attunement." },
  { name: "Dancing Sword", rarity: "very rare", note: "Let go and it fights beside you on its own for a few turns. Needs attunement." },
  { name: "Staff of Fire", rarity: "very rare", note: "Charges to cast fire spells, and resistance to fire. Needs attunement by a spellcaster." },
  { name: "Armor, +3", rarity: "legendary", note: "+3 to AC on top of the armor. You pick what kind of armor." },
  { name: "Vorpal Sword", rarity: "legendary", note: "A blade sharp enough to take a head off on a natural 20. Needs attunement." },
  { name: "Cloak of Invisibility", rarity: "legendary", note: "Pull up the hood to turn invisible, a couple of hours a day. Needs attunement." },
  { name: "Ring of Three Wishes", rarity: "legendary", note: "Holds three uses of the wish spell." },
  { name: "Robe of the Archmagi", rarity: "legendary", note: "Better AC, saves against magic, and stronger spells. Needs attunement by a wizard, sorcerer or warlock." },
];

const pick = <T,>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

/** A magic item for a creature of this CR (rarity follows the tier). */
export function rollItem(cr: number, rng: Rng = Math.random): MagicItem {
  const [usual, chance, other] = RARITY[tierOf(cr)];
  const rarity = rng() < chance ? usual : other;
  return pick(
    MAGIC_ITEMS.filter((i) => i.rarity === rarity),
    rng,
  );
}

/** Loot for the creatures of a fight (or one creature on its page). */
export function rollLoot(foes: Foe[], rng: Rng = Math.random): Loot {
  const lines: LootLine[] = foes.map((f) => {
    const why = noCoinsWhy(f);
    if (why) return { name: f.name, count: f.count, coins: null, why };
    let coins: Coins = { cp: 0, sp: 0, gp: 0, pp: 0 };
    for (let i = 0; i < f.count; i++) coins = addCoins(coins, rollCoins(f.cr, rng));
    return { name: f.name, count: f.count, coins };
  });
  const carriers = foes.filter((f) => !noCoinsWhy(f)).sort((a, b) => b.cr - a.cr);
  const top = carriers[0];
  const item = top && rng() < ITEM_CHANCE[tierOf(top.cr)] ? { item: rollItem(top.cr, rng), from: top.name } : null;
  const total = lines.reduce((n, l) => n + (l.coins ? coinValue(l.coins) : 0), 0);
  return { lines, item, total };
}
