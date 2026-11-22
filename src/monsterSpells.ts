// Monster spells (REQUIREMENTS §4.9): the Spellcasting / Innate Spellcasting traits of a stat block
// as rows of spells (one per spell level, or per "3/day each"), a host's changed spell list
// ("build"), and how a build compares with the book's rule (Monster Manual, page 10: a spell can
// only be swapped for another of the same level from the same class list).
import { supabase } from "./cloud";
import type { Monster } from "./lookup";

/** A changed Spellcasting list: spell names (as written) per spell level, "0" = cantrips. */
export type SpellMap = Record<string, string[]>;

export interface SpellRow {
  /** "0"–"9" for spell levels, else the innate label ("At will", "3/day each"). */
  key: string;
  label: string;
  /** Spell level for slot rows (0 = cantrips). */
  level: number | null;
  /** Slots of this level (0 = at will). */
  slots: number;
  /** Innate: uses per day for each spell (0 = at will). */
  perDay: number;
  spells: string[];
}

export interface SpellBlock {
  /** The trait's name ("Spellcasting", "Innate Spellcasting", "Shared Spellcasting (Coven Only)"). */
  trait: string;
  kind: "slots" | "innate";
  /** The sentence(s) before the list. */
  intro: string;
  /** Lines after the list ("* The archmage casts these spells on itself before combat."). */
  after: string;
  /** "wizard", "cleric"… (the class list it uses), or "". */
  className: string;
  casterLevel: number | null;
  ability: string;
  dc: number | null;
  hit: number | null;
  rows: SpellRow[];
}

/** Minimal spell facts the build check needs. */
export interface SpellFacts {
  slug: string;
  name: string;
  level_int: number;
  dnd_class: string;
}

const ORD = ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
export const ordinal = (n: number) => ORD[n] ?? `${n}th`;
export const levelLabel = (n: number) => (n === 0 ? "Cantrips" : `${ordinal(n)} level`);

/** "mage armor*" → name "mage armor", star; "plane shift (self only)" → note "self only". */
export function cleanSpell(raw: string): { name: string; note: string; star: boolean } {
  let s = raw.trim().replace(/_/g, "");
  const star = /\*$/.test(s);
  s = s.replace(/\*+$/, "").trim();
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(s);
  return m ? { name: m[1].trim(), note: m[2].trim(), star } : { name: s, note: "", star };
}
export const spellKey = (raw: string) => cleanSpell(raw).name.toLowerCase();

