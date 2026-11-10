// Dev-server plugin: stores in-app feedback in ./feedback so Claude can read and fix it.
//   feedback/feedback.json  — every note (newest first)
//   feedback/images/*.png   — pasted screenshots, referenced from the JSON
// Routes (dev server only): GET /__feedback, POST /__feedback (new item), PATCH /__feedback/<id>, DELETE /__feedback/<id>.
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "feedback");
const IMG = join(DIR, "images");
const FILE = join(DIR, "feedback.json");

type Item = { id: string; images?: string[]; [k: string]: unknown };

const load = (): Item[] => {
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch {
    return [];
  }
};
const save = (items: Item[]) => {
  mkdirSync(IMG, { recursive: true });
  writeFileSync(FILE, JSON.stringify(items, null, 2));
};
const body = (req: IncomingMessage) =>
  new Promise<string>((ok, fail) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => ok(s));
    req.on("error", fail);
  });
const send = (res: ServerResponse, code: number, data: unknown) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};
const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

export function feedbackPlugin(): Plugin {
  return {
    name: "characterforge-feedback",
    configureServer(server) {
      server.middlewares.use("/__feedback", async (req, res) => {
        try {
          const id = safeId((req.url ?? "/").slice(1).split("?")[0]);
          const items = load();
          if (req.method === "GET") return send(res, 200, items);
          if (req.method === "POST") {
            const item = JSON.parse(await body(req)) as Item & { imageData?: string[] };
            item.id = safeId(item.id);
            mkdirSync(IMG, { recursive: true });
            // Pasted images arrive as data URLs; store them as files the JSON points to.
            item.images = (item.imageData ?? []).map((d, i) => {
              const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(d);
              if (!m) return "";
              const name = `${item.id}-${i + 1}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
              writeFileSync(join(IMG, name), Buffer.from(m[2], "base64"));
              return `feedback/images/${name}`;
            }).filter(Boolean);
            delete item.imageData;
            save([item, ...items.filter((x) => x.id !== item.id)]);
            return send(res, 200, item);
          }
          if (req.method === "PATCH" && id) {
            const patch = JSON.parse(await body(req));
            const next = items.map((x) => (x.id === id ? { ...x, ...patch, id: x.id, images: x.images } : x));
            save(next);
            return send(res, 200, next.find((x) => x.id === id) ?? null);
          }
          if (req.method === "DELETE" && id) {
            const gone = items.find((x) => x.id === id);
            for (const p of gone?.images ?? []) {
              const f = join(process.cwd(), p);
              if (f.startsWith(IMG) && existsSync(f)) unlinkSync(f);
            }
            save(items.filter((x) => x.id !== id));
            return send(res, 200, { ok: true });
          }
          send(res, 405, { error: "method not allowed" });
        } catch (e) {
          send(res, 500, { error: String(e) });
        }
      });
    },
  };
}
