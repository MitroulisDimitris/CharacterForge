// Finds the rolls inside stat block text (REQUIREMENTS 4.6, "Monster rolls"):
// "+10 to hit" → an attack roll; "17 (2d10 + 6) piercing damage" → a damage roll on the dice in
// brackets; "(Recharge 5–6)" → a d6 recharge roll. Everything else stays plain text.
import { parseDice } from "./roll";

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

/** "…or half as much damage on a successful one": damage in this text is halved on a save. */
export const halfOnSave = (text: string) => /half as much damage on a successful/i.test(text);
