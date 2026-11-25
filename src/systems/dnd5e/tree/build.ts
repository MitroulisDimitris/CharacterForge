// The progression tree's content for one character: one row per level (1 to the class's top level),
// built from the class data, with each step's state read from the character (what they have, what
// waits for a choice, what comes later). Layout and drawing live in components/ProgressionTab.tsx.
import type { Character } from "../character";
import type { Derived } from "../derive";
import type { ClassDef } from "../data/classes";
import { RULES, classOf, inBooks } from "../rules";
import { stylesFor } from "../data2014/classes";
import { INVOCATIONS, PACT_BOONS } from "../data2014/warlock";
import { lookOf, type IconId, type Look } from "./looks";

export type Lane = "root" | "cls" | "sub" | "spl" | "gro";
export type Status = "have" | "choose" | "later" | "waiting";
export type ChoiceKind = "subclass" | "style" | "meta" | "boon" | "inv";

export interface TreeOption {
  id: string;
  name: string;
  /** Book or cost shown beside the name. */
  meta: string;
  text: string;
  tag?: "Popular" | "Beginner-friendly";
  /** Why it can't be picked yet (an invocation's prerequisite). */
  needs?: string;
  /** Subclass: the power it gives at this level (shown on the reveal step). */
  featName?: string;
  featText?: string;
}

export interface TreeNode {
  id: string;
  /** Level (row); 0 = the root. */
  r: number;
  lane: Lane;
  name: string;
  icon: IconId;
  text: string;
  tip?: string;
  /** A choice made here. */
  kind?: ChoiceKind;
  /** How many to pick. */
  n?: number;
  choice?: TreeOption[];
  /** This step shows what the choice `reveal` gave (the subclass's first power). */
  reveal?: string;
}

export interface Tree {
  cls: string;
  look: Look;
  level: number;
  maxLevel: number;
  nodes: TreeNode[];
  /** What the character picked, by choice node id. */
  picks: Record<string, string[]>;
}

const BOOK: Record<string, string> = { PHB14: "PHB", PHB24: "PHB", XGE: "XGE", TCE: "TCE" };
const bookOf = (b?: string) => BOOK[b ?? ""] ?? b ?? "";

/** A simple, strong first pick per class (same as SubclassPicker). */
export const BEGINNER: Record<string, string> = {
  barbarian: "berserker", bard: "lore", cleric: "life", druid: "moon", fighter: "champion", monk: "openHand", paladin: "devotion",
  ranger: "hunter", rogue: "thief", sorcerer: "draconic", warlock: "fiend", wizard: "evocation", artificer: "battleSmith",
};
/** Widely played picks, first ones allowed by the character's books get "Popular" (two at most). */
const POPULAR: Record<string, string[]> = {
  barbarian: ["totemWarrior", "zealot", "ancestralGuardian"], bard: ["eloquence", "swords", "glamour"], cleric: ["twilight", "light", "war"],
  druid: ["stars", "land", "shepherd"], fighter: ["battleMaster", "eldritchKnight", "samurai"], monk: ["shadow", "mercy", "kensei"],
  paladin: ["vengeance", "ancients", "glory"], ranger: ["gloomStalker", "feyWanderer", "beastMaster"], rogue: ["arcaneTrickster", "swashbuckler", "assassin"],
  sorcerer: ["divineSoul", "clockwork", "shadow"], warlock: ["hexblade", "genie", "celestial"], wizard: ["divination", "bladesinging", "abjuration"],
  artificer: ["artillerist", "armorer"],
  // other choices, keyed by kind
  style: ["defense", "greatWeapon", "archery"], meta: ["quickened", "twinned"], boon: ["tome", "blade"], inv: ["agonizingBlast", "devilsSight", "armorOfShadows"],
};

const ICON_RULES: [RegExp, IconId][] = [
  [/Rage|Frenzy/, "axe"], [/Reckless/, "bolt"], [/Danger Sense/, "eye"], [/Unarmored Defense/, "shield"],
  [/Fast Movement|Unarmored Movement|Natural Explorer|Deft Explorer/, "wind"], [/Extra Attack/, "two"], [/Inspiration|Song|Jack of/, "music"],
  [/Expertise/, "star"], [/Channel Divinity|Divine Sense|Divine Health/, "sun"], [/Destroy Undead/, "skull"], [/Lay on Hands/, "hand"],
  [/Smite/, "bolt"], [/Wild Shape/, "paw"], [/Druidic/, "leaf"], [/Second Wind/, "wind"], [/Action Surge/, "bolt"],
  [/Martial Arts|Stunning/, "fist"], [/^Ki$/, "drop"], [/Deflect|Slow Fall/, "hand"], [/Favored Enemy|Favored Foe/, "eye"],
  [/Primal Awareness/, "paw"], [/Sneak Attack/, "dagger"], [/Thieves/, "mask"], [/Cunning/, "wind"], [/Uncanny/, "shield"],
  [/Font of Magic|Innate Sorcery/, "drop"], [/Pact Magic/, "eye"], [/Invocation/, "eye"], [/Arcane Recovery/, "glass"], [/Spellcasting/, "wand"],
  [/Tinkering|Infuse|Right Tool/, "gear"], [/Ability Score/, "up"], [/Proficiency/, "star"],
];
const iconOf = (name: string): IconId => ICON_RULES.find(([re]) => re.test(name))?.[1] ?? "star";

