// Items for the Wiki (REQUIREMENTS 4.5): every item in the free SRD 5.1 (fetched once from Open5e
// by `npx vite-node scripts/fetchItems.ts` into public/srd-items.json, because new Open5e queries
// can take minutes to answer): the
// Player's Handbook equipment (weapons, armour, gear, tools, mounts, with cost and weight) and the
// Dungeon Master's Guide magic items the SRD includes (rarity, attunement). Loaded once, cached.
// Xanathar's and Tasha's magic items are our own write-ups in bookItems.ts.

import { BOOK_ITEMS } from "./bookItems";

export type ItemKind = "weapon" | "armour" | "gear" | "tool" | "mount" | "wondrous" | "ring" | "rod" | "staff" | "wand" | "potion" | "scroll";
export type Rarity = "common" | "uncommon" | "rare" | "very rare" | "legendary" | "artifact";

export const KIND_LABEL: Record<ItemKind, string> = {
  weapon: "Weapon",
  armour: "Armour",
  gear: "Gear",
  tool: "Tool",
  mount: "Mount / vehicle",
  wondrous: "Wondrous item",
  ring: "Ring",
  rod: "Rod",
  staff: "Staff",
  wand: "Wand",
  potion: "Potion",
  scroll: "Scroll",
};
export const RARITIES: { id: Rarity; label: string; letter: string; color: string; rank: number }[] = [
  { id: "common", label: "Common", letter: "C", color: "#cbbfae", rank: 1 },
  { id: "uncommon", label: "Uncommon", letter: "U", color: "#6fbf73", rank: 2 },
  { id: "rare", label: "Rare", letter: "R", color: "#8fb6e3", rank: 3 },
  { id: "very rare", label: "Very rare", letter: "VR", color: "#b9a3e8", rank: 4 },
  { id: "legendary", label: "Legendary", letter: "L", color: "#e8a04a", rank: 5 },
  { id: "artifact", label: "Artifact", letter: "A", color: "#e0485e", rank: 6 },
];
export const rarityOf = (r?: Rarity) => RARITIES.find((x) => x.id === r);

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  /** "Weapon (any sword)", "Martial melee weapon", "Adventuring gear". */
  sub: string;
  rarity?: Rarity;
  /** "Requires attunement" / "Requires attunement by a wizard". */
  attune?: string;
  /** In gold pieces. */
  cost?: number;
  weight?: number;
  stats: [string, string][];
  desc: string;
  source: "PHB" | "DMG" | "XGE" | "TCE";
  /** One short line for the list. */
  line: string;
  /** Lower-case text the search looks through. */
  words: string;
}

export const OPEN5E = "https://api.open5e.com";

export interface V2Item {
  key: string;
  name: string;
  desc: string;
  category: { name: string; key: string };
  weapon: { damage_dice: string; damage_type?: { name: string }; properties?: { property: { name: string }; detail?: string | null }[]; is_simple?: boolean } | null;
  armor: { category: string; ac_display: string; grants_stealth_disadvantage: boolean; strength_score_required: number | null } | null;
  weight: string;
  cost: string;
}
export interface V1Magic {
  slug: string;
  name: string;
  type: string;
  desc: string;
  rarity: string;
  requires_attunement: string;
}

export const gp = (n?: number) => (n == null ? "" : n >= 1 ? `${+n.toFixed(2)} gp` : n >= 0.1 ? `${Math.round(n * 10)} sp` : `${Math.round(n * 100)} cp`);
const lb = (n?: number) => (n ? `${+n.toFixed(2)} lb` : "");

