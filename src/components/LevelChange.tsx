// Level changes as a promotion (or demotion): show gains/losses, then walk through new choices.
import { useMemo, useState } from "react";
import type { AnySystem, BaseCharacter, DerivedBase, Gain, StatLine, Unlock } from "../systems/types";

type Mode = { kind: "change"; target: number } | { kind: "resume"; ids: string[] };

interface Props {
  system: AnySystem;
  char: BaseCharacter;
  books: string[];
  pending: string[];
  mode: Mode;
  onCommit: (char: BaseCharacter, pending: string[]) => void;
  onClose: () => void;
}

/** All unlocks for levels in (from, to], generated with each level's own context. */
export function unlocksBetween(system: AnySystem, char: BaseCharacter, books: string[], from: number, to: number): Unlock[] {
  const out: Unlock[] = [];
  for (let l = from + 1; l <= to; l++) {
    const c = { ...char, level: l };
    out.push(...system.progression.unlocksAt(c, system.derive(c, books), l));
  }
  return out;
}

function gainsBetween(system: AnySystem, char: BaseCharacter, books: string[], from: number, to: number) {
  const out: { level: number; gains: Gain[] }[] = [];
  for (let l = from + 1; l <= to; l++) {
    const c = { ...char, level: l };
    out.push({ level: l, gains: system.progression.gainsAt(c, system.derive(c, books), l) });
  }
  return out;
}

/** Pending unlocks still waiting for this character (not done, not above its level). */
export function openUnlocks(system: AnySystem, char: BaseCharacter, books: string[], pending: string[]): Unlock[] {
  if (!pending.length) return [];
  const d = system.derive(char, books);
  return unlocksBetween(system, char, books, 0, char.level).filter((u) => pending.includes(u.id) && !(u.isDone?.(d) ?? false));
}

