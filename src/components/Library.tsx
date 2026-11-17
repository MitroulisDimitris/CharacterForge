import { useRef, useState, type ReactNode } from "react";
import { getSystem, isAvailable, SYSTEMS } from "../systems/registry";
import { bookAbbr, type AnySystem, type BaseCharacter, type DerivedBase, type Warning } from "../systems/types";
import { buildTodos } from "../todo";
import { openUnlocks } from "./LevelChange";
import { exportJson, importFile, newRecordId, type StoredCharacter, type Theme } from "../storage";
import { skinOf } from "../skins";
import { Brand, SkinPicker } from "./Brand";
import { Crest, MoreMenu, SideToggle } from "./Hero";

interface Row {
  rec: StoredCharacter;
  system: AnySystem;
  c: BaseCharacter;
  identity: string;
  problems: number;
}

const ago = (t: number) => {
  const days = Math.floor((Date.now() - t) / 86400000);
  return days <= 0 ? "Edited today" : days === 1 ? "Edited yesterday" : days < 7 ? `Edited ${days} days ago` : `Edited ${new Date(t).toLocaleDateString()}`;
};

export function Library({
  lib,
  theme,
  account,
  welcome = false,
  onDismissWelcome,
  notice = "",
  onDismissNotice,
  inSessions = () => [],
  sessionsNav,
  sessionsStrip,
  onTheme,
  onOpen,
  onNew,
  onImport,
  onDelete,
  onDuplicate,
}: {
  lib: StoredCharacter[];
  theme: Theme;
  account: Account;
  welcome?: boolean;
  onDismissWelcome?: () => void;
  notice?: string;
  onDismissNotice?: () => void;
  /** Names of the sessions a character plays in. */
  inSessions?: (id: string) => string[];
  sessionsNav?: ReactNode;
  /** "Your sessions" cards at the top of the main area. */
  sessionsStrip?: ReactNode;
  onTheme: (t: Theme) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (rec: StoredCharacter) => void;
  onDelete: (id: string) => void;
  onDuplicate: (rec: StoredCharacter) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("all");
  const [sideOpen, setSideOpen] = useState(false);
  const sorted = [...lib].sort((a, b) => b.updated - a.updated);

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const rec = await importFile(f);
      // Only D&D 5e (2014) is open for now (REQUIREMENTS §1).
      if (!isAvailable(rec.system)) throw new Error(`This character uses ${getSystem(rec.system)?.name ?? rec.system}, which is coming soon.`);
      onImport(rec);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };
  const duplicate = (rec: StoredCharacter, c: BaseCharacter) =>
    onDuplicate({ ...rec, id: newRecordId(), created: Date.now(), updated: Date.now(), data: { ...(rec.data as object), name: `${c.name} (copy)` } });
  const remove = (rec: StoredCharacter, c: BaseCharacter) => {
    const s = inSessions(rec.id);
    const also = s.length ? ` It also leaves ${s.length === 1 ? `the session "${s[0]}"` : `${s.length} sessions`}.` : "";
    if (confirm(`Delete ${c.name || "this character"}?${also} Export it first if you want a backup.`)) onDelete(rec.id);
  };

  const rows: Row[] = [];
  for (const rec of sorted) {
    const system = getSystem(rec.system);
    if (!system) continue;
    const c = system.normalize(rec.data) as BaseCharacter;
    let identity = "";
    let problems = 0;
    try {
      const d: DerivedBase = system.derive(c, rec.books);
      identity = d.identity;
      // Same count as the character's To do list (rule problems + postponed level-up choices).
      problems = buildTodos(d.warnings as Warning[], openUnlocks(system, c, rec.books, rec.pending ?? [])).todos.length;
    } catch {
      identity = "Couldn't read this character";
    }
    rows.push({ rec, system, c, identity, problems });
  }
  const importInput = <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => (doImport(e.target.files?.[0]), (e.target.value = ""))} />;
  const empty = (
    <div className="empty card">
      <h3>No characters yet</h3>
      <p className="muted">Create one to choose the game rules and allowed books, then build your character step by step.</p>
      <button type="button" className="btn primary" onClick={onNew}>
        + New character
      </button>
    </div>
  );

  const welcomeNote = welcome && (
    <div className="welcome-note" role="status">
      <span>
        <strong>Your account is ready.</strong> Your characters are saved online, so they're on every device you log in from.
      </span>
      <button type="button" className="hero-dismiss" aria-label="Close" onClick={onDismissWelcome}>
        ×
      </button>
    </div>
  );

  const noticeNote = notice && (
    <div className="welcome-note" role="status">
      <span>{notice}</span>
      <button type="button" className="hero-dismiss" aria-label="Close" onClick={onDismissNotice}>
        ×
      </button>
    </div>
  );

  // ---------- "Hero" skin ----------
  if (skinOf(theme).layout === "hero") {
    const shown = rows.filter((r) => filter === "all" || r.system.id === filter);
    return (
      <div className="hero-shell">
        <aside className={`hero-side ${sideOpen ? "open" : ""}`}>
          <Brand />
          <button type="button" className="btn primary hero-new" onClick={onNew}>
            + New character
          </button>
          <SideToggle open={sideOpen} onToggle={() => setSideOpen((o) => !o)} label="Menu" />
          <div className="hero-side-extra">
          <nav className="hero-filter" aria-label="Rule sets">
            <span className="hero-label">Rule sets</span>
            {[{ id: "all", short: "All characters" }, ...SYSTEMS.map((s) => ({ id: s.id, short: s.short }))].map((s) => {
              const n = s.id === "all" ? rows.length : rows.filter((r) => r.system.id === s.id).length;
              return (
                <button key={s.id} type="button" className={filter === s.id ? "on" : ""} aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
                  <span>{s.short}</span>
                  <span className="hero-count">{n}</span>
                </button>
              );
            })}
          </nav>
          {sessionsNav}
          <div className="hero-foot">
            <button type="button" className="link" onClick={() => fileRef.current?.click()}>
              Import a character…
            </button>
            {importInput}
            <SkinPicker theme={theme} onChange={onTheme} />
            <AccountRow account={account} />
          </div>
          </div>
        </aside>
        <main className="hero-main">
          <header className="hero-page-head">
            <h1>My characters</h1>
            <span className="muted">{rows.length ? "Pick up where you left off." : ""}</span>
          </header>
          {welcomeNote}
          {noticeNote}
          {sessionsStrip}
          {rows.length === 0 ? (
            empty
          ) : shown.length === 0 ? (
            <p className="muted">No characters for these rules yet.</p>
          ) : (
            <div className="hero-cards">
              {shown.map(({ rec, system, c, identity, problems }) => (
                <article className={`hero-card ${problems ? "has-todo" : ""}`} key={rec.id}>
                  <button type="button" className="hero-card-open" onClick={() => onOpen(rec.id)}>
                    <Crest identity={identity} level={c.level} maxLevel={system.maxLevel} size={92} badge={false} />
                    <span className="hero-card-text">
                      <strong>{c.name || "Unnamed"}</strong>
                      <span className="hero-sub">
                        Level {c.level} · {identity}
                      </span>
                      <span className="hero-card-tags">
                        <span className="hero-system">{system.short}</span>
                        {problems > 0 && <span className="hero-todo-chip">{problems} to do</span>}
                        {inSessions(rec.id).length > 0 && (
                          <span className="session-chip" title={inSessions(rec.id).join(", ")}>
                            In {inSessions(rec.id).length === 1 ? inSessions(rec.id)[0] : `${inSessions(rec.id).length} sessions`}
                          </span>
                        )}
                        <span className="muted">{ago(rec.updated)}</span>
                      </span>
                    </span>
                  </button>
                  <MoreMenu label={`More actions for ${c.name || "this character"}`}>
                    <button type="button" onClick={() => exportJson(rec)}>
                      Export as file
                    </button>
                    <button type="button" onClick={() => duplicate(rec, c)}>
                      Duplicate
                    </button>
                    <button type="button" className="danger" onClick={() => remove(rec, c)}>
                      Delete…
                    </button>
                  </MoreMenu>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---------- classic skins ----------
  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="identity">
          <h1 className="page-title">My characters</h1>
        </div>
        <div className="actions">
          <SkinPicker theme={theme} onChange={onTheme} />
          <AccountRow account={account} />
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          {importInput}
          <button type="button" className="btn primary" onClick={onNew}>
            + New character
          </button>
        </div>
      </header>

      {welcomeNote}
      {noticeNote}
      {sessionsStrip}
      {rows.length === 0 ? (
        empty
      ) : (
        <div className="char-grid">
          {rows.map(({ rec, system, c, identity, problems }) => (
            <article className="char-card card" key={rec.id}>
              <button type="button" className="char-open" onClick={() => onOpen(rec.id)}>
                <span className="system-badge">{system.short}</span>
                <strong className="char-name">{c.name || "Unnamed"}</strong>
                <span className="muted">{identity}</span>
                <span className="char-books">{rec.books.map((b) => bookAbbr(system, b)).join(" · ")}</span>
                {problems > 0 && <span className="counter under">{problems} to do</span>}
              </button>
              <div className="char-actions">
                <button type="button" className="link" onClick={() => exportJson(rec)}>
                  Export
                </button>
                <button type="button" className="link" onClick={() => duplicate(rec, c)}>
                  Duplicate
                </button>
                <button type="button" className="link danger" onClick={() => remove(rec, c)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type Account = { name: string; email: string; onLogout: () => void; onSettings?: () => void };

/** Who is logged in, with "Log out" in the "⋯" menu. */
function AccountRow({ account }: { account: Account }) {
  return (
    <div className="account-row" title={account.email}>
      <span className="account-initial" aria-hidden="true">
        {account.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <span className="account-name">{account.name}</span>
      <MoreMenu label="Account">
        {account.onSettings && (
          <button type="button" onClick={account.onSettings}>
            Name and password
          </button>
        )}
        <button type="button" onClick={account.onLogout}>
          Log out
        </button>
      </MoreMenu>
    </div>
  );
}
