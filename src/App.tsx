import { useEffect, useRef, useState } from "react";
import { Library } from "./components/Library";
import { NewCharacterWizard } from "./components/NewCharacterWizard";
import { Editor } from "./components/Editor";
import { Loading, Login, NewPassword } from "./components/Login";
import { AccountDialog } from "./components/AccountDialog";
import { HostDialog, JoinDialog, SessionPage, SessionsNav } from "./components/Sessions";
import { SessionsPage, SessionsStrip, sessionRows } from "./components/SessionsOverview";
import { skinOf } from "./skins";
import { loadLastOpen, loadTheme, saveLastOpen, saveTheme, type StoredCharacter, type Theme } from "./storage";
import { arrivedFrom, claimIfFresh, cloudConfigured, deleteCharacters, kickedOut, markFreshLogin, stillActiveLogin, loadCharacters, loadProfile, saveCharacters, supabase, type Profile, type Session } from "./cloud";
import {
  clearLevelAward,
  clearPendingJoin,
  joinSession,
  loadMyLive,
  loadMemberships,
  loadOverview,
  loadSessions,
  loadVersion,
  pendingJoin,
  saveMemberships,
  saveVersion,
  sessionError,
  summarize,
  takeJoinFromUrl,
  type Membership,
  type Overview,
  type Preview,
  type SessionInfo,
} from "./sessions";
import { getSystem } from "./systems/registry";

type View =
  | { kind: "library" }
  | { kind: "new"; forSession?: { preview: Preview; code: string } }
  | { kind: "edit"; id: string }
  | { kind: "session"; id: string }
  | { kind: "sessions" };
export type SaveState = "saved" | "saving" | "error";

/** Login gate: the login page, or the logged-in account's app. */
export default function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [recovery, setRecovery] = useState(() => arrivedFrom() === "recovery");
  // A Verify or Reset link is a fresh login too.
  useState(() => arrivedFrom() && markFreshLogin());
  useState(() => takeJoinFromUrl());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.layout = skinOf(theme).layout;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!cloudConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!cloudConfigured) return <Loading text="This copy of the app isn't connected to its server (the Supabase settings are missing)." />;
  if (session === undefined) return <Loading text="Loading…" />;
  if (!session) return <Login />;
  if (recovery) return <NewPassword onDone={() => setRecovery(false)} />;
  return <Account key={session.user.id} session={session} userId={session.user.id} email={session.user.email ?? ""} theme={theme} setTheme={setTheme} />;
}

/** Saves records shortly after they change; retries every 8 s if saving fails. */
function useAutosave<T>(list: T[] | null, keyOf: (x: T) => string, save: (changed: T[], removed: string[]) => Promise<void>) {
  const synced = useRef(new Map<string, T>());
  const [state, setState] = useState<SaveState>("saved");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!list) return;
    const changed = list.filter((x) => synced.current.get(keyOf(x)) !== x);
    const removed = [...synced.current.keys()].filter((k) => !list.some((x) => keyOf(x) === k));
    if (!changed.length && !removed.length) return;
    setState("saving");
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(async () => {
      try {
        await save(changed, removed);
        changed.forEach((x) => synced.current.set(keyOf(x), x));
        removed.forEach((k) => synced.current.delete(k));
        setState("saved");
      } catch (e) {
        console.error(e);
        setState("error");
        retryTimer = setTimeout(() => setRetry((n) => n + 1), 8000);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, retry]);
  /** Mark records as already saved (just loaded, or saved some other way). */
  const markSaved = (items: T[], reset = false) => {
    if (reset) synced.current = new Map();
    items.forEach((x) => synced.current.set(keyOf(x), x));
  };
  return [state, markSaved] as const;
}

