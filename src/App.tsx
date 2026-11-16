import { useEffect, useRef, useState } from "react";
import { Library } from "./components/Library";
import { NewCharacterWizard } from "./components/NewCharacterWizard";
import { Editor } from "./components/Editor";
import { Loading, Login, NewPassword } from "./components/Login";
import { AccountDialog } from "./components/AccountDialog";
import { skinOf } from "./skins";
import { loadLastOpen, loadTheme, saveLastOpen, saveTheme, type StoredCharacter, type Theme } from "./storage";
import { arrivedFrom, cloudConfigured, deleteCharacters, loadCharacters, loadProfile, saveCharacters, supabase, type Profile, type Session } from "./cloud";

type View = { kind: "library" } | { kind: "new" } | { kind: "edit"; id: string };
export type SaveState = "saved" | "saving" | "error";

/** Login gate: the login page, or the logged-in account's app. */
export default function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [recovery, setRecovery] = useState(() => arrivedFrom() === "recovery");

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
  return <Account key={session.user.id} email={session.user.email ?? ""} theme={theme} setTheme={setTheme} />;
}

function Account({ email, theme, setTheme }: { email: string; theme: Theme; setTheme: (t: Theme) => void }) {
  const [lib, setLib] = useState<StoredCharacter[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [save, setSave] = useState<SaveState>("saved");
  const [retry, setRetry] = useState(0);
  const synced = useRef(new Map<string, StoredCharacter>());
  const [view, setView] = useState<View>({ kind: "library" });
  const [welcome, setWelcome] = useState(() => arrivedFrom() === "signup");
  const [settings, setSettings] = useState(false);

  // Load the account's characters (and reopen the last one on this device).
  useEffect(() => {
    let live = true;
    setLoadError("");
    Promise.all([loadProfile(), loadCharacters()])
      .then(([p, list]) => {
        if (!live) return;
        synced.current = new Map(list.map((r) => [r.id, r]));
        setProfile(p);
        setLib(list);
        const last = loadLastOpen();
        if (last && list.some((r) => r.id === last)) setView({ kind: "edit", id: last });
      })
      .catch((e) => live && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [attempt]);

  // Save changes to the account shortly after they happen; retry if it fails.
  useEffect(() => {
    if (!lib) return;
    const changed = lib.filter((r) => synced.current.get(r.id) !== r);
    const removed = [...synced.current.keys()].filter((id) => !lib.some((r) => r.id === id));
    if (!changed.length && !removed.length) return;
    setSave("saving");
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(async () => {
      try {
        await saveCharacters(changed);
        await deleteCharacters(removed);
        changed.forEach((r) => synced.current.set(r.id, r));
        removed.forEach((id) => synced.current.delete(id));
        setSave("saved");
      } catch (e) {
        console.error(e);
        setSave("error");
        retryTimer = setTimeout(() => setRetry((n) => n + 1), 8000);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      clearTimeout(retryTimer);
    };
  }, [lib, retry]);

  // Warn before closing the page while a change isn't saved yet.
  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  useEffect(() => {
    if (lib) saveLastOpen(view.kind === "edit" ? view.id : null);
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
  if (!lib) return <Loading />;

  const upsert = (rec: StoredCharacter) => setLib((l) => (l!.some((r) => r.id === rec.id) ? l!.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...l!]));
  const logout = async () => {
    if (save !== "saved" && !confirm("Some changes aren't saved yet. Log out anyway?")) return;
    saveLastOpen(null);
    await supabase.auth.signOut();
  };
  const account = { name: profile?.display_name || email, email, onLogout: logout, onSettings: profile ? () => setSettings(true) : undefined };

  if (view.kind === "new")
    return (
      <NewCharacterWizard
        theme={theme}
        onTheme={setTheme}
        onCancel={() => setView({ kind: "library" })}
        onCreate={(rec) => {
          upsert(rec);
          setView({ kind: "edit", id: rec.id });
        }}
      />
    );

  const open = view.kind === "edit" ? lib.find((r) => r.id === view.id) : undefined;
  if (open)
    return (
      <Editor
        key={open.id}
        rec={open}
        theme={theme}
        save={save}
        onTheme={setTheme}
        onUpdate={(patch) => upsert({ ...open, ...patch, updated: Date.now() })}
        onBack={() => setView({ kind: "library" })}
      />
    );

  return (
    <>
      <Library
        lib={lib}
        theme={theme}
        account={account}
        welcome={welcome}
        onDismissWelcome={() => setWelcome(false)}
        onTheme={setTheme}
        onOpen={(id) => setView({ kind: "edit", id })}
        onNew={() => setView({ kind: "new" })}
        onImport={(rec) => upsert(rec)}
        onDelete={(id) => setLib((l) => l!.filter((r) => r.id !== id))}
        onDuplicate={(rec) => upsert(rec)}
      />
      {settings && profile && <AccountDialog profile={profile} email={email} onSaved={setProfile} onClose={() => setSettings(false)} />}
    </>
  );
}
