// The Progression tab: the character's class as a tree, bottom to top, one row per level (approved
// mockup: canvas "Progression Tree", boards 4–6). One trunk up the middle carries the level numbers;
// each level's steps branch left and right. Tap a step to read it; choices glow gold and can be made
// right here. A level-up tells the class's story on the tree, then the "Level up!" card shows (at
// the class's top level, the big final story for Sorcerer, Fighter and Wizard).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ProgressProps } from "../../types";
import type { Character } from "../character";
import type { Derived } from "../derive";
import { buildTree, nameOf, optionOf, picked, pickPatch, statusOf, type Status, type TreeNode } from "../tree/build";
import { ICONS, STORY_CLASSES } from "../tree/looks";
import { TreeFx, partyFx, reducedMotion, storyFx } from "../tree/fx";
import "../../../tree.css";

// The mockup's styles are CSS text; React wants objects. Parsed once per distinct string.
const sxCache = new Map<string, CSSProperties>();
function sx(s: string): CSSProperties {
  const hit = sxCache.get(s);
  if (hit) return hit;
  const o: Record<string, string> = {};
  let depth = 0, from = 0;
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      parts.push(s.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(s.slice(from));
  for (const p of parts) {
    const k = p.indexOf(":");
    if (k < 0) continue;
    const name = p.slice(0, k).trim();
    if (!name) continue;
    const key = name.replace(/^-webkit-/, "Webkit-").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    o[key] = p.slice(k + 1).trim();
  }
  if (sxCache.size > 4000) sxCache.clear();
  sxCache.set(s, o as CSSProperties);
  return o as CSSProperties;
}

const CLIP: Record<string, string> = {
  jag: "polygon(50% 0, 64% 10%, 84% 6%, 92% 26%, 100% 46%, 90% 64%, 96% 84%, 74% 92%, 54% 100%, 34% 92%, 12% 96%, 6% 74%, 0 54%, 8% 34%, 4% 12%, 26% 8%)",
  kite: "polygon(50% 0, 100% 20%, 90% 64%, 50% 100%, 10% 64%, 0 20%)",
  gemUp: "polygon(50% 0, 100% 40%, 82% 100%, 18% 100%, 0 40%)",
  gemDown: "polygon(18% 0, 82% 0, 100% 60%, 50% 100%, 0 60%)",
  oct: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)",
  hex: "polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)",
};

