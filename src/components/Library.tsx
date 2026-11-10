import { useRef } from "react";
import { getSystem } from "../systems/registry";
import { bookAbbr, type BaseCharacter, type DerivedBase } from "../systems/types";
import { exportJson, importFile, newRecordId, type StoredCharacter, type Theme } from "../storage";
import { Brand, ThemeButton } from "./Brand";

export function Library({
  lib,
  theme,
  onToggleTheme,
  onOpen,
  onNew,
  onImport,
  onDelete,
  onDuplicate,
}: {
  lib: StoredCharacter[];
  theme: Theme;
  onToggleTheme: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (rec: StoredCharacter) => void;
  onDelete: (id: string) => void;
  onDuplicate: (rec: StoredCharacter) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...lib].sort((a, b) => b.updated - a.updated);

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      onImport(await importFile(f));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="identity">
          <h1 className="page-title">My characters</h1>
        </div>
        <div className="actions">
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => (doImport(e.target.files?.[0]), (e.target.value = ""))} />
          <button type="button" className="btn primary" onClick={onNew}>
            + New character
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="empty card">
          <h3>No characters yet</h3>
          <p className="muted">Create one to choose the game rules and allowed books, then build your character step by step.</p>
          <button type="button" className="btn primary" onClick={onNew}>
            + New character
          </button>
        </div>
      ) : (
        <div className="char-grid">
          {sorted.map((rec) => {
            const system = getSystem(rec.system);
            if (!system) return null;
            const c = system.normalize(rec.data) as BaseCharacter;
            let identity = "";
            let problems = 0;
            try {
              const d: DerivedBase = system.derive(c, rec.books);
              identity = d.identity;
              problems = d.warnings.filter((w) => w.level !== "info").length;
            } catch {
              identity = "Couldn't read this character";
            }
            return (
              <article className="char-card card" key={rec.id}>
                <button type="button" className="char-open" onClick={() => onOpen(rec.id)}>
                  <span className="system-badge">{system.short}</span>
                  <strong className="char-name">{c.name || "Unnamed"}</strong>
                  <span className="muted">{identity}</span>
                  <span className="char-books">{rec.books.map((b) => bookAbbr(system, b)).join(" · ")}</span>
                  {problems > 0 && <span className="counter under">{problems} to fix</span>}
                </button>
                <div className="char-actions">
                  <button type="button" className="link" onClick={() => exportJson(rec)}>
                    Export
                  </button>
                  <button type="button" className="link" onClick={() => onDuplicate({ ...rec, id: newRecordId(), created: Date.now(), updated: Date.now(), data: { ...(rec.data as object), name: `${c.name} (copy)` } })}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      if (confirm(`Delete ${c.name || "this character"}? Export it first if you want a backup.`)) onDelete(rec.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
