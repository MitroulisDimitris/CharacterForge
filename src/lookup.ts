// Lookup data (REQUIREMENTS §4.4): the SRD 5.1 monsters and spells, saved in the app
// (public/srd-monsters.json, public/srd-spells.json; made from Open5e by scripts/fetchSrd.ts),
// loaded once and kept in memory; favorites and recently viewed in this browser.

export interface Named {
  name: string;
  desc: string;
}

export interface Monster {
  slug: string;
  name: string;
  size: string;
  type: string;
  subtype: string;
  alignment: string;
  armor_class: number;
  armor_desc: string | null;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, number | boolean>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  strength_save: number | null;
  dexterity_save: number | null;
  constitution_save: number | null;
  intelligence_save: number | null;
  wisdom_save: number | null;
  charisma_save: number | null;
  skills: Record<string, number>;
  damage_vulnerabilities: string;
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  senses: string;
  languages: string;
  challenge_rating: string;
  cr: number;
  actions: Named[] | null;
  bonus_actions: Named[] | null;
  reactions: Named[] | null;
  legendary_desc: string;
  legendary_actions: Named[] | null;
  special_abilities: Named[] | null;
  environments: string[];
}

export interface Spell {
  slug: string;
  name: string;
  desc: string;
  higher_level: string;
  range: string;
  components: string;
  material: string;
  duration: string;
  requires_concentration: boolean;
  can_be_cast_as_ritual: boolean;
  casting_time: string;
  level: string;
  level_int: number;
  school: string;
  dnd_class: string;
}