/** New spells by level (the class table's big steps), in short words. */
const SPELLS: Record<string, [number, string, string][]> = {
  bard: [[3, "2nd-level spells", "Second-level spells like Heat Metal, Invisibility or Suggestion."], [4, "+1 cantrip", "One more bard cantrip."], [5, "3rd-level spells", "Third-level spells like Hypnotic Pattern or Fear."]],
  cleric: [[3, "2nd-level spells", "Second-level spells like Spiritual Weapon, Aid or Lesser Restoration."], [4, "+1 cantrip", "One more cleric cantrip."], [5, "3rd-level spells", "Third-level spells like Spirit Guardians and Revivify."]],
  druid: [[3, "2nd-level spells", "Second-level spells like Moonbeam or Pass without Trace."], [4, "+1 cantrip", "One more druid cantrip."], [5, "3rd-level spells", "Third-level spells like Call Lightning or Conjure Animals."]],
  sorcerer: [[3, "2nd-level spells", "Second-level spells like Misty Step or Scorching Ray."], [4, "+1 cantrip", "One more cantrip and one more spell known."], [5, "3rd-level spells", "Third-level spells like Fireball and Counterspell."]],
  wizard: [[3, "2nd-level spells", "Second-level spells like Misty Step or Web."], [4, "+1 cantrip", "One more cantrip, and two more spells in your book."], [5, "3rd-level spells", "Third-level spells like Fireball, Counterspell and Fly."]],
  warlock: [[3, "2nd-level slots", "Your pact slots become 2nd level: every warlock spell you cast gets stronger."], [4, "+1 cantrip", "One more warlock cantrip."], [5, "3rd-level slots", "Your pact slots become 3rd level, with spells like Hunger of Hadar or Fly."]],
  paladin: [[5, "2nd-level spells", "Second-level spells like Find Steed, Aid or Magic Weapon."]],
  ranger: [[5, "2nd-level spells", "Second-level spells like Pass without Trace or Spike Growth."]],
  artificer: [[5, "2nd-level spells", "Second-level spells like Heat Metal, Web or Enlarge/Reduce."]],
};
const TIPS: Record<string, string> = {
  Rage: "Rage before you charge in: it lasts a minute.", "Sneak Attack": "Once per turn: you need Advantage, or a friend next to the target.",
  "Action Surge": "Save it for the big moment.", "Extra Attack": "Your damage roughly doubles here.", "Wild Shape": "A wolf or a giant spider are classic picks.",
  "Ability Score Improvement": "Most players raise their main ability.", "Divine Smite": "Smite on a critical hit: the extra dice double too.",
  "Cunning Action": "Hide or Disengage every turn, then strike again.", "Font of Magic": "Sorcery points refill on a long rest.",
  "Bardic Inspiration": "Give it to a friend before a big roll.", Ki: "Ki comes back on a short rest: spend it freely.",
};

/** Subclass names without the class's prefix ("Path of the Berserker" → "Berserker"). */
const shortSub = (name: string) => name.replace(/^(Path of the |College of |Circle of the |Circle of |Way of the |Way of |Oath of the |Oath of |The )/, "");

