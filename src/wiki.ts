// The Wiki (REQUIREMENTS 4.7): every section and what its search looks through. Spells and monsters
// come from the Lookup (Open5e SRD); classes, races, backgrounds and feats from the app's own 2014
// data (PHB, Xanathar's, Tasha's, in our own words); rules are short plain-words pages.
import { CONDITIONS, EXHAUSTION } from "./live";
import { RULES } from "./systems/dnd5e/rules";
import { ABILITY_NAMES, skillName, type Ability, type SkillId } from "./systems/dnd5e/data/core";

export type WikiSection = "spells" | "monsters" | "items" | "classes" | "races" | "backgrounds" | "feats" | "rules";

export const SECTIONS: { id: WikiSection; label: string; color: string; desc: string; icon: string }[] = [
  { id: "spells", label: "Spells", color: "#8fb6e3", desc: "Every spell: level, school, who can cast it.", icon: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" },
  { id: "monsters", label: "Monsters", color: "#e07a5a", desc: "Stat blocks, with what matters in a fight first.", icon: "M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4 3 5v3h8v-3c1.8-1 3-2.5 3-5a7 7 0 0 0-7-7z M9.5 11h.01 M14.5 11h.01 M10 18v3 M14 18v3" },
  { id: "items", label: "Items", color: "#d4a64a", desc: "Weapons, armour, gear and magic items.", icon: "M6 8h12l1 13H5z M9 8V6a3 3 0 0 1 6 0v2" },
  { id: "classes", label: "Classes", color: "#e8d3a6", desc: "What each class does, and its subclasses.", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M12 8v8 M9 11h6" },
  { id: "races", label: "Races", color: "#e0485e", desc: "Ability scores, size, speed and traits.", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" },
  { id: "backgrounds", label: "Backgrounds", color: "#e0485e", desc: "Skills, tools and the feature each one gives.", icon: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11" },
  { id: "feats", label: "Feats", color: "#6fbf73", desc: "Every feat and what you need to take it.", icon: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" },
  { id: "rules", label: "Rules", color: "#b9a3e8", desc: "Conditions, combat, resting.", icon: "M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" },
];
export const sectionOf = (id: WikiSection) => SECTIONS.find((s) => s.id === id)!;

/** Short rule pages in our own words (PHB chapters 7–10). */
export const RULE_PAGES: { id: string; name: string; group: "combat" | "rest" | "basics"; points: string[] }[] = [
  {
    id: "advantage",
    name: "Advantage and disadvantage",
    group: "basics",
    points: [
      "Advantage: roll two d20s and keep the higher one. Disadvantage: keep the lower one.",
      "If you have both, they cancel out: roll one d20, however many of each you have.",
    ],
  },
  {
    id: "checks",
    name: "Ability checks, saves and attacks",
    group: "basics",
    points: [
      "Roll a d20 and add your bonus. Meet or beat the number (a DC or an armour class) to succeed.",
      "A natural 20 on an attack is a critical hit: roll the damage dice twice. A natural 1 always misses.",
      "Natural 20s and 1s don't automatically succeed or fail on checks and saves.",
    ],
  },
  {
    id: "actions",
    name: "Your turn in combat",
    group: "combat",
    points: [
      "On your turn you can move up to your speed and take one action (Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object).",
      "Some features give you a bonus action. You get one reaction per round, usually an opportunity attack.",
      "You can split your movement around your action.",
    ],
  },
  {
    id: "opportunity",
    name: "Opportunity attacks",
    group: "combat",
    points: [
      "When a creature you can see leaves your reach, you can use your reaction to make one melee attack against it.",
      "Taking the Disengage action, or being moved by something else, doesn't provoke one.",
    ],
  },
  {
    id: "cover",
    name: "Cover",
    group: "combat",
    points: [
      "Half cover (a low wall, another creature): +2 to armour class and Dexterity saves.",
      "Three-quarters cover (an arrow slit, a thick tree trunk): +5.",
      "Total cover: you can't be targeted directly.",
    ],
  },
  {
    id: "grapple",
    name: "Grappling and shoving",
    group: "combat",
    points: [
      "Instead of one attack, grab a creature up to one size bigger: your Athletics against its Athletics or Acrobatics. If you win, it's grappled.",
      "Shove the same way to knock it prone or push it 5 feet away.",
      "A grappled creature can use its action to escape with the same contest.",
    ],
  },
  {
    id: "concentration",
    name: "Concentration",
    group: "combat",
    points: [
      "Only one concentration spell at a time; casting another ends the first.",
      "When you take damage, make a Constitution save: DC 10, or half the damage if that's higher. Fail, and the spell ends.",
      "Being knocked out or killed ends it too.",
    ],
  },
  {
    id: "dying",
    name: "Dropping to 0 hit points",
    group: "combat",
    points: [
      "At 0 hit points you fall unconscious and make a death saving throw each turn: 10 or more is a success.",
      "Three successes: you're stable. Three failures: you die. A natural 20 brings you back with 1 hit point; a natural 1 counts as two failures.",
      "Any healing wakes you up. Damage while at 0 counts as a failure (a critical hit as two).",
    ],
  },
  {
    id: "resting",
    name: "Short and long rests",
    group: "rest",
    points: [
      "Short rest: at least 1 hour. Spend hit dice to heal: roll each one and add your Constitution modifier.",
      "Long rest: at least 8 hours. You get back all hit points and up to half your hit dice (at least one).",
      "Only one long rest every 24 hours.",
    ],
  },
];

const BOOK: Record<string, string> = { PHB14: "Player's Handbook", XGE: "Xanathar's Guide to Everything", TCE: "Tasha's Cauldron of Everything" };
export const bookLabel = (b?: string) => (b ? (BOOK[b] ?? b) : "");

/** One entry the Wiki can list and search (spells and monsters are searched separately). */
export interface WikiEntry {
  sec: WikiSection;
  id: string;
  name: string;
  line: string;
  /** Lower-case text the search looks through. */
  words: string;
  /** Filter chip ids this entry belongs to. */
  tags: string[];
}

const R = RULES["2014"];
const asiText = (a?: Partial<Record<Ability, number>>) =>
  Object.entries(a ?? {})
    .map(([k, v]) => `+${v} ${k}`)
    .join(", ");

let entriesCache: WikiEntry[] | null = null;
export function localEntries(): WikiEntry[] {
  if (entriesCache) return entriesCache;
  const out: WikiEntry[] = [];
  for (const c of R.classes)
    out.push({
      sec: "classes",
      id: c.id,
      name: c.name,
      line: `d${c.hitDie} hit die · ${c.spell ? "casts spells" : "no spells"} · ${bookLabel(c.book)}`,
      words: [c.name, c.summary, c.primary, ...c.subclasses.map((s) => `${s.name} ${s.summary}`), ...c.features.map((f) => f.name)].join(" ").toLowerCase(),
      tags: [c.spell ? "spells" : "nospells"],
    });
  for (const s of R.species)
    out.push({
      sec: "races",
      id: s.id,
      name: s.name,
      line: [asiText(s.asi?.fixed) || (s.asi?.chooseCount ? `+1 to ${s.asi.chooseCount} abilities` : ""), `speed ${s.speed} ft`, s.darkvision ? "darkvision" : ""].filter(Boolean).join(" · "),
      words: [s.name, ...s.traits.map((t) => `${t.name} ${t.text}`), ...(s.lineages ?? []).map((l) => `${l.name} ${l.text}`)].join(" ").toLowerCase(),
      tags: [s.darkvision ? "dark" : "", s.sizes.includes("Small") && !s.sizes.includes("Medium") ? "small" : "", s.book === "PHB14" ? "PHB14" : s.book].filter(Boolean),
    });
  for (const b of R.backgrounds)
    out.push({
      sec: "backgrounds",
      id: b.id,
      name: b.name,
      line: b.skills.length ? b.skills.map((x) => skillName(x as SkillId)).join(", ") : "Choose your own",
      words: [b.name, b.tools, b.feature?.name ?? "", b.feature?.text ?? "", b.equipment].join(" ").toLowerCase(),
      tags: [b.book],
    });
  for (const f of R.feats)
    out.push({
      sec: "feats",
      id: f.id,
      name: f.name,
      line: `${featReq(f) ? `Needs ${featReq(f)}` : "No prerequisite"} · ${bookLabel(f.book)}`,
      words: [f.name, f.text].join(" ").toLowerCase(),
      tags: [featReq(f) ? "pre" : "none"],
    });
  for (const c of CONDITIONS.filter((x) => x.id !== "concentrating"))
    out.push({ sec: "rules", id: `cond-${c.id}`, name: c.name, line: "Condition", words: `${c.name} ${c.text}`.toLowerCase(), tags: ["cond"] });
  out.push({ sec: "rules", id: "cond-exhaustion", name: "Exhaustion", line: "Condition · 6 levels", words: `exhaustion ${EXHAUSTION.join(" ")}`.toLowerCase(), tags: ["cond"] });
  for (const p of RULE_PAGES) out.push({ sec: "rules", id: p.id, name: p.name, line: p.group === "combat" ? "Combat" : p.group === "rest" ? "Resting" : "The basics", words: `${p.name} ${p.points.join(" ")}`.toLowerCase(), tags: [p.group] });
  entriesCache = out;
  return out;
}

/** A feat's prerequisite in plain words ("" when it has none). */
export function featReq(f: (typeof R.feats)[number]): string {
  const r = f.req;
  if (!r) return "";
  const out: string[] = [];
  if (r.ability) out.push(`${r.ability[0].map((a) => ABILITY_NAMES[a]).join(" or ")} ${r.ability[1]}+`);
  if (r.spellcasting) out.push("the ability to cast a spell");
  if (r.armor) out.push(`${r.armor} armour training`);
  if (r.martial) out.push("martial weapon training");
  if (r.species?.length) out.push(r.species.join(" or "));
  if (r.lineage?.length) out.push(r.lineage.join(" or "));
  if (r.small) out.push("a Small race");
  return out.join(", ");
}

/** Filter chips per local section. */
export const CHIPS: Partial<Record<WikiSection, [string, string][]>> = {
  classes: [["", "All"], ["spells", "Casts spells"], ["nospells", "No spells"]],
  races: [["", "All"], ["dark", "Darkvision"], ["small", "Small"], ["PHB14", "Player's Handbook"]],
  feats: [["", "All"], ["none", "No prerequisite"], ["pre", "Has a prerequisite"]],
  rules: [["", "All"], ["cond", "Conditions"], ["combat", "Combat"], ["rest", "Resting"], ["basics", "The basics"]],
};

export const rules2014 = R;
