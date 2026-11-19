// Builds public/srd-items.json: every SRD 5.1 item (PHB equipment + DMG magic items) from Open5e,
// already in the app's Item shape. Run again only if the data should be refreshed:
//   npx vite-node scripts/fetchItems.ts
import { writeFileSync } from "node:fs";
import { OPEN5E, fromV1, fromV2, type V1Magic, type V2Item } from "../src/items";

const get = async <T>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return (await r.json()) as T;
};
const a = await get<{ results: V2Item[] }>(`${OPEN5E}/v2/items/?document=srd-2014&limit=500`);
const b = await get<{ results: V1Magic[] }>(`${OPEN5E}/v1/magicitems/?document__slug=wotc-srd&limit=500`);
const items = [...a.results.map(fromV2), ...b.results.map(fromV1)].sort((x, y) => x.name.localeCompare(y.name));
writeFileSync("public/srd-items.json", JSON.stringify(items));
console.log(`${items.length} items (${a.results.length} equipment, ${b.results.length} magic)`);
