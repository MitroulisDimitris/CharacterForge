// Lookup data (REQUIREMENTS §4.4): monsters and spells from the free Open5e API (SRD 5.1 only),
// cached in memory; favorites and recently viewed in this browser.

const API = "https://api.open5e.com/v1";
const SRD = "document__slug=wotc-srd";

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

const cache = new Map<string, unknown>();
async function get<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`The monster and spell library didn't answer (${r.status}). Try again in a moment.`);
  const json = (await r.json()) as T;
  cache.set(path, json);
  return json;
}

export async function searchMonsters(q: string): Promise<Monster[]> {
  const res = await get<{ results: Monster[] }>(`/monsters/?${SRD}&limit=40&search=${encodeURIComponent(q)}`);
  return res.results;
}
export async function searchSpells(q: string): Promise<Spell[]> {
  const res = await get<{ results: Spell[] }>(`/spells/?${SRD}&limit=30&search=${encodeURIComponent(q)}`);
  return res.results;
}
export async function getMonster(slug: string): Promise<Monster> {
  return get<Monster>(`/monsters/${encodeURIComponent(slug)}/`);
}
export async function getSpell(slug: string): Promise<Spell> {
  return get<Spell>(`/spells/${encodeURIComponent(slug)}/`);
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

export type LookupKind = "monster" | "spell" | "condition";
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
