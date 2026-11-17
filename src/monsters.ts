// Monster browse + monster page helpers: icons (game-icons.net, CC BY 3.0, built by
// scripts/monster-icons.py into public/monster-icons.json), the Monster Manual page number
// (scripts/mm-pages.py: page numbers only), the DM's own pictures (private storage), dice rolls
// and the short "At the table" summary for a stat block.
import { supabase } from "./cloud";
import { splitList, type Monster } from "./lookup";
import { dataUrlToBlob, shrinkImage } from "./images";
import MM_PAGES from "./data/mmPages.json";

// ---------- icons ----------

interface IconFile {
  credit: string;
  map: Record<string, string>;
  icons: Record<string, string>;
}
let iconFile: Promise<IconFile> | null = null;
/** The icon file (about 300 KB, loaded once, the first time a list with icons shows). */
export function loadIcons(): Promise<IconFile> {
  iconFile ??= fetch(`${import.meta.env.BASE_URL}monster-icons.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<IconFile>;
    })
    .catch((e) => {
      iconFile = null;
      throw e;
    });
  return iconFile;
}

/** One colour per creature type; they differ in lightness too, not only hue. */
export const TYPE_COLORS: Record<string, string> = {
  aberration: "#b9a3e8",
  beast: "#d9a86c",
  celestial: "#f0d27a",
  construct: "#a9b4c2",
  dragon: "#ef6b7e",
  elemental: "#7fc4d9",
  fey: "#c4b2ef",
  fiend: "#e0485e",
  giant: "#c9a27e",
  humanoid: "#d8c8ae",
  monstrosity: "#ef8a6b",
  ooze: "#9fd36f",
  plant: "#7fcf83",
  undead: "#c5d1bb",
};
export const typeColor = (type: string) => TYPE_COLORS[type.toLowerCase()] ?? "#d8c8ae";

// ---------- Monster Manual page ----------

const PAGES = MM_PAGES as Record<string, number>;
export const mmPage = (slug: string): number | undefined => PAGES[slug];

// ---------- the DM's own pictures ----------

const BUCKET = "monster-pictures";
let mine: Promise<Set<string>> | null = null;
let mineFor = "";

/** Which monsters this account has a picture for (one listing per visit). */
function myPictures(userId: string): Promise<Set<string>> {
  if (mine && mineFor === userId) return mine;
  mineFor = userId;
  mine = supabase.storage
    .from(BUCKET)
    .list(userId, { limit: 1000 })
    .then(({ data, error }) => {
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.name.replace(/\.\w+$/, "")));
    })
    .catch(() => new Set<string>());
  return mine;
}

/** A link to this account's picture of the monster, or null. */
export async function pictureUrl(userId: string, slug: string): Promise<string | null> {
  if (!(await myPictures(userId)).has(slug)) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${userId}/${slug}.jpg`, 60 * 60);
  return error ? null : data.signedUrl;
}

export async function savePicture(userId: string, slug: string, file: File): Promise<string> {
  const blob = await dataUrlToBlob(await shrinkImage(file, 1200, 0.85));
  const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${slug}.jpg`, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  (await myPictures(userId)).add(slug);
  return (await pictureUrl(userId, slug)) ?? "";
}

export async function removePicture(userId: string, slug: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([`${userId}/${slug}.jpg`]);
  if (error) throw error;
  (await myPictures(userId)).delete(slug);
}

// ---------- dice ----------

const DICE = /(\d+)d(\d+)/;
/** Average of "2d6" (+ bonus). */
export function average(dice: string | undefined, bonus = 0): number {
  const m = dice?.match(DICE);
  if (!m) return bonus;
  return Math.floor((Number(m[1]) * (Number(m[2]) + 1)) / 2) + bonus;
}

export function rollDice(dice: string, rnd: () => number = Math.random): number {
  const m = dice.match(DICE);
  if (!m) return 0;
  let total = 0;
  for (let i = 0; i < Number(m[1]); i++) total += 1 + Math.floor(rnd() * Number(m[2]));
  return total;
}

export interface AttackRoll {
  d20: number;
  toHit: number;
  damage: number;
  crit: boolean;
  miss: boolean;
}
/** Roll an attack: d20 + bonus, and its damage (dice doubled on a natural 20). */
export function rollAttack(bonus: number, dice: string | undefined, damageBonus = 0, rnd: () => number = Math.random): AttackRoll {
  const d20 = 1 + Math.floor(rnd() * 20);
  const crit = d20 === 20;
  const base = dice ? rollDice(dice, rnd) + (crit ? rollDice(dice, rnd) : 0) : 0;
  return { d20, toHit: d20 + bonus, damage: Math.max(0, base + damageBonus), crit, miss: d20 === 1 };
}

// ---------- the page's numbers and summary ----------

export const passivePerception = (m: Monster): number | undefined => {
  const p = m.senses?.match(/passive Perception (\d+)/i);
  return p ? Number(p[1]) : undefined;
};
export const initiative = (m: Monster) => Math.floor((m.dexterity - 10) / 2);
export const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Attacks with a roll (attack bonus + damage dice), for the Roll buttons. */
export function attacks(m: Monster) {
  return (m.actions ?? [])
    .map((a) => {
      const x = a as typeof a & { attack_bonus?: number; damage_dice?: string; damage_bonus?: number };
      // The written "+6 to hit" wins: the data's attack_bonus field is sometimes off by one.
      const written = a.desc.match(/([+-]\d+) to hit/);
      return { name: a.name, bonus: written ? Number(written[1]) : x.attack_bonus, dice: x.damage_dice, damageBonus: x.damage_bonus ?? 0 };
    })
    .filter((a): a is { name: string; bonus: number; dice: string | undefined; damageBonus: number } => typeof a.bonus === "number" && a.bonus !== 0);
}

/** A few plain lines a DM needs at the table, worked out from the stat block. */
export function atTheTable(m: Monster): string[] {
  const out: string[] = [];
  const multi = (m.actions ?? []).find((a) => /^multiattack/i.test(a.name));
  const hits = attacks(m).map((a) => ({ ...a, avg: average(a.dice, a.damageBonus) }));
  const best = hits.sort((a, b) => b.avg - a.avg)[0];
  if (multi) {
    const n = multi.desc.match(/\b(two|three|four|five)\b/i)?.[1]?.toLowerCase();
    out.push(`Attacks ${n ? `${n} times` : "more than once"} a turn (Multiattack).`);
  }
  if (best && best.avg > 0) out.push(`Hardest hit: ${best.name}, ${signed(best.bonus)} to hit, about ${best.avg} damage.`);
  const weak = splitList(m.damage_vulnerabilities);
  const resist = splitList(m.damage_resistances);
  const immune = splitList(m.damage_immunities);
  if (!weak.length && !resist.length && !immune.length) out.push("No resistances or immunities: every damage type works.");
  if (weak.length) out.push(`Takes double damage from ${weak.join(", ").toLowerCase()}.`);
  const sight = m.senses?.match(/(darkvision|blindsight|truesight|tremorsense) (\d+) ft/i);
  if (sight) out.push(sight[1].toLowerCase() === "darkvision" ? `Sees in the dark (${sight[2]} ft).` : `Has ${sight[1].toLowerCase()} (${sight[2]} ft): hard to hide from.`);
  if (m.legendary_actions?.length) out.push(`Acts between your turns too (${m.legendary_actions.length} legendary actions).`);
  return out;
}
