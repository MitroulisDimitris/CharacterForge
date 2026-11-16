import { useState } from "react";
import { getSystem, isAvailable, SYSTEMS } from "../systems/registry";
import type { AnySystem, BaseCharacter } from "../systems/types";
import { clearDraft, loadDraft, newRecordId, saveDraft, type StoredCharacter, type Theme } from "../storage";
import { Brand, SkinPicker } from "./Brand";
import { Card, Field } from "./ui";
import { BookChecklist, normalizeBooks } from "./BookChecklist";
import { CreationStepper } from "./CreationStepper";
import { skinOf } from "../skins";

/**
 * New character: pick the rules and allowed books, then either build the character step by
 * step (systems with guided creation, e.g. D&D 2014) or start from a template.
 * The rules can't change later; the books can (Books button on the sheet).
 */
export function NewCharacterWizard({
  theme,
  onTheme,
  onCancel,
  onCreate,
  preset,
  userId,
}: {
  /** Whose creation draft to keep / resume on this device. */
  userId: string;
  /** New character for a session: rules and books are the session's (REQUIREMENTS §4.2). */
  preset?: { systemId: string; books: string[]; label: string };
  theme: Theme;
  onTheme: (t: Theme) => void;
  onCancel: () => void;
  onCreate: (rec: StoredCharacter) => void;
}) {
  const presetSystem = preset ? (getSystem(preset.systemId) ?? null) : null;
  // Only one rule set is open for now: pick it straight away (others stay listed as "Coming soon").
  const onlyOne = SYSTEMS.filter((s) => isAvailable(s.id));
  const startSystem = presetSystem ?? (onlyOne.length === 1 ? onlyOne[0] : null);
  const [draft, setDraft] = useState(() => (preset ? null : loadDraft(userId)));
  const [resume, setResume] = useState<{ char: BaseCharacter; step: number; visited: number[] } | undefined>();
  const [system, setSystem] = useState<AnySystem | null>(startSystem);
  const [books, setBooks] = useState<string[]>(
    presetSystem ? normalizeBooks(presetSystem, preset!.books) : startSystem ? normalizeBooks(startSystem, startSystem.books.map((b) => b.id)) : [],
  );
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [building, setBuilding] = useState(Boolean(presetSystem?.creation));

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
    clearDraft();
    const now = Date.now();
    onCreate({ id: newRecordId(), system: system.id, books: normalizeBooks(system, books), created: now, updated: now, data });
  };

  const createFromTemplate = () => {
    if (!template) return;
    const data = template.make();
    if (name.trim()) data.name = name.trim();
    save(data);
  };

  const progress = (p: { char: BaseCharacter; step: number; visited: number[] }) => {
    if (!system || preset) return;
    saveDraft({ userId, system: system.id, books: normalizeBooks(system, books), char: p.char, step: p.step, visited: p.visited, saved: Date.now() });
  };
  const draftSystem = draft ? getSystem(draft.system) : undefined;
  const draftName = (draft?.char as { name?: string } | undefined)?.name?.trim();
  const draftBox = draft && draftSystem?.creation && !building && (
    <div className="draft-box" role="status">
      <div>
        <strong>Continue your character?</strong>
        <span className="muted">
          {draftName || "An unnamed hero"} · step {Math.min(draft.step + 1, draftSystem.creation.steps.length + 1)} of {draftSystem.creation.steps.length + 1} · {draftSystem.short}
        </span>
      </div>
      <div className="draft-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            clearDraft();
            setDraft(null);
          }}
        >
          Start over
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setSystem(draftSystem);
            setBooks(draft.books);
            setResume({ char: draft.char as BaseCharacter, step: draft.step, visited: draft.visited });
            setBuilding(true);
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const header = (
    <header className="topbar">
      <Brand onClick={onCancel} />
      <div className="identity">
        <h1 className="page-title">New character{building && system ? ` · ${system.short}` : ""}</h1>
      </div>
      <div className="actions">
        <SkinPicker theme={theme} onChange={onTheme} />
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </header>
  );

  if (building && system?.creation && skinOf(theme).layout === "hero")
    return (
      <CreationStepper
        system={system}
        books={normalizeBooks(system, books)}
        onBack={() => (preset ? onCancel() : setBuilding(false))}
        onCreate={save}
        resume={resume}
        onProgress={progress}
        hero={{ onCancel, footer: <SkinPicker theme={theme} onChange={onTheme} /> }}
      />
    );

  if (building && system?.creation)
    return (
      <div className="app">
        {header}
        <CreationStepper system={system} books={normalizeBooks(system, books)} onBack={() => (preset ? onCancel() : setBuilding(false))} onCreate={save} resume={resume} onProgress={progress} />
      </div>
    );

  return (
    <div className="app">
      {header}
      <div className="wizard stack">
        {draftBox}
        <Card title="1 · Game rules" aside={<span className="muted">This can't be changed later</span>}>
          <div className="option-grid wide">
            {[...SYSTEMS].sort((a, b) => Number(isAvailable(b.id)) - Number(isAvailable(a.id))).map((s) => (
              <button
                type="button"
                key={s.id}
                className={`option ${system?.id === s.id ? "on" : ""}`}
                aria-pressed={system?.id === s.id}
                disabled={!isAvailable(s.id)}
                onClick={() => pickSystem(s)}
              >
                <strong>
                  {s.name}
                  {!isAvailable(s.id) && <span className="pill soon-pill">Coming soon</span>}
                </strong>
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
