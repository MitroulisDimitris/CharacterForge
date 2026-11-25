// Sessions online (REQUIREMENTS §4): host, join with an invite code, session copies of characters
// (D2), the roster (summary only, D4). Tables + security rules: supabase/migrations/20261116_sessions.sql.
import { supabase } from "./cloud";
import type { StoredCharacter } from "./storage";
import { getSystem } from "./systems/registry";
import type { SystemId } from "./systems/types";
import type { Live } from "./live";
import { validPortrait } from "./portrait";
import { greekKeysToLatin } from "./text";

export interface SessionInfo {
  id: string;
  host_id: string;
  name: string;
  system: SystemId;
  books: string[];
  joining_locked: boolean;
  status: "active" | "ended";
  created_at: string;
  /** The level the session plays at (set by the DM); null = not set. */
  level: number | null;
}

/** My seat in a session: the session copy of one of my characters. */
export interface Membership {
  id: string;
  session_id: string;
  character_id: string;
  books: string[];
  data: unknown;
  pending: string[];
  summary: Summary;
  joined_at: string;
  updated_at: string;
  /** Host-kept in-play state (D3); read-only for the player. */
  live: Live;
  /** The host awarded this level ("Level up ready"). */
  level_award: number | null;
  /**
   * This seat is the character's own version for this session (user, 2026-11-24): its sheet changes
   * only here. False (or missing, before 20261124_session_versions.sql ran): it follows the character.
   */
  version?: boolean;
}

/** What other players see of a character (D4). */
export interface Summary {
  name?: string;
  identity?: string;
  level?: number;
  system?: string;
  /** Small picture (src/portrait.ts), when the player added one. */
  portrait?: string;
}

export interface Preview {
  id: string;
  name: string;
  system: SystemId;
  books: string[];
  host_name: string;
  joining_locked: boolean;
  status: "active" | "ended";
  is_host: boolean;
  my_character: string | null;
  level: number | null;
}

export interface RosterRow {
  member_id: string;
  user_id: string;
  display_name: string;
  summary: Summary;
  joined_at: string;
}