function tagged(kind: string, opts: TreeOption[], beginner?: string): TreeOption[] {
  const popular = (POPULAR[kind] ?? []).filter((id) => opts.some((o) => o.id === id) && id !== beginner).slice(0, 2);
  const out = opts.map((o) => ({ ...o, tag: o.id === beginner ? ("Beginner-friendly" as const) : popular.includes(o.id) ? ("Popular" as const) : undefined }));
  const rank = (o: TreeOption) => (o.tag === "Beginner-friendly" ? 0 : o.tag === "Popular" ? 1 + popular.indexOf(o.id) : 9);
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Can a picked subclass, style, etc. still be found among the options? */
const valid = (ids: string[], opts?: TreeOption[]) => ids.filter((id) => !opts || opts.some((o) => o.id === id));

export function buildTree(c: Character, _d: Derived, books: string[]): Tree {
  const CL: ClassDef = classOf(RULES[c.edition], c.cls);
  const look = lookOf(CL.id);
  const maxLevel = Math.max(1, Math.min(5, CL.maxLevel));
  const level = Math.min(c.level, maxLevel);
  const rows: Record<number, TreeNode[]> = {};
  for (let r = 1; r <= maxLevel; r++) rows[r] = [];
  const subLabels = [CL.subclassLabel, "Sorcerer Subclass", "Sorcerous Origin"];
  // Tasha's optional features as on the sheet (derive.ts): additions when the book is allowed, and a
  // replacement (the ranger's Favored Foe, Deft Explorer) only when the player opted in.
  const tasha = c.rangerTasha && books.includes("TCE");
  const shown = CL.features.filter((f) => inBooks(books, f.book) && (f.replaces ? tasha : !(tasha && CL.features.some((x) => x.replaces === f.name))));
  let subDone = false;

  const subOpts = (): TreeOption[] =>
    tagged(
      CL.id,
      CL.subclasses
        .filter((s) => inBooks(books, s.book))
        .map((s) => {
          const f = s.features.find((x) => x.level === CL.subclassLevel) ?? s.features[0];
          return { id: s.id, name: shortSub(s.name), meta: bookOf(s.book), text: s.summary, featName: f?.name ?? s.name, featText: f?.text ?? s.summary };
        }),
      BEGINNER[CL.id],
    );

  for (const f of CL.features) {
    const r = f.level;
    if (r < 1 || r > maxLevel || !shown.includes(f)) continue;
    const name = f.name;
    const node: TreeNode = { id: name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14) + r, r, lane: "cls", name, icon: iconOf(name), text: f.text };
    if (TIPS[name]) node.tip = TIPS[name];
    if (subLabels.includes(name) && !subDone) {
      subDone = true;
      rows[r].push({ ...node, id: "sub", lane: "sub", icon: "crown", kind: "subclass", n: 1, text: `${f.text} It shapes your powers from now on.`, choice: subOpts() });
      rows[r].push({ id: "subpow", r, lane: "sub", name: `${look.subLane} power`, icon: "star", text: "", reveal: "sub" });
      continue;
    }
    if (name === "Fighting Style" && CL.fightingStyle) {
      const opts = stylesFor(CL).filter((s) => inBooks(books, s.book)).map((s) => ({ id: s.id, name: s.name, meta: bookOf(s.book), text: s.text }));
      Object.assign(node, { id: "style", icon: "shield", kind: "style", n: 1, choice: tagged("style", opts) });
    } else if (name === "Metamagic" && CL.sorcery) {
      const opts = CL.sorcery.metamagic.filter((m) => inBooks(books, m.book)).map((m) => ({ id: m.id, name: m.name, meta: m.cost, text: m.text }));
      Object.assign(node, { id: "meta", icon: "twist", kind: "meta", n: CL.sorcery.metamagicKnown[Math.max(r, level)] ?? 2, choice: tagged("meta", opts), tip: "Quickened and Twinned are the classic pair." });
    } else if (name === "Pact Boon" && CL.pactBoonLevel) {
      const opts = PACT_BOONS.filter((p) => inBooks(books, p.book)).map((p) => ({ id: p.id, name: p.name, meta: bookOf(p.book), text: p.text }));
      Object.assign(node, { id: "boon", icon: "crown", kind: "boon", n: 1, choice: tagged("boon", opts) });
    } else if (name === "Eldritch Invocations" && CL.invocations) {
      const opts = INVOCATIONS.filter((x) => inBooks(books, x.book) && (!x.level || x.level <= maxLevel)).map((x) => {
        const needs = [
          x.level && level < x.level && `warlock ${x.level}`,
          x.eldritchBlast && !c.cantrips.includes("Eldritch Blast") && "Eldritch Blast",
          x.pact && c.pactBoon !== x.pact && `Pact of the ${x.pact[0].toUpperCase() + x.pact.slice(1)}`,
          x.hex && !c.prepared.includes("Hex") && c.subclass !== "hexblade" && "Hex or a curse feature",
        ].filter(Boolean).join(", ");
        return { id: x.id, name: x.name, meta: bookOf(x.book), text: x.text, needs: needs || undefined };
      });
      Object.assign(node, { id: "inv", icon: "eye", kind: "inv", n: CL.invocations[Math.max(r, level)] ?? 2, choice: tagged("inv", opts), tip: "Agonizing Blast is the classic first pick." });
    }
    if (name === "Ability Score Improvement") node.lane = "gro";
    if (name === "Spellcasting" || name === "Pact Magic") node.lane = "spl";
    rows[r].push(node);
  }
  // a class without a subclass feature in its list still gets the choice at its level
  if (!subDone && CL.subclassLevel <= maxLevel && CL.subclasses.length) {
    const r = CL.subclassLevel;
    rows[r].unshift(
      { id: "sub", r, lane: "sub", name: CL.subclassLabel, icon: "crown", kind: "subclass", n: 1, text: "Your specialty within the class. It shapes your powers from now on.", choice: subOpts() },
      { id: "subpow", r, lane: "sub", name: `${look.subLane} power`, icon: "star", text: "", reveal: "sub" },
    );
  }
  for (const [r, name, text] of SPELLS[CL.id] ?? []) if (r <= maxLevel) rows[r].push({ id: "spl" + r, r, lane: "spl", name, icon: name.startsWith("+") ? "plus" : r === 5 ? "flame" : "book", text });
  if (maxLevel >= 5) rows[5].push({ id: "prof5", r: 5, lane: "gro", name: "Proficiency +3", icon: "star", text: "Your proficiency bonus goes up to +3: attacks, saves and your trained skills all improve." });

  const nodes: TreeNode[] = [
    { id: "root", r: 0, lane: "root", name: CL.name, icon: look.icon, text: `${CL.summary} Everything on this tree grows from here, one row per level.`, tip: "Glowing gold means you have something to choose." },
  ];
  const laneOrder: Record<Lane, number> = { root: 0, sub: 0, cls: 1, spl: 2, gro: 3 };
  for (let r = 1; r <= maxLevel; r++) {
    // at most four steps a row: the spell and growth steps give way first
    const row = rows[r].sort((a, b) => laneOrder[a.lane] - laneOrder[b.lane]);
    while (row.length > 4) {
      const i = row.map((n) => n.lane).lastIndexOf(row.some((n) => n.lane === "spl" && !n.kind) ? "spl" : "gro");
      row.splice(i >= 0 ? i : row.length - 1, 1);
    }
    nodes.push(...row);
  }

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const picks: Record<string, string[]> = {};
  if (byId.sub && c.subclass) picks.sub = valid([c.subclass], byId.sub.choice);
  if (byId.style && c.fightingStyle) picks.style = valid([c.fightingStyle], byId.style.choice);
  if (byId.meta) picks.meta = valid(c.metamagic, byId.meta.choice);
  if (byId.boon && c.pactBoon) picks.boon = valid([c.pactBoon], byId.boon.choice);
  if (byId.inv) picks.inv = valid(c.invocations, byId.inv.choice);
  return { cls: CL.id, look, level, maxLevel, nodes, picks };
}