const files = new Map<string, Promise<unknown>>();
/** One of the saved SRD files, loaded once. */
function load<T>(name: string): Promise<T> {
  let p = files.get(name);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${name}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load the ${name.includes("monster") ? "monster" : "spell"} list (${r.status}). Try again in a moment.`))))
      .catch((e) => {
        files.delete(name);
        throw e;
      });
    files.set(name, p);
  }
  return p as Promise<T>;
}
const monstersFile = () => load<Monster[]>("srd-monsters.json");
const spellsFile = () => load<Spell[]>("srd-spells.json");
const matches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

export async function searchMonsters(q: string): Promise<Monster[]> {
  return (await monstersFile()).filter((m) => matches(m.name, q)).slice(0, 40);
}
export async function searchSpells(q: string): Promise<Spell[]> {
  return (await spellsFile()).filter((s) => matches(s.name, q)).slice(0, 30);
}
export async function getMonster(slug: string): Promise<Monster> {
  const m = (await monstersFile()).find((x) => x.slug === slug);
  if (!m) throw new Error("That monster isn't in the list.");
  return m;
}
export async function getSpell(slug: string): Promise<Spell> {
  const s = (await spellsFile()).find((x) => x.slug === slug);
  if (!s) throw new Error("That spell isn't in the list.");
  return s;
}

/** "fire; bludgeoning, piercing, and slashing from nonmagical attacks" → short chips. */
export function splitList(s: string): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/;\s*/)
    .flatMap((part) => (/from|that|except/i.test(part) ? [part.trim()] : part.split(/,\s*(?:and\s+)?|\s+and\s+/)))
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
}

/** The few things that change how a fight goes, in plain words (§4.4: host-first summary). */
export function keyTraits(m: Monster): string[] {
  const out: string[] = [];
  const fly = m.speed?.fly;
  if (fly) out.push(`Flies ${fly} ft`);
  if (m.speed?.burrow) out.push(`Burrows ${m.speed.burrow} ft`);
  if (m.legendary_actions?.length) out.push(`Legendary actions (${m.legendary_actions.length})`);
  const names = (m.special_abilities ?? []).map((a) => a.name);
  const important = [/spellcasting/i, /magic resistance/i, /legendary resistance/i, /pack tactics/i, /regeneration/i, /incorporeal/i, /sunlight sensitivity/i, /amphibious/i, /pounce|charge|trampling/i, /shapechanger/i, /undead fortitude/i, /siege/i];
  for (const n of names) if (important.some((re) => re.test(n)) && !out.includes(n)) out.push(n.replace(/\s*\(.*\)$/, ""));
  return out.slice(0, 4);
}

export const crText = (m: Monster) => m.challenge_rating;
export const abilityMod = (score: number) => {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : String(m);
};
export const speedText = (m: Monster) =>
  Object.entries(m.speed ?? {})
    .filter(([k, v]) => typeof v === "number" && k !== "hover")
    .map(([k, v]) => (k === "walk" ? `${v} ft` : `${k} ${v} ft`))
    .join(", ");

// ---------- favorites + recently viewed (this browser) ----------

/** Monsters, spells and conditions are shared with the session Lookup; the rest are Wiki-only. */
export type LookupKind = "monster" | "spell" | "condition" | "item" | "class" | "race" | "background" | "feat" | "rule";
export interface LookupRef {
  kind: LookupKind;
  slug: string;
  name: string;
}
const FAV_KEY = "character-forge:lookup:favorites";
const RECENT_KEY = "character-forge:lookup:recent";
const read = (k: string): LookupRef[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const write = (k: string, v: LookupRef[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};
export const favorites = () => read(FAV_KEY);
export const recent = () => read(RECENT_KEY);
export const isFavorite = (r: LookupRef) => favorites().some((x) => x.kind === r.kind && x.slug === r.slug);
export function toggleFavorite(r: LookupRef) {
  const f = favorites();
  write(FAV_KEY, isFavorite(r) ? f.filter((x) => !(x.kind === r.kind && x.slug === r.slug)) : [r, ...f].slice(0, 50));
}
export function addRecent(r: LookupRef) {
  write(RECENT_KEY, [r, ...recent().filter((x) => !(x.kind === r.kind && x.slug === r.slug))].slice(0, 12));
}

// ---------- the whole SRD monster list (for encounter suggestions) ----------

export interface MonsterBrief {
  slug: string;
  name: string;
  size: string;
  type: string;
  armor_class: number;
  hit_points: number;
  challenge_rating: string;
  cr: number;
  environments: string[];
}

/** All ~320 SRD monsters with only what lists and suggestions need. */
export const allMonsters = (): Promise<MonsterBrief[]> => monstersFile();

// ---------- the whole SRD spell list (browse spells) ----------

export interface SpellBrief {
  slug: string;
  name: string;
  level_int: number;
  school: string;
  dnd_class: string;
  casting_time: string;
  range: string;
  duration: string;
  requires_concentration: boolean;
  can_be_cast_as_ritual: boolean;
}

/** All ~320 SRD spells (browse spells). */
export const allSpells = (): Promise<SpellBrief[]> => spellsFile();

/** Places to pick from, each covering the data's own (messier) names. */
export const PLACES: { id: string; label: string; match: string[] }[] = [
  { id: "arctic", label: "Arctic / tundra", match: ["Arctic", "Tundra"] },
  { id: "coastal", label: "Coast", match: ["Coastal"] },
  { id: "desert", label: "Desert", match: ["Desert"] },
  { id: "forest", label: "Forest", match: ["Forest"] },
  { id: "grassland", label: "Grassland", match: ["Grassland"] },
  { id: "hill", label: "Hills", match: ["Hill", "Hills"] },
  { id: "jungle", label: "Jungle", match: ["Jungle"] },
  { id: "mountain", label: "Mountains", match: ["Mountain", "Mountains"] },
  { id: "swamp", label: "Swamp", match: ["Swamp"] },
  { id: "underdark", label: "Underdark / caves", match: ["Underdark", "Caverns"] },
  { id: "urban", label: "Town / city", match: ["Urban", "Settlement", "Sewer"] },
  { id: "ruins", label: "Ruins / tombs / temples", match: ["Ruin", "Tomb", "Temple"] },
  { id: "water", label: "Water", match: ["Water", "Underwater"] },
];
