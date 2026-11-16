// Feedback on this PC (REQUIREMENTS §6.1). Logs in as the admin account (CF_ADMIN_EMAIL /
// CF_ADMIN_PASSWORD in .env.local) and:
//   npm run feedback:pull                 → writes ./feedback/feedback.json + ./feedback/images/
//   npm run feedback:fix -- <id> "<note>" → marks an item fixed online (the sender sees the note)
//   npm run feedback:fix -- <id> --reopen → opens it again
// The JSON keeps the old local format (id, created, note, context, target, images, status,
// fixNote) plus sender and details. Items in the old local file that never went online are kept.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
for (const k of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "CF_ADMIN_EMAIL", "CF_ADMIN_PASSWORD"])
  if (!env[k]) throw new Error(`Add ${k}=... to .env.local`);

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: loginError } = await sb.auth.signInWithPassword({ email: env.CF_ADMIN_EMAIL, password: env.CF_ADMIN_PASSWORD });
if (loginError) throw new Error("Admin login failed: " + loginError.message);
// Note: this login does not "claim" the account, so the browser stays logged in.

const DIR = join(root, "feedback");
const IMG = join(DIR, "images");
const FILE = join(DIR, "feedback.json");
const [cmd, id, ...rest] = process.argv.slice(2);

if (cmd === "fix") {
  if (!id) throw new Error('Usage: npm run feedback:fix -- <id> "what changed"');
  const reopen = rest[0] === "--reopen";
  const patch = reopen ? { status: "open", fix_note: "" } : { status: "fixed", fix_note: rest.join(" ") };
  const { data, error } = await sb.from("feedback").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw new Error(`No feedback with id ${id}`);
  console.log(reopen ? `Reopened ${id}` : `Marked ${id} fixed`);
}

// Always (also after fix): pull everything into ./feedback.
mkdirSync(IMG, { recursive: true });
const { data: rows, error } = await sb.from("feedback").select("*").order("created_at", { ascending: false });
if (error) throw error;
const items = [];
for (const r of rows) {
  const images = [];
  for (const path of r.images) {
    const name = path.split("/").pop();
    const local = join(IMG, name);
    if (!existsSync(local)) {
      const { data: blob, error: e } = await sb.storage.from("feedback").download(path);
      if (e) {
        console.warn(`Couldn't download ${path}: ${e.message}`);
        continue;
      }
      writeFileSync(local, Buffer.from(await blob.arrayBuffer()));
    }
    images.push(`feedback/images/${name}`);
  }
  items.push({
    id: r.id,
    created: Date.parse(r.created_at),
    note: r.note,
    context: r.context,
    ...(r.target ? { target: r.target } : {}),
    images,
    status: r.status,
    ...(r.fix_note ? { fixNote: r.fix_note } : {}),
    sender: r.sender_name || (r.user_id ? "a logged-in user" : "logged out"),
    details: r.details,
  });
}
// Keep old local-only items (from before feedback went online).
let legacy = [];
try {
  legacy = JSON.parse(readFileSync(FILE, "utf8")).filter((x) => x.local || (!x.details && !items.some((y) => y.id === x.id)));
} catch {
  /* no old file */
}
legacy = legacy.map((x) => ({ ...x, local: true }));
writeFileSync(FILE, JSON.stringify([...items, ...legacy].sort((a, b) => b.created - a.created), null, 2));
const open = [...items, ...legacy].filter((x) => x.status === "open").length;
console.log(`feedback/feedback.json: ${items.length} online + ${legacy.length} old local item(s), ${open} open.`);
