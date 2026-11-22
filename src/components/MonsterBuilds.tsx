// The build picker on a session's monster page (REQUIREMENTS §4.9): the book's version or one of the
// host's saved spell builds; save as new, rename, delete. A build outside the book's rule shows
// ⚠ with ↑ (stronger) / ↓ (weaker) / ≈ (different, same strength).
import { useEffect, useRef, useState } from "react";
import { strengthText, type BuildCheck, type MonsterBuild, type SpellMap } from "../monsterSpells";
import { WarnIcon } from "./MonsterSpells";

const ARROWS = { up: "↑", down: "↓", off: "≈", "": "" } as const;

export function BuildPicker({
  builds,
  sel,
  dirty,
  checkOf,
  onSelect,
  onSaveNew,
  onRename,
  onDelete,
}: {
  builds: MonsterBuild[];
  sel: string;
  dirty: boolean;
  checkOf: (m: SpellMap | null) => BuildCheck;
  onSelect: (id: string) => void;
  onSaveNew: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  useEffect(() => {
    if (naming) inputRef.current?.select();
  }, [naming]);

  const current = builds.find((b) => b.id === sel);
  const items = [{ id: "orig", name: "Original", sub: "Monster Manual", spells: null as SpellMap | null }, ...builds.map((b) => ({ id: b.id, name: b.name, sub: "Your build", spells: b.spells }))];
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setNaming(null);
      setAsking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const startNaming = (kind: "new" | "rename") => {
    setOpen(false);
    setNaming(kind);
    setDraft(kind === "rename" ? current?.name ?? "" : current ? `${current.name} 2` : "");
  };

  return (
    <div className="build-pick" ref={ref}>
      <span className="build-label">Build</span>
      <button type="button" className="build-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>
          {current?.name ?? "Original"}
          {dirty && <small> (changed)</small>}
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="build-menu" role="menu">
          {items.map((b) => {
            const c = b.spells ? checkOf(b.spells) : null;
            return (
              <button
                key={b.id}
                type="button"
                role="menuitemradio"
                aria-checked={b.id === sel}
                className={`build-item ${b.id === sel ? "on" : ""}`}
                title={c?.kind ? strengthText(c) : undefined}
                onClick={() => (onSelect(b.id), setOpen(false))}
              >
                <span className="build-item-text">
                  <strong>{b.name}</strong>
                  <small>{b.sub}</small>
                </span>
                {c?.kind && (
                  <span className={`build-mark ${c.kind}`} aria-label={strengthText(c)}>
                    <WarnIcon />
                    <b aria-hidden="true">{ARROWS[c.kind]}</b>
                  </span>
                )}
              </button>
            );
          })}
          <div className="build-menu-foot">
            <button type="button" role="menuitem" onClick={() => startNaming("new")}>
              Save as a new build
            </button>
            {current && (
              <>
                <button type="button" role="menuitem" onClick={() => startNaming("rename")}>
                  Rename this build
                </button>
                <button type="button" role="menuitem" className="danger" onClick={() => (setOpen(false), setAsking(true))}>
                  Delete this build…
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {naming && (
        <form
          className="build-name"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void run(() => (naming === "new" ? onSaveNew(draft.trim()) : onRename(draft.trim())));
          }}
        >
          <label className="auth-field">
            <span>{naming === "new" ? "Name this build" : "Rename this build"}</span>
            <input ref={inputRef} value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} placeholder="Storm Lich" />
          </label>
          <button type="submit" className="btn primary" disabled={busy || !draft.trim()}>
            {naming === "new" ? "Save build" : "Rename"}
          </button>
          <button type="button" className="btn ghost" onClick={() => setNaming(null)}>
            Cancel
          </button>
        </form>
      )}
      {asking && current && (
        <div className="build-name" role="alertdialog" aria-label="Delete this build">
          <span>Delete “{current.name}”? Encounters that already have it keep their copy.</span>
          <button type="button" className="btn danger" disabled={busy} onClick={() => void run(onDelete)}>
            Delete
          </button>
          <button type="button" className="btn ghost" onClick={() => setAsking(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
