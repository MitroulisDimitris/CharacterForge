// The character's one "To do" list (left sidebar in Hero; a box above the tabs in the classic
// skins). Every item opens its tab and makes the right section glow. Grey notes are folded below.
import type { ReactNode } from "react";
import type { Todo } from "../todo";

export function TodoBox({
  todos,
  notes,
  top,
  onGo,
  onDismiss,
  onChooseNow,
  variant = "side",
}: {
  todos: Todo[];
  notes: Todo[];
  /** Shown first (e.g. "Level up ready"). */
  top?: ReactNode;
  onGo: (t: Todo) => void;
  onDismiss: (unlockId: string) => void;
  /** Postponed level-up choices, step by step. */
  onChooseNow?: () => void;
  variant?: "side" | "banner";
}) {
  const has = todos.length > 0 || !!top;
  return (
    <section className={`${variant === "side" ? "hero-todo" : "todo-box"} ${has ? "has" : ""}`} aria-label="To do">
      <span className="hero-label">
        To do{todos.length ? <span className="todo-count">{todos.length}</span> : null}
      </span>
      {top}
      {todos.length === 0 ? (
        top ? null : <span className="muted">Nothing to do right now. Everything checks out.</span>
      ) : (
        <ul className="todo-list">
          {todos.map((t) => (
            <li key={t.key}>
              <button type="button" className="link todo-go" onClick={() => onGo(t)} title={t.tab ? "Show me where" : undefined}>
                {t.text}
              </button>
              {t.unlockId && (
                <button type="button" className="hero-dismiss" title="Remove from the list (you can still do it later)" aria-label={`Dismiss ${t.text}`} onClick={() => onDismiss(t.unlockId!)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {onChooseNow && (
        <button type="button" className="btn small" onClick={onChooseNow}>
          Choose now
        </button>
      )}
      {notes.length > 0 && (
        <details className="todo-notes">
          <summary>Notes ({notes.length})</summary>
          <ul className="todo-list">
            {notes.map((t) => (
              <li key={t.key}>
                <button type="button" className="link todo-go note" onClick={() => onGo(t)}>
                  {t.text}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
