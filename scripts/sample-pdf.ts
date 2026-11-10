// Renders a template character's PDF to disk, for checking layouts without the browser.
// Usage: npm run pdf:sample -- [output.pdf] [level] [--system dnd2024|dnd2014|dnd35|pf2e] [--template parry|blank]
import { writeFileSync } from "node:fs";
import { SYSTEMS, getSystem } from "../src/systems/registry";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const systemId = flag("system") ?? "dnd2024";
const templateId = flag("template") ?? "parry";
const [out = "sample.pdf", levelArg] = args;

const system = getSystem(systemId);
if (!system) throw new Error(`Unknown system ${systemId}. Known: ${SYSTEMS.map((s) => s.id).join(", ")}`);
const template = system.templates.find((t) => t.id === templateId) ?? system.templates[0];
const c = template.make();
if (Number(levelArg)) c.level = Number(levelArg);
const books = [...new Set([...system.books.filter((b) => b.core).map((b) => b.id), ...template.books])];

system.buildPdf(c, system.derive(c, books), books).then((bytes) => {
  writeFileSync(out, bytes);
  console.log(`wrote ${out} (${bytes.length} bytes) — ${system.name}, ${template.name}, level ${c.level}`);
});
