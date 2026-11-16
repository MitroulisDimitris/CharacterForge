import { useMemo, useState } from "react";
import { getSystem } from "../systems/registry";
import { bookName, type BaseCharacter, type Warning } from "../systems/types";
import { downloadBlob, exportJson, fileSafe, type StoredCharacter, type Theme } from "../storage";
import { Brand, SkinPicker } from "./Brand";
import { Warnings } from "./Warnings";
import { LevelChangeDialog, openUnlocks } from "./LevelChange";
import { BooksDialog, hasOptionalBooks } from "./BookChecklist";
import { Crest, MoreMenu } from "./Hero";
import { SheetTab, SHEET_TAB } from "./SheetTab";
import { JustChanged } from "./JustChanged";
import { skinOf } from "../skins";
import type { SaveState } from "../App";

const SAVE_TEXT: Record<SaveState, string> = {
  saved: "Saved to your account",
  saving: "Saving…",
  error: "Not saved yet: can't reach the server. Retrying…",
};

export function Editor({
  rec,
  theme,
  save,
  onTheme,
  onUpdate,
  onBack,
  versions = [],
  version = "",
  onVersion,
  sessionCopy,
  onOpenSession,
}: {
  rec: StoredCharacter;
  theme: Theme;
  save: SaveState;
  onTheme: (t: Theme) => void;
  onUpdate: (patch: Partial<StoredCharacter>) => void;
  onBack: () => void;
  /** "My character" + one entry per session the character plays in (D2). Empty: not in a session. */
  versions?: { id: string; label: string }[];
  version?: string;
  onVersion?: (id: string) => void;
  /** Set when editing a session's copy: the session's name. */
  sessionCopy?: string;
  onOpenSession?: () => void;
}) {
  const system = getSystem(rec.system)!;
  const [char, setChar] = useState<BaseCharacter>(() => system.normalize(rec.data));
  const [tab, setTab] = useState(SHEET_TAB);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pending, setPending] = useState<string[]>(rec.pending ?? []);
  const [booksOpen, setBooksOpen] = useState(false);
  const [dialog, setDialog] = useState<{ kind: "change"; target: number } | { kind: "resume"; ids: string[] } | null>(null);
  const d = useMemo(() => system.derive(char, rec.books), [system, char, rec.books]);

  const set = (patch: Partial<BaseCharacter>) => {
    const next = { ...char, ...patch };
    setChar(next);
    onUpdate({ data: next });
  };

  const commitFromDialog = (next: BaseCharacter, nextPending: string[]) => {
    setChar(next);
    setPending(nextPending);
    onUpdate({ data: next, pending: nextPending });
  };

  const waiting = useMemo(() => openUnlocks(system, char, rec.books, pending), [system, char, rec.books, pending]);

  const onPdf = async () => {
    setPdfBusy(true);
    try {
      const bytes = await system.buildPdf(char, d, rec.books);
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${fileSafe(char.name)}_${system.id}_lvl${char.level}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Couldn't make the PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPdfBusy(false);
    }
  };

  const tabErrors = (id: string) => (d.warnings as Warning[]).filter((w) => w.tab === id && w.level !== "info").length;
  const Active = system.tabs.find((t) => t.id === tab)?.Component;
  const body = Active ? <Active c={char} d={d} set={set} books={rec.books} /> : <SheetTab system={system} c={char} d={d} set={set} />;
  const maxLevel = system.maxLevelFor?.(char) ?? system.maxLevel;
  const levelOptions = Array.from({ length: maxLevel }, (_, i) => i + 1);
  const dismiss = (id: string) => {
    const p = pending.filter((x) => x !== id);
    setPending(p);
    onUpdate({ pending: p });
  };

  const canChangeBooks = hasOptionalBooks(system) && !sessionCopy;
  const versionPick = versions.length > 1 && (
    <label className="version-pick" title="Each session keeps its own version of this character">
      <span>Version</span>
      <select value={version} onChange={(e) => onVersion?.(e.target.value)}>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
  const sessionNote = sessionCopy && (
    <p className="session-copy-note">
      Playing in{" "}
      <button type="button" className="link" onClick={onOpenSession}>
        {sessionCopy}
      </button>
      . Changes here stay in this session.
    </p>
  );

  const tabsNav = (
    <nav className="tabs" role="tablist">
      <button role="tab" aria-selected={!Active} className={!Active ? "on" : ""} onClick={() => setTab(SHEET_TAB)}>
        Sheet
      </button>
      {system.tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
          {t.label}
          {tabErrors(t.id) > 0 && <span className="badge">{tabErrors(t.id)}</span>}
        </button>
      ))}
    </nav>
  );
  const dialogs = (
    <>
      {booksOpen && (
        <BooksDialog
          system={system}
          books={rec.books}
          inUse={(b) => (system.derive(char, b).warnings as Warning[]).filter((w) => w.level !== "info").map((w) => w.text)}
          onSave={(b) => {
            onUpdate({ books: b });
            setBooksOpen(false);
          }}
          onClose={() => setBooksOpen(false)}
        />
      )}
      {dialog && (
        <LevelChangeDialog
          key={dialog.kind === "change" ? `c${dialog.target}` : `r${dialog.ids.join()}`}
          system={system}
          char={char}
          books={rec.books}
          pending={pending}
          mode={dialog}
          onCommit={commitFromDialog}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );

  // ---------- "Hero" skin: the character in a sidebar on the left (UI rules in CLAUDE.md) ----------
  if (skinOf(theme).layout === "hero") {
    const books = rec.books.map((b) => bookName(system, b)).join(", ");
    return (
      <div className="hero-shell">
        <aside className="hero-side">
          <button type="button" className="hero-back" onClick={onBack}>
            ‹ My characters
          </button>
          <Crest identity={d.identity} level={char.level} maxLevel={system.maxLevel} />
          <div className="hero-id">
            <input className="hero-name" value={char.name} onChange={(e) => set({ name: e.target.value })} aria-label="Character name" placeholder="Name your hero" />
            <span className="hero-sub">{d.identity}</span>
            {canChangeBooks ? (
              <button type="button" className="hero-system" title={`Rules fixed at creation. Books: ${books}. Click to change the books.`} onClick={() => setBooksOpen(true)}>
                {system.short} · {rec.books.length} book{rec.books.length > 1 ? "s" : ""}
              </button>
            ) : (
              <span className="hero-system" title={`Rules fixed at creation. Books: ${books}.`}>
                {system.short} · {rec.books.length} book{rec.books.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {versionPick}
          {sessionNote}
          <section className={`hero-todo ${waiting.length ? "has" : ""}`} aria-label="To do">
            <span className="hero-label">To do</span>
            {waiting.length === 0 ? (
              <span className="muted">Nothing to choose right now.</span>
            ) : (
              <>
                <ul>
                  {waiting.map((u) => (
                    <li key={u.id}>
                      <button type="button" className="link" onClick={() => setDialog({ kind: "resume", ids: [u.id] })}>
                        {u.title}
                      </button>
                      <button type="button" className="hero-dismiss" title="Remove from the list (it may still show as a warning)" aria-label={`Dismiss ${u.title}`} onClick={() => dismiss(u.id)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn small" onClick={() => setDialog({ kind: "resume", ids: waiting.map((u) => u.id) })}>
                  Choose now
                </button>
              </>
            )}
          </section>
          <div className="hero-foot">
            {char.level < maxLevel && (
              <button type="button" className="btn primary hero-levelup" onClick={() => setDialog({ kind: "change", target: char.level + 1 })}>
                Level up to {char.level + 1}
              </button>
            )}
            <div className="hero-foot-row">
              <label className="level-pick">
                <span>Level</span>
                <select value={char.level} onChange={(e) => Number(e.target.value) !== char.level && setDialog({ kind: "change", target: Number(e.target.value) })}>
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <MoreMenu>
                <button type="button" onClick={onPdf} disabled={pdfBusy}>
                  {pdfBusy ? "Making PDF…" : "Download PDF"}
                </button>
                <button type="button" onClick={() => exportJson({ ...rec, data: char, pending })}>
                  Export as file
                </button>
                {canChangeBooks && (
                  <button type="button" onClick={() => setBooksOpen(true)}>
                    Change books
                  </button>
                )}
                <div className="more-row">
                  <SkinPicker theme={theme} onChange={onTheme} />
                </div>
              </MoreMenu>
            </div>
            <span className="hero-saved" aria-live="polite">
              {SAVE_TEXT[save]}
            </span>
          </div>
        </aside>
        <main className="hero-main">
          {tabsNav}
          <Warnings warnings={d.warnings} onJump={(t) => setTab(t)} startOpen={false} />
          <div className="tab-body">{body}</div>
          <p className="credits muted">{system.credits}</p>
        </main>
        {dialogs}
        <JustChanged system={system} d={d} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={onBack} />
        <div className="identity">
          <input className="name-input" value={char.name} onChange={(e) => set({ name: e.target.value })} aria-label="Character name" />
          <span className="identity-sub">{d.identity}</span>
        </div>
        {versionPick}
        {canChangeBooks ? (
          <button
            type="button"
            className="system-badge as-button"
            title={`Rules fixed at creation. Books: ${rec.books.map((b) => bookName(system, b)).join(", ")}. Click to change the books.`}
            onClick={() => setBooksOpen(true)}
          >
            {system.short} · {rec.books.length} book{rec.books.length > 1 ? "s" : ""} ✎
          </button>
        ) : (
          <span className="system-badge" title={`Rules fixed at creation. Books: ${rec.books.map((b) => bookName(system, b)).join(", ")}`}>
            {system.short} · {rec.books.length} book{rec.books.length > 1 ? "s" : ""}
          </span>
        )}
        <label className="level-pick">
          <span>Level</span>
          <select value={char.level} onChange={(e) => Number(e.target.value) !== char.level && setDialog({ kind: "change", target: Number(e.target.value) })}>
            {levelOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← My characters
          </button>
          <SkinPicker theme={theme} onChange={onTheme} />
          <button type="button" className="btn ghost" onClick={() => exportJson({ ...rec, data: char, pending })}>
            Export JSON
          </button>
          <button type="button" className="btn primary" onClick={onPdf} disabled={pdfBusy}>
            {pdfBusy ? "Making PDF…" : "Download PDF"}
          </button>
        </div>
      </header>
      {sessionNote}
      <p className="save-status" aria-live="polite">
        {SAVE_TEXT[save]}
      </p>

      <div className="layout single">
        <main className="main">
          {tabsNav}
          {waiting.length > 0 && (
            <div className="todo-banner">
              <div className="todo-head">
                <strong>
                  🎁 {waiting.length} level-up choice{waiting.length > 1 ? "s" : ""} waiting
                </strong>
                <button type="button" className="btn primary small" onClick={() => setDialog({ kind: "resume", ids: waiting.map((u) => u.id) })}>
                  Choose now
                </button>
              </div>
              <ul>
                {waiting.map((u) => (
                  <li key={u.id}>
                    <span className="pill">Level {u.level}</span>
                    <span>{u.title}</span>
                    <button type="button" className="link" onClick={() => setDialog({ kind: "resume", ids: [u.id] })}>
                      Do it
                    </button>
                    <button
                      type="button"
                      className="link muted-link"
                      title="Remove from the list (it may still show as a warning)"
                      onClick={() => dismiss(u.id)}
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Warnings warnings={d.warnings} onJump={(t) => setTab(t)} startOpen={false} />
          <div className="tab-body">{body}</div>
          <p className="credits muted">{system.credits}</p>
        </main>
      </div>
      {dialogs}
      <JustChanged system={system} d={d} />
    </div>
  );
}
