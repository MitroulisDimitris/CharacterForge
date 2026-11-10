import { useMemo, useState } from "react";
import type { AnySystem, BaseCharacter, Warning } from "../systems/types";
import { Card } from "./ui";
import { Warnings } from "./Warnings";

/** Guided, step-by-step creation of a new character (systems with `creation`). */
export function CreationStepper({
  system,
  books,
  onBack,
  onCreate,
}: {
  system: AnySystem;
  books: string[];
  onBack: () => void;
  onCreate: (char: BaseCharacter) => void;
}) {
  const steps = system.creation!.steps;
  const [char, setChar] = useState<BaseCharacter>(() => system.creation!.fresh());
  const [i, setI] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const d = useMemo(() => system.derive(char, books), [system, char, books]);
  const warnings = d.warnings as Warning[];
  const review = i === steps.length;
  const step = steps[i];
  const set = (patch: Partial<BaseCharacter>) => setChar((c) => ({ ...c, ...patch }));
  const open = (k: number) => warnings.filter((w) => w.level !== "info" && steps[k].tabs.includes(w.tab ?? "")).length;
  const blocker = step?.blocker?.(char, d) ?? null;
  const go = (k: number) => {
    setI(k);
    setVisited((v) => new Set([...v, k]));
    window.scrollTo({ top: 0 });
  };
  const Summary = system.Summary;
  const Step = step?.Component;

  return (
    <div className="creation">
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

      <div className="layout">
        <main className="main">
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

          <div className="step-foot">
            <button type="button" className="btn ghost" onClick={() => (i === 0 ? onBack() : go(i - 1))}>
              ← {i === 0 ? "Books" : "Back"}
            </button>
            <span className="spacer" />
            {!review && (
              <>
                {blocker && <span className="muted">{blocker}</span>}
                {!blocker && open(i) > 0 && (
                  <button type="button" className="btn ghost" onClick={() => go(i + 1)} title="Leave the open choices for later; they stay on the sheet as to-dos">
                    Skip for now
                  </button>
                )}
                <button type="button" className="btn primary" disabled={!!blocker} onClick={() => go(i + 1)}>
                  {i === steps.length - 1 ? "Review →" : "Next →"}
                </button>
              </>
            )}
            {review && (
              <button type="button" className="btn primary" onClick={() => onCreate({ ...char, name: char.name.trim() || "Unnamed hero" })}>
                Create character
              </button>
            )}
          </div>
        </main>
        <aside className="side">
          <Summary c={char} d={d} />
        </aside>
      </div>
    </div>
  );
}
