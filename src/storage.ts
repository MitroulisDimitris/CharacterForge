// Browser storage for the character library, plus JSON import/export.
import { getSystem, isSystemId } from "./systems/registry";
import type { SystemId } from "./systems/types";

export interface StoredCharacter {
  id: string;
  system: SystemId;
  /** Allowed books, fixed when the character was created. */
  books: string[];
  created: number;
  updated: number;
  data: unknown;
  /** Level-up choices the player skipped for later (unlock ids like "5:cantrips"). */
  pending?: string[];
}

const LIB_KEY = "character-forge:library:v2";
const OLD_KEY = "character-forge:character";
const LAST_KEY = "character-forge:last-open";
const THEME_KEY = "character-forge:theme";

export type Theme = "dark" | "parchment";

let idCounter = 0;
export const newRecordId = () => `c${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The books a version-1 save (from before rules selection) is treated as using. */
export const LEGACY_V1_BOOKS = ["PHB24", "PHB14", "XGE"];

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function validRecord(r: unknown): r is StoredCharacter {
  if (!r || typeof r !== "object") return false;
  const x = r as StoredCharacter;
  return typeof x.id === "string" && isSystemId(x.system) && Array.isArray(x.books) && typeof x.data === "object" && x.data !== null;
}

/** Load the library; the first time, moves the old single-character save into it. */
export function loadLibrary(): StoredCharacter[] {
  const raw = safeGet(LIB_KEY);
  if (raw) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list.filter(validRecord);
    } catch {
      /* fall through to an empty library */
    }
    return [];
  }
  const old = safeGet(OLD_KEY);
  if (old) {
    try {
      const data = JSON.parse(old);
      const now = Date.now();
      const migrated: StoredCharacter[] = [{ id: newRecordId(), system: "dnd2024", books: LEGACY_V1_BOOKS, created: now, updated: now, data: { ...data, edition: "2024" } }];
      saveLibrary(migrated);
      return migrated;
    } catch {
      return [];
    }
  }
  return [];
}

export const saveLibrary = (list: StoredCharacter[]) => safeSet(LIB_KEY, JSON.stringify(list));
export const loadLastOpen = () => safeGet(LAST_KEY);
export const saveLastOpen = (id: string | null) => (id ? safeSet(LAST_KEY, id) : safeSet(LAST_KEY, ""));

export function loadTheme(): Theme {
  return safeGet(THEME_KEY) === "parchment" ? "parchment" : "dark";
}
export const saveTheme = (t: Theme) => safeSet(THEME_KEY, t);

export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "character";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportFile {
  format: "character-forge";
  version: 2;
  system: SystemId;
  books: string[];
  character: unknown;
  pending?: string[];
}

export function exportJson(rec: StoredCharacter) {
  const data = rec.data as { name?: string; level?: number };
  const file: ExportFile = { format: "character-forge", version: 2, system: rec.system, books: rec.books, character: rec.data, pending: rec.pending ?? [] };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${fileSafe(data.name ?? "character")}_${rec.system}_lvl${data.level ?? 1}.json`);
}

/** Parse an exported file (version 2, or a version-1 single character) into a new library record. */
export function parseImport(text: string): StoredCharacter {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const now = Date.now();
  if (data && typeof data === "object" && (data as ExportFile).format === "character-forge") {
    const f = data as ExportFile;
    const system = getSystem(f.system);
    if (!system) throw new Error(`This file is for a game system this app doesn't know ("${String(f.system)}").`);
    const books = Array.isArray(f.books) ? f.books.filter((b) => typeof b === "string") : [];
    const known = system.books.map((b) => b.id);
    const core = system.books.filter((b) => b.core).map((b) => b.id);
    return { id: newRecordId(), system: system.id, books: [...new Set([...core, ...books.filter((b) => known.includes(b))])], created: now, updated: now, data: system.normalize(f.character), pending: Array.isArray(f.pending) ? f.pending.filter((p) => typeof p === "string") : [] };
  }
  if (data && typeof data === "object" && "name" in data && "level" in data && "base" in data) {
    // Version 1: a single D&D 2024 character saved before rules selection existed.
    const system = getSystem("dnd2024")!;
    return { id: newRecordId(), system: "dnd2024", books: LEGACY_V1_BOOKS, created: now, updated: now, data: system.normalize(data) };
  }
  throw new Error("This file doesn't look like a Character Forge save.");
}

export async function importFile(file: File): Promise<StoredCharacter> {
  return parseImport(await file.text());
}
