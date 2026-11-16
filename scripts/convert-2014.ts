// Convert a saved D&D 5e 2024 character to the 2014 rules and show what still needs choosing.
// Usage: npx vite-node scripts/convert-2014.ts <in.json> <out.json>
// <in.json> is the character's `data`; <out.json> gets the converted data.
import { readFileSync, writeFileSync } from "node:fs";
import { dnd2014 } from "../src/systems/dnd5e";

const [inPath, outPath] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(inPath, "utf8"));
const books = ["PHB14", "XGE", "TCE"];
const c = dnd2014.normalize({ ...raw, edition: "2014" });
const d = dnd2014.derive(c, books);
writeFileSync(outPath, JSON.stringify(c, null, 1));
console.log("identity:", d.identity, "| level", c.level);
console.log("scores:", JSON.stringify(d.scores), "| AC", d.ac, "| HP", d.hpMax, "| DC", d.spellDc);
console.log("cantrips:", c.cantrips.join(", "));
console.log("spells:", c.prepared.join(", "));
console.log("metamagic:", c.metamagic.join(", "), "| subclass:", c.subclass, c.subclassOption, "| background:", c.background, "| species:", c.species);
console.log("languages:", c.languages.join(", "));
for (const w of d.warnings) console.log(`[${w.level}] ${w.tab}: ${w.text}`);
