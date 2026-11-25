// Finds the rolls inside stat block text (REQUIREMENTS 4.6, "Monster rolls"):
// "+10 to hit" → an attack roll; "17 (2d10 + 6) piercing damage" → a damage roll on the dice in
// brackets; "(Recharge 5–6)" → a d6 recharge roll. Everything else stays plain text.
import { parseDice, type RollSpec, type Via } from "./roll";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "hit"; text: string; bonus: number }
  | { kind: "dice"; text: string; dice: string; unit: string }
  | { kind: "recharge"; text: string; need: number };

const PATTERN = /([+−-]\s?\d+) to hit|\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)(?:\s+(\w+)\s+damage)?|\(Recharge (\d)(?:[–-]6)?\)|\b(\d+d\d+(?:\s*[+−-]\s*\d+)?)\b/g;

export function segmentsOf(text: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(PATTERN)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ kind: "text", text: text.slice(at, i) });
    if (m[1]) {
      out.push({ kind: "hit", text: `${m[1].replace(/\s/g, "")} to hit`, bonus: Number(m[1].replace(/\s/g, "").replace("−", "-")) });
    } else if (m[2] && parseDice(m[2])) {
      out.push({ kind: "text", text: "(" });
      out.push({ kind: "dice", text: m[2], dice: m[2], unit: (m[3] ?? "").toLowerCase() });
      out.push({ kind: "text", text: `)${m[3] ? ` ${m[3]} damage` : ""}` });
    } else if (m[4]) {
      out.push({ kind: "recharge", text: m[0].slice(1, -1), need: Number(m[4]) });
    } else if (m[5] && parseDice(m[5])) {
      out.push({ kind: "dice", text: m[5], dice: m[5], unit: "" });
    } else out.push({ kind: "text", text: m[0] });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  // Merge neighbouring text pieces.
  return out.reduce<Segment[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (s.kind === "text" && last?.kind === "text") last.text += s.text;
    else acc.push(s.kind === "text" ? { ...s } : s);
    return acc;
  }, []);
}

/** How a stat block or spell text deals its damage: "Melee Weapon Attack" (also "Melee or Ranged…"),
 *  "make a ranged spell attack", or a saving throw (area). Undefined when it doesn't say. */
export function viaOfText(text: string): Via | undefined {
  const m = /\b(melee|ranged)(?: or ranged)? (?:weapon |spell )?attack/i.exec(text);
  if (m) return m[1].toLowerCase() as Via;
  if (/saving throw|\bsave\b/i.test(text)) return "area";
  return undefined;
}

/** "…or half as much damage on a successful one": damage in this text is halved on a save. */
export const halfOnSave = (text: string) => /half as much damage on a successful/i.test(text);

export const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

/** A piece of a spell's text: plain, or dice that roll. */
export interface TextRoll {
  text: string;
  spec?: RollSpec;
  fire?: boolean;
}

/**
 * A spell's description (no caster behind it, as in the Wiki) → pieces with rolls. Each dice
 * expression reads its sentence: "8d6 fire damage" (fire, half on a save when the text says so),
 * "regains 1d8 + …" (healing), "temporary hit points", or a plain roll (Bless's 1d4).
 */
export function spellTextRolls(text: string, name: string): TextRoll[] {
  const out: TextRoll[] = [];
  const halfText = halfOnSave(text) || /half as much damage|half damage/i.test(text);
  const via = viaOfText(text);
  let at = 0;
  // "8d6", "1d4 + 1", and a bare die ("roll a d4").
  for (const m of text.matchAll(/\b\d*d\d+(?:\s*[+−-]\s*\d+(?![\dd]))?(?![\w])/g)) {
    const p = parseDice(m[0]);
    if (!p) continue;
    const i = m.index ?? 0;
    if (i > at) out.push({ text: text.slice(at, i) });
    const after = text.slice(i + m[0].length);
    const start = Math.max(text.lastIndexOf(". ", i), text.lastIndexOf("\n", i)) + 1;
    const endDot = text.indexOf(".", i + m[0].length);
    const sentence = text.slice(start, endDot < 0 ? text.length : endDot);
    const next = /^\)?\s*([a-z]+)(,| or)?/i.exec(after);
    const type = next && !next[2] && DAMAGE_TYPES.includes(next[1].toLowerCase()) ? next[1].toLowerCase() : "";
    const temp = /temporary hit points/i.test(sentence);
    const heal = !temp && !type && /regains?|restores?|heal/i.test(sentence) && /hit points/i.test(sentence) && !/damage/i.test(sentence);
    const damage = !!type || (!heal && !temp && /damage/i.test(sentence));
    const fire = type === "fire";
    out.push({
      text: m[0],
      fire,
      spec: {
        label: `${name} · ${heal ? "healing" : temp ? "temporary hit points" : damage ? (type ? `${type} damage` : "damage") : "roll"}`,
        kind: heal || temp ? "heal" : damage ? "damage" : "free",
        groups: p.groups.map((g) => ({ ...g, tone: fire ? ("fire" as const) : undefined })),
        bonus: p.bonus,
        unit: heal ? "hit points back" : temp ? "temporary hit points" : damage ? type || "damage" : undefined,
        half: damage && halfText,
        via: damage ? via : undefined,
        tone: "player",
      },
    });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