interface Fx {
  sel: string;
  sheet: boolean;
  all: boolean;
  /** The level being (or just) told. */
  just: number;
  told: number;
  igniting: boolean;
  justPick: string;
  party: number;
  story: number;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function ProgressionTab({ c, d, set, books, celebrate, onCelebrated, onLevelUp, sidebarLevelUp, onTab }: ProgressProps<Character, Derived>) {
  const tree = useMemo(() => buildTree(c, d, books), [c, d, books]);
  const T = tree.look, cls = tree.cls, lv = tree.level, maxLevel = tree.maxLevel;
  const handled = useRef(0);
  const [st, setStRaw] = useState<Fx>(() => ({
    sel: "", sheet: false, all: false, justPick: "", party: 0, story: 0, told: 0,
    just: celebrate ? celebrate.level : 0,
    igniting: !!celebrate && !reducedMotion(),
  }));
  const setSt = (p: Partial<Fx>) => setStRaw((s) => ({ ...s, ...p }));

  // ---------- size: the PC tree (700 px) with its panel beside it, or the phone tree with a sheet
  const wrapRef = useRef<HTMLElement>(null);
  const [cw, setCw] = useState(() => (typeof window === "undefined" ? 1200 : Math.max(280, window.innerWidth - 40)));
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCw(Math.round(el.clientWidth) || cw);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wide = cw >= 1060;
  const compact = cw < 720;

  // ---------- the living background and the level-up story
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<TreeFx | null>(null);
  const live = useRef({ cls, lv, maxLevel });
  live.current = { cls, lv, maxLevel };
  useEffect(() => {
    if (!canvasRef.current || !cardRef.current) return;
    const fx = new TreeFx(canvasRef.current, cardRef.current, () => live.current);
    fxRef.current = fx;
    return () => {
      fx.destroy();
      fxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!celebrate || handled.current === celebrate.n) return;
    handled.current = celebrate.n;
    const level = celebrate.level;
    const final = level >= maxLevel && STORY_CLASSES.includes(cls);
    const finish = () => {
      setSt({ igniting: false, told: level, ...(final ? { story: level } : { party: level }) });
      onCelebrated?.();
    };
    setSt({ just: level, told: 0, igniting: !reducedMotion(), party: 0, story: 0, justPick: "", sheet: false });
    // the story is told on the tree: make sure it's in sight (phones scroll)
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    const t = window.setTimeout(() => (fxRef.current ? fxRef.current.tell(level, cls, finish) : finish()), 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate?.n]);

  // ---------- the tree's geometry: one trunk up the middle, steps branching left and right
  const nodesAll = tree.nodes;
  const byId = useMemo(() => Object.fromEntries(nodesAll.map((n) => [n.id, n])), [nodesAll]);
  const W = compact ? Math.max(260, Math.min(cw, 400)) : 700;
  const H = compact ? 600 : 626;
  const kx = compact ? W / 358 : 1;
  const CX = W / 2;
  const Y = (r: number) => (compact ? 542 - r * 92 : 572 - r * 100);
  const NS = compact ? 46 : 62, RS = compact ? 60 : 84;
  const NEAR = (compact ? 76 : 122) * kx, FAR = (compact ? 140 : 236) * kx;
  const PX: Record<string, number> = { root: CX };
  const PARENT: Record<string, string> = {};
  for (let r = 1; r <= maxLevel; r++) {
    const row = nodesAll.filter((n) => n.r === r);
    const A = r % 2 ? -1 : 1;
    const slotX = [CX + A * NEAR, CX - A * NEAR, CX + A * FAR, CX - A * FAR];
    const rv = row.find((n) => n.reveal);
    const rest = row.filter((n) => !n.reveal && (!rv || n.id !== rv.reveal));
    // A second step on a side hangs off the first (the power a choice reveals hangs off that choice),
    // so no line runs behind a step.
    const order = rv ? [byId[rv.reveal!], rest[0], rv, rest[1]] : [rest[0], rest[1], rest[2], rest[3]];
    order.forEach((n, k) => {
      if (!n) return;
      PX[n.id] = slotX[k];
      if (k >= 2 && order[k - 2]) PARENT[n.id] = order[k - 2].id;
    });
  }

  const { just, told, igniting, justPick, all } = st;
  const status = (n: TreeNode): Status => statusOf(tree, n, lv);
  const choiceNode = nodesAll.find((n) => n.choice && status(n) === "choose") ?? nodesAll.find((n) => n.choice) ?? nodesAll[0];
  const sel = st.sel && byId[st.sel] ? st.sel : choiceNode.id;
  const LANE: Record<string, [string, string]> = { root: ["Class", T.accent], cls: ["Class", "#e8d3a6"], sub: [T.subLane, "#e0485e"], spl: ["Spells", "#8fb6e3"], gro: ["Growth", "#6fbf73"] };

  // lines
  const edges: { d: string; row: number; color: string; w: number; style: string }[] = [];
  const flows: { d: string; row: number; w: number; style: string }[] = [];
  for (const b of nodesAll) {
    if (b.id === "root") continue;
    const a = PARENT[b.id] ? byId[PARENT[b.id]] : null;
    const sa = a ? status(a) : b.r <= lv ? "have" : "later", sb = status(b);
    const bx = PX[b.id], by = Y(b.r);
    let path: string;
    if (a) {
      const ax = PX[a.id];
      path = `M${ax},${by} Q${(ax + bx) / 2},${by - 16} ${bx},${by}`;
    } else {
      const sxp = CX + (bx > CX ? 11 : -11);
      path = `M${sxp},${by} Q${(sxp + bx) / 2},${by - 24} ${bx},${by}`;
    }
    const top = a ? Math.max(a.r, b.r) : b.r;
    // a level being told (the story draws it) starts hidden; once told it just stays drawn
    const hide = igniting && top === just, quiet = !!told && top === told;
    const delay = top === just || (justPick && ((a && a.id === justPick) || b.id === justPick)) ? 150 : 200 + top * 170;
    const w = compact ? 2.5 : 3;
    if (sa === "later" || sb === "later" || sa === "waiting" || sb === "waiting")
      edges.push({ d: path, row: top, color: "#4a3b2e", w: 2, style: `stroke-dasharray: .045 .03; opacity: 0; animation: pt-fadein .6s ease ${delay}ms forwards` });
    else if (sa === "choose" || sb === "choose")
      edges.push({ d: path, row: top, color: "#d4a64a", w: 2.5, style: "stroke-dasharray: 1; " + (hide ? "stroke-dashoffset: 1; opacity: 0" : quiet ? "stroke-dashoffset: 0; opacity: .85" : `stroke-dashoffset: 1; opacity: .85; animation: pt-drawline .6s ease ${delay}ms forwards`) });
    else {
      edges.push({ d: path, row: top, color: T.line, w, style: "stroke-dasharray: 1; " + (hide ? "stroke-dashoffset: 1; opacity: 0" : quiet ? "stroke-dashoffset: 0" : `stroke-dashoffset: 1; animation: pt-drawline .7s ease ${delay}ms forwards`) + `; filter: drop-shadow(0 0 4px rgba(${T.glowRgb},.5))` });
      flows.push({ d: path, row: top, w, style: `stroke-dasharray: ${T.flowDash}; stroke-dashoffset: 1; opacity: ${hide ? 0 : 0.9}; filter: drop-shadow(0 0 5px rgba(${T.glowRgb},.9)); animation: pt-flow ${cls === "wizard" ? 4 : 2.6}s linear ${quiet ? 0 : delay + 900}ms infinite` });
    }
  }

  // clipped shapes: an outer layer in the edge colour, an inner one in the fill, so the edge shows
  const shapeInner = (s: Status, isRoot: boolean) => {
    const clip = CLIP[T.shape];
    if (!clip) return "display: none";
    const fill = isRoot ? `radial-gradient(circle at 40% 30%, ${T.accent}55, #141210 75%)` : s === "have" ? "linear-gradient(160deg, #2c241c, #1a1512)" : s === "choose" ? "radial-gradient(circle at 50% 30%, rgba(212,166,74,.3), #221b14 70%)" : s === "waiting" ? "#15110e" : "#14100d";
    return `position: absolute; inset: ${isRoot ? 3 : s === "later" ? 1 : 2}px; clip-path: ${clip}; -webkit-clip-path: ${clip}; background: ${fill}`;
  };
  const shapeLook = (s: Status, col: string, isRoot: boolean) => {
    const sz = isRoot ? RS : NS;
    const clip = CLIP[T.shape];
    if (clip) {
      const bc = isRoot ? T.accent : s === "have" ? col : s === "choose" ? "#d4a64a" : s === "waiting" ? col + "80" : "#4a3b2e";
      return `position: absolute; inset: 0; clip-path: ${clip}; -webkit-clip-path: ${clip}; background: ${bc}` + (s === "choose" && !isRoot ? "; animation: pt-nextglow 2.4s ease-in-out 1.4s infinite" : "");
    }
    let geo: string;
    if (T.shape === "diamond" && !isRoot) geo = `inset: ${Math.round(sz * 0.15)}px; transform: rotate(45deg); border-radius: ${Math.round(sz * 0.16)}px; `;
    else if (T.shape === "shield") geo = `inset: 0; border-radius: ${Math.round(sz * 0.2)}px ${Math.round(sz * 0.2)}px 50% 50% / ${Math.round(sz * 0.2)}px ${Math.round(sz * 0.2)}px 46% 46%; `;
    else if (T.shape === "leaf" && !isRoot) geo = "inset: 2px; border-radius: 4px 60% 4px 60%; ";
    else if (T.shape === "drop" && !isRoot) geo = "inset: 4px; border-radius: 50% 50% 50% 10%; transform: rotate(-45deg); ";
    else if (T.shape === "enso") geo = "inset: 0; border-radius: 44% 56% 48% 52% / 54% 46% 56% 44%; ";
    else geo = "inset: 0; border-radius: 50%; ";
    let look: string;
    if (isRoot) {
      if (cls === "fighter") look = "background: linear-gradient(110deg, transparent 35%, rgba(255,240,200,.35) 50%, transparent 65%) no-repeat, linear-gradient(160deg, #3a3326, #1d1a15); background-size: 250% 100%, 100% 100%; border: 2px solid #c9a45a; box-shadow: 0 0 0 3px #15171b, 0 0 0 5px rgba(201,164,90,.55), 0 0 28px rgba(201,164,90,.3); animation: pt-gleam 4s ease-in-out 1.5s infinite";
      else if (cls === "wizard") look = "background: radial-gradient(circle at 40% 30%, #26315a, #10132a 75%); border: 2px solid #8fb6e3; box-shadow: 0 0 0 3px #10132a, 0 0 30px rgba(120,170,255,.4)";
      else if (cls !== "sorcerer") look = `background: radial-gradient(circle at 40% 30%, ${T.accent}55, #141210 75%); border: 2px solid ${T.accent}; box-shadow: 0 0 0 3px #141210, 0 0 30px rgba(${T.glowRgb},.35)`;
      else look = "background: radial-gradient(circle at 40% 30%, #4a1d24, #1a1210 75%); border: 2px solid #8a5d12; box-shadow: 0 0 0 3px #1a1210, 0 0 0 5px rgba(192,53,74,.65), 0 0 30px rgba(255,110,40,.35)";
    } else if (s === "have") look = `background: linear-gradient(160deg, #2c241c, #1a1512); border: 1.5px solid ${col}; box-shadow: inset 0 0 0 3px #1a1512, inset 0 0 0 4px ${col}45, 0 6px 16px rgba(0,0,0,.45), 0 0 18px ${col}30`;
    else if (s === "choose") look = "background: radial-gradient(circle at 50% 30%, rgba(212,166,74,.3), #221b14 70%); border: 2px solid #d4a64a; animation: pt-glow 2.4s ease-in-out 1.4s infinite";
    else if (s === "waiting") look = `background: #15110e; border: 1.5px dashed ${col}80`;
    else look = "background: #14100d; border: 1px dashed #4a3b2e";
    if (T.shape === "halo" && look.includes("box-shadow: ")) look = look.replace("box-shadow: ", `box-shadow: 0 0 0 4px #17130f, 0 0 0 5.5px ${T.accent}70, `);
    return "position: absolute; box-sizing: border-box; " + geo + look;
  };

  // each step's column (for the pop-in stagger), left to right
  const colOf = (n: TreeNode) => Math.round((PX[n.id] - CX) / (NEAR / 2)) + 3;
  const select = (n: TreeNode) => setSt({ sel: n.id, sheet: !wide, all: false, justPick: st.justPick === n.id ? n.id : "" });

  const nodeViews = nodesAll.map((n) => {
    const s = status(n);
    const col = LANE[n.lane][1];
    const isRoot = n.id === "root";
    const size = isRoot ? RS : NS;
    const h = T.shape === "shield" ? Math.round(size * 1.1) : size;
    const cIdx = colOf(n);
    const unlockedNow = (just && n.r === just && !told && !igniting) || justPick === n.id || (!!justPick && n.reveal === justPick);
    const hideNow = igniting && n.r === just;
    const anim = hideNow || (told && n.r === told && !unlockedNow) ? "" : unlockedNow ? `animation: pt-unlock .9s cubic-bezier(.2,.8,.2,1) ${250 + cIdx * 110}ms both` : `animation: pt-pop .55s cubic-bezier(.2,.8,.2,1) ${150 + n.r * 170 + cIdx * 30}ms both`;
    const isNext = s === "later" && n.r === lv + 1;
    const nm = nameOf(tree, n);
    const isSel = sel === n.id;
    return (
      <div key={n.id} data-node={n.id} data-level={n.r} style={sx(`position: absolute; z-index: 2; left: ${PX[n.id] - (compact ? 34 : 64)}px; top: ${Y(n.r) - h / 2}px; width: ${compact ? 68 : 128}px; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none` + (hideNow ? "; opacity: 0" : ""))}>
        <button
          type="button"
          className="pt-node"
          onClick={() => select(n)}
          onFocus={wide ? () => setSt({ sel: n.id }) : undefined}
          aria-pressed={isSel}
          aria-label={nm + (isRoot ? "" : `, level ${n.r}`) + ", " + (s === "have" ? "unlocked" : s === "choose" ? "choose now" : s === "waiting" ? "hidden until you choose" : `unlocks at level ${n.r}`)}
          style={sx(`pointer-events: auto; position: relative; width: ${size}px; height: ${h}px; display: grid; place-items: center; padding: 0; border: 0; background: none; cursor: pointer; ` + (isSel ? "outline: 2px solid #c0354a; outline-offset: 6px; border-radius: 16px; " : "") + anim)}
        >
          {isRoot && cls === "wizard" && (
            <>
              <span aria-hidden="true" style={sx("position: absolute; inset: -10px; border-radius: 50%; border: 1px dashed rgba(143,182,227,.6); animation: pt-spin 24s linear infinite")} />
              <span aria-hidden="true" style={sx("position: absolute; inset: -18px; border-radius: 50%; border: 1px dotted rgba(185,163,232,.45); animation: pt-spinback 36s linear infinite")} />
            </>
          )}
          {unlockedNow && <span aria-hidden="true" style={sx(`position: absolute; inset: 0; border-radius: 50%; border: 2px solid ${s === "have" ? col : "#ecc46e"}; animation: pt-ringout 1s ease-out ${450 + cIdx * 110}ms both`)} />}
          <span aria-hidden="true" style={sx(shapeLook(s, col, isRoot))} />
          <span aria-hidden="true" style={sx(shapeInner(s, isRoot))} />
          <svg viewBox="0 0 24 24" width={isRoot ? (compact ? 30 : 36) : compact ? 22 : 26} height={isRoot ? (compact ? 30 : 36) : compact ? 22 : 26} fill="none" stroke={isRoot ? (cls === "wizard" ? "#cfe0ff" : cls === "sorcerer" || cls === "fighter" ? "#ecc46e" : T.accent) : s === "have" ? col : s === "choose" ? "#ecc46e" : s === "waiting" ? col : isNext ? "#a3927f" : "#6f6253"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: "relative" }}>
            <path d={ICONS[s === "waiting" ? "ask" : n.icon]} />
          </svg>
          {s === "choose" && <span style={sx("position: absolute; right: -8px; top: -8px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #d4a64a; color: #1c1815; font-size: 12px; font-weight: 800; box-shadow: 0 0 10px rgba(212,166,74,.7)")}>{Math.max(1, (n.n ?? 1) - (tree.picks[n.id] ?? []).length)}</span>}
          {s === "later" && !compact && <span style={sx("position: absolute; right: -10px; bottom: -8px; padding: 0 6px; border-radius: 999px; font-size: 10px; font-weight: 700; " + (isNext ? "background: #2a2116; border: 1px solid #d4a64a; color: #ecc46e" : "background: #16120f; border: 1px solid #5a4636; color: #a3927f"))}>Lv {n.r}</span>}
        </button>
        <span style={sx(`max-width: ${compact ? 66 : 122}px; text-align: center; font-size: ${compact ? 10.5 : 12}px; line-height: 1.22; font-weight: 600; text-shadow: 0 1px 3px #000; color: ${s === "later" ? (isNext ? "#c9b9a0" : "#8f806e") : s === "choose" ? "#ecc46e" : s === "waiting" ? "#a3927f" : "#ece3d3"}; animation: pt-fadein .5s ease ${350 + n.r * 170}ms both`)}>{nm}</span>
      </div>
    );
  });

  // the trunk: level ticks, the dashed rail ahead, the filled rail up to the current level
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);
  const rx = CX - 2;

