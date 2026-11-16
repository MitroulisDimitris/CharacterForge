// Online storage: login (Supabase Auth) and the account's characters (table `characters`,
// row-level security: each account sees only its own rows). See REQUIREMENTS.md §3 and §9.
import { createClient, type Session } from "@supabase/supabase-js";
import type { StoredCharacter } from "./storage";
import { isSystemId } from "./systems/registry";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the app was built without the Supabase settings (.env.local / Netlify variables). */
export const cloudConfigured = Boolean(url && key);

// What an email link brought us (read before the client consumes and clears the address).
const linkParams = (() => {
  if (typeof window === "undefined") return new URLSearchParams();
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  new URLSearchParams(window.location.search).forEach((v, k) => p.set(k, v));
  return p;
})();
const linkErrorCode = linkParams.get("error_code") || linkParams.get("error");
if (linkErrorCode && typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);

/** True when the page was opened from an expired or already-used email link. */
export const linkProblem = () => Boolean(linkErrorCode);
/** "signup" right after Verify, "recovery" after Reset password, else null. */
export const arrivedFrom = (): "signup" | "recovery" | null => {
  const t = linkParams.get("type");
  return t === "signup" || t === "recovery" ? t : null;
};

export const MIN_PASSWORD = 8;

export const supabase = createClient(url ?? "http://localhost", key ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "character-forge:auth" },
});

export type { Session };

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
}

interface Row {
  id: string;
  system: string;
  books: string[];
  data: unknown;
  pending: string[];
  created_at: string;
  updated_at: string;
}

const toRecord = (r: Row): StoredCharacter | null =>
  isSystemId(r.system) && r.data && typeof r.data === "object"
    ? {
        id: r.id,
        system: r.system,
        books: r.books,
        data: r.data,
        pending: r.pending.length ? r.pending : undefined,
        created: Date.parse(r.created_at),
        updated: Date.parse(r.updated_at),
      }
    : null;

const toRow = (c: StoredCharacter) => ({
  id: c.id,
  system: c.system,
  books: c.books,
  data: c.data,
  pending: c.pending ?? [],
  created_at: new Date(c.created).toISOString(),
  updated_at: new Date(c.updated).toISOString(),
});

/** Plain-words message for a failed account action. */
export function authError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Check them and try again.";
  if (/email not confirmed/i.test(message)) return "This email isn't verified yet. Open the link we emailed you first.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with this email. Log in instead, or reset the password.";
  if (/rate limit|too many|security purposes/i.test(message)) return "Too many tries in a short time. Wait a minute and try again.";
  if (/should be different/i.test(message)) return "That's your current password. Choose a different one.";
  if (/password/i.test(message) && /(weak|short|at least|characters)/i.test(message)) return `That password is too weak. Use at least ${MIN_PASSWORD} characters.`;
  if (/invalid.*email|email.*invalid/i.test(message)) return "That doesn't look like an email address.";
  if (/fetch|network/i.test(message)) return "Can't reach the server. Check your internet connection and try again.";
  return message;
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("id, display_name, is_admin").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function loadCharacters(): Promise<StoredCharacter[]> {
  const { data, error } = await supabase.from("characters").select("id, system, books, data, pending, created_at, updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toRecord).filter((r): r is StoredCharacter => r !== null);
}

export async function saveCharacters(list: StoredCharacter[]): Promise<void> {
  if (!list.length) return;
  const { error } = await supabase.from("characters").upsert(list.map(toRow));
  if (error) throw error;
}

export async function deleteCharacters(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from("characters").delete().in("id", ids);
  if (error) throw error;
}

export async function saveDisplayName(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", id);
  if (error) throw error;
}

// ---------- One active login per account ----------
// A fresh login (password, Verify link, Reset link) "claims" the account: other devices are signed
// out on the server, and the app on those devices notices the claim and logs out (checked on
// focus and every minute).

const CLAIM_KEY = "character-forge:claim";
const KICKED_KEY = "character-forge:kicked";

/** The login session id inside the access token. */
export function loginSessionId(session: Session | null): string | null {
  try {
    const part = session?.access_token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.session_id === "string" ? json.session_id : null;
  } catch {
    return null;
  }
}

/** Call right before a fresh login: the app claims the account once it's in. */
export function markFreshLogin() {
  try {
    sessionStorage.setItem(CLAIM_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** If this is a fresh login: sign out every other device and make this one the active login. */
export async function claimIfFresh(userId: string, session: Session): Promise<void> {
  let fresh = false;
  try {
    fresh = sessionStorage.getItem(CLAIM_KEY) === "1";
  } catch {
    /* ignore */
  }
  if (!fresh) return;
  const sid = loginSessionId(session);
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});
  if (sid) await supabase.from("profiles").update({ active_session: sid }).eq("id", userId);
  try {
    sessionStorage.removeItem(CLAIM_KEY);
  } catch {
    /* ignore */
  }
}

/** False when another device has logged in to this account since. */
export async function stillActiveLogin(userId: string, session: Session): Promise<boolean> {
  const sid = loginSessionId(session);
  const { data, error } = await supabase.from("profiles").select("active_session").eq("id", userId).maybeSingle();
  if (error || !data || !sid) return true; // offline or unknown: don't kick
  return !data.active_session || data.active_session === sid;
}

/** Log this device out because the account logged in somewhere else. */
export async function kickedOut() {
  try {
    sessionStorage.setItem(KICKED_KEY, "1");
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut({ scope: "local" });
}

/** Read (once) whether this device was just logged out by a newer login. */
export function takeKicked(): boolean {
  try {
    const k = sessionStorage.getItem(KICKED_KEY) === "1";
    sessionStorage.removeItem(KICKED_KEY);
    return k;
  } catch {
    return false;
  }
}
