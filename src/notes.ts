// Session notes in tabs (REQUIREMENTS §4.8): pure helpers, no React, no network.

export const NOTE_COLORS = [
  { id: "parchment", name: "Parchment", hex: "#e8d3a6" },
  { id: "crimson", name: "Crimson", hex: "#e0485e" },
  { id: "gold", name: "Gold", hex: "#d4a64a" },
  { id: "green", name: "Green", hex: "#6fbf73" },
  { id: "blue", name: "Blue", hex: "#8fb6e3" },
  { id: "violet", name: "Violet", hex: "#b9a3e8" },
  { id: "teal", name: "Teal", hex: "#5fc4b8" },
  { id: "stone", name: "Stone", hex: "#a3927f" },
] as const;
export type NoteColor = (typeof NOTE_COLORS)[number]["id"];

export const MAX_TABS = 30;
export const MAX_CHARS = 50_000;
export const TITLE_MAX = 40;

export const colorHex = (id: string) => NOTE_COLORS.find((c) => c.id === id)?.hex ?? NOTE_COLORS[0].hex;

/** "Notes N+1", N = the highest number among tabs called "Notes N" (a plain "Notes" counts as 1). */
export function nextNoteTitle(titles: string[]): string {
  let n = 0;
  for (const t of titles) {
    const m = /^notes(?:\s+(\d+))?$/i.exec(t.trim());
    if (m) n = Math.max(n, m[1] ? Number(m[1]) : 1);
  }
  return `Notes ${n + 1}`;
}

/** The least-used colour among the tabs; on a tie, a random one of those. */
export function pickNoteColor(used: string[], random: () => number = Math.random): NoteColor {
  const counts = NOTE_COLORS.map((c) => ({ id: c.id, n: used.filter((u) => u === c.id).length }));
  const least = Math.min(...counts.map((c) => c.n));
  const pool = counts.filter((c) => c.n === least);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/** Editor HTML → plain text (search, counters, export). Blocks and list items end a line. */
export function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, "[x] ")
    .replace(/<li[^>]*data-checked="false"[^>]*>/gi, "[ ] ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** How many times `q` appears in `text` (case-insensitive). */
export function countMatches(text: string, q: string): number {
  const needle = q.trim().toLowerCase();
  if (!needle) return 0;
  const hay = text.toLowerCase();
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/** Move the item with `id` so it ends up at index `to` (counted in the list without it). */
export function moveItem<T extends { id: string }>(list: T[], id: string, to: number): T[] {
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return list;
  const rest = list.filter((x) => x.id !== id);
  const at = Math.max(0, Math.min(rest.length, to));
  return [...rest.slice(0, at), list[from], ...rest.slice(at)];
}

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago", or a date. */
export function editedAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "a minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "an hour ago" : `${h} hours ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
