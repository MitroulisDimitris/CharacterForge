// Read the activity log (admin only) on this PC.
//   npm run audit                 → the last 50 changes
//   npm run audit -- 200          → the last 200
//   npm run audit -- <row id>     → everything that happened to one character / session
//   npm run audit -- restore <id> → put a deleted character back (from its last delete entry)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: e0 } = await sb.auth.signInWithPassword({ email: env.CF_ADMIN_EMAIL, password: env.CF_ADMIN_PASSWORD });
if (e0) throw new Error("Admin login failed: " + e0.message);

const [a, b] = process.argv.slice(2);
if (a === "restore") {
  const { data } = await sb.from("audit_log").select("info").eq("table_name", "characters").eq("row_id", b).eq("action", "delete").order("at", { ascending: false }).limit(1);
  const old = data?.[0]?.info?.old_row;
  if (!old) throw new Error(`No deleted character with id ${b}`);
  // The admin can't write other people's characters through the app's rules: print the row so it
  // can be re-inserted (Supabase SQL editor, or ask Claude).
  console.log(JSON.stringify(old, null, 2));
  process.exit(0);
}

let q = sb.from("audit_log").select("at, user_id, action, table_name, row_id, info").order("at", { ascending: false });
q = a && !/^\d+$/.test(a) ? q.eq("row_id", a).limit(500) : q.limit(Number(a) || 50);
const { data: rows, error } = await q;
if (error) throw error;
const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
const names = new Map();
if (ids.length) {
  const { data: profs } = await sb.from("profiles").select("id, display_name").in("id", ids);
  profs?.forEach((p) => names.set(p.id, p.display_name));
}
for (const r of rows.reverse()) {
  const who = r.user_id ? names.get(r.user_id) || r.user_id.slice(0, 8) : "system";
  const i = r.info ?? {};
  const what = [i.name ?? i.display_name, i.level_from != null ? `level ${i.level_from} → ${i.level}` : i.level != null ? `level ${i.level}` : "", i.data_fields ? `changed: ${i.data_fields.join(", ")}` : i.fields ? `changed: ${i.fields.join(", ")}` : "", i.old_row ? "(full copy kept)" : ""]
    .filter(Boolean)
    .join(" · ");
  console.log(`${new Date(r.at).toLocaleString()}  ${who.padEnd(14)} ${r.action.padEnd(6)} ${r.table_name.padEnd(15)} ${r.row_id}  ${what}`);
}
