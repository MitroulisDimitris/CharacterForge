import { useEffect, useMemo, useRef, useState } from "react";
import { setState as setFeedbackState } from "../trail";
import { getSystem } from "../systems/registry";
import { bookName, type BaseCharacter, type Warning } from "../systems/types";
import { downloadBlob, exportJson, fileSafe, type StoredCharacter, type Theme } from "../storage";
import { Brand, SkinPicker } from "./Brand";
import { TodoBox } from "./TodoBox";
import { buildTodos, flashSection, type Todo } from "../todo";
import { LevelChangeDialog, openUnlocks } from "./LevelChange";
import { BooksDialog, hasOptionalBooks } from "./BookChecklist";
import { Crest, MoreMenu, SideToggle } from "./Hero";
import { CameraIcon, PortraitDialog } from "./Portrait";
import { SheetTab, SHEET_TAB } from "./SheetTab";
import { PlayHp } from "./InPlay";
import { RollScope } from "./Dice";
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
  levelReady,
  onKeepLevel,
}: {
  rec: StoredCharacter;
  theme: Theme;
  save: SaveState;
  onTheme: (t: Theme) => void;
  onUpdate: (patch: Partial<StoredCharacter>) => void;
  onBack: () => void;
  /** A level one of the character's sessions asks for: a DM's award, or the session's level when joining. */
  levelReady?: { level: number; session: string } | null;
  /** "Keep level N" on a suggestion to lower the level. */
  onKeepLevel?: () => void;
}) {
  const system = getSystem(rec.system)!;
  const [char, setChar] = useState<BaseCharacter>(() => system.normalize(rec.data));
  const [tab, setTab] = useState(SHEET_TAB);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pending, setPending] = useState<string[]>(rec.pending ?? []);
  const [booksOpen, setBooksOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [portraitOpen, setPortraitOpen] = useState(false);
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

  // What feedback sends about the open character (same as a JSON export, plus what's shown).
  useEffect(() => {
    setFeedbackState("character", {
      id: rec.id,
      system: rec.system,
      books: rec.books,
      level: char.level,
      tab,
      pending,
      warnings: (d.warnings as Warning[]).map((w) => `[${w.level}] ${w.text}`),
      data: char,
    });
    return () => setFeedbackState("character", undefined);
  }, [rec.id, rec.system, rec.books, char, pending, tab, d]);

  const waiting = useMemo(() => openUnlocks(system, char, rec.books, pending), [system, char, rec.books, pending]);
  const { todos, notes } = useMemo(() => buildTodos(d.warnings as Warning[], waiting), [d, waiting]);

  // Clicking a to-do: open its tab, then scroll to the section and make it glow.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ section?: string; words: string[]; n: number } | null>(null);
  useEffect(() => {
    if (!flash) return;
    // One glow per click: forget the request once it has run, so later tab switches don't repeat it.
    const t = window.setTimeout(() => {
      flashSection(bodyRef.current, flash.section, flash.words);
      setFlash(null);
    }, 60);
    return () => window.clearTimeout(t);
  }, [flash]);
  const go = (t: Todo) => {
    if (t.tab) setTab(t.tab);
    setSideOpen(false);
    setFlash((f) => ({ section: t.section, words: t.find, n: (f?.n ?? 0) + 1 }));
  };

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
  const maxLevel = system.maxLevelFor?.(char) ?? system.maxLevel;
  const card = system.tableCard?.(char, d) ?? null;
  const hero = skinOf(theme).layout === "hero";
  const body = <RollScope>{Active ? <Active c={char} d={d} set={set} books={rec.books} /> : <SheetTab system={system} c={char} d={d} set={set} withHp={!hero} />}</RollScope>;
  const target = levelReady && levelReady.level !== char.level ? Math.min(levelReady.level, maxLevel) : null;
  const awardItem =
    target && target > char.level ? (
      <div className="award-todo">
        <strong>Level up ready</strong>
        <span>
          {levelReady!.session} plays at level {target}. See what you gain and make your choices.
        </span>
        <button type="button" className="btn primary small" onClick={() => setDialog({ kind: "change", target })}>
          Level up to {target}
        </button>
      </div>
    ) : target && target < char.level ? (
      <div className="award-todo">
        <strong>Lower to level {target}?</strong>
        <span>
          {levelReady!.session} plays at level {target}; {char.name || "this character"} is level {char.level}. A suggestion: you decide.
        </span>
        <span className="award-btns">
          <button type="button" className="btn small" onClick={() => setDialog({ kind: "change", target })}>
            Lower to {target}
          </button>
          {onKeepLevel && (
            <button type="button" className="btn ghost small" onClick={onKeepLevel}>
              Keep level {char.level}
            </button>
          )}
        </span>
      </div>
    ) : null;
  const levelOptions = Array.from({ length: maxLevel }, (_, i) => i + 1);
  const dismiss = (id: string) => {
    const p = pending.filter((x) => x !== id);
    setPending(p);
    onUpdate({ pending: p });
  };

  const canChangeBooks = hasOptionalBooks(system);

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
  const portraitLabel = char.portrait ? "Change the portrait" : "Add a portrait";
  const crestButton = (size?: number) => (
    <button type="button" className="crest-btn" aria-label={portraitLabel} title={portraitLabel} onClick={() => setPortraitOpen(true)}>
      <Crest identity={d.identity} level={char.level} maxLevel={system.maxLevel} portrait={char.portrait} size={size} badge={size === undefined} />
      <span className="crest-cam" aria-hidden="true">
        <CameraIcon size={16} />
      </span>
    </button>
  );
  const dialogs = (
    <>
      {portraitOpen && (
        <PortraitDialog
          current={char.portrait}
          name={char.name}
          onSave={(portrait) => {
            set({ portrait: portrait ?? undefined });
            setPortraitOpen(false);
          }}
          onClose={() => setPortraitOpen(false)}
        />
      )}
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
  if (hero) {
    const books = rec.books.map((b) => bookName(system, b)).join(", ");
    return (
      <div className="hero-shell">
        <aside className={`hero-side ${sideOpen ? "open" : ""}`}>
          <button type="button" className="hero-back" onClick={onBack} aria-label="My characters">
            ‹ <span className="back-label">My characters</span>
          </button>
          {crestButton()}
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
          <RollScope>
            <PlayHp c={char} card={card} set={set} compact onDown={() => (setTab(SHEET_TAB), setSideOpen(false))} />
          </RollScope>
          <SideToggle open={sideOpen} onToggle={() => setSideOpen((o) => !o)} dot={todos.length > 0 || !!target} />
          <div className="hero-side-extra">
          <TodoBox
            todos={todos}
            notes={notes}
            top={awardItem}
            onGo={go}
            onDismiss={dismiss}
            onChooseNow={waiting.length ? () => setDialog({ kind: "resume", ids: waiting.map((u) => u.id) }) : undefined}
          />
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
                <button type="button" onClick={() => setPortraitOpen(true)}>
                  {portraitLabel}
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
          </div>
        </aside>
        <main className="hero-main">
          {tabsNav}
          <div className="tab-body" ref={bodyRef}>
            {body}
          </div>
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
        {crestButton(56)}
        <div className="identity">
          <input className="name-input" value={char.name} onChange={(e) => set({ name: e.target.value })} aria-label="Character name" />
          <span className="identity-sub">{d.identity}</span>
        </div>
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
      <p className="save-status" aria-live="polite">
        {SAVE_TEXT[save]}
      </p>

      <div className="layout single">
        <main className="main">
          <TodoBox
            variant="banner"
            todos={todos}
            notes={notes}
            top={awardItem}
            onGo={go}
            onDismiss={dismiss}
            onChooseNow={waiting.length ? () => setDialog({ kind: "resume", ids: waiting.map((u) => u.id) }) : undefined}
          />
          {tabsNav}
          <div className="tab-body" ref={bodyRef}>
            {body}
          </div>
          <p className="credits muted">{system.credits}</p>
        </main>
      </div>
      {dialogs}
      <JustChanged system={system} d={d} />
    </div>
  );
}
