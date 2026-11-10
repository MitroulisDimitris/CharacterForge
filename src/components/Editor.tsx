import { useMemo, useState } from "react";
import { getSystem } from "../systems/registry";
import { bookName, type BaseCharacter, type Warning } from "../systems/types";
import { downloadBlob, exportJson, fileSafe, type StoredCharacter, type Theme } from "../storage";
import { Brand, ThemeButton } from "./Brand";
import { Warnings } from "./Warnings";
import { LevelChangeDialog, openUnlocks } from "./LevelChange";
import { BooksDialog, hasOptionalBooks } from "./BookChecklist";

export function Editor({
  rec,
  theme,
  saveOk,
  onToggleTheme,
  onUpdate,
  onBack,
}: {
  rec: StoredCharacter;
  theme: Theme;
  saveOk: boolean;
  onToggleTheme: () => void;
  onUpdate: (patch: Partial<StoredCharacter>) => void;
  onBack: () => void;
}) {
  const system = getSystem(rec.system)!;
  const [char, setChar] = useState<BaseCharacter>(() => system.normalize(rec.data));
  const [tab, setTab] = useState(system.tabs[0].id);
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
  const Active = system.tabs.find((t) => t.id === tab)?.Component ?? system.tabs[0].Component;
  const Summary = system.Summary;

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={onBack} />
        <div className="identity">
          <input className="name-input" value={char.name} onChange={(e) => set({ name: e.target.value })} aria-label="Character name" />
          <span className="identity-sub">{d.identity}</span>
        </div>
        {hasOptionalBooks(system) ? (
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
            {Array.from({ length: system.maxLevelFor?.(char) ?? system.maxLevel }, (_, i) => i + 1).map((l) => (
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
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          <button type="button" className="btn ghost" onClick={() => exportJson({ ...rec, data: char, pending })}>
            Export JSON
          </button>
          <button type="button" className="btn primary" onClick={onPdf} disabled={pdfBusy}>
            {pdfBusy ? "Making PDF…" : "Download PDF"}
          </button>
        </div>
      </header>
      <p className="save-status" aria-live="polite">
        {saveOk ? "Saved in this browser" : "Couldn't save (browser storage blocked)"}
      </p>

      <div className="layout">
        <main className="main">
          <nav className="tabs" role="tablist">
            {system.tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                {t.label}
                {tabErrors(t.id) > 0 && <span className="badge">{tabErrors(t.id)}</span>}
              </button>
            ))}
          </nav>
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
                      onClick={() => {
                        const p = pending.filter((x) => x !== u.id);
                        setPending(p);
                        onUpdate({ pending: p });
                      }}
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Warnings warnings={d.warnings} onJump={(t) => setTab(t)} />
          <div className="tab-body">
            <Active c={char} d={d} set={set} books={rec.books} />
          </div>
          <p className="credits muted">{system.credits}</p>
        </main>
        <aside className="side">
          <Summary c={char} d={d} />
        </aside>
      </div>
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
    </div>
  );
}