/** Split "a, b (x, y), c" on commas outside brackets. */
function splitSpells(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const LEVEL_LINE = /^(?:Cantrips \(at will\)|(\d)(?:st|nd|rd|th) level \((\d+) slots?\))\s*:\s*(.+)$/i;
const INNATE_LINE = /^(At will|(\d+)\/day(?: each)?)\s*:\s*(.+)$/i;

/** One Spellcasting-type trait as rows of spells, or null when it has no list we can read. */
export function parseSpellTrait(trait: string, desc: string): SpellBlock | null {
  if (!/spellcasting/i.test(trait)) return null;
  const lines = desc.split("\n").map((l) => l.trim());
  const rows: SpellRow[] = [];
  const intro: string[] = [];
  const after: string[] = [];
  let kind: SpellBlock["kind"] = /innate/i.test(trait) ? "innate" : "slots";
  for (const raw of lines) {
    if (!raw) continue;
    const l = raw.replace(/^\*\s*/, "");
    const lv = LEVEL_LINE.exec(l);
    const inn = lv ? null : INNATE_LINE.exec(l);
    if (lv) {
      const level = lv[1] ? Number(lv[1]) : 0;
      rows.push({ key: String(level), label: levelLabel(level), level, slots: lv[2] ? Number(lv[2]) : 0, perDay: 0, spells: splitSpells(lv[3]) });
    } else if (inn) {
      kind = "innate";
      const per = inn[2] ? Number(inn[2]) : 0;
      rows.push({ key: inn[1].toLowerCase(), label: per ? `${per}/day${/each/i.test(inn[1]) ? " each" : ""}` : "At will", level: null, slots: 0, perDay: per, spells: splitSpells(inn[3]) });
    } else (rows.length ? after : intro).push(raw);
  }
  // "Innate Spellcasting (1/Day)": "The mephit can innately cast _fog cloud_, …"
  if (!rows.length) {
    const per = /\((\d+)\/day\)/i.exec(trait);
    const names = [...desc.matchAll(/_([^_]+)_/g)].map((m) => m[1]);
    if (!per || !names.length) return null;
    rows.push({ key: `${per[1]}/day`, label: `${per[1]}/day`, level: null, slots: 0, perDay: Number(per[1]), spells: names });
    kind = "innate";
    intro.length = 0;
    intro.push(desc.replace(/_/g, ""));
  }
  const text = intro.join(" ");
  const num = (re: RegExp) => {
    const m = re.exec(text);
    return m ? Number(m[1].replace("−", "-")) : null;
  };
  return {
    trait,
    kind,
    intro: text,
    after: after.join("\n"),
    className: (/following (\w+) spells/i.exec(text) ?? /from the (\w+)'s spell list/i.exec(text))?.[1].toLowerCase() ?? "",
    casterLevel: num(/(\d+)(?:st|nd|rd|th)-level spellcaster/i),
    ability: /spell ?casting ability is (\w+)/i.exec(text)?.[1] ?? "",
    dc: num(/spell save DC (\d+)/i),
    hit: num(/([+−-]\d+) to hit with spell attacks/i),
    rows,
  };
}

/** Every spell list in the stat block (traits and actions). */
export function monsterSpells(m: Pick<Monster, "special_abilities" | "actions">): SpellBlock[] {
  return [...(m.special_abilities ?? []), ...(m.actions ?? [])].map((t) => parseSpellTrait(t.name, t.desc)).filter((b): b is SpellBlock => !!b);
}

/** The block a build can change: the monster's own "Spellcasting" (slots, with a class list). */
export const editableBlock = (blocks: SpellBlock[]) => blocks.find((b) => b.kind === "slots" && /^spellcasting$/i.test(b.trait.trim()) && b.className) ?? null;

/** The block's list as a map (level → spells). */
export function blockMap(b: SpellBlock): SpellMap {
  const out: SpellMap = {};
  for (const r of b.rows) if (r.level != null) out[String(r.level)] = [...r.spells];
  return out;
}

/** The block with a build's spells: slot counts stay; a level with no slots in the book gets 0. */
export function applyBuild(b: SpellBlock, map: SpellMap | undefined): SpellBlock {
  if (!map) return b;
  const rows: SpellRow[] = [];
  for (let lvl = 0; lvl <= 9; lvl++) {
    const key = String(lvl);
    const orig = b.rows.find((r) => r.key === key);
    const spells = map[key] ?? (orig ? orig.spells : []);
    if (!spells.length && !orig) continue;
    rows.push(orig ? { ...orig, spells } : { key, label: levelLabel(lvl), level: lvl, slots: 0, perDay: 0, spells });
  }
  return { ...b, rows };
}

export const sameMap = (a: SpellMap, b: SpellMap) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? []).map(spellKey).join("|") !== (b[k] ?? []).map(spellKey).join("|")) return false;
  return true;
};

export type Strength = "" | "up" | "down" | "off";
export interface BuildCheck {
  kind: Strength;
  added: string[];
  removed: string[];
}

/** Index SRD spells by lower-case name. */
export function spellIndex(list: SpellFacts[]): Map<string, SpellFacts> {
  return new Map(list.map((s) => [s.name.toLowerCase(), s]));
}
const inClass = (s: SpellFacts | undefined, cls: string) => !!s && !!cls && s.dnd_class.toLowerCase().split(/,\s*/).includes(cls);

/**
 * Compare a build with the book. A same-level spell from the same class list for each one taken
 * out is by the book; anything else makes it stronger (more or higher spells), weaker, or just
 * different ("off": same weight, outside the rule). Cantrips count half a level.
 */
