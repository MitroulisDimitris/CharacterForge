// One "To do" list for a character (user, 2026-11-17): the choices postponed at level-up plus every
// rule problem on the sheet, without duplicates; the grey notes go in a folded "Notes" part. Each
// item knows its tab and a few words that find the right section there, so clicking it can open
// the tab, scroll to that section and make it glow.
//
// Numbers always come from the sheet as it is now ("Prepare 2 more spells (3 of 5)"), not from
// what one level-up added, so the list says exactly how many clicks are left.
import type { Unlock, Warning } from "./systems/types";

export interface Todo {
  key: string;
  text: string;
  tab?: string;
  /** The card on that tab that fixes it (its `todo` id). */
  section?: string;
  /** Words that name the section, used only when there's no section id. */
  find: string[];
  /** A postponed level-up choice (can be dismissed, and done in the step-by-step dialog). */
  unlockId?: string;
}

const strip = (s: string) => s.replace(/\.$/, "").trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, " ").trim();

/** What a check or a level-up choice is about, so the two can be matched. */
function topicOf(text: string): string {
  const t = strip(text);
  let m: RegExpMatchArray | null;
  if (/^Cantrips?:/i.test(t)) return "cantrips";
  if (/^Spellbook:/i.test(t)) return "spellbook";
  if (/^(Spells known|Prepared spells|Spells prepared|Spells):/i.test(t)) return "spells";
  if (/^Metamagic:/i.test(t)) return "metamagic";
  if (/^Eldritch Invocations:/i.test(t)) return "invocations";
  if (/^Infusions:/i.test(t)) return "infusions";
  if (/^Expertise:/i.test(t)) return "expertise";
  if (/^Choose a Fighting Style/i.test(t)) return "style";
  if ((m = t.match(/^Choose your (.+)$/i))) return `choose:${norm(m[1])}`;
  if ((m = t.match(/^([^:]{3,40}):/))) return `label:${norm(m[1])}`;
  return `text:${norm(t)}`;
}

const UNLOCK_TOPIC: Record<string, string> = {
  cantrips: "cantrips",
  spells: "spells",
  spellbook: "spellbook",
  metamagic: "metamagic",
  invocations: "invocations",
  infusions: "infusions",
  expertise: "expertise",
  style: "style",
  pact: "choose:pact boon",
};
/** Where each kind of level-up choice is made (a card's `todo` id). */
const UNLOCK_SECTION: Record<string, string> = {
  subclass: "subclass",
  cantrips: "cantrips",
  spells: "spells-1",
  spellbook: "spells-1",
  swap: "your-spells",
  style: "fighting-style",
  expertise: "expertise",
  invocations: "invocations",
  pact: "pact-boon",
  infusions: "infusions",
  picks: "subclass",
  metamagic: "metamagic",
  asi: "feat",
  hp: "hit-points",
};
export const unlockSection = (u: Unlock) => u.section ?? UNLOCK_SECTION[u.id.split(":")[1] ?? ""];

/** Level-up choices that are a number of picks: their check on the sheet says how many are left. */
const COUNTED = new Set(["cantrips", "spells", "spellbook", "metamagic", "invocations", "infusions", "expertise"]);

function unlockTopic(u: Unlock): string {
  const kind = u.id.split(":")[1] ?? "";
  if (UNLOCK_TOPIC[kind]) return UNLOCK_TOPIC[kind];
  if (kind === "picks") return `label:${norm(u.title.replace(/^Choose\s+/i, ""))}`;
  return topicOf(u.title);
}

/** Section names to look for in the tab, per topic (headings of the cards there). */
function findFor(topic: string, text: string): string[] {
  switch (topic) {
    case "cantrips":
      return ["Cantrips"];
    case "spells":
      return ["level spells", "Your spells"];
    case "spellbook":
      return ["Spellbook", "level spells"];
    case "metamagic":
      return ["Metamagic"];
    case "invocations":
      return ["Eldritch Invocations"];
    case "infusions":
      return ["Infusions"];
    case "expertise":
      return ["Expertise"];
    case "style":
      return ["Fighting Style"];
  }
  if (topic.startsWith("choose:")) return [topic.slice(7)];
  if (topic.startsWith("label:")) return [topic.slice(6)];
  return findWords(text);
}

/** Section names a check points at, from its wording (for checks without a known topic). */
export function findWords(text: string): string[] {
  const t = strip(text);
  let m: RegExpMatchArray | null;
  const topic = topicOf(t);
  if (!topic.startsWith("text:")) return findFor(topic, t);
  if ((m = t.match(/^Choose \d+ more (.+?) skill/i))) return [`${m[1]} skills`, "Skills"];
  if ((m = t.match(/^Choose (?:a|an) (.+)$/i))) return [m[1]];
  if (/languages?/i.test(t)) return ["Languages"];
  if (/armor|shield/i.test(t)) return ["Armor", "Equipment"];
  if (/\bspells?\b/i.test(t)) return ["level spells", "Your spells"];
  return [];
}

const NOUN: [RegExp, string, string][] = [
  // label on the sheet, what you do, what you pick
  [/^cantrips?$/i, "Choose", "cantrip"],
  [/^(prepared spells|spells prepared)$/i, "Prepare", "spell"],
  [/^(spells known|spells)$/i, "Choose", "spell"],
  [/^spellbook$/i, "Copy", "spell"],
  [/^metamagic$/i, "Choose", "Metamagic option"],
  [/^eldritch invocations$/i, "Choose", "invocation"],
  [/^infusions$/i, "Learn", "infusion"],
];
const plural = (n: number, w: string) => (n === 1 ? w : `${w}s`);

