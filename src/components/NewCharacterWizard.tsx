import { useState } from "react";
import { SYSTEMS } from "../systems/registry";
import type { AnySystem, BaseCharacter } from "../systems/types";
import { newRecordId, type StoredCharacter, type Theme } from "../storage";
import { Brand, ThemeButton } from "./Brand";
import { Card, Field } from "./ui";
import { BookChecklist, normalizeBooks } from "./BookChecklist";
import { CreationStepper } from "./CreationStepper";

/**
 * New character: pick the rules and allowed books, then either build the character step by
 * step (systems with guided creation, e.g. D&D 2014) or start from a template.
 * The rules can't change later; the books can (Books button on the sheet).
 */
export function NewCharacterWizard({
  theme,
  onToggleTheme,
  onCancel,
  onCreate,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  onCancel: () => void;
  onCreate: (rec: StoredCharacter) => void;
}) {
  const [system, setSystem] = useState<AnySystem | null>(null);
  const [books, setBooks] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [building, setBuilding] = useState(false);

  const pickSystem = (s: AnySystem) => {
    const t = s.templates[0];
    setSystem(s);
    setTemplateId(t?.id ?? "");
    setBooks(normalizeBooks(s, s.creation ? s.books.map((b) => b.id) : (t?.books ?? [])));
    setName("");
  };

  const template = system?.templates.find((t) => t.id === templateId);

  const save = (data: BaseCharacter) => {
    if (!system) return;
    const now = Date.now();
    onCreate({ id: newRecordId(), system: system.id, books: normalizeBooks(system, books), created: now, updated: now, data });
  };

  const createFromTemplate = () => {
    if (!template) return;
    const data = template.make();
    if (name.trim()) data.name = name.trim();
    save(data);
  };

  const header = (
    <header className="topbar">
      <Brand onClick={onCancel} />
      <div className="identity">
        <h1 className="page-title">New character{building && system ? ` · ${system.short}` : ""}</h1>
      </div>
      <div className="actions">
        <ThemeButton theme={theme} onToggle={onToggleTheme} />
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </header>
  );

  if (building && system?.creation)
    return (
      <div className="app">
        {header}
        <CreationStepper system={system} books={normalizeBooks(system, books)} onBack={() => setBuilding(false)} onCreate={save} />
      </div>
    );

  return (
    <div className="app">
      {header}
      <div className="wizard stack">
        <Card title="1 · Game rules" aside={<span className="muted">This can't be changed later</span>}>
          <div className="option-grid wide">
            {SYSTEMS.map((s) => (
              <button type="button" key={s.id} className={`option ${system?.id === s.id ? "on" : ""}`} aria-pressed={system?.id === s.id} onClick={() => pickSystem(s)}>
                <strong>{s.name}</strong>
                <span>{s.tagline}</span>
                <small className="muted">Core: {s.books.filter((b) => b.core).map((b) => b.name).join(", ")}</small>
              </button>
            ))}
          </div>
        </Card>

        {system && (
          <>
            <Card title="2 · Allowed books" aside={<span className="muted">Ask your DM which books are allowed · you can change this later</span>}>
              <BookChecklist system={system} books={books} onChange={setBooks} />
              {system.dataNote && <p className="muted note">{system.dataNote}</p>}
              {system.creation && (
                <div className="row-actions">
                  <button type="button" className="btn primary" onClick={() => setBuilding(true)}>
                    Build my character →
                  </button>
                  <span className="muted">
                    {system.short} · {system.books.filter((b) => b.core || books.includes(b.id)).map((b) => b.abbr).join(", ")} · {system.creation.steps.length} short steps, starting at level 1
                  </span>
                </div>
              )}
            </Card>

            {!system.creation && (
              <Card title="3 · Start from">
                <div className="option-grid">
                  {system.templates.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={`option ${templateId === t.id ? "on" : ""}`}
                      aria-pressed={templateId === t.id}
                      onClick={() => {
                        setTemplateId(t.id);
                        setBooks((bs) => [...new Set([...bs, ...t.books])]);
                      }}
                    >
                      <strong>{t.name}</strong>
                      <span>{t.description}</span>
                    </button>
                  ))}
                </div>
                <div className="grid-3">
                  <Field label="Character name" hint="Leave empty to use the template's name">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder={template?.make().name} />
                  </Field>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn primary" onClick={createFromTemplate}>
                    Create character
                  </button>
                  <span className="muted">
                    {system.short} · {system.books.filter((b) => b.core || books.includes(b.id)).map((b) => b.abbr).join(", ")}
                  </span>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
