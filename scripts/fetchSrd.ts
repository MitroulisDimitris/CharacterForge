// Downloads the SRD 5.1 monsters and spells from Open5e into public/ so the app never waits on
// Open5e (new queries there can take minutes). Run again only to refresh the data:
//   npx vite-node scripts/fetchSrd.ts
import { writeFileSync } from "node:fs";

const API = "https://api.open5e.com/v1";
const SRD = "document__slug=wotc-srd";

async function getAll<T>(path: string): Promise<T[]> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 300_000);
      const r = await fetch(`${API}${path}`, { signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(`${r.status}`);
      const j = (await r.json()) as { results: T[]; count: number };
      return j.results;
    } catch (e) {
      console.log(`${path}: try ${attempt} failed (${e instanceof Error ? e.message : e})`);
    }
  }
  throw new Error(`gave up on ${path}`);
}

// Keep only what the app reads (smaller files).
const MONSTER_KEYS = ["slug", "name", "size", "type", "subtype", "alignment", "armor_class", "armor_desc", "hit_points", "hit_dice", "speed", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "strength_save", "dexterity_save", "constitution_save", "intelligence_save", "wisdom_save", "charisma_save", "skills", "damage_vulnerabilities", "damage_resistances", "damage_immunities", "condition_immunities", "senses", "languages", "challenge_rating", "cr", "actions", "bonus_actions", "reactions", "legendary_desc", "legendary_actions", "special_abilities", "environments"];
const SPELL_KEYS = ["slug", "name", "desc", "higher_level", "range", "components", "material", "duration", "requires_concentration", "can_be_cast_as_ritual", "casting_time", "level", "level_int", "school", "dnd_class"];
const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k] ?? null]));

const which = process.argv[2] ?? "both";
if (which !== "spells") {
  const m = await getAll<Record<string, unknown>>(`/monsters/?${SRD}&limit=500`);
  writeFileSync("public/srd-monsters.json", JSON.stringify(m.map((x) => pick(x, MONSTER_KEYS))));
  console.log(`${m.length} monsters`);
}
if (which !== "monsters") {
  const s = await getAll<Record<string, unknown>>(`/spells/?${SRD}&limit=500`);
  writeFileSync("public/srd-spells.json", JSON.stringify(s.map((x) => pick(x, SPELL_KEYS))));
  console.log(`${s.length} spells`);
}