/**
 * "Prepared spells: 3 of 5 chosen" → "Prepare 2 more spells (3 of 5)";
 * "Spells known: 9 of 6 chosen" → "Remove 3 spells (9 of 6)". Anything else stays as it is.
 */
export function actionText(text: string): string {
  const t = strip(text);
  const m = t.match(/^([^:]+):\s*(\d+) of (\d+)\b(.*)$/i);
  if (!m) return t;
  const [, label, haveS, wantS] = m;
  const have = Number(haveS);
  const want = Number(wantS);
  const known = NOUN.find(([rx]) => rx.test(label.trim()));
  const verb = known?.[1] ?? "Choose";
  const noun = known?.[2] ?? label.trim().replace(/s$/, "");
  const where = /^spellbook$/i.test(label.trim()) ? " into your spellbook" : "";
  if (have < want) return `${verb} ${want - have} more ${plural(want - have, noun)}${where} (${have} of ${want})`;
  if (have > want) return `Remove ${have - want} ${plural(have - want, noun)} (${have} of ${want})`;
  return t;
}

/** To-dos (postponed choices + rule problems) and notes (the grey "info" checks). */
export function buildTodos(warnings: Warning[], waiting: Unlock[]): { todos: Todo[]; notes: Todo[] } {
  const make = (w: Warning, key: string): Todo & { topic: string } => {
    const topic = topicOf(w.text);
    return { key, text: actionText(w.text), tab: w.tab, section: w.section, find: findFor(topic, w.text), topic };
  };
  const todos = warnings.filter((w) => w.level !== "info").map((w, i) => make(w, `w${i}:${w.text}`));
  const notes = warnings.filter((w) => w.level === "info").map((w, i) => make(w, `n${i}:${w.text}`));
  for (const u of waiting) {
    const topic = unlockTopic(u);
    // The same thing as a rule problem (e.g. "Choose your Druid Circle")? Show it once.
    const same = todos.find((t) => t.topic === topic && (!t.tab || t.tab === u.tab));
    if (same) {
      same.unlockId ??= u.id;
      continue;
    }
    // A grey note about it (prepared spells are only a note on the sheet): it becomes a to-do,
    // with the sheet's real numbers.
    const ni = u.optional ? -1 : notes.findIndex((t) => t.topic === topic && (!t.tab || t.tab === u.tab));
    if (ni >= 0) {
      const [n] = notes.splice(ni, 1);
      todos.push({ ...n, unlockId: u.id });
      continue;
    }
    // A number of picks with nothing left on the sheet: already done.
    if (COUNTED.has(topic)) continue;
    const item = { key: `u:${u.id}`, text: u.title, tab: u.tab, section: unlockSection(u), find: findFor(topic, u.title), topic, unlockId: u.id };
    // Nice-to-know choices ("Optional: swap a spell") aren't to-dos.
    (u.optional ? notes : todos).push(item);
  }
  const clean = ({ topic: _t, ...rest }: Todo & { topic: string }): Todo => rest;
  return { todos: todos.map(clean), notes: notes.map(clean) };
}

/**
 * The title of a postponed level-up choice with the sheet's real numbers (for the step-by-step
 * dialog, so it says the same as the To do list): "Prepare 1 more spell" -> "Prepare 2 more spells
 * (3 of 5)" when 3 of 5 are prepared.
 */
export function liveTitle(u: Unlock, warnings: Warning[]): string {
  const topic = unlockTopic(u);
  if (!COUNTED.has(topic)) return u.title;
  const w = warnings.find((x) => topicOf(x.text) === topic && (!x.tab || x.tab === u.tab));
  return w ? actionText(w.text) : u.title;
}

/**
 * Find the section in `root` whose heading matches one of the words (first word wins; card
 * headings before other labels), scroll it into view and make it glow for a moment. Falls back to
 * the first card in the tab.
 */
export function flashSection(root: HTMLElement | null, section: string | undefined, words: string[]): boolean {
  if (!root) return false;
  let target: HTMLElement | null = section ? root.querySelector<HTMLElement>(`[data-todo="${section}"]`) : null;
  if (!target && section) {
    // The section is in a view that isn't showing (e.g. the spell list behind "Learn spells"):
    // ask the tab to show it, then try again.
    const reveal = root.querySelector<HTMLElement>(`[data-todo-reveals~="${section}"]`);
    if (reveal) {
      reveal.click();
      window.setTimeout(() => flashSection(root, section, words), 80);
      return true;
    }
  }
  if (!target) {
    const heads = [
      ...root.querySelectorAll<HTMLElement>(".card-head h3"),
      ...root.querySelectorAll<HTMLElement>(".preview-head strong, h2, h4, legend"),
      ...root.querySelectorAll<HTMLElement>(".hero-label"),
    ];
    for (const w of words) {
      const want = norm(w);
      if (!want) continue;
      const h = heads.find((x) => norm(x.textContent ?? "").includes(want));
      if (h) {
        target = h.closest<HTMLElement>(".card, section, fieldset, .subclass-picker, .preview-split") ?? h.parentElement;
        break;
      }
    }
  }
  target ??= root.querySelector<HTMLElement>(".card, section");
  if (!target) return false;
  // A tall section (a long spell list) starts at the top of the screen so its heading shows.
  const tall = target.getBoundingClientRect().height > window.innerHeight * 0.6;
  target.style.scrollMarginTop = "80px";
  target.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
  // Only one section glows at a time (the last one asked for).
  root.querySelectorAll(".todo-flash").forEach((el) => el.classList.remove("todo-flash"));
  void target.offsetWidth; // restart the animation if it's clicked again
  target.classList.add("todo-flash");
  window.setTimeout(() => target!.classList.remove("todo-flash"), 2600);
  return true;
}
