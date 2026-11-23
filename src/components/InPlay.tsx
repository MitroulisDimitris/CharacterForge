// The player's own tracker (user, 2026-11-22; src/play.ts): HP with Damage / Heal / Temp HP (in the
// sidebar, always in view), and the Sheet's "In play" panel: death saves at 0 HP, conditions,
// exhaustion, concentration, limited-use features, Hit Dice and rests. Private: never sent to
// sessions, where the DM keeps the session's own state.
import { useEffect, useRef, useState } from "react";
import type { BaseCharacter, ResourcePool, TableCard } from "../systems/types";
import { CONDITIONS, DAMAGE_TYPES, EXHAUSTION, conditionOf, currentHp } from "../live";
import { deathSave, heal, longRest, setConc, setExh, setTempHp, spendHitDie, takeDamage, toggleCond, type PlayState } from "../play";
import { rest } from "../resources";
import { ResourcePips } from "./ResourcePips";
import { useDice } from "./Dice";

type Set = (patch: Partial<BaseCharacter>) => void;
const D20 = [{ n: 1, sides: 20 }];

/** Current / max / temp HP with an amount box and Damage, Heal, Temp HP. */
export function PlayHp({ c, card, set, compact = false, onDown }: { c: BaseCharacter; card: TableCard | null; set: Set; compact?: boolean; onDown?: () => void }) {
  const max = card?.hpMax ?? 0;
  const p: PlayState = c.play ?? {};
  const hp = currentHp(p, max);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [crit, setCrit] = useState(false);
  // A note belongs to the state it was written for: any later change (a rest, a level up, the
  // In play panel) hides it.
  const [noteFor, setNoteFor] = useState<{ play: PlayState | undefined; level: number; text: string[] }>({ play: undefined, level: 0, text: [] });
  const notes = noteFor.play === c.play && noteFor.level === c.level ? noteFor.text : [];
  const setNotes = (text: string[], play: PlayState | undefined = c.play) => setNoteFor({ play, level: c.level, text });
  if (!max) return null;
  const n = Math.floor(Number(amount));
  const ok = amount.trim() !== "" && Number.isFinite(n) && n > 0;
  const immune = !!type && (card?.immunities ?? []).some((x) => x.toLowerCase() === type.toLowerCase());
  const resist = !!type && (card?.resistances ?? []).some((x) => x.toLowerCase() === type.toLowerCase());
  const done = (play: PlayState, ns: string[] = []) => {
    set({ play });
    setNotes(ns, play);
    setAmount("");
    setType("");
    setCrit(false);
  };
  const damage = () => {
    if (immune) return (setNotes([`You're immune to ${type.toLowerCase()} damage: no damage.`]), setAmount(""), setType(""));
    const r = takeDamage(p, max, n, type, resist, false, crit);
    done(r.play, resist ? [`Halved: you resist ${type.toLowerCase()} damage.`, ...r.notes] : r.notes);
  };
  const pct = Math.round((hp / max) * 100);
  const tone = pct > 50 ? "ok" : pct > 0 ? "hurt" : "down";
  return (
    <section className={`play-hp ${compact ? "compact" : ""}`} aria-label="Hit points">
      <div className="play-hp-top">
        <span className="hero-label">Hit points</span>
        <span className="play-hp-num" aria-live="polite">
          <strong>{hp}</strong> / {max}
          {p.temp ? <em title="Temporary hit points">+{p.temp} temp</em> : null}
        </span>
      </div>
      <div className="hp-bar" role="img" aria-label={`${hp} of ${max} hit points${p.temp ? `, plus ${p.temp} temporary` : ""}`}>
        <div className={`hp-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {hp === 0 && (
        <button type="button" className="play-down" onClick={onDown}>
          {p.stable ? "Down but stable" : `Down · death saves ${p.saves?.ok ?? 0}✓ ${p.saves?.fail ?? 0}✗`}
        </button>
      )}
      <div className="play-hp-row">
        <label className="play-amount">
          <span className="sr-only">Amount</span>
          <input type="number" inputMode="numeric" min={1} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok && damage()} />
        </label>
        <label className="play-type">
          <span className="sr-only">Damage type (optional)</span>
          <select value={type} onChange={(e) => setType(e.target.value)} title="Damage type (optional): your resistances count">
            <option value="">Any type</option>
            {DAMAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
                {(card?.resistances ?? []).includes(t) ? " (resist)" : (card?.immunities ?? []).includes(t) ? " (immune)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="play-hp-btns">
        <button type="button" className="btn primary small" disabled={!ok} onClick={damage}>
          Damage
        </button>
        <button type="button" className="btn small" disabled={!ok} onClick={() => (({ play, notes }) => done(play, notes))(heal(p, max, n))}>
          Heal
        </button>
        <button type="button" className="btn ghost small" disabled={!ok} title="Temporary HP don't stack: this replaces them" onClick={() => done(setTempHp(p, n), [`Temporary HP: ${n}.`])}>
          Temp HP
        </button>
      </div>
      {hp === 0 && (
        <label className="check play-crit">
          <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /> It was a critical hit (two failed saves)
        </label>
      )}
      {notes.length > 0 && (
        <p className="play-note" role="status">
          {notes.join(" ")}
        </p>
      )}
    </section>
  );
}

/** The Sheet's "In play" panel. */
export function InPlayPanel({
  c,
  card,
  pools,
  set,
  concSpells,
  withHp,
}: {
  c: BaseCharacter;
  card: TableCard | null;
  pools: ResourcePool[];
  set: Set;
  /** Spells the character can concentrate on (for the picker). */
  concSpells: string[];
  /** Show the HP box here too (layouts without the sidebar). */
  withHp: boolean;
}) {
  const p: PlayState = c.play ?? {};
  const max = card?.hpMax ?? 0;
  const hp = max ? currentHp(p, max) : 1;
  const dice = useDice();
  const [noteFor, setNoteFor] = useState<{ play: PlayState | undefined; level: number; text: string[] }>({ play: undefined, level: 0, text: [] });
  const notes = noteFor.play === c.play && noteFor.level === c.level ? noteFor.text : [];
  // Dice results land later: they pass the state they made.
  const setNotes = (text: string[], play: PlayState | undefined = latest.current.c.play) => setNoteFor({ play, level: latest.current.c.level, text });
  const [resting, setResting] = useState<"" | "short" | "long">("");
  const [rolled, setRolled] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const savesRef = useRef<HTMLDivElement>(null);
  // Refs so a dice result applies to the newest state (the roll lands ~1 s later).
  const latest = useRef({ c, set });
  latest.current = { c, set };

  const die = card?.hitDie ?? 0;
  const total = card?.hitDiceTotal ?? 0;
  const con = card?.conMod ?? 0;
  const hdLeft = Math.max(0, total - (p.hdUsed ?? 0));
  const play = (next: PlayState, ns: string[] = []) => {
    set({ play: next });
    setNotes(ns, next);
  };
  const rollSave = () => {
    if (!dice) return;
    dice.roll({
      label: "Death saving throw",
      kind: "check",
      groups: D20,
      tone: "player",
      onDone: (_r, faces) => {
        const { c: now, set: setNow } = latest.current;
        const face = faces[0] ?? 0;
        const r = deathSave(now.play ?? {}, max, face);
        setNow({ play: r.play });
        setNotes(r.notes, r.play);
      },
    });
  };
  const rollHitDie = () => {
    if (!dice || !die) return;
    dice.roll({
      label: "Hit Die",
      kind: "heal",
      groups: [{ n: 1, sides: die }],
      parts: [{ label: "Constitution", value: con }],
      unit: "hit points",
      tone: "player",
      onDone: (r) => {
        const { c: now, set: setNow } = latest.current;
        const out = spendHitDie(now.play ?? {}, max, r.total, total);
        setNow({ play: out.play });
        setNotes(out.notes, out.play);
      },
    });
  };
  const typedHitDie = () => {
    const v = Math.floor(Number(rolled));
    if (!Number.isFinite(v) || v < 1 || v > die) return setNotes([`Type what the d${die} showed (1–${die}).`]);
    const r = spendHitDie(p, max, v + con, total);
    play(r.play, r.notes);
    setRolled("");
  };
  const finishShort = () => {
    set(rest(c, pools, "short"));
    setResting("");
    setNotes(["Short rest done: features that come back on a short rest are back."], c.play);
  };
  const doLong = () => {
    const r = longRest(p, total);
    set({ ...rest(c, pools, "long"), play: r.play });
    setResting("");
    setNotes(["Long rest done: spell slots and features are back.", ...r.notes], r.play);
  };
  const status = statusLine(p);

  return (
    <section className="in-play" aria-label="In play">
      <div className="in-play-head">
        <span className="hero-label">In play</span>
        <span className="muted in-play-private">Only you see this</span>
      </div>
      {withHp && <PlayHp c={c} card={card} set={set} onDown={() => savesRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })} />}

      {max > 0 && hp === 0 && (
        <div className="play-saves" ref={savesRef}>
          <strong>{p.stable ? "Stable at 0 HP" : "Death saving throws"}</strong>
          {!p.stable && (
            <>
              <div className="save-pips" role="group" aria-label="Successes">
                <span>Successes</span>
                {[0, 1, 2].map((i) => {
                  const on = i < (p.saves?.ok ?? 0);
                  return <button key={i} type="button" className={`save-pip ok ${on ? "on" : ""}`} aria-pressed={on} aria-label={`Success ${i + 1}`} onClick={() => play({ ...p, saves: { ok: on ? i : i + 1, fail: p.saves?.fail ?? 0 } })} />;
                })}
              </div>
              <div className="save-pips" role="group" aria-label="Failures">
                <span>Failures</span>
                {[0, 1, 2].map((i) => {
                  const on = i < (p.saves?.fail ?? 0);
                  return <button key={i} type="button" className={`save-pip fail ${on ? "on" : ""}`} aria-pressed={on} aria-label={`Failure ${i + 1}`} onClick={() => play({ ...p, saves: { ok: p.saves?.ok ?? 0, fail: on ? i : i + 1 } })} />;
                })}
              </div>
              {dice && (
                <button type="button" className="btn primary small" onClick={rollSave}>
                  Roll a death save
                </button>
              )}
              <p className="muted play-small">At the start of each of your turns: 10 or higher is a success. Three successes and you're stable; three failures and you die. A 20 brings you back with 1 HP.</p>
            </>
          )}
        </div>
      )}

      <button type="button" className={`play-status ${status.length ? "on" : ""}`} aria-haspopup="dialog" onClick={() => setStatusOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {status.length ? <path d="M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /> : <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>}
        </svg>
        <span className="play-status-text">
          <strong>Status</strong> · {status.length ? status.join(" · ") : "All clear"}
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {statusOpen && <StatusDialog p={p} card={card} concSpells={concSpells} play={play} onClose={() => setStatusOpen(false)} />}

      {pools.length > 0 && <ResourcePips c={c} pools={pools} set={set} noRests />}

      {total > 0 && (
        <div className="play-row">
          <span className="play-label">Hit Dice</span>
          <span>
            <strong>{hdLeft}</strong> of {total} left (d{die} {con >= 0 ? "+" : "−"} {Math.abs(con)} each)
          </span>
        </div>
      )}

      {resting === "short" && (
        <div className="play-rest">
          <strong>Short rest (at least 1 hour)</strong>
          {total > 0 && hp < max ? (
            <>
              <span className="muted play-small">Spend Hit Dice to heal: each heals d{die} + CON. Spend one, see the result, then decide.</span>
              <div className="play-hp-btns">
                {dice && (
                  <button type="button" className="btn small" disabled={!hdLeft} onClick={rollHitDie}>
                    Roll a Hit Die (d{die})
                  </button>
                )}
                <span className="play-typed">
                  <input type="number" inputMode="numeric" min={1} max={die} value={rolled} onChange={(e) => setRolled(e.target.value)} placeholder={`I rolled (1–${die})`} aria-label={`What your d${die} showed`} />
                  <button type="button" className="btn small ghost" disabled={!hdLeft || !rolled} onClick={typedHitDie}>
                    Add
                  </button>
                </span>
              </div>
            </>
          ) : total > 0 ? (
            <span className="muted play-small">You're at full HP: no need to spend Hit Dice.</span>
          ) : null}
          <div className="play-hp-btns">
            <button type="button" className="btn primary small" onClick={finishShort}>
              Finish short rest
            </button>
            <button type="button" className="btn ghost small" onClick={() => setResting("")}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {resting === "long" && (
        <div className="play-rest">
          <strong>Long rest (8 hours)?</strong>
          <span className="muted play-small">All HP, spell slots and features come back, plus half your Hit Dice (at least one).</span>
          <div className="play-hp-btns">
            <button type="button" className="btn primary small" onClick={doLong}>
              Take the long rest
            </button>
            <button type="button" className="btn ghost small" onClick={() => setResting("")}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {!resting && (
        <div className="play-hp-btns play-rests">
          <button type="button" className="btn small ghost" onClick={() => setResting("short")}>
            Short rest
          </button>
          <button type="button" className="btn small ghost" onClick={() => setResting("long")}>
            Long rest
          </button>
        </div>
      )}
      {notes.length > 0 && (
        <p className="play-note" role="status">
          {notes.join(" ")}
        </p>
      )}
    </section>
  );
}

/** One line for the Status button: active conditions, exhaustion, concentration. */
function statusLine(p: PlayState): string[] {
  const out = (p.conditions ?? []).filter((x) => x !== "concentrating").map((id) => conditionOf(id)?.name ?? id);
  if (p.exhaustion) out.push(`Exhaustion ${p.exhaustion}`);
  if (p.conc) out.push(`Concentrating on ${p.conc}`);
  return out;
}

/** Conditions, exhaustion and concentration, in a panel that opens from the Status line
 *  (user, 2026-11-23: "popping up only if necessary"). A sheet from the bottom on phones. */
function StatusDialog({ p, card, concSpells, play, onClose }: { p: PlayState; card: TableCard | null; concSpells: string[]; play: (next: PlayState, notes?: string[]) => void; onClose: () => void }) {
  const [concText, setConcText] = useState("");
  const concLeft = p.conc;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-backdrop status-backdrop" role="dialog" aria-modal="true" aria-label="Status" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal status-modal">
        <header className="modal-hero compact status-head">
          <h2>Status</h2>
          <button type="button" className="dice-card-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="modal-body status-body">
          <div className="play-row">
            <span className="play-label">Conditions</span>
            <div className="cond-toggle" role="group" aria-label="Conditions">
              {CONDITIONS.filter((x) => x.id !== "concentrating").map((cd) => {
                const on = !!p.conditions?.includes(cd.id);
                return (
                  <button key={cd.id} type="button" className={`cond-btn ${on ? "on" : ""}`} aria-pressed={on} title={cd.text} onClick={() => play(toggleCond(p, cd.id))}>
                    {cd.name}
                  </button>
                );
              })}
            </div>
            {(p.conditions ?? [])
              .filter((x) => x !== "concentrating")
              .map((id) => (
                <p key={id} className="muted play-small status-cond-text">
                  <strong>{conditionOf(id)?.name ?? id}:</strong> {conditionOf(id)?.text}
                </p>
              ))}
          </div>

          <div className="play-row">
            <span className="play-label">Exhaustion</span>
            <span className="stepper" role="group" aria-label="Exhaustion level">
              <button type="button" aria-label="One level less" disabled={!p.exhaustion} onClick={() => play(setExh(p, (p.exhaustion ?? 0) - 1))}>
                −
              </button>
              <strong>{p.exhaustion ?? 0}</strong>
              <button type="button" aria-label="One level more" disabled={(p.exhaustion ?? 0) >= 6} onClick={() => play(setExh(p, (p.exhaustion ?? 0) + 1))}>
                +
              </button>
            </span>
            {p.exhaustion ? <span className="muted play-small">{EXHAUSTION.slice(1, (p.exhaustion ?? 0) + 1).join(" · ")}</span> : null}
          </div>

          <div className="play-row">
            <span className="play-label">Concentrating</span>
            {concLeft ? (
              <span className="play-conc">
                <strong>{concLeft}</strong>
                <button type="button" className="btn small ghost" onClick={() => play(setConc(p, ""))}>
                  End
                </button>
                <span className="muted play-small">Taking damage: Constitution save, DC 10 or half the damage{card?.conSave != null ? ` (you add ${card.conSave >= 0 ? "+" : ""}${card.conSave})` : ""}.</span>
              </span>
            ) : (
              <span className="play-conc">
                <select
                  value=""
                  aria-label="Start concentrating on a spell"
                  onChange={(e) => {
                    if (e.target.value === "__other") return setConcText(" ");
                    if (e.target.value) play(setConc(p, e.target.value));
                  }}
                >
                  <option value="">Not concentrating</option>
                  {concSpells.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__other">Another spell…</option>
                </select>
                {concText && (
                  <form
                    className="play-conc-other"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (concText.trim()) play(setConc(p, concText));
                      setConcText("");
                    }}
                  >
                    <input autoFocus value={concText.trimStart()} maxLength={60} onChange={(e) => setConcText(e.target.value || " ")} placeholder="Spell name" aria-label="Spell name" />
                    <button type="submit" className="btn small">
                      Start
                    </button>
                  </form>
                )}
              </span>
            )}
          </div>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
