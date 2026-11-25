// Every Wiki entry with its book, for scripts/wikirefs.py (writes scripts/out/wiki-entries.json).
//   npx vite-node scripts/wikirefs-dump.ts
import fs from "node:fs";
import { RULE_PAGES, rules2014 as R } from "../src/wiki";
import { CONDITIONS } from "../src/live";
import { BOOK_ITEMS } from "../src/bookItems";

type Named = { id?: string; name: string; book?: string };
const srdItems = JSON.parse(fs.readFileSync("public/srd-items.json", "utf8")) as { id: string; name: string; source: string }[];
const out = {
  classes: R.classes.map((c) => ({ id: c.id, name: c.name, book: c.book, subclasses: c.subclasses.map((s: Named) => ({ id: s.id, name: s.name, book: s.book ?? c.book })) })),
  races: R.species.map((s) => ({ id: s.id, name: s.name, book: s.book, lineages: (s.lineages ?? []).map((l: Named) => ({ id: l.id ?? l.name, name: l.name, book: l.book ?? s.book })) })),
  backgrounds: R.backgrounds.map((b) => ({ id: b.id, name: b.name, book: b.book })),
  feats: R.feats.map((f) => ({ id: f.id, name: f.name, book: f.book })),
  conditions: CONDITIONS.filter((c) => c.id !== "concentrating").map((c) => ({ id: c.id, name: c.name })),
  rules: RULE_PAGES.map((r) => ({ id: r.id, name: r.name })),
  items: [...srdItems.map((i) => ({ id: i.id, name: i.name, source: i.source })), ...BOOK_ITEMS.map((i) => ({ id: i.id, name: i.name, source: i.source }))],
};
fs.mkdirSync("scripts/out", { recursive: true });
fs.writeFileSync("scripts/out/wiki-entries.json", JSON.stringify(out, null, 1));
console.log("classes", out.classes.length, "races", out.races.length, "backgrounds", out.backgrounds.length, "feats", out.feats.length, "items", out.items.length);