function StatDiff({ before, after, down }: { before: StatLine[]; after: StatLine[]; down?: boolean }) {
  const rows = after.map((a, i) => ({ label: a.label, from: before[i]?.value, to: a.value })).filter((r) => String(r.from) !== String(r.to));
  if (!rows.length) return null;
  return (
    <table className="stat-diff">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td className="muted">{r.from}</td>
            <td aria-hidden="true">→</td>
            <td className={down ? "down" : "up"}>
              <strong>{r.to}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GainList({ groups, lost }: { groups: { level: number; gains: Gain[] }[]; lost?: boolean }) {
  return (
    <div className="gain-groups">
      {groups
        .filter((g) => g.gains.length)
        .map((g) => (
          <section key={g.level}>
            <h4>Level {g.level}</h4>
            <ul className="gain-list">
              {g.gains.map((x) => (
                <li key={x.name} className={lost ? "lost" : ""}>
                  <strong>{x.name}</strong>
                  <p>{x.text}</p>
                  {x.tip && !lost && <p className="tip">💡 {x.tip}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

export function LevelChangeDialog({ system, char: liveChar, books, pending, mode, onCommit, onClose }: Props) {
  // Freeze the character as it was when the dialog opened; edits go to `current`.
  const [char] = useState(liveChar);
  const from = char.level;
  const target = mode.kind === "change" ? mode.target : from;
  const up = mode.kind === "change" && target > from;
  const [stage, setStage] = useState<"summary" | "choose" | "finish">(mode.kind === "resume" ? "choose" : "summary");
  const [current, setCurrent] = useState<BaseCharacter>(char);
  const [pend, setPend] = useState<string[]>(pending);
  const [step, setStep] = useState(0);

  const before = useMemo(() => system.derive(char, books), [system, char, books]);
  const promoted = useMemo(() => ({ ...char, level: target }), [char, target]);
  const after = useMemo(() => system.derive(up ? promoted : system.progression.demote(char, target, books).c, books), [system, promoted, up, char, target, books]);
  const gains = useMemo(() => (up ? gainsBetween(system, char, books, from, target) : gainsBetween(system, char, books, target, from)), [system, char, books, from, target, up]);
  const demotion = useMemo(() => (!up && mode.kind === "change" ? system.progression.demote(char, target, books) : null), [system, char, target, books, up, mode.kind]);

  /** The choices to walk through. */
  const steps: Unlock[] = useMemo(() => {
    if (mode.kind === "resume") return unlocksBetween(system, char, books, 0, char.level).filter((u) => mode.ids.includes(u.id));
    return up ? unlocksBetween(system, char, books, from, target) : [];
  }, [system, char, books, from, target, up, mode]);
  const required = steps.filter((u) => !u.optional);

  const dNow: DerivedBase = useMemo(() => system.derive(current, books), [system, current, books]);
  const unlock = steps[step];
  const tab = unlock ? system.tabs.find((t) => t.id === unlock.tab) ?? system.tabs[0] : undefined;
  const done = unlock?.isDone ? unlock.isDone(dNow) : undefined;
  /** Live rule checks for this step's tab, so the player sees exactly what's missing. */
  const notes = unlock ? dNow.warnings.filter((w) => w.tab === unlock.tab && w.level !== "info").slice(0, 4) : [];

  const commit = (c: BaseCharacter, p: string[]) => {
    setCurrent(c);
    setPend(p);
    onCommit(c, p);
  };
  const setChar = (patch: Partial<BaseCharacter>) => commit({ ...current, ...patch }, pend);

  const startChoosing = () => {
    const p = [...new Set([...pend, ...required.map((u) => u.id)])];
    commit(promoted, p);
    setStep(0);
    setStage(steps.length ? "choose" : "finish");
  };
  const applyLater = () => {
    commit(promoted, [...new Set([...pend, ...required.map((u) => u.id)])]);
    onClose();
  };
  const next = (markDone: boolean) => {
    if (unlock) {
      const keep = !markDone && !unlock.optional;
      const p = keep ? [...new Set([...pend, unlock.id])] : pend.filter((x) => x !== unlock.id);
      commit(current, p);
    }
    if (step + 1 < steps.length) setStep(step + 1);
    else if (mode.kind === "resume") onClose();
    else setStage("finish");
  };

  const waiting = openUnlocks(system, current, books, pend);
  const Tab = tab?.Component;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={up ? "Level up" : "Level change"}>
      <div className={`modal ${up || mode.kind === "resume" ? "promo" : "demote"}`}>
        {stage === "summary" && up && (
          <>
            <header className="modal-hero">
              <span className="hero-kicker">Promotion</span>
              <h2>
                Level {from} → {target}
              </h2>
              <p>
                {char.name} grows stronger. Here's what you gain{required.length ? `, and ${required.length} choice${required.length > 1 ? "s" : ""} to make` : ""}.
              </p>
            </header>
            <div className="modal-body">
              <StatDiff before={system.progression.snapshot(before)} after={system.progression.snapshot(after)} />
              <GainList groups={gains} />
              {steps.length > 0 && (
                <>
                  <h4>New choices</h4>
                  <ul className="choice-preview">
                    {steps.map((u) => (
                      <li key={u.id} className={u.optional ? "optional" : ""}>
                        <span className="pill">Level {u.level}</span> {u.title}
                        {u.optional && <small className="muted"> (optional)</small>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <footer className="modal-foot">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn ghost" onClick={applyLater}>
                Level up, choose later
              </button>
              <button type="button" className="btn primary" onClick={startChoosing}>
                {steps.length ? "Level up & choose now" : "Level up"}
              </button>
            </footer>
          </>
        )}

        {stage === "summary" && !up && demotion && (
          <>
            <header className="modal-hero">
              <span className="hero-kicker">Level down</span>
              <h2>
                Level {from} → {target}
              </h2>
              <p>Going back a level removes what those levels gave you.</p>
            </header>
            <div className="modal-body">
              <StatDiff before={system.progression.snapshot(before)} after={system.progression.snapshot(after)} down />
              <h4>You lose what {target + 1 === from ? `level ${from}` : `levels ${target + 1}–${from}`} gave you</h4>
              <GainList groups={gains} lost />
              {demotion.removed.length > 0 && (
                <>
                  <h4>Choices that no longer fit</h4>
                  <ul className="removed-list">
                    {demotion.removed.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <footer className="modal-foot">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              {demotion.removed.length > 0 && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    onCommit({ ...char, level: target }, pend.filter((id) => parseInt(id) <= target));
                    onClose();
                  }}
                >
                  Lower level, keep my choices
                </button>
              )}
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  onCommit(demotion.c, pend.filter((id) => parseInt(id) <= target));
                  onClose();
                }}
              >
                {demotion.removed.length ? "Lower level & remove them" : "Lower level"}
              </button>
            </footer>
          </>
        )}

        {stage === "choose" && unlock && Tab && (
          <>
            <header className="modal-hero compact">
              <span className="hero-kicker">
                Choice {step + 1} of {steps.length} · Level {unlock.level}
              </span>
              <h2>{unlock.title}</h2>
              <p>{unlock.detail}</p>
              {done !== undefined && <span className={`counter ${done ? "ok" : "under"}`}>{done ? "✓ Done" : "Not done yet"}</span>}
              {notes.length > 0 && (
                <ul className="step-notes">
                  {notes.map((w) => (
                    <li key={w.text}>{w.text}</li>
                  ))}
                </ul>
              )}
            </header>
            <div className="modal-body embedded-tab">
              <Tab c={current} d={dNow} set={setChar} books={books} />
            </div>
            <footer className="modal-foot">
              <span className="muted">{unlock.optional ? "Optional" : "You can skip this and finish it later from the to-do list."}</span>
              <button type="button" className="btn ghost" onClick={() => next(false)}>
                {unlock.optional ? "Skip" : "Skip for later"}
              </button>
              <button type="button" className="btn primary" onClick={() => next(true)} disabled={done === false}>
                {step + 1 < steps.length ? "Done, next" : "Done"}
              </button>
            </footer>
          </>
        )}

        {stage === "finish" && (
          <>
            <header className="modal-hero">
              <span className="hero-kicker">Welcome to level {target}</span>
              <h2>{current.name} is now level {target}</h2>
              <p>{waiting.length ? `${waiting.length} choice${waiting.length > 1 ? "s are" : " is"} saved for later; you'll find them at the top of the sheet.` : "Everything for this level is chosen. Good luck out there!"}</p>
            </header>
            {waiting.length > 0 && (
              <div className="modal-body">
                <ul className="choice-preview">
                  {waiting.map((u) => (
                    <li key={u.id}>
                      <span className="pill">Level {u.level}</span> {u.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <footer className="modal-foot">
              <button type="button" className="btn primary" onClick={onClose}>
                Back to the sheet
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