// Mundane rings, rods, staffs and wands are spellcasting focuses and jewellery: gear, not magic.
function mundaneKind(cat: string): ItemKind {
  if (/weapon|ammunition/.test(cat)) return "weapon";
  if (/armor|shield/.test(cat)) return "armour";
  if (/tool/.test(cat)) return "tool";
  if (/vehicle|mount/.test(cat)) return "mount";
  return "gear";
}
/** Open5e text has some broken punctuation ("â€™" for "’"): put it back. */
export function cleanText(s: string): string {
  return s
    .replace(/â€™/g, "’")
    .replace(/â€˜/g, "‘")
    .replace(/â€œ/g, "“")
    .replace(/â€|â€|â€�/g, "”")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€‘|â€|Â­/g, "-")
    .replace(/â€¦/g, "…")
    .replace(/Ã—/g, "×")
    .replace(/Â/g, "");
}
function magicKind(type: string): ItemKind {
  const t = type.toLowerCase();
  if (t.startsWith("weapon")) return "weapon";
  if (t.startsWith("armor")) return "armour";
  if (t.startsWith("ring")) return "ring";
  if (t.startsWith("rod")) return "rod";
  if (t.startsWith("staff")) return "staff";
  if (t.startsWith("wand")) return "wand";
  if (t.startsWith("potion")) return "potion";
  if (t.startsWith("scroll")) return "scroll";
  return "wondrous";
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function fromV2(x: V2Item): Item {
  const kind = mundaneKind(x.category.key);
  const cost = Number(x.cost) || undefined;
  const weight = Number(x.weight) || undefined;
  const stats: [string, string][] = [];
  if (cost) stats.push(["Cost", gp(cost)]);
  if (weight) stats.push(["Weight", lb(weight)]);
  let sub = x.category.name;
  if (x.weapon) {
    const ranged = (x.weapon.properties ?? []).some((p) => p.property.name === "Ammunition");
    sub = `${x.weapon.is_simple ? "Simple" : "Martial"} ${ranged ? "ranged" : "melee"} weapon`;
    if (x.weapon.damage_dice) stats.push(["Damage", `${x.weapon.damage_dice} ${(x.weapon.damage_type?.name ?? "").toLowerCase()}`.trim()]);
    const props = (x.weapon.properties ?? []).map((p) => `${p.property.name}${p.detail ? ` (${p.detail})` : ""}`).join(", ");
    if (props) stats.push(["Properties", props]);
  }
  if (x.category.key === "shield") {
    sub = "Shield";
    stats.push(["Armour class", "+2"]);
  }
  if (x.armor) {
    sub = x.armor.category === "shield" ? "Shield" : `${cap(x.armor.category)} armour`;
    stats.push(["Armour class", x.armor.ac_display]);
    if (x.armor.strength_score_required) stats.push(["Strength", String(x.armor.strength_score_required)]);
    if (x.armor.grants_stealth_disadvantage) stats.push(["Stealth", "Disadvantage"]);
  }
  return {
    id: x.key,
    name: x.name,
    kind,
    sub,
    cost,
    weight,
    stats,
    desc: cleanText(x.desc),
    source: "PHB",
    line: [sub, gp(cost), lb(weight)].filter(Boolean).join(" · "),
    words: `${x.name} ${x.desc} ${sub}`.toLowerCase(),
  };
}

export function fromV1(x: V1Magic): Item {
  const rarity = (["common", "uncommon", "rare", "very rare", "legendary", "artifact"] as Rarity[]).find((r) => x.rarity.toLowerCase().startsWith(r));
  const attune = x.requires_attunement ? cap(x.requires_attunement.replace(/^\(|\)$/g, "")) : undefined;
  const r = rarityOf(rarity);
  const stats: [string, string][] = [];
  const charges = /has (\d+) charges/i.exec(x.desc);
  if (charges) stats.push(["Charges", charges[1]]);
  return {
    id: x.slug,
    name: x.name,
    kind: magicKind(x.type),
    sub: x.type,
    rarity,
    attune,
    stats,
    desc: cleanText(x.desc),
    source: "DMG",
    line: [x.type, r?.label ?? cap(x.rarity), attune ? "attunement" : ""].filter(Boolean).join(" · "),
    words: `${x.name} ${x.desc} ${x.type}`.toLowerCase(),
  };
}

let cache: Promise<Item[]> | null = null;
let loaded: Item[] = [];
export function loadItems(): Promise<Item[]> {
  cache ??= fetch(`${import.meta.env.BASE_URL}srd-items.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load the item list (${r.status}). Try again in a moment.`))))
    .then((list: Item[]) => (loaded = [...list, ...BOOK_ITEMS].sort((a, b) => a.name.localeCompare(b.name))))
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}
/** Items already loaded (empty until `loadItems` has finished once). */
export const loadedItems = () => loaded;

/** Mundane items keep their weight; magic items get a usual weight for their kind. */
export function weightOf(it: Item): number {
  if (it.weight != null) return it.weight;
  const k: Partial<Record<ItemKind, number>> = { potion: 0.5, ring: 0, wand: 1, rod: 2, staff: 4, scroll: 0 };
  return k[it.kind] ?? 1;
}