const SESSION_COLS = "id, host_id, name, system, books, joining_locked, status, created_at, level";
const BASE_MEMBER_COLS = "id, session_id, character_id, books, data, pending, summary, joined_at, updated_at, live, level_award";
// `version` exists once supabase/migrations/20261124_session_versions.sql has run; until then the
// select falls back to the columns without it (Postgres error 42703 = no such column).
let hasVersionCol = true;
const memberCols = () => (hasVersionCol ? `${BASE_MEMBER_COLS}, version` : BASE_MEMBER_COLS);
async function selectMembers<T>(run: (cols: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>): Promise<T[]> {
  let { data, error } = await run(memberCols());
  if (error?.code === "42703" && hasVersionCol) {
    hasVersionCol = false;
    ({ data, error } = await run(memberCols()));
  }
  if (error) throw error;
  return (data ?? []) as T[];
}

/** "k7p2qx", "K7P 2QX" → "K7P-2QX". */
export function normalizeCode(raw: string): string {
  // A Greek keyboard types κ for K, ρ for R…: read those as the keys pressed.
  const s = greekKeysToLatin(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length > 3 ? `${s.slice(0, 3)}-${s.slice(3, 6)}` : s;
}
export const codeComplete = (code: string) => /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code);
export const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}?join=${code}`;

/**
 * What a session gets of a character: everything but the player's private play state (their own HP
 * tracker, conditions, used slots and resources). The DM keeps the session's own (`live`).
 */
export function sessionData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  // versionPlay: the player's own trackers for each session version (private, like play).
  const { play: _play, spent: _spent, versionPlay: _vp, ...rest } = data as Record<string, unknown>;
  return rest;
}

/** The summary saved with a session copy, from the character's data. */
export function summarize(system: SystemId, books: string[], data: unknown): Summary {
  const sys = getSystem(system);
  if (!sys) return {};
  try {
    const c = sys.normalize(data);
    return { name: c.name || "Unnamed", identity: sys.derive(c, books).identity, level: c.level, system, ...(validPortrait(c.portrait) ? { portrait: c.portrait } : {}) };
  } catch {
    return {};
  }
}

/** Plain-words message from a database error. */
export const sessionError = (e: unknown) => {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  return /fetch|network/i.test(m) ? "Can't reach the server. Check your internet connection and try again." : m;
};

/** Per session I host or play in: players, encounters (host only), last activity. */
export interface Overview {
  session_id: string;
  players: number;
  encounters: number | null;
  last_activity: string;
}
export async function loadOverview(): Promise<Overview[]> {
  const { data, error } = await supabase.rpc("my_sessions_overview");
  if (error) throw error;
  return (data ?? []) as Overview[];
}

export async function loadSessions(): Promise<SessionInfo[]> {
  const { data, error } = await supabase.from("sessions").select(SESSION_COLS).order("created_at", { ascending: false });
  if (error) throw error;
  return data as SessionInfo[];
}

export async function loadMemberships(userId: string): Promise<Membership[]> {
  return selectMembers<Membership>((cols) => supabase.from("session_members").select(cols).eq("user_id", userId));
}

export async function createSession(name: string, system: SystemId, books: string[], level: number | null = null): Promise<SessionInfo> {
  const { data, error } = await supabase.from("sessions").insert({ name, system, books, level }).select(SESSION_COLS).single();
  if (error) throw error;
  return data as SessionInfo;
}

export async function updateSession(id: string, patch: Partial<Pick<SessionInfo, "name" | "books" | "joining_locked" | "status" | "level">>): Promise<void> {
  const { error } = await supabase.from("sessions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function sessionCode(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("session_code", { sid: id });
  if (error) throw error;
  return data as string;
}

export async function newSessionCode(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("new_session_code", { sid: id });
  if (error) throw error;
  return data as string;
}

export async function previewSession(code: string): Promise<Preview | null> {
  const { data, error } = await supabase.rpc("session_preview", { code });
  if (error) throw error;
  return ((data as Preview[])[0] as Preview | undefined) ?? null;
}

export async function joinSession(code: string, rec: StoredCharacter): Promise<string> {
  const { data, error } = await supabase.rpc("join_session", {
    code,
    char_id: rec.id,
    copy: sessionData(rec.data),
    copy_pending: rec.pending ?? [],
    copy_summary: summarize(rec.system, rec.books, rec.data),
  });
  if (error) throw error;
  return data as string;
}

/** Make my seat in a session the character's own version (true) or follow the character (false). */
export async function setSeatVersion(sessionId: string, version: boolean): Promise<void> {
  // Row rules let a player update only their own seat, so the session id is enough.
  const { error } = await supabase.from("session_members").update({ version }).eq("session_id", sessionId);
  if (error && !(error.code === "42703" && !version)) {
    throw error.code === "42703" ? new Error("Versions need a database update first (supabase/migrations/20261124_session_versions.sql).") : error;
  }
}

export async function swapCharacter(sessionId: string, rec: StoredCharacter): Promise<void> {
  const { error } = await supabase.rpc("swap_character", {
    sid: sessionId,
    char_id: rec.id,
    copy: sessionData(rec.data),
    copy_pending: rec.pending ?? [],
    copy_summary: summarize(rec.system, rec.books, rec.data),
  });
  if (error) throw error;
}

export async function loadRoster(sessionId: string): Promise<RosterRow[]> {
  const { data, error } = await supabase.rpc("session_roster", { sid: sessionId });
  if (error) throw error;
  return data as RosterRow[];
}

/** Leave (my own row) or remove a player (host). */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("session_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function saveMemberships(list: Membership[]): Promise<void> {
  for (const m of list) {
    // A version keeps its own books; a following seat's books are set by joining.
    const patch = { data: m.data, pending: m.pending, summary: m.summary, updated_at: m.updated_at, ...(m.version ? { books: m.books } : {}) };
    const { error } = await supabase.from("session_members").update(patch).eq("id", m.id);
    if (error) throw error;
  }
}

/** Why a character can't join a session, in plain words; null when it can (§4.2). */
export function joinBlocker(rec: StoredCharacter, session: { system: SystemId; books: string[] }): { reason: string; tip?: string } | null {
  const sessionSystem = getSystem(session.system);
  const sys = getSystem(rec.system);
  if (rec.system !== session.system) return { reason: `This session uses ${sessionSystem?.name ?? session.system}.` };
  const extra = rec.books.filter((b) => !session.books.includes(b));
  if (extra.length) {
    const names = extra.map((b) => sys?.books.find((x) => x.id === b)?.name ?? b);
    return {
      reason: `Uses ${names.join(" and ")}, which this session doesn't allow.`,
      tip: "Tip · You can remove a book from the character with the Books badge on its sheet.",
    };
  }
  return null;
}