function Account({ session, userId, email, theme, setTheme }: { session: Session; userId: string; email: string; theme: Theme; setTheme: (t: Theme) => void }) {
  const [lib, setLib] = useState<StoredCharacter[] | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [overview, setOverview] = useState<Overview[]>([]);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View>({ kind: "library" });
  const [welcome, setWelcome] = useState(() => arrivedFrom() === "signup");
  const [dialog, setDialog] = useState<{ kind: "settings" } | { kind: "host" } | { kind: "join"; code: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [versions, setVersions] = useState<Record<string, string>>({});
  // What the DM changed on my session copies (HP, conditions, level awards), polled.
  const [hostSide, setHostSide] = useState<Record<string, { live: Membership["live"]; level_award: number | null }>>({});

  const [saveChars, markChars] = useAutosave(lib, (r) => r.id, async (changed, removed) => {
    await saveCharacters(changed);
    await deleteCharacters(removed);
  });
  const [saveMembers, markMembers] = useAutosave(memberships, (m) => m.id, async (changed) => {
    await saveMemberships(changed);
  });
  const save: SaveState = saveChars === "error" || saveMembers === "error" ? "error" : saveChars === "saving" || saveMembers === "saving" ? "saving" : "saved";

  const reloadSessions = async () => {
    const [s, m] = await Promise.all([loadSessions(), loadMemberships(userId)]);
    markMembers(m, true);
    setSessions(s);
    setMemberships(m);
  };

  // One active login per account: claim it after a fresh login, then keep checking.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const check = async () => {
      if (live && !(await stillActiveLogin(userId, sessionRef.current))) await kickedOut();
    };
    const onVisible = () => document.visibilityState === "visible" && check();
    claimIfFresh(userId, session).then(() => {
      if (!live) return;
      timer = setInterval(check, 60_000);
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", onVisible);
    });
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load the account's characters and sessions (and reopen the last character on this device).
  useEffect(() => {
    let live = true;
    setLoadError("");
    Promise.all([loadProfile(userId), loadCharacters(), loadSessions(), loadMemberships(userId)])
      .then(([p, list, s, m]) => {
        if (!live) return;
        markChars(list, true);
        markMembers(m, true);
        setProfile(p);
        setLib(list);
        setSessions(s);
        setMemberships(m);
        const code = pendingJoin();
        if (code) setDialog({ kind: "join", code });
        else {
          const last = loadLastOpen();
          if (last === "new") setView({ kind: "new" });
          else if (last?.startsWith("s:") && s.some((x) => x.id === last.slice(2))) setView({ kind: "session", id: last.slice(2) });
          else if (last && list.some((r) => r.id === last)) setView({ kind: "edit", id: last });
        }
      })
      .catch((e) => live && setLoadError(sessionError(e)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    let live = true;
    const load = () =>
      loadMyLive(userId)
        .then((rows) => live && setHostSide(Object.fromEntries(rows.map((r) => [r.id, { live: r.live, level_award: r.level_award }]))))
        .catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    window.addEventListener("focus", load);
    return () => {
      live = false;
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [userId]);

  // Players, encounters and last activity per session (main page cards + Sessions page).
  useEffect(() => {
    let live = true;
    const load = () =>
      loadOverview()
        .then((o) => live && setOverview(o))
        .catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => {
      live = false;
      window.removeEventListener("focus", load);
    };
  }, [sessions, view.kind]);

  // Warn before closing the page while a change isn't saved yet.
  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  useEffect(() => {
    if (lib) saveLastOpen(view.kind === "edit" ? view.id : view.kind === "session" ? `s:${view.id}` : view.kind === "new" && !view.forSession ? "new" : null);
  }, [view, lib]);

  if (loadError)
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Couldn't load your characters</h1>
          <p className="auth-tagline">Check your internet connection and try again.</p>
          <p className="auth-note">{loadError}</p>
          <button type="button" className="btn primary auth-submit" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  if (!lib || !memberships) return <Loading />;

  const upsert = (rec: StoredCharacter) => setLib((l) => (l!.some((r) => r.id === rec.id) ? l!.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...l!]));
  const logout = async () => {
    if (save !== "saved" && !confirm("Some changes aren't saved yet. Log out anyway?")) return;
    saveLastOpen(null);
    await supabase.auth.signOut();
  };
  const account = { name: profile?.display_name || email, email, onLogout: logout, onSettings: profile ? () => setDialog({ kind: "settings" }) : undefined };
  const sessionName = (id: string) => sessions.find((s) => s.id === id)?.name ?? "A session";
  const closeJoin = () => {
    clearPendingJoin();
    setDialog(null);
  };
  const rows = sessionRows(sessions, memberships, lib, overview, userId);
  const openSession = (id: string) => {
    setDialog(null);
    setView({ kind: "session", id });
  };
  const openSheet = (characterId: string, memberId: string) => {
    saveVersion(characterId, memberId);
    setVersions((v) => ({ ...v, [characterId]: memberId }));
    setView({ kind: "edit", id: characterId });
  };

  if (view.kind === "new") {
    const forSession = view.forSession;
    return (
      <NewCharacterWizard
        userId={userId}
        theme={theme}
        onTheme={setTheme}
        preset={forSession && { systemId: forSession.preview.system, books: forSession.preview.books, label: forSession.preview.name }}
        onCancel={() => setView({ kind: "library" })}
        onCreate={async (rec) => {
          upsert(rec);
          if (!forSession) return setView({ kind: "edit", id: rec.id });
          // Save it first: joining checks the saved character.
          try {
            await saveCharacters([rec]);
            markChars([rec]);
            await joinSession(forSession.code, rec);
            clearPendingJoin();
            await reloadSessions();
            setNotice(`${(rec.data as { name?: string }).name || "Your character"} joined ${forSession.preview.name}.`);
            setView({ kind: "session", id: forSession.preview.id });
          } catch (e) {
            setNotice(`Your character is saved, but couldn't join: ${sessionError(e)}`);
            setView({ kind: "edit", id: rec.id });
          }
        }}
      />
    );
  }

  if (view.kind === "session") {
    const s = sessions.find((x) => x.id === view.id);
    if (s)
      return (
        <SessionPage
          key={s.id}
          session={s}
          userId={userId}
          membership={memberships.find((m) => m.session_id === s.id)}
          lib={lib}
          theme={theme}
          onTheme={setTheme}
          onBack={() => setView({ kind: "library" })}
          onChanged={reloadSessions}
          onOpenSheet={openSheet}
        />
      );
  }

  const open = view.kind === "edit" ? lib.find((r) => r.id === view.id) : undefined;
  if (open) {
    const mine = memberships.filter((m) => m.character_id === open.id);
    const picked = versions[open.id] ?? loadVersion(open.id);
    const m = mine.find((x) => x.id === picked);
    const versionList = mine.length
      ? [
          { id: "", label: "My character" },
          ...mine.map((x) => {
            const lvl = (x.data as { level?: number }).level;
            return { id: x.id, label: `${sessionName(x.session_id)}${lvl ? ` · level ${lvl}` : ""}` };
          }),
        ]
      : [];
    const pickVersion = (id: string) => {
      saveVersion(open.id, id);
      setVersions((v) => ({ ...v, [open.id]: id }));
    };
    const rec: StoredCharacter = m ? { ...open, books: m.books, data: m.data, pending: m.pending.length ? m.pending : undefined, updated: Date.parse(m.updated_at) } : open;
    return (
      <Editor
        key={`${open.id}:${m?.id ?? ""}`}
        rec={rec}
        theme={theme}
        save={save}
        onTheme={setTheme}
        versions={versionList}
        version={m?.id ?? ""}
        onVersion={pickVersion}
        sessionCopy={m ? sessionName(m.session_id) : undefined}
        live={m ? (hostSide[m.id]?.live ?? m.live) : undefined}
        levelReady={m ? (hostSide[m.id] ? hostSide[m.id].level_award : m.level_award) : undefined}
        onOpenSession={m ? () => setView({ kind: "session", id: m.session_id }) : undefined}
        onUpdate={(patch) => {
          if (!m) return upsert({ ...open, ...patch, updated: Date.now() });
          const data = patch.data ?? m.data;
          const pending = patch.pending ?? m.pending;
          // Leveled up to what the DM awarded: the to-do is done.
          const award = hostSide[m.id]?.level_award ?? m.level_award;
          const lvl = (data as { level?: number }).level ?? 0;
          if (award && lvl >= award) {
            clearLevelAward(m.id).catch(() => {});
            setHostSide((h) => ({ ...h, [m.id]: { live: h[m.id]?.live ?? m.live, level_award: null } }));
          }
          setMemberships((list) =>
            list!.map((x) => (x.id === m.id ? { ...x, data, pending, summary: summarize(open.system, m.books, data), updated_at: new Date().toISOString() } : x)),
          );
        }}
        onBack={() => setView({ kind: "library" })}
      />
    );
  }

  const inSessions = (charId: string) => memberships.filter((m) => m.character_id === charId).map((m) => sessionName(m.session_id));
  return (
    <>
      {view.kind === "sessions" ? (
        <SessionsPage
          rows={rows}
          theme={theme}
          onTheme={setTheme}
          onBack={() => setView({ kind: "library" })}
          onOpen={openSession}
          onHost={() => setDialog({ kind: "host" })}
          onJoin={() => setDialog({ kind: "join", code: "" })}
        />
      ) : (
        <Library
          lib={lib}
          theme={theme}
          account={account}
          welcome={welcome}
          notice={notice}
          onDismissNotice={() => setNotice("")}
          inSessions={inSessions}
          sessionsNav={<SessionsNav count={sessions.length} onAll={() => setView({ kind: "sessions" })} onHost={() => setDialog({ kind: "host" })} onJoin={() => setDialog({ kind: "join", code: "" })} />}
          sessionsStrip={
            <SessionsStrip
              rows={rows}
              onOpen={openSession}
              onAll={() => setView({ kind: "sessions" })}
              onHost={() => setDialog({ kind: "host" })}
              onJoin={() => setDialog({ kind: "join", code: "" })}
            />
          }
          onDismissWelcome={() => setWelcome(false)}
          onTheme={setTheme}
          onOpen={(id) => setView({ kind: "edit", id })}
          onNew={() => setView({ kind: "new" })}
          onImport={(rec) => upsert(rec)}
          onDelete={(id) => {
            setLib((l) => l!.filter((r) => r.id !== id));
            setMemberships((list) => list!.filter((m) => m.character_id !== id));
          }}
          onDuplicate={(rec) => upsert(rec)}
        />
      )}
      {dialog?.kind === "settings" && profile && <AccountDialog profile={profile} email={email} onSaved={setProfile} onClose={() => setDialog(null)} />}
      {dialog?.kind === "host" && <HostDialog onClose={() => setDialog(null)} onCreated={reloadSessions} onOpen={openSession} />}
      {dialog?.kind === "join" && (
        <JoinDialog
          lib={lib}
          initialCode={dialog.code}
          onClose={closeJoin}
          onJoined={async (id) => {
            clearPendingJoin();
            await reloadSessions();
            openSession(id);
          }}
          onCreateFor={(preview, code) => {
            setDialog(null);
            if (!getSystem(preview.system)) return;
            setView({ kind: "new", forSession: { preview, code } });
          }}
        />
      )}
    </>
  );
}
