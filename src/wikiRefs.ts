// Book and page for every Wiki entry (user, 2026-11-24: "everything we write on the wiki should have a
// reference"). src/data/wikiRefs.json is made by scripts/wikirefs.py from the extracted books
// (reference/books): the PHB index, chapter headings, and hand fixes checked on the page.
// SRD spells: public/spell-pages-2014.json (scripts/spellpages.py). Monsters: src/data/mmPages.json.
import REFS from "./data/wikiRefs.json";

const BOOK: Record<string, string> = {
  PHB14: "Player's Handbook",
  PHB: "Player's Handbook",
  XGE: "Xanathar's Guide to Everything",
  TCE: "Tasha's Cauldron of Everything",
  DMG: "Dungeon Master's Guide",
};
const refs = REFS as unknown as Record<string, [string, number]>;

/** "Player's Handbook, page 46" for a key like "class:barbarian" (undefined when not placed). */
export function refOf(key: string): string | undefined {
  const r = refs[key];
  return r ? `${BOOK[r[0]] ?? r[0]}, page ${r[1]}` : undefined;
}

/** The key of a Wiki entry (src/wiki.ts localEntries ids). */
export function entryKey(sec: string, id: string): string {
  if (sec === "classes") return `class:${id}`;
  if (sec === "races") return `race:${id}`;
  if (sec === "backgrounds") return `bg:${id}`;
  if (sec === "feats") return `feat:${id}`;
  if (id.startsWith("cond-")) return `cond:${id.slice(5)}`;
  return `rule:${id}`;
}
