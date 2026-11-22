import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnySystem, BaseCharacter, Warning } from "../systems/types";
import { Card } from "./ui";
import { Warnings } from "./Warnings";
import { Crest, SHORT } from "./Hero";
import { JustChanged } from "./JustChanged";

/** Guided, step-by-step creation of a new character (systems with `creation`). */
export function CreationStepper({
  system,
  books,
  onBack,
  onCreate,
  hero,
  onCancel,
  menu,
  resume,
  onProgress,
}: {
  /** Leave creation (asks first). Hero passes it in `hero` instead. */
  onCancel?: () => void;
  /** Extra items for the phone bar's ⋯ menu (the skin picker). */
  menu?: ReactNode;
  /** Continue a character that was being made (after a reload). */
  resume?: { char: BaseCharacter; step: number; visited: number[] };
  /** Called on every change, to keep the progress on this device. */
  onProgress?: (p: { char: BaseCharacter; step: number; visited: number[] }) => void;
  system: AnySystem;
  books: string[];
  onBack: () => void;
  onCreate: (char: BaseCharacter) => void;
  /** Hero skin: show the character taking shape in a left sidebar (with these extras). */
  hero?: { onCancel: () => void; footer: ReactNode };
}) {
  const steps = system.creation!.steps;
  const [char, setChar] = useState<BaseCharacter>(() => (resume ? system.normalize(resume.char) : system.creation!.fresh()));
  const [i, setI] = useState(() => Math.min(resume?.step ?? 0, system.creation!.steps.length));
  const [visited, setVisited] = useState<Set<number>>(() => new Set(resume?.visited ?? [0]));
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.documentElement.classList.add("creating");
    return () => document.documentElement.classList.remove("creating");
  }, []);
  useEffect(() => {
    if (!sheet) return;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [sheet]);
  // Keep progress only once something changed (opening and leaving leaves no draft behind).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onProgress?.({ char, step: i, visited: [...visited] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, i, visited]);
  const d = useMemo(() => system.derive(char, books), [system, char, books]);
  const warnings = d.warnings as Warning[];
  const review = i === steps.length;
  const step = steps[i];
  // No "Just changed" pop-up on the class step (user, 2026-11-17): the class preview already shows it.
  const showChanges = step?.id !== "class";
  const set = (patch: Partial<BaseCharacter>) => setChar((c) => ({ ...c, ...patch }));
  const open = (k: number) => warnings.filter((w) => w.level !== "info" && steps[k].tabs.includes(w.tab ?? "")).length;
  const blocker = step?.blocker?.(char, d) ?? null;
  const go = (k: number) => {
    setMenuOpen(false);
    setI(k);
    setVisited((v) => new Set([...v, k]));
    window.scrollTo({ top: 0 });
  };
  const Summary = system.Summary;
  const Step = step?.Component;

  // ---------- Phones (<=860 px, every skin; user 2026-11-17): one slim bar instead of the header,
  // step pills and side panel. "HP · AC" opens the character as a sheet; ⋯ holds the steps and skin.
  const cancel = hero?.onCancel ?? onCancel;
  const total = steps.length + 1;
  const quick = system.progression
    .snapshot(d)
    .slice(0, 2)
    .map((x) => `${SHORT[x.label] ?? x.label} ${x.value}`)
    .join(" · ");

  const stepsNav = (
    <nav className="steps" aria-label="Creation steps">
      {[...steps.map((s) => s.title), "Review"].map((t, k) => {
        const n = k < steps.length ? open(k) : 0;
        // Any step can be opened once nothing before it blocks (e.g. a class is chosen).
        const reachable = k <= i || visited.has(k) || !steps.slice(0, k).some((s) => s.blocker?.(char, d));
        return (
          <button
            type="button"
            key={t}
            className={`step ${k === i ? "on" : ""} ${visited.has(k) && k !== i ? (n ? "todo" : "done") : ""}`}
            disabled={!reachable}
            aria-current={k === i ? "step" : undefined}
            onClick={() => go(k)}
          >
            <span className="step-n">{visited.has(k) && k !== i && !n && k < steps.length ? "✓" : k + 1}</span>
            <span>{t}</span>
          </button>
        );
      })}
    </nav>
  );
  const phoneBar = (
    <header className="cr-bar">
      <div className="cr-bar-row">
        {cancel && (
          <button type="button" className="cr-icon" aria-label="Cancel" onClick={cancel}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <div className="cr-bar-title">
          <strong>New character</strong>
          <span>
            Step {i + 1} of {total} · {review ? "Review" : step.title}
          </span>
        </div>
        <button type="button" className="cr-hero-btn" aria-haspopup="dialog" onClick={() => setSheet(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
          <span>{quick}</span>
        </button>
        <button type="button" className="cr-icon" aria-label="Steps and skin" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
      <div className="cr-progress" aria-hidden="true">
        {Array.from({ length: total }, (_, k) => (
          <span key={k} className={k === i ? "on" : visited.has(k) ? "done" : ""} />
        ))}
      </div>
      {menuOpen && (
        <div className="cr-menu">
          <span className="hero-label">Steps</span>
          {stepsNav}
          {menu && <div className="cr-menu-extra">{menu}</div>}
        </div>
      )}
    </header>
  );
  const heroSheet = sheet && (
    <div className="cr-sheet-back" onClick={() => setSheet(false)}>
      <section className="cr-sheet" role="dialog" aria-modal="true" aria-label="Your character so far" onClick={(e) => e.stopPropagation()}>
        <div className="cr-sheet-head">
          <div>
            <h2>Your character so far</h2>
            <span className="muted">
              {char.name.trim() || "Unnamed hero"} · {d.identity}
            </span>
          </div>
          <button ref={closeRef} type="button" className="cr-icon boxed" aria-label="Close" onClick={() => setSheet(false)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="cr-sheet-body">
          <Summary c={char} d={d} />
          <p className="muted small-text">Your progress is kept on this device. The character is saved to your account when you press Create character.</p>
        </div>
      </section>
    </div>
  );

  const content = (
    <>
      {!review ? (
        <>
          <div className="step-intro">
            <h2>
              {i + 1}. {step.title}
            </h2>
            <p>{step.intro(char, d)}</p>
          </div>
          <Step c={char} d={d} set={set} books={books} />
          <Warnings
            warnings={warnings.filter((w) => step.tabs.includes(w.tab ?? ""))}
            onJump={(t) => {
              const k = steps.findIndex((s) => s.tabs.includes(t));
              if (k >= 0 && k !== i) go(k);
            }}
          />
        </>
      ) : (
        <>
          <div className="step-intro">
            <h2>Review</h2>
            <p>
              Here's your character. Anything left open is listed below; you can create the character now and finish those later, since they stay as warnings on the sheet until they're done.
            </p>
          </div>
          <Card title="Name">
            <input className="name-input big" value={char.name} placeholder="Character name" onChange={(e) => set({ name: e.target.value })} aria-label="Character name" />
            <p className="muted">{d.identity}</p>
          </Card>
          {warnings.filter((w) => w.level !== "info").length === 0 ? (
            <Card title="All set">
              <p>Every choice is made. Have fun!</p>
            </Card>
          ) : (
            <Card title="Still open">
              <ul className="todo-list">
                {steps.map((s, k) =>
                  warnings
                    .filter((w) => w.level !== "info" && s.tabs.includes(w.tab ?? ""))
                    .map((w) => (
                      <li key={k + w.text}>
                        <span className="pill">{s.title}</span> {w.text}{" "}
                        <button type="button" className="link" onClick={() => go(k)}>
                          Go there
                        </button>
                      </li>
                    )),
                )}
              </ul>
            </Card>
          )}
        </>
      )}

      <div className="step-foot cr-foot">
        <button type="button" className="btn ghost cr-back" aria-label={i === 0 ? "Back to books" : "Back"} onClick={() => (i === 0 ? onBack() : go(i - 1))}>
          ←<span className="cr-back-label"> {i === 0 ? "Books" : "Back"}</span>
        </button>
        <span className="spacer" />
        {!review && (
          <>
            {blocker && <span className="muted">{blocker}</span>}
            {!blocker && open(i) > 0 && (
              <button type="button" className="btn ghost cr-skip" onClick={() => go(i + 1)} title="Leave the open choices for later; they stay on the sheet as to-dos">
                Skip for now
              </button>
            )}
            <button
              type="button"
              className="btn primary"
              disabled={!!blocker}
              onClick={() => {
                const patch = step?.onNext?.(char, d);
                if (patch) set(patch);
                go(i + 1);
              }}
            >
              {i === steps.length - 1 ? (
                "Review →"
              ) : (
                <>
                  Next<span className="cr-next-name">: {steps[i + 1].title}</span> →
                </>
              )}
            </button>
          </>
        )}
        {review && (
          <button type="button" className="btn primary" onClick={() => onCreate({ ...char, name: char.name.trim() || "Unnamed hero" })}>
            Create character
          </button>
        )}
      </div>
    </>
  );

  // The character so far: open in a wide left column on PC (every skin, user 2026-11-17),
  // folded to one line on phones so the step's choices stay near the top.
  const summary = (
    <>
      <div className="sum-wide">
        <Summary c={char} d={d} />
      </div>
      <details className="sum-narrow">
        <summary>Your character so far</summary>
        <Summary c={char} d={d} />
      </details>
    </>
  );

  // ---------- Hero skin: the character taking shape on the left ----------
  if (hero) {
    return (
      <div className="hero-shell creation-shell">
        {phoneBar}
        {heroSheet}
        <aside className="hero-side creation-side">
          <button type="button" className="hero-back" onClick={hero.onCancel}>
            ‹ Cancel
          </button>
          <Crest identity={d.identity} level={char.level} maxLevel={system.maxLevel} size={96} badge={false} portrait={char.portrait} />
          <div className="hero-id">
            <input className="hero-name" value={char.name} placeholder="Unnamed hero" onChange={(e) => set({ name: e.target.value })} aria-label="Character name" />
            <span className="hero-sub">{d.identity}</span>
            <span className="hero-system" title={books.join(", ")}>
              {system.short} · {books.length} book{books.length > 1 ? "s" : ""}
            </span>
          </div>
          {stepsNav}
          {summary}
          <p className="draft-note">Your progress is kept on this device. The character is saved to your account when you press Create character.</p>
          <div className="hero-foot">{hero.footer}</div>
        </aside>
        <main className="hero-main creation-main">{content}</main>
        {showChanges && <JustChanged system={system} d={d} />}
      </div>
    );
  }

  return (
    <div className="creation">
      {phoneBar}
      {heroSheet}
      {showChanges && <JustChanged system={system} d={d} />}
      {stepsNav}
      <div className="layout creation-layout">
        <aside className="side">{summary}</aside>
        <main className="main">{content}</main>
      </div>
    </div>
  );
}
