// Dice on the screen (REQUIREMENTS 4.6): the 3D table over the whole page, the result window, the
// gold roll chips, "Next roll: Normal · Advantage · Disadvantage" and the free roller.
// Rolls show on your own screen only. Dice fade 2 s after they land; the result window stays
// ~8 s and holds while the pointer, a finger or the keyboard focus is on it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DiceTable } from "../dice/engine";
import { diceFor, parseDice, randomFace, resultOf, usesD20, type Advantage, type DiceGroup, type RollResult, type RollSpec } from "../dice/roll";
import { quipFor } from "../dice/quips";

const CARD_MS = 8000;
const CARD_AFTER_HOLD_MS = 3000;

interface DiceApi {
  roll: (spec: RollSpec) => void;
  next: Advantage;
  setNext: (a: Advantage) => void;
}
const DiceCtx = createContext<DiceApi | null>(null);
/** Chips only roll where rolling makes sense (a character's tabs, monster pages, the wiki). */
const ScopeCtx = createContext(false);

export const useDice = () => useContext(DiceCtx);
export const RollScope = ({ children, on = true }: { children: ReactNode; on?: boolean }) => <ScopeCtx.Provider value={on}>{children}</ScopeCtx.Provider>;

const isCompact = () => window.innerWidth < 720;
const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function DiceProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const table = useRef<DiceTable | null>(null);
  const rollId = useRef(0);
  const timer = useRef(0);
  const leaveTimer = useRef(0);
  const hold = useRef(false);
  /** Dice on the table or a result showing (Esc clears them). */
  const busy = useRef(false);
  const [card, setCard] = useState<{ id: number; spec: RollSpec; res: RollResult; quip: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [next, setNext] = useState<Advantage>("normal");
  const nextRef = useRef(next);
  nextRef.current = next;

  const clearTimers = () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(leaveTimer.current);
  };
  const arm = useCallback((ms: number) => {
    clearTimers();
    timer.current = window.setTimeout(() => {
      if (hold.current) return;
      setLeaving(true);
      leaveTimer.current = window.setTimeout(() => {
        busy.current = false;
        setCard(null);
        setLeaving(false);
      }, 320);
    }, ms);
  }, []);
  const close = useCallback(() => {
    clearTimers();
    hold.current = false;
    busy.current = false;
    rollId.current++;
    setCard(null);
    setLeaving(false);
    table.current?.clear();
  }, []);

  const roll = useCallback(
    (spec0: RollSpec) => {
      const cv = canvasRef.current;
      if (!cv) return;
      if (!table.current) table.current = new DiceTable(cv);
      let spec = spec0;
      if (usesD20(spec.kind) && spec.adv == null && nextRef.current !== "normal") {
        spec = { ...spec, adv: nextRef.current };
        setNext("normal");
      }
      const id = ++rollId.current;
      busy.current = true;
      clearTimers();
      hold.current = false;
      setCard(null);
      setLeaving(false);
      const dice = diceFor(spec);
      const reduced = reducedMotion();
      table.current
        .throw(dice, { compact: isCompact(), reduced, faces: reduced ? dice.map((d) => randomFace(d.sides)) : undefined })
        .then((faces) => {
          if (id !== rollId.current) return;
          const res = resultOf(spec, dice, faces);
          table.current?.setDropped(res.dropped);
          setCard({ id, spec, res, quip: quipFor(spec, dice, faces, res) });
          spec.onDone?.(res, faces);
          arm(CARD_MS);
        });
    },
    [arm],
  );

  useEffect(() => {
    const onResize = () => table.current?.resize();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && busy.current && close();
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      clearTimers();
      table.current?.destroy();
    };
  }, [close]);

  const api = useMemo(() => ({ roll, next, setNext }), [roll, next]);
  const holdOn = () => {
    hold.current = true;
    clearTimers();
    setLeaving(false);
  };
  const holdOff = () => {
    hold.current = false;
    if (card) arm(CARD_AFTER_HOLD_MS);
  };

  return (
    <DiceCtx.Provider value={api}>
      {children}
      <div className="dice-layer">
        <canvas ref={canvasRef} className="dice-canvas" aria-hidden="true" />
        {card && (
          <div
            key={card.id}
            className={`dice-card ${leaving ? "leaving" : ""} ${card.res.gold ? "gold" : ""}`}
            role="status"
            aria-live="polite"
            onMouseEnter={holdOn}
            onMouseLeave={holdOff}
            onFocus={holdOn}
            onBlur={holdOff}
            onTouchStart={holdOn}
            onTouchEnd={holdOff}
          >
            <div className="dice-card-top">
              <span className="dice-card-label">{card.spec.label}</span>
              <button type="button" className="dice-card-x" onClick={close} aria-label="Close the result">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="dice-card-total">
              <strong>{card.res.total}</strong>
              {card.res.unit && <span>{card.res.unit}</span>}
            </div>
            {card.res.note && <p className="dice-card-note">{card.res.note}</p>}
            {card.quip && <p className="dice-card-quip">{card.quip}</p>}
            {card.res.lines.length > 0 && (
              <dl className="dice-card-lines">
                {card.res.lines.map((l, i) => (
                  <div key={i}>
                    <dt>{l.k}</dt>
                    <dd>{l.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {card.res.sub && <p className="dice-card-sub">{card.res.sub}</p>}
            <div className="dice-card-actions">
              <button type="button" className="btn ghost small dice-again" onClick={() => roll({ ...card.spec, onDone: undefined })}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                  <path d="M20 4v7h-7" />
                </svg>
                Roll again
              </button>
            </div>
          </div>
        )}
      </div>
    </DiceCtx.Provider>
  );
}

export const DieIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2l9 5v10l-9 5-9-5V7z" />
    <path d="M12 7l5 9H7z" />
  </svg>
);

/** A gold, tappable roll ("+5", "2d10 + 6"). Outside a roll scope it's plain text. */
export function RollChip({
  spec,
  children,
  label,
  className = "",
  fire,
  icon = true,
}: {
  spec: RollSpec | (() => RollSpec);
  children: ReactNode;
  /** Read out by screen readers ("Roll Dexterity check, plus 3"). */
  label?: string;
  className?: string;
  /** Fire damage: orange chip. */
  fire?: boolean;
  icon?: boolean;
}) {
  const dice = useDice();
  const scope = useContext(ScopeCtx);
  if (!dice || !scope) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      className={`roll-chip ${fire ? "fire" : ""} ${className}`}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        dice.roll(typeof spec === "function" ? spec() : spec);
      }}
    >
      {icon && <DieIcon />}
      {children}
    </button>
  );
}

/** "Next roll: Normal · Advantage · Disadvantage". Goes back to Normal after a d20 roll. */
export function NextRoll() {
  const dice = useDice();
  if (!dice) return null;
  const opts: [Advantage, string][] = [
    ["normal", "Normal"],
    ["adv", "Advantage"],
    ["dis", "Disadvantage"],
  ];
  return (
    <div className="next-roll">
      <span className="next-roll-label">Next roll</span>
      <div className="seg" role="group" aria-label="Next roll">
        {opts.map(([k, l]) => (
          <button key={k} type="button" className={`seg-btn ${k} ${dice.next === k ? "on" : ""}`} aria-pressed={dice.next === k} onClick={() => dice.setNext(k)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const FREE_DICE = [4, 6, 8, 10, 12, 20, 100];

/** The free roller: only real dice, a − / + counter on each, then Throw. */
export function FreeRoller({ onThrown }: { onThrown?: () => void }) {
  const dice = useDice();
  const [counts, setCounts] = useState<Record<number, number>>({ 20: 1 });
  if (!dice) return null;
  const total = FREE_DICE.reduce((s, d) => s + (counts[d] ?? 0), 0);
  const bump = (d: number, by: number) => setCounts((c) => ({ ...c, [d]: Math.max(0, Math.min(20, (c[d] ?? 0) + by)) }));
  const groups: DiceGroup[] = FREE_DICE.filter((d) => counts[d]).map((d) => ({ n: counts[d], sides: d }));
  return (
    <div className="free-roller">
      <ul className="free-dice">
        {FREE_DICE.map((d) => (
          <li key={d} className={counts[d] ? "on" : ""}>
            <span className="free-die">d{d}</span>
            <span className="free-count">
              <button type="button" onClick={() => bump(d, -1)} disabled={!counts[d]} aria-label={`One less d${d}`}>
                −
              </button>
              <output aria-label={`d${d} count`}>{counts[d] ?? 0}</output>
              <button type="button" onClick={() => bump(d, 1)} aria-label={`One more d${d}`}>
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="free-actions">
        <button type="button" className="link" onClick={() => setCounts({})} disabled={!total}>
          Clear
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!total}
          onClick={() => {
            dice.roll({ label: `Free roll · ${groups.map((g) => `${g.n}d${g.sides}`).join(" + ")}`, kind: "free", groups, tone: "player" });
            onThrown?.();
          }}
        >
          Throw {total} {total === 1 ? "die" : "dice"}
        </button>
      </div>
    </div>
  );
}

/** The "Dice" button: opens the free roller (a popover on PC, a panel from the bottom on a phone). */
export function DiceButton() {
  const dice = useDice();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (!dice) return null;
  return (
    <div className="dice-btn-wrap" ref={ref}>
      <button type="button" className={`btn dice-btn ${open ? "on" : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <DieIcon size={18} />
        Dice
      </button>
      {open && (
        <div className="dice-pop" role="dialog" aria-label="Throw dice">
          <div className="dice-pop-head">
            <strong>Throw dice</strong>
            <button type="button" className="dice-card-x" onClick={() => setOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <FreeRoller onThrown={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** A dice expression in text as a chip ("2d10 + 6" → damage roll). Falls back to plain text. */
export function DiceText({ text, label, unit, tone, half, fire, kind = "damage" }: { text: string; label: string; unit?: string; tone: "monster" | "player"; half?: boolean; fire?: boolean; kind?: RollSpec["kind"] }) {
  const p = parseDice(text);
  if (!p) return <>{text}</>;
  return (
    <RollChip
      fire={fire}
      label={`Roll ${text}${unit ? ` ${unit}` : ""}`}
      spec={{ label, kind, groups: p.groups.map((g) => ({ ...g, tone: fire ? "fire" : undefined })), bonus: p.bonus, unit, tone, half }}
    >
      {text}
    </RollChip>
  );
}

/** True where gold chips roll (inside a RollScope, with the dice table mounted). */
export const useCanRoll = () => !!useContext(DiceCtx) && useContext(ScopeCtx);