export function checkBuild(orig: SpellMap, map: SpellMap, cls: string, index: Map<string, SpellFacts>): BuildCheck {
  const added: string[] = [];
  const removed: string[] = [];
  let score = 0;
  const label = (raw: string, lvl: number) => {
    const s = index.get(spellKey(raw));
    const name = s?.name ?? cleanSpell(raw).name;
    const other = s && !inClass(s, cls) ? `, ${s.dnd_class.split(/,\s*/)[0].toLowerCase()}` : "";
    return `${name} (${lvl === 0 ? "cantrip" : ordinal(lvl)}${other})`;
  };
  for (let lvl = 0; lvl <= 9; lvl++) {
    const cur = (map[String(lvl)] ?? orig[String(lvl)] ?? []).map(spellKey);
    const was = (orig[String(lvl)] ?? []).map(spellKey);
    const add = cur.filter((s) => !was.includes(s));
    const rem = was.filter((s) => !cur.includes(s));
    const fair = add.filter((s) => {
      const f = index.get(s);
      return inClass(f, cls) && f!.level_int === lvl;
    });
    const pairs = Math.min(fair.length, rem.length);
    const looseAdd = [...add.filter((s) => !fair.includes(s)), ...fair.slice(pairs)];
    const looseRem = rem.slice(pairs);
    const w = lvl === 0 ? 0.5 : lvl;
    for (const s of looseAdd) {
      score += w;
      added.push(label(s, lvl));
    }
    for (const s of looseRem) {
      score -= w;
      removed.push(label(s, lvl));
    }
  }
  if (!added.length && !removed.length) return { kind: "", added, removed };
  return { kind: score > 0 ? "up" : score < 0 ? "down" : "off", added, removed };
}

/** The note shown on the warning mark. */
export function strengthText(c: BuildCheck): string {
  if (!c.kind) return "";
  const head = c.kind === "up" ? "Stronger than the books allow." : c.kind === "down" ? "Weaker than the books allow." : "Outside the books' rule.";
  return `${head} Monster Manual, page 10: a spell can only be swapped for another of the same level from the same class list.${c.added.length ? ` Added: ${c.added.join(", ")}.` : ""}${c.removed.length ? ` Removed: ${c.removed.join(", ")}.` : ""}`;
}
export const STRENGTH_SHORT: Record<Strength, string> = { "": "", up: "Stronger than the books", down: "Weaker than the books", off: "Outside the books' rule" };

/** Cantrip damage dice at a caster level (5th: ×2, 11th: ×3, 17th: ×4). */
export function cantripDice(dice: string, casterLevel: number | null): string {
  if (!casterLevel || casterLevel < 5) return dice;
  const tier = casterLevel >= 17 ? 4 : casterLevel >= 11 ? 3 : 2;
  return dice.replace(/^(\d+)d/, (_, n) => `${Number(n) * tier}d`);
}

// ---------- saved builds (table monster_builds, host only) ----------

export interface MonsterBuild {
  id: string;
  session_id: string;
  slug: string;
  name: string;
  spells: SpellMap;
  updated_at: string;
}
const COLS = "id, session_id, slug, name, spells, updated_at";

export async function loadBuilds(sessionId: string, slug: string): Promise<MonsterBuild[]> {
  const { data, error } = await supabase.from("monster_builds").select(COLS).eq("session_id", sessionId).eq("slug", slug).order("created_at");
  if (error) throw error;
  return data as MonsterBuild[];
}
export async function saveBuild(b: { id?: string; session_id: string; slug: string; name: string; spells: SpellMap }): Promise<MonsterBuild> {
  const row = { session_id: b.session_id, slug: b.slug, name: b.name.trim().slice(0, 40) || "My build", spells: b.spells, updated_at: new Date().toISOString() };
  const q = b.id ? supabase.from("monster_builds").update(row).eq("id", b.id) : supabase.from("monster_builds").insert(row);
  const { data, error } = await q.select(COLS).single();
  if (error) throw error;
  return data as MonsterBuild;
}
export async function deleteBuild(id: string): Promise<void> {
  const { error } = await supabase.from("monster_builds").delete().eq("id", id);
  if (error) throw error;
}