  // ---------- the details panel
  const node = byId[sel] ?? choiceNode;
  const ns = status(node);
  const lc = LANE[node.lane][1];
  const togo = node.r - lv;
  const revealOpt = node.reveal && picked(tree, node.reveal) ? optionOf(tree, node.reveal) : null;
  const pText = node.reveal ? (revealOpt ? revealOpt.featText : `Choose your ${byId[node.reveal].name} to reveal this power.`) : node.text;
  const hasOpts = !!node.choice && ns !== "later";
  const mine = tree.picks[node.id] ?? [];
  const need = node.n ?? 1;
  const opts = hasOpts ? (all ? node.choice! : node.choice!.slice(0, 3)) : [];
  const classTodo = d.warnings.some((w) => w.tab === "class" && w.level !== "info");
  const toggle = (id: string) => {
    const patch = pickPatch(c, d, node, id);
    if (!patch) return;
    set(patch);
    const count = (patch.metamagic ?? patch.invocations)?.length ?? 1;
    setSt({ justPick: count >= need ? node.id : "" });
  };
  const statusText = ns === "have" ? "Unlocked" : ns === "choose" ? "Choose now" : ns === "waiting" ? "Hidden until you choose" : togo === 1 ? "Unlocks at your next level!" : `Unlocks at level ${node.r} · ${togo} levels to go`;

