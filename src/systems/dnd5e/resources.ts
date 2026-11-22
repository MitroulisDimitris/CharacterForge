// What a 5e character uses up in play (tracked with tappable pips, refilled by rests): spell slots,
// sorcery points, and every limited-use feature (user, 2026-11-22: class, subclass and race).
// The counts come from the features' "uses" text in the rules data (checked against the PHB,
// XGE and TCE), plus the few whose count grows with level (Rage, Ki, Lay on Hands).
import type { ResourcePool } from "../types";
import type { Character } from "./character";
import type { Derived } from "./derive";
import type { Ability } from "./data/core";

const ord = (n: number) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ABIL: Record<string, Ability> = { STR: "STR", DEX: "DEX", CON: "CON", INT: "INT", WIS: "WIS", CHA: "CHA" };

/** "1 / Short Rest", "PB / Long Rest", "1 + CHA mod / Long Rest", "2 × PB d6 / Long Rest", "1 / day". */
export function parseUses(uses: string, pb: number, mods: Record<Ability, number>): { max: number; refresh: "short" | "long"; die?: string } | null {
  const m = /^(.*?)\s*\/\s*(Short Rest|Long Rest|day)\s*(\(min 1\))?$/i.exec(uses.trim());
  if (!m) return null;
  const refresh = /short/i.test(m[2]) ? "short" : "long";
  let expr = m[1].trim();
  const die = /\s*d(\d+)$/i.exec(expr);
  if (die) expr = expr.slice(0, die.index).trim();
  let max = 0;
  for (const part of expr.split("+").map((x) => x.trim())) {
    const times = /^(\d+)\s*[×x*]\s*PB$/i.exec(part);
    const mod = /^(STR|DEX|CON|INT|WIS|CHA) mod$/i.exec(part);
    if (/^\d+$/.test(part)) max += Number(part);
    else if (/^PB$/i.test(part)) max += pb;
    else if (times) max += Number(times[1]) * pb;
    else if (mod) max += mods[ABIL[mod[1].toUpperCase()]];
    else return null;
  }
  if (m[3]) max = Math.max(1, max);
  return { max: Math.max(0, max), refresh, die: die ? `d${die[1]}` : undefined };
}

// What the dice are called in the books.
const DIE_NAMES: Record<string, string> = { "Combat Superiority": "Superiority dice", "Psionic Power": "Psionic Energy dice" };

/** Pools tracked in play, in sheet order: slots, sorcery points, then features A–Z. */
export function resources5e(_c: Character, d: Derived): ResourcePool[] {
  const out: ResourcePool[] = [
    ...d.slots.flatMap((n, i) =>
      n ? [{ id: `slot${i + 1}`, label: d.pact ? `Pact slots (${ord(i + 1)})` : `${ord(i + 1)}-level slots`, max: n, refresh: d.pact ? ("short" as const) : ("long" as const), kind: "slot" as const }] : [],
    ),
    ...(d.sorceryPoints ? [{ id: "sorcery", label: "Sorcery points", max: d.sorceryPoints, refresh: "long" as const, kind: "points" as const }] : []),
  ];
  const feats: ResourcePool[] = [];
  const add = (id: string, label: string, max: number, refresh: "short" | "long", kind: ResourcePool["kind"] = "feature") => {
    if (max > 0 && !feats.some((p) => p.id === id)) feats.push({ id, label, max, refresh, kind });
  };
  const level = d.level;
  const cls = d.cls.id;
  for (const g of d.featureGroups) {
    const fromFeats = g.title === "Feats & Background";
    for (const f of g.items) {
      const id = `f-${slug(f.name)}`;
      // Counts that grow with the class level (the data says them in the feature's text).
      if (cls === "barbarian" && f.name === "Rage") add(id, "Rage", level >= 3 ? 3 : 2, "long");
      else if (cls === "monk" && f.name === "Ki") add(id, "Ki points", level, "short", "points");
      else if (cls === "paladin" && f.name === "Lay on Hands") add(id, "Lay on Hands (HP)", 5 * level, "long", "points");
      else if (fromFeats && f.name === "Lucky") add(id, "Luck points", 3, "long");
      else if (f.uses) {
        const u = parseUses(f.uses, d.pb, d.mods);
        if (!u) continue;
        // Font of Inspiration (bard 5): Bardic Inspiration comes back on a short rest too.
        const refresh = cls === "bard" && f.name === "Bardic Inspiration" && level >= 5 ? "short" : u.refresh;
        const name = DIE_NAMES[f.name] ?? f.name;
        const label = u.die ? `${name} (${u.die})` : name;
        add(id, label, u.max, refresh, u.die || u.max > 6 ? "points" : "feature");
      }
    }
  }
  // Paladins get Channel Divinity with their oath (once per short rest).
  if (cls === "paladin" && level >= 3 && d.subclassActive) add("f-channel-divinity", "Channel Divinity", 1, "short");
  // Spells cast once per long rest without a slot (racial magic, Magic Initiate, Fey Touched…).
  for (const r of d.spellRows)
    if (r.note && /^1 \/ Long Rest/i.test(r.note) && r.level > 0) add(`spell-${slug(r.name)}`, `${r.name} (${r.source})`, 1, "long");
  feats.sort((a, b) => a.label.localeCompare(b.label));
  return [...out, ...feats];
}
