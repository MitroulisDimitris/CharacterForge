// Checks that every named 2014 item in the app can be found in the book it says it comes from.
// Needs the book texts: reference/books/{PHB2014,XGE,TCE}.raw.txt (pdftotext of the PDFs).
// Run: npx vite-node scripts/bookcoverage.ts
import { readFileSync } from "node:fs";
import { RULES } from "../src/systems/dnd5e/rules";
import { INVOCATIONS, INFUSIONS, PACT_BOONS } from "../src/systems/dnd5e/data2014/warlock";
import { FIGHTING_STYLES } from "../src/systems/dnd5e/data2014/classes";

const R = RULES["2014"];
const FILE: Record<string, string> = { PHB14: "PHB2014", XGE: "XGE", TCE: "TCE" };
// Book headings are letter-spaced in the PDFs, so compare with all spaces and punctuation removed.
const squash = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const text: Record<string, string> = {};
for (const [b, f] of Object.entries(FILE)) text[b] = squash(readFileSync(`reference/books/${f}.raw.txt`, "latin1"));

type Item = { kind: string; name: string; book: string };
const items: Item[] = [];
const add = (kind: string, list: { name: string; book?: string }[]) => list.forEach((x) => items.push({ kind, name: x.name, book: x.book ?? "PHB14" }));
add("spell", R.spells);
add("feat", R.feats.filter((f) => f.id !== "asi"));
add("background", R.backgrounds.filter((b) => !(b as { custom?: boolean }).custom));
add("race", R.species);
R.species.forEach((s) => add("lineage", (s.lineages ?? []).map((l) => ({ name: l.name, book: s.book }))));
add("class", R.classes);
R.classes.forEach((c) => add(`subclass (${c.name})`, c.subclasses));
R.classes.forEach((c) => add(`feature (${c.name})`, c.features.map((f) => ({ name: f.name, book: (f as { book?: string }).book ?? c.book }))));
add("invocation", INVOCATIONS);
add("infusion", INFUSIONS);
add("pact boon", PACT_BOONS);
add("fighting style", FIGHTING_STYLES);
add("metamagic", R.metamagic);

// Names the app shortens or words differently from the book.
const strip = (n: string) =>
  n.replace(/\s*\((?:[^)]*variant|Tasha's|Acid|Lightning|Fire|Poison|Cold)\)$/, "").replace(/^(Black|Blue|Brass|Bronze|Copper|Gold|Green|Red|Silver|White) Dragon.*/, "$1").replace(/ \/ .*/, "");

const missing: Item[] = [];
let found = 0;
for (const it of items) {
  const t = text[it.book];
  if (!t) continue;
  const n = squash(strip(it.name));
  if (t.includes(n) || Object.values(text).some((x) => x.includes(n))) found++;
  else missing.push(it);
}
console.log(`Checked ${found + missing.length} items, found ${found}.`);
for (const m of missing) console.log(`NOT FOUND  [${m.book}] ${m.kind}: ${m.name}`);
