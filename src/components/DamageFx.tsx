// A damage (or healing) total with its type's animation (user, 2026-11-25; mockup canvas "Session
// Versions and Table Dice", page "Damage animations", boards "Every damage type" and "How it was dealt").
// Each type tells a short story with GSAP while a WebGL shader draws its effect across the whole row or
// card (src/dice/fxEngine.ts). Fire and piercing open differently when we know how the damage was dealt
// (ranged, melee, area). Styles: src/damageFx.css.
import { useLayoutEffect, useRef } from "react";
import "../damageFx.css";
import { runFx, type FxVia } from "../dice/fxEngine";

export const FX_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const;
export type FxType = (typeof FX_TYPES)[number] | "healing";

/** The animation for a roll's unit ("fire", "lightning or thunder", "hit points back"…), or null. */
export function fxTypeOf(unit: string): FxType | null {
  const u = unit.toLowerCase();
  if (/hit points back|temporary hit points|healing/.test(u)) return "healing";
  for (const t of FX_TYPES) if (new RegExp(`\\b${t}\\b`).test(u)) return t;
  return null;
}

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** How a roll shows its type: "play" runs the animation (a roll that just came in), "rest" shows its held
 *  last picture, "plain" just the coloured banner with the word and number. */
export type FxMode = "play" | "rest" | "plain";

/**
 * The tint, the effect's canvas and layer, and the type word + total. Goes inside the row or card, which
 * needs the classes `fx-row lf-<type>` (position, clipping, the type's colours).
 */
export function DamageFx({
  type,
  via,
  word,
  total,
  mode = "play",
  big = false,
}: {
  type: FxType;
  via?: FxVia | null;
  word: string;
  total: number;
  mode?: FxMode;
  /** The result card's size. */
  big?: boolean;
}) {
  const tint = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLElement>(null);
  const plain = mode === "plain";
  useLayoutEffect(() => {
    const host = canvas.current?.parentElement;
    if (plain || !host || !canvas.current || !layer.current || !tint.current || !end.current || !num.current) return;
    const fx = runFx(
      { host, canvas: canvas.current, layer: layer.current, tint: tint.current, end: end.current, num: num.current },
      type,
      via,
      mode === "play" && !reducedMotion() ? "play" : "rest",
    );
    // A held picture is drawn again when the row changes width (the window resized).
    let w = host.clientWidth;
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (host.clientWidth === w) return;
      w = host.clientWidth;
      fx.redraw();
    }) : null;
    ro?.observe(host);
    return () => {
      ro?.disconnect();
      fx.stop();
    };
    // Runs when the row appears (or its type changes), not on every poll: a roll that came in keeps
    // playing when the list re-renders it as "rest".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, via, plain]);
  return (
    <>
      <span ref={tint} className="fx-tint" aria-hidden="true" />
      {!plain && <canvas ref={canvas} className="fx-gl" aria-hidden="true" />}
      {!plain && <span ref={layer} className="fx-layer" aria-hidden="true" />}
      <span ref={end} className={`fx-end${big ? " big" : ""}${plain ? " lit" : ""}`}>
        <span className="fx-tag">{word}</span>
        <strong ref={num} className="fx-num">
          {total}
        </strong>
      </span>
    </>
  );
}