export const picked = (t: Tree, id: string) => {
  const n = t.nodes.find((x) => x.id === id);
  return (t.picks[id] ?? []).length >= (n?.n ?? 1);
};

export function statusOf(t: Tree, n: TreeNode, level = t.level): Status {
  if (n.id === "root") return "have";
  if (n.r > level) return "later";
  if (n.reveal) return picked(t, n.reveal) ? "have" : "waiting";
  if (n.choice && !picked(t, n.id)) return "choose";
  return "have";
}

/** The option a single choice picked (the subclass, for its reveal step). */
export const optionOf = (t: Tree, choiceId: string) => {
  const c = t.nodes.find((x) => x.id === choiceId);
  const p = (t.picks[choiceId] ?? [])[0];
  return c?.choice?.find((o) => o.id === p);
};

export function nameOf(t: Tree, n: TreeNode): string {
  if (n.reveal) return (picked(t, n.reveal) && optionOf(t, n.reveal)?.featName) || n.name;
  if (n.choice && picked(t, n.id)) {
    const mine = t.picks[n.id] ?? [];
    return n.choice.filter((o) => mine.includes(o.id)).map((o) => ((n.n ?? 1) > 1 ? o.name.split(" ")[0] : o.name)).join(" + ");
  }
  return n.name;
}

/** The character change for picking (or un-picking) an option. */
export function pickPatch(c: Character, d: Derived, n: TreeNode, id: string): Partial<Character> | null {
  const on = (n.kind === "meta" ? c.metamagic : n.kind === "inv" ? c.invocations : []).includes(id);
  const max = n.n ?? 1;
  const toggle = (list: string[]) => (on ? list.filter((x) => x !== id) : list.length < max ? [...list, id] : null);
  switch (n.kind) {
    case "subclass": {
      if (c.subclass === id) return null;
      const s = d.cls.subclasses.find((x) => x.id === id);
      if (!s) return null;
      return { subclass: id, subclassOption: "", subclassSkills: [], subclassCantrip: "", subclassPicks: [], ...(s.spell || d.cls.spell ? {} : { cantrips: [], prepared: [] }) };
    }
    case "style":
      return c.fightingStyle === id ? null : { fightingStyle: id, styleCantrips: [] };
    case "boon":
      return c.pactBoon === id ? null : { pactBoon: id };
    case "meta": {
      const m = toggle(c.metamagic);
      return m ? { metamagic: m } : null;
    }
    case "inv": {
      const v = toggle(c.invocations);
      return v ? { invocations: v } : null;
    }
  }
  return null;
}