  const panelBody = (
    <>
      <div className="pt-panel-head">
        <div className="pt-panel-title">
          <span className="pt-lane" style={{ color: lc, background: lc + "1f", borderColor: lc + "55" }}>
            {LANE[node.lane][0]} · Level {node.r || 1}
          </span>
          <h2>{nameOf(tree, node)}</h2>
          <span className={`pt-status ${ns === "have" ? "ok" : ns === "choose" || (ns === "later" && togo === 1) ? "act" : ""}`}>{statusText}</span>
        </div>
        {!wide && (
          <button type="button" className="pt-x" aria-label="Close" onClick={() => setSt({ sheet: false })}>
            <CloseIcon />
          </button>
        )}
      </div>
      <div className="pt-panel-scroll">
        <span className="pt-label">{ns === "later" ? "What you’ll be able to do" : "What it does"}</span>
        <p className="pt-text">{pText}</p>
        {node.tip && !node.reveal && (
          <p className="pt-tip">
            <strong>Tip · </strong>
            {node.tip}
          </p>
        )}
        {hasOpts && (
          <div className="pt-opts">
            <div className="pt-opts-head">
              <span className="pt-label">Pick {need}</span>
              <span className={`pt-count ${mine.length >= need ? "ok" : ""}`}>
                {Math.min(mine.length, need)} of {need} chosen
              </span>
            </div>
            {opts.map((o) => {
              const on = mine.includes(o.id);
              const blocked = !on && (!!o.needs || (need > 1 && mine.length >= need));
              return (
                <button type="button" key={o.id} className={`pt-opt ${on ? "on" : ""}`} aria-pressed={on} aria-disabled={blocked || undefined} onClick={() => !blocked && toggle(o.id)}>
                  <span className="pt-opt-row">
                    <span className={`pt-check ${need > 1 ? "multi" : ""}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#1c1815" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    </span>
                    <strong>{o.name}</strong>
                    {o.tag && <span className="pt-tag">{o.tag}</span>}
                    <span className="pt-meta">{o.meta}</span>
                  </span>
                  <span className="pt-opt-text">{o.needs ? `Needs ${o.needs}. ` : ""}{o.text}</span>
                </button>
              );
            })}
            {!all && node.choice!.length > 3 && (
              <button type="button" className="pt-more" onClick={() => setSt({ all: true })}>
                Show all {node.choice!.length}
              </button>
            )}
          </div>
        )}
        {justPick === node.id && <p className="pt-done">Unlocked! It's on your Sheet now.</p>}
        {hasOpts && ns === "have" && classTodo && onTab && (
          <button type="button" className="pt-more" onClick={() => onTab("class")}>
            More to choose on the Class tab
          </button>
        )}
      </div>
    </>
  );

  // ---------- counts
  const real = nodesAll.filter((n) => n.id !== "root");
  const have = real.filter((n) => status(n) === "have").length;
  const newRow = st.just ? nodesAll.filter((n) => n.r === st.just) : [];
  const chips = newRow.map((n) => {
    const col = LANE[n.lane][1];
    return { name: nameOf(tree, n), style: `font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 999px; color: ${col}; background: ${col}1f; border: 1px solid ${col}66` };
  });
  const goNew = () => setSt({ party: 0, story: 0, sel: newRow.find((n) => status(n) === "choose")?.id ?? newRow[0]?.id ?? sel, sheet: !wide, all: false });
  const subText = `${newRow.length} new power${newRow.length === 1 ? "" : "s"}`;
  const name = c.name.trim();
  const storyLine = cls === "sorcerer" ? `The dragon in ${name ? `${name}’s` : "your"} blood wakes a little more.` : cls === "fighter" ? (name ? `${name}’s steel comes off the anvil harder.` : "Your steel comes off the anvil harder.") : name ? `${name} writes a new page into the spellbook.` : "You write a new page into your spellbook.";

  const showLevelUp = !!onLevelUp && lv < maxLevel && (!sidebarLevelUp || !wide);
  const sheetOpen = !wide && st.sheet;

  return (
    <section ref={wrapRef} className={`ptree ${wide ? "wide" : ""} ${compact ? "compact" : ""}`} aria-label="Progression tree">
      <div className="pt-top">
        <div className="pt-title">
          <h2>Your path</h2>
          <span>{T.tagline}</span>
        </div>
        <div className="pt-progress">
          <span>
            <strong style={{ color: T.accent }}>{have}</strong> of {real.length} powers unlocked
          </span>
          <span className="pt-bar" aria-hidden="true">
            <span style={{ width: `${Math.round((100 * have) / Math.max(1, real.length))}%`, background: `linear-gradient(90deg, #d4a64a, ${T.accent})` }} />
          </span>
        </div>
      </div>
      <div className="pt-body">
        <div
          ref={cardRef}
          className="pt-card"
          style={{ ...(compact ? { width: W, height: H } : { height: H + 24 }), background: T.bg, borderColor: T.accent + "40" }}
        >
          <canvas ref={canvasRef} aria-hidden="true" className="pt-canvas" />
          <div style={{ position: "relative", zIndex: 1, width: W, height: H }}>
            <span aria-hidden="true" style={sx(`position: absolute; left: ${rx + 1}px; top: ${Y(maxLevel)}px; height: ${Y(0) - (compact ? 30 : 20) - Y(maxLevel)}px; border-left: 2px dashed #3b3027`)} />
            <span aria-hidden="true" data-rail="1" style={sx(`position: absolute; left: ${rx}px; top: ${Y(lv)}px; height: ${Y(0) - (compact ? 30 : 20) - Y(lv)}px; width: 4px; border-radius: 2px; background: linear-gradient(0deg, #d4a64a, #c0354a); transform-origin: bottom; transition: top .9s cubic-bezier(.2,.8,.2,1), height .9s cubic-bezier(.2,.8,.2,1); animation: pt-rise 1.2s cubic-bezier(.2,.8,.2,1) .1s both`)} />
            {levels.map((r) => {
              const now = r === lv, done = r < lv, next = r === lv + 1;
              const sz = compact ? 22 : 24;
              return (
                <span key={r} data-tick={r} aria-label={now ? `Level ${r}, your level` : undefined} style={sx(`position: absolute; z-index: 1; left: ${CX - sz / 2}px; top: ${Y(r) - sz / 2}px; width: ${sz}px; height: ${sz}px; display: grid; place-items: center; border-radius: 50%; font-size: 12px; font-weight: 700; transition: all .5s ease; ` + (done ? "background: #d4a64a; color: #1c1815" : now ? "background: #2a1a1c; color: #fff; border: 2px solid #c0354a; animation: pt-nowpulse 2.2s ease-out 1.2s infinite" : next ? "background: #1f1810; color: #ecc46e; border: 1px dashed #d4a64a; animation: pt-nextpulse 2.6s ease-out 1.5s infinite" : "background: #15110e; color: #8f806e; border: 1px dashed #5a4636"))}>
                  {r}
                </span>
              );
            })}
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {edges.map((e, i) => (
                <path key={"e" + i} data-row={e.row} data-edge="1" d={e.d} pathLength={1} fill="none" stroke={e.color} strokeWidth={e.w} strokeLinecap="round" style={sx(e.style)} />
              ))}
              {flows.map((f, i) => (
                <path key={"f" + i} data-row={f.row} data-flow="1" d={f.d} pathLength={1} fill="none" stroke={T.flow} strokeWidth={f.w} strokeLinecap="round" style={sx(f.style)} />
              ))}
            </svg>
            {nodeViews}
          </div>
        </div>
        {wide && (
          <aside className="pt-panel side" aria-label="Step details" style={{ borderTopColor: ns === "choose" ? "#d4a64a" : lc }}>
            {panelBody}
          </aside>
        )}
      </div>
      {showLevelUp && (
        <button type="button" className="btn primary pt-levelup" onClick={onLevelUp}>
          Level up to {lv + 1}
        </button>
      )}

      {sheetOpen &&
        createPortal(
          <div className="pt-sheet-wrap">
            <button type="button" className="pt-backdrop" aria-label="Close" onClick={() => setSt({ sheet: false })} />
            <aside className="pt-panel sheet" role="dialog" aria-modal="true" aria-label="Step details" style={{ borderTopColor: ns === "choose" ? "#d4a64a" : lc }}>
              <span className="pt-grip" aria-hidden="true" />
              {panelBody}
            </aside>
          </div>,
          document.body,
        )}
      {st.party > 0 && <PartyCard cls={cls} glowRgb={T.glowRgb} accent={T.accent} title={`Level ${st.party}`} sub={`${subText} unlocked`} chips={chips} onClose={() => setSt({ party: 0 })} onGo={goNew} />}
      {st.story > 0 && <StoryCard cls={cls} num={`Level ${st.story}`} line={storyLine} sub={subText} chips={chips} onClose={() => setSt({ story: 0 })} onGo={goNew} />}
    </section>
  );
}

function useEscape(on: () => void) {
  const ref = useRef(on);
  ref.current = on;
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && ref.current();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

interface CardProps {
  cls: string;
  chips: { name: string; style: string }[];
  onClose: () => void;
  onGo: () => void;
}

/** "Level up!" in the class's colours. */
function PartyCard({ cls, glowRgb, accent, title, sub, chips, onClose, onGo }: CardProps & { glowRgb: string; accent: string; title: string; sub: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(onClose);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const stop = partyFx(ref.current, cls, glowRgb);
    ref.current.querySelector<HTMLElement>('[data-p="go"]')?.focus({ preventScroll: true });
    return stop;
  }, [cls, glowRgb]);
  const card =
    "position: relative; z-index: 1; width: 340px; max-width: 86%; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 30px 24px 24px; border-radius: 22px; text-align: center; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6), " +
    (!STORY_CLASSES.includes(cls)
      ? `0 0 40px rgba(${glowRgb},.22); background: radial-gradient(circle at 50% 0%, rgba(${glowRgb},.16), transparent 60%), #18151a; border: 1px solid ${accent}`
      : cls === "fighter"
        ? "0 0 30px rgba(201,164,90,.22); background: linear-gradient(160deg, #2a2620, #17150f); border: 1px solid #c9a45a"
        : cls === "wizard"
          ? "0 0 40px rgba(120,170,255,.25); background: radial-gradient(circle at 50% 0%, rgba(120,170,255,.18), transparent 60%), #141629; border: 1px solid #8fb6e3"
          : "0 0 40px rgba(255,110,40,.25); background: radial-gradient(circle at 50% 0%, rgba(255,110,40,.18), transparent 60%), #1f1612; border: 1px solid #8a5d12");
  const labelColor = cls === "wizard" ? "#cfe0ff" : cls === "fighter" ? "#f0dca8" : "#ecc46e";
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="pt-overlay" style={sx("background: radial-gradient(circle at 50% 45%, rgba(0,0,0,.35), rgba(0,0,0,.8))")}>
      <canvas data-pfx="1" aria-hidden="true" className="pt-overlay-canvas" />
      <div data-p="card" style={sx(card)}>
        <span data-p="sheen" aria-hidden="true" style={sx("position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 38%, rgba(255,240,200,.28) 50%, transparent 62%); transform: translateX(-120%)")} />
        <button type="button" data-p="x" aria-label="Close" onClick={onClose} className="pt-card-x">
          <CloseIcon />
        </button>
        <span data-p="label" style={sx(`position: relative; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; font-weight: 700; color: ${labelColor}`)}>Level up!</span>
        <strong data-p="num" style={sx("position: relative; display: inline-block; font-family: Cinzel, serif; font-size: 44px; line-height: 1; color: #efe4d2")}>{title}</strong>
        <span data-p="sub" style={sx("position: relative; font-size: 15px; color: #ddd2c1")}>{sub}</span>
        <div data-p="chips" style={sx("position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px")}>
          {chips.map((p) => (
            <span key={p.name} style={sx(p.style)}>{p.name}</span>
          ))}
        </div>
        <button type="button" data-p="go" onClick={onGo} className="pt-go">
          See what's new
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** The class's top level: the big story (Sorcerer, Fighter, Wizard). */
function StoryCard({ cls, num, line, sub, chips, onClose, onGo }: CardProps & { num: string; line: string; sub: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fx = useRef<{ skip: () => void; stop: () => void } | null>(null);
  useEscape(onClose);
  useLayoutEffect(() => {
    if (!ref.current) return;
    fx.current = storyFx(ref.current, cls);
    ref.current.querySelector<HTMLElement>('[data-p="x"]')?.focus({ preventScroll: true });
    return () => fx.current?.stop();
  }, [cls]);
  const card =
    "position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 22px 24px; border-radius: 22px; text-align: center; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6), " +
    (cls === "fighter"
      ? "0 0 30px rgba(201,164,90,.22); background: linear-gradient(160deg, #2a2620, #17150f); border: 1px solid #c9a45a"
      : cls === "wizard"
        ? "0 0 40px rgba(120,170,255,.25); background: radial-gradient(circle at 50% 0%, rgba(120,170,255,.18), transparent 60%), #141629; border: 1px solid #8fb6e3"
        : "0 0 40px rgba(255,110,40,.25); background: radial-gradient(circle at 50% 0%, rgba(255,120,50,.2), transparent 60%), #1d1210; border: 1px solid #e0485e");
  const ink = cls === "wizard" ? "#cfe0ff" : cls === "fighter" ? "#f0dca8" : "#ecc46e";
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={num}
      className="pt-overlay"
      onClick={(e) => !(e.target as HTMLElement).closest("button") && fx.current?.skip()}
      style={sx("overflow: hidden; background: radial-gradient(circle at 50% 45%, rgba(8,6,5,.82), rgba(4,3,3,.95))")}
    >
      <div data-p="rig" style={sx("position: relative; z-index: 1; width: 340px; max-width: 86%")}>
        {cls === "wizard" && (
          <svg data-p="book" viewBox="0 0 220 140" width="220" height="140" aria-hidden="true" style={sx("position: absolute; left: calc(50% - 110px); top: calc(50% - 70px); opacity: 0; overflow: visible; pointer-events: none")}>
            <path d="M110 22 Q150 12 198 18 L198 122 Q150 116 110 126 Z" fill="#efe6d1" stroke="#b9a67e" />
            <g data-p="cover">
              <path d="M110 17 L203 13 Q207 13 207 17 L207 125 Q207 129 203 129 L110 131 Z" fill="#26346e" stroke="#8fb6e3" strokeWidth="2" />
              <circle cx="158" cy="71" r="20" fill="none" stroke="#d4a64a" strokeWidth="2" />
              <path d="M158 56 L162 67 L173 71 L162 75 L158 86 L154 75 L143 71 L154 67 Z" fill="#d4a64a" />
            </g>
            <path data-p="left" d="M110 22 Q70 12 22 18 L22 122 Q70 116 110 126 Z" fill="#e9dfc8" stroke="#b9a67e" opacity="0" />
            <path data-pg="1" d="M110 22 Q150 13 195 19 L195 121 Q150 117 110 126 Z" fill="#f4ecd9" stroke="#c9b68e" opacity="0" />
            <path data-pg="2" d="M110 22 Q150 13 193 20 L193 120 Q150 117 110 126 Z" fill="#f6efdf" stroke="#c9b68e" opacity="0" />
            <path data-pg="3" d="M110 22 Q150 13 191 21 L191 119 Q150 117 110 126 Z" fill="#f8f2e4" stroke="#c9b68e" opacity="0" />
            <g data-p="ink" stroke="#6f9fe8" strokeWidth="2" strokeLinecap="round" opacity="0">
              <path d="M34 40 H96 M34 52 H90 M34 64 H98 M34 76 H84 M34 88 H94 M34 100 H72" />
              <circle cx="158" cy="64" r="18" fill="none" />
              <path d="M158 46 V82 M140 64 H176 M124 98 H192 M130 108 H186" />
            </g>
            <rect x="106" y="15" width="8" height="117" rx="2" fill="#1b2450" />
          </svg>
        )}
        <div data-p="card" style={sx(card)}>
          <span data-p="heat" aria-hidden="true" style={sx("position: absolute; inset: 0; opacity: 0; pointer-events: none; background: radial-gradient(circle at 50% 28%, #ffe6b8 0%, #ff9b3c 32%, #c9400f 70%, #6e1a08 100%)")} />
          <span data-p="sheen" aria-hidden="true" style={sx("position: absolute; inset: 0; opacity: 0; pointer-events: none; background: linear-gradient(105deg, transparent 38%, rgba(255,240,200,.3) 50%, transparent 62%)")} />
          <span data-p="label" style={sx(`position: relative; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; font-weight: 700; color: ${ink}`)}>Level up!</span>
          <strong data-p="num" style={sx(`position: relative; display: inline-block; font-family: Cinzel, serif; font-size: 44px; line-height: 1.05; padding: 0 4px; color: ${cls === "wizard" ? "#e2ecff" : cls === "fighter" ? "#f0dca8" : "#ffd28a"}`)}>{num}</strong>
          <span data-p="line" style={sx("position: relative; max-width: 260px; font-size: 14px; line-height: 1.45; font-style: italic; color: #e6d9c3")}>{line}</span>
          <span data-p="sub" style={sx("position: relative; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; color: #a3927f")}>{sub}</span>
          <div data-p="chips" style={sx("position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px")}>
            {chips.map((p) => (
              <span key={p.name} style={sx(p.style)}>{p.name}</span>
            ))}
          </div>
          <button type="button" data-p="go" onClick={onGo} className="pt-go">
            See what's new
          </button>
        </div>
        {cls === "fighter" && (
          <svg data-p="hammer" viewBox="0 0 200 60" width="240" height="72" aria-hidden="true" style={sx("position: absolute; left: calc(50% - 43px); top: -72px; opacity: 0; overflow: visible; pointer-events: none")}>
            <rect x="44" y="25" width="152" height="10" rx="4" fill="#6b4a2e" stroke="#3a2716" />
            <rect x="188" y="22" width="12" height="16" rx="3" fill="#c9a45a" />
            <rect x="10" y="0" width="52" height="60" rx="6" fill="#8d949c" stroke="#4a4f56" strokeWidth="2" />
            <rect x="10" y="22" width="52" height="16" fill="#c9a45a" opacity=".85" />
            <rect x="15" y="4" width="9" height="52" rx="3" fill="#d3d8de" opacity=".55" />
          </svg>
        )}
      </div>
      <canvas data-pfx="1" aria-hidden="true" className="pt-overlay-canvas" style={{ zIndex: 2 }} />
      <button type="button" data-p="x" aria-label="Close" onClick={onClose} className="pt-story-x">
        <CloseIcon />
      </button>
    </div>,
    document.body,
  );
}
