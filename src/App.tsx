import { useEffect, useRef, useState } from "react";
import { Library } from "./components/Library";
import { NewCharacterWizard } from "./components/NewCharacterWizard";
import { Editor } from "./components/Editor";
import { Loading, Login, NewPassword } from "./components/Login";
import { AccountDialog } from "./components/AccountDialog";
import { HostDialog, JoinDialog, SessionPage, SessionsNav } from "./components/Sessions";
import { SessionsPage, SessionsStrip, sessionRows } from "./components/SessionsOverview";
import { skinOf } from "./skins";
import { loadLastOpen, loadTheme, newRecordId, saveLastOpen, saveTheme, type StoredCharacter, type Theme } from "./storage";
import { arrivedFrom, claimIfFresh, cloudConfigured, deleteCharacters, kickedOut, markFreshLogin, stillActiveLogin, loadCharacters, loadProfile, saveCharacters, supabase, type Profile, type Session } from "./cloud";
import {
  clearLevelAward,
  clearPendingJoin,
  joinSession,
  loadMyLive,
  loadMemberships,
  loadOverview,
  loadSessions,
  pendingJoin,
  saveMemberships,
  sessionError,
  sessionData,
  summarize,
  takeJoinFromUrl,
  type Membership,
  type Overview,
  type Preview,
  type SessionInfo,
} from "./sessions";
import { getSystem } from "./systems/registry";
import { Wiki } from "./components/Wiki";
import type { Place } from "./components/MainMenu";

