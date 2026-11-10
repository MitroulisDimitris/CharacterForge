import { useState } from "react";
import type { AnySystem } from "../systems/types";

/** The allowed-books checkboxes: core books are always on. Used by the wizard and the Books dialog. */
export function BookChecklist({ system, books, onChange }: { system: AnySystem; books: string[]; onChange: (books: string[]) => void }) {
  return (
    <ul className="book-list">
      {system.books.map((b) => (
        <li key={b.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={b.core || books.includes(b.id)}
              disabled={b.core}
              onChange={(e) => onChange(e.target.checked ? [...books, b.id] : books.filter((x) => x !== b.id))}
            />
            <span>
              <strong>{b.name}</strong>
              {b.core && <span className="pill">Core</span>}
              {b.note && <small className="muted"> — {b.note}</small>}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Core books plus the given ones, in the system's order, without unknown ids. */
export function normalizeBooks(system: AnySystem, books: string[]) {
  return system.books.filter((b) => b.core || books.includes(b.id)).map((b) => b.id);
}

/** Does this system have any books the player can switch on or off? */
export const hasOptionalBooks = (system: AnySystem) => system.books.some((b) => !b.core);

/** Change the allowed books of an existing character. Nothing is deleted: options from a removed book show as warnings. */
export function BooksDialog({
  system,
  books: initial,
  inUse,
  onSave,
  onClose,
}: {
  system: AnySystem;
  books: string[];
  /** Warnings the character would get with a given book list (to preview what removing a book breaks). */
  inUse: (books: string[]) => string[];
  onSave: (books: string[]) => void;
  onClose: () => void;
}) {
  const [books, setBooks] = useState(initial);
  const next = normalizeBooks(system, books);
  const before = new Set(inUse(normalizeBooks(system, initial)));
  const fresh = inUse(next).filter((w) => !before.has(w));
  const changed = next.join() !== normalizeBooks(system, initial).join();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Allowed books">
      <div className="modal">
        <header className="modal-hero compact">
          <h2>Allowed books</h2>
          <p>Tick the books your DM allows. Adding one offers its options right away. Removing one deletes nothing: anything the character already uses from it shows as a warning until you change it.</p>
        </header>
        <div className="modal-body">
          <BookChecklist system={system} books={books} onChange={setBooks} />
          {fresh.length > 0 && (
            <div className="warn-preview">
              <strong>With these books, the character gets {fresh.length} new warning{fresh.length > 1 ? "s" : ""}:</strong>
              <ul>
                {fresh.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!changed} onClick={() => onSave(next)}>
            Save books
          </button>
        </footer>
      </div>
    </div>
  );
}