// Invite links: ?join=CODE is remembered through login / sign-up / Verify.
const JOIN_KEY = "character-forge:join";
export function takeJoinFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const code = p.get("join");
  if (!code) return;
  try {
    localStorage.setItem(JOIN_KEY, normalizeCode(code));
  } catch {
    /* ignore */
  }
  p.delete("join");
  const q = p.toString();
  window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
}
export function pendingJoin(): string | null {
  try {
    return localStorage.getItem(JOIN_KEY);
  } catch {
    return null;
  }
}
export function clearPendingJoin() {
  try {
    localStorage.removeItem(JOIN_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- Host tools (§4.4) ----------

/** Every member's full row: the host may read them (read-only sheets, D3). */
export async function loadHostMembers(sessionId: string): Promise<(Membership & { user_id: string })[]> {
  return selectMembers<Membership & { user_id: string }>((cols) => supabase.from("session_members").select(`${cols}, user_id`).eq("session_id", sessionId).order("joined_at"));
}

export async function setLive(memberId: string, live: Live): Promise<void> {
  const { error } = await supabase.rpc("set_live", { mid: memberId, new_live: live });
  if (error) throw error;
}

/** One more level for one member, or everyone when memberId is omitted. */
export async function awardLevel(sessionId: string, memberId?: string): Promise<void> {
  const { error } = await supabase.rpc("award_level", { sid: sessionId, mid: memberId ?? null });
  if (error) throw error;
}

// Host notes in tabs (REQUIREMENTS §4.8; supabase/migrations/20261120_session_notes.sql). The old
// single note (`sessions.notes`) is no longer written: it stays as a backup, and the first load
// turns it into the first tab.
export interface NoteTab {
  id: string;
  session_id: string;
  title: string;
  color: string;
  body: string;
  position: number;
  created_at: string;
  updated_at: string;
}

/** The session's tabs in order; makes "Notes 1" from the old notes when there are none yet. */
export async function loadNoteTabs(sessionId: string): Promise<NoteTab[]> {
  const { data, error } = await supabase.rpc("ensure_session_notes", { sid: sessionId });
  if (error) throw error;
  return (data as NoteTab[]) ?? [];
}

export async function addNoteTab(tab: Pick<NoteTab, "id" | "session_id" | "title" | "color" | "body" | "position">): Promise<NoteTab> {
  const { data, error } = await supabase.from("session_notes").insert(tab).select().single();
  if (error) throw error;
  return data as NoteTab;
}

export async function updateNoteTab(id: string, patch: Partial<Pick<NoteTab, "title" | "color" | "body" | "position">>): Promise<string> {
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from("session_notes").update({ ...patch, updated_at }).eq("id", id);
  if (error) throw error;
  return updated_at;
}

export async function deleteNoteTab(id: string): Promise<void> {
  const { error } = await supabase.from("session_notes").delete().eq("id", id);
  if (error) throw error;
}

/** Save a new order: only the tabs whose position changed. */
export async function reorderNoteTabs(tabs: { id: string; position: number }[]): Promise<void> {
  const results = await Promise.all(tabs.map((t) => supabase.from("session_notes").update({ position: t.position }).eq("id", t.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** The player: what the host changed (live state, level awards) on my session copies. */
export async function loadMyLive(userId: string): Promise<{ id: string; live: Live; level_award: number | null }[]> {
  const { data, error } = await supabase.from("session_members").select("id, live, level_award").eq("user_id", userId);
  if (error) throw error;
  return data as { id: string; live: Live; level_award: number | null }[];
}

export async function clearLevelAward(memberId: string): Promise<void> {
  const { error } = await supabase.from("session_members").update({ level_award: null }).eq("id", memberId);
  if (error) throw error;
}