type View =
  | { kind: "library" }
  | { kind: "new"; forSession?: { preview: Preview; code: string } }
  /** `version`: a session seat that is this character's own version (Membership.version). */
  | { kind: "edit"; id: string; version?: string }
  | { kind: "session"; id: string }
  | { kind: "sessions" }
  | { kind: "wiki" };
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
  // The sessions a character plays in, by name.
  const sessionsOf = (charId: string) => memberships.filter((m) => m.character_id === charId).map((m) => sessionName(m.session_id));
  // "Join with a copy" (user, 2026-11-22): a separate character in the library, saved before joining.
  const copyCharacter = async (rec: StoredCharacter, name: string): Promise<StoredCharacter> => {
    const now = Date.now();
    const copy: StoredCharacter = { ...rec, id: newRecordId(), created: now, updated: now, data: { ...(sessionData(rec.data) as object), name } };
    await saveCharacters([copy]);
    markChars([copy]);
    upsert(copy);
    return copy;
  };
  // A session opens the character, at its version for that session when the seat is one (2026-11-24).
  const openSheet = (characterId: string, memberId: string) => {
    const seat = memberships.find((m) => m.id === memberId);
    setView({ kind: "edit", id: characterId, ...(seat?.version ? { version: memberId } : {}) });
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

  /** The main menu: My characters · Sessions · Wiki (REQUIREMENTS 4.7). */
  const go = (p: Place) => setView(p === "characters" ? { kind: "library" } : p === "sessions" ? { kind: "sessions" } : { kind: "wiki" });
  if (view.kind === "wiki")
    return <Wiki lib={lib} theme={theme} onTheme={setTheme} go={go} userId={userId} onSave={upsert} />;

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
          go={go}
          onChanged={reloadSessions}
          onOpenSheet={openSheet}
          inSessions={sessionsOf}
          onCopy={copyCharacter}
          myLive={(() => {
            const mm = memberships.find((x) => x.session_id === s.id);
            return mm ? hostSide[mm.id]?.live : undefined;
          })()}
        />
      );
  }

  const open = view.kind === "edit" ? lib.find((r) => r.id === view.id) : undefined;
  if (open) {
    // Seats that follow the character get its changes; a version seat has its own sheet
    // (per-session versions, user 2026-11-24). The page shows "My character" or one version.
    const mine = memberships.filter((m) => m.character_id === open.id);
    const following = mine.filter((m) => !m.version);
    const versions = mine.filter((m) => m.version);
    const seat = view.kind === "edit" && view.version ? versions.find((m) => m.id === view.version) : undefined;
    const awardOf = (m: Membership) => (hostSide[m.id] ? hostSide[m.id].level_award : m.level_award);
    const awards = (seat ? [seat] : following).map((m) => ({ m, award: awardOf(m) })).filter((x) => x.award);
    type VersionPlay = Record<string, { play?: unknown; spent?: unknown }>;
    const openData = open.data as { level?: number; versionPlay?: VersionPlay };
    // The version's sheet: the seat's data plus the player's own trackers for it (kept privately
    // on the character, never sent to the session).
    const shown: StoredCharacter = seat
      ? { ...open, books: seat.books, pending: seat.pending, data: { ...(seat.data as object), ...(openData.versionPlay?.[seat.id] ?? {}) } }
      : open;
    const nowLevel = (shown.data as { level?: number }).level ?? 1;
    const pending = awards.find((x) => x.award !== nowLevel);
    const levelReady = pending ? { level: pending.award!, session: sessionName(pending.m.session_id) } : null;
    const dropAward = (memberId: string) => {
      clearLevelAward(memberId).catch(() => {});
      const mm = mine.find((x) => x.id === memberId);
      setHostSide((h) => ({ ...h, [memberId]: { live: h[memberId]?.live ?? mm?.live ?? {}, level_award: null } }));
    };
    // Reached the suggested level (or went past it in that direction): that to-do is done.
    const settleAwards = (lvl: number) => {
      for (const { m, award } of awards)
        if (award && (lvl === award || (award > nowLevel && lvl > award) || (award < nowLevel && lvl < award))) dropAward(m.id);
    };
    const pickVersion = (id: string | null) => setView({ kind: "edit", id: open.id, ...(id ? { version: id } : {}) });
    return (
      <Editor
        key={`${open.id}:${seat?.id ?? "main"}`}
        rec={shown}
        theme={theme}
        save={save}
        onTheme={setTheme}
        levelReady={levelReady}
        onKeepLevel={pending ? () => dropAward(pending.m.id) : undefined}
        versions={
          versions.length
            ? {
                current: seat?.id ?? null,
                options: versions.map((m) => ({ id: m.id, session: sessionName(m.session_id), level: (m.data as { level?: number }).level ?? 1 })),
                mainLevel: openData.level ?? 1,
                base: seat ? { data: open.data, books: open.books } : undefined,
                onPick: pickVersion,
                onOpenSession: seat ? () => setView({ kind: "session", id: seat.session_id }) : undefined,
              }
            : undefined
        }
        onUpdate={(patch) => {
          if (seat) {
            // A version: the sheet goes to the seat, the trackers stay on the character.
            const stamp = new Date().toISOString();
            const nextData = patch.data ? (patch.data as Record<string, unknown>) : undefined;
            if (nextData) {
              settleAwards((nextData.level as number) ?? 0);
              const vp: VersionPlay = { ...(openData.versionPlay ?? {}), [seat.id]: { play: nextData.play, spent: nextData.spent } };
              upsert({ ...open, data: { ...(open.data as object), versionPlay: vp }, updated: Date.now() });
            }
            setMemberships((list) =>
              list!.map((x) => {
                if (x.id !== seat.id) return x;
                const data = nextData ? sessionData(nextData) : x.data;
                const books = patch.books ?? x.books;
                return { ...x, data, books, pending: patch.pending ?? x.pending, summary: summarize(open.system, books, data), updated_at: stamp };
              }),
            );
            return;
          }
          const next = { ...open, ...patch, updated: Date.now() };
          upsert(next);
          if (!following.length || (!patch.data && !patch.pending)) return;
          const data = sessionData(next.data);
          const pending = next.pending ?? [];
          settleAwards((data as { level?: number }).level ?? 0);
          setMemberships((list) =>
            list!.map((x) => (x.character_id === open.id && !x.version ? { ...x, data, pending, summary: summarize(open.system, x.books, data), updated_at: new Date().toISOString() } : x)),
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
          go={go}
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
          go={go}
          sessionCount={sessions.length}
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
          inSessions={sessionsOf}
          onCopy={copyCharacter}
        />
      )}
    </>
  );
}
