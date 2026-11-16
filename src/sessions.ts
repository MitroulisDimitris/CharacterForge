// Sessions online (REQUIREMENTS §4): host, join with an invite code, session copies of characters
// (D2), the roster (summary only, D4). Tables + security rules: supabase/migrations/20261116_sessions.sql.
import { supabase } from "./cloud";
import type { StoredCharacter } from "./storage";
import { getSystem } from "./systems/registry";
import type { SystemId } from "./systems/types";
import type { Live } from "./live";

export interface SessionInfo {
  id: string;
  host_id: string;
  name: string;
  system: SystemId;
  books: string[];
  joining_locked: boolean;
  status: "active" | "ended";
  created_at: string;
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
}

/** What other players see of a character (D4). */
export interface Summary {
  name?: string;
  identity?: string;
  level?: number;
  system?: string;
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
}

export interface RosterRow {
  member_id: string;
  user_id: string;
  display_name: string;
  summary: Summary;
  joined_at: string;
}

const SESSION_COLS = "id, host_id, name, system, books, joining_locked, status, created_at";
const MEMBER_COLS = "id, session_id, character_id, books, data, pending, summary, joined_at, updated_at, live, level_award";

/** "k7p2qx", "K7P 2QX" → "K7P-2QX". */
export function normalizeCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length > 3 ? `${s.slice(0, 3)}-${s.slice(3, 6)}` : s;
}
export const codeComplete = (code: string) => /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code);
export const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}?join=${code}`;

/** The summary saved with a session copy, from the character's data. */
export function summarize(system: SystemId, books: string[], data: unknown): Summary {
  const sys = getSystem(system);
  if (!sys) return {};
  try {
    const c = sys.normalize(data);
    return { name: c.name || "Unnamed", identity: sys.derive(c, books).identity, level: c.level, system };
  } catch {
    return {};
  }
}

/** Plain-words message from a database error. */
export const sessionError = (e: unknown) => {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  return /fetch|network/i.test(m) ? "Can't reach the server. Check your internet connection and try again." : m;
};

export async function loadSessions(): Promise<SessionInfo[]> {
  const { data, error } = await supabase.from("sessions").select(SESSION_COLS).order("created_at", { ascending: false });
  if (error) throw error;
  return data as SessionInfo[];
}

export async function loadMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase.from("session_members").select(MEMBER_COLS).eq("user_id", userId);
  if (error) throw error;
  return data as Membership[];
}

export async function createSession(name: string, system: SystemId, books: string[]): Promise<SessionInfo> {
  const { data, error } = await supabase.from("sessions").insert({ name, system, books }).select(SESSION_COLS).single();
  if (error) throw error;
  return data as SessionInfo;
}

export async function updateSession(id: string, patch: Partial<Pick<SessionInfo, "name" | "books" | "joining_locked" | "status">>): Promise<void> {
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

export async function joinSession(code: string, rec: StoredCharacter): Promise<void> {
  const { error } = await supabase.rpc("join_session", {
    code,
    char_id: rec.id,
    copy: rec.data,
    copy_pending: rec.pending ?? [],
    copy_summary: summarize(rec.system, rec.books, rec.data),
  });
  if (error) throw error;
}

export async function swapCharacter(sessionId: string, rec: StoredCharacter): Promise<void> {
  const { error } = await supabase.rpc("swap_character", {
    sid: sessionId,
    char_id: rec.id,
    copy: rec.data,
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
    const { error } = await supabase
      .from("session_members")
      .update({ data: m.data, pending: m.pending, summary: m.summary, updated_at: m.updated_at })
      .eq("id", m.id);
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

// The sheet version picked last on this device ("" = My character), per character.
const versionKey = (charId: string) => `character-forge:version:${charId}`;
export function loadVersion(charId: string): string {
  try {
    return localStorage.getItem(versionKey(charId)) ?? "";
  } catch {
    return "";
  }
}
export function saveVersion(charId: string, memberId: string) {
  try {
    localStorage.setItem(versionKey(charId), memberId);
  } catch {
    /* ignore */
  }
}

// ---------- Host tools (§4.4) ----------

/** Every member's full row: the host may read them (read-only sheets, D3). */
export async function loadHostMembers(sessionId: string): Promise<(Membership & { user_id: string })[]> {
  const { data, error } = await supabase.from("session_members").select(`${MEMBER_COLS}, user_id`).eq("session_id", sessionId).order("joined_at");
  if (error) throw error;
  return data as (Membership & { user_id: string })[];
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

export async function loadNotes(sessionId: string): Promise<string> {
  const { data, error } = await supabase.rpc("session_notes", { sid: sessionId });
  if (error) throw error;
  return (data as string | null) ?? "";
}

export async function saveNotes(sessionId: string, notes: string): Promise<void> {
  const { error } = await supabase.from("sessions").update({ notes }).eq("id", sessionId);
  if (error) throw error;
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
