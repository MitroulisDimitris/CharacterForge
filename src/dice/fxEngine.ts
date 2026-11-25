// Damage animations (user, 2026-11-25; mockup canvas "Session Versions and Table Dice", page "Damage
// animations", boards "Every damage type" and "How it was dealt"): each type tells a short story with GSAP
// (fxStories.ts) while a WebGL shader (fxShaders.ts) draws its effect across the whole row or card, nothing
// on the left and full at the number. It plays for about 2 s, slows to a stop and holds, number whole.
//
// One WebGL context draws every effect (browsers allow only ~16 live ones per page) and copies each frame
// onto the row's own 2D canvas, which keeps its last picture. No WebGL: the coloured banner and the DOM
// pieces still play.
import { gsap } from "gsap";
import { FX_HEAD, FX_SHADERS } from "./fxShaders";
import { STORIES } from "./fxStories";
import type { Via } from "./roll";

export type FxVia = Via;

/** What a story animates in its shader, plus where a hit lands (`ipx`/`ipy`, piercing and bludgeoning). */
export interface FxState {
  t: number;
  A: number;
  B: number;
  C: number;
  D: number;
  seed: number;
  ipx?: number;
  ipy?: number;
}

/** The host and number, in CSS pixels of the host: number centre NX/NY, its width NW, font size NH. */
export interface FxGeo {
  W: number;
  H: number;
  dpr: number;
  NX: number;
  NY: number;
  NW: number;
  NH: number;
  /** The number's size: 1 on a roll line (24 px), ~2.5 on the result card. */
  sz: number;
  cw: number;
  ch: number;
}

export interface FxCtx {
  tl: gsap.core.Timeline;
  S: FxState;
  g: FxGeo;
  k: number;
  host: HTMLElement;
  num: HTMLElement;
  tint: HTMLElement;
  tag: HTMLElement | null;
  /** What a jolt or shake moves: the host's children (the host may run its own CSS transform). */
  shake: Element[];
  el(cls: string, w: number, h: number, css?: string): HTMLDivElement;
  bolt(at: number, dur: number, o: { to: number; c1: string; c2: string; ease?: string; y?: number }): void;
  hit(at: number, o?: { flash?: string; punch?: number; jolt?: [number, number] }): void;
  sparks(at: number, o: { n?: number; every?: number; x?: number; y?: number; color: string; glow: string; up?: [number, number]; side?: [number, number]; size?: number; fall?: boolean }): void;
}

/** Full speed for RUN s, then the whole story (and the shader's clock) eases to a stop over SLOW s. */
const RUN = 2.0;
const SLOW = 1.1;
/** The shader clock when it stops (power2.out from speed 1 to 0 covers a third of SLOW). */
const END_T = RUN + SLOW / 3;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- the shared WebGL renderer ----------

type Prog = { pr: WebGLProgram; U: Record<string, WebGLUniformLocation | null>; loc: number };
type GLR = { cv: HTMLCanvasElement; gl: WebGLRenderingContext; buf: WebGLBuffer; progs: Map<string, Prog | null>; lost: boolean };
let glr: GLR | null | undefined;

function renderer(): GLR | null {
  if (glr && !glr.lost) return glr;
  if (glr === null) return null; // no WebGL here
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 320;
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) {
    glr = null;
    return null;
  }
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const r: GLR = { cv, gl, buf, progs: new Map(), lost: false };
  // A lost context (the GPU reset, too many tabs) is simply made again on the next draw.
  cv.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    r.lost = true;
  });
  glr = r;
  return r;
}

function program(r: GLR, id: string): Prog | null {
  if (r.progs.has(id)) return r.progs.get(id)!;
  const { gl } = r;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  let p: Prog | null = null;
  try {
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FX_HEAD + FX_SHADERS[id]));
    gl.linkProgram(pr);
    const U: Prog["U"] = {};
    for (const k of ["res", "num", "ip", "t", "unit", "sz", "A", "B", "C", "D", "seed"]) U[k] = gl.getUniformLocation(pr, k);
    p = { pr, U, loc: gl.getAttribLocation(pr, "p") };
  } catch {
    p = null; // this GPU can't build it: that type shows its banner only
  }
  r.progs.set(id, p);
  return p;
}

function draw(id: string, g: FxGeo, S: FxState, ctx: CanvasRenderingContext2D) {
  const r = renderer();
  if (!r) return;
  const P = program(r, id);
  if (!P) return;
  const { gl, cv } = r;
  // The shared canvas grows to the biggest row it has drawn.
  if (g.cw > cv.width || g.ch > cv.height) {
    cv.width = Math.min(4096, Math.max(cv.width, g.cw));
    cv.height = Math.min(2048, Math.max(cv.height, g.ch));
  }
  const w = Math.min(cv.width, g.cw);
  const h = Math.min(cv.height, g.ch);
  gl.useProgram(P.pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, r.buf);
  gl.enableVertexAttribArray(P.loc);
  gl.vertexAttribPointer(P.loc, 2, gl.FLOAT, false, 0, 0);
  const unit = 56 * g.dpr;
  const U = P.U;
  gl.uniform2f(U.res, w, h);
  gl.uniform1f(U.unit, unit);
  gl.uniform1f(U.sz, g.sz);
  gl.uniform2f(U.num, (g.NX * g.dpr) / unit, ((g.H - g.NY) * g.dpr) / unit);
  gl.uniform2f(U.ip, ((S.ipx ?? g.NX) * g.dpr) / unit, ((g.H - (S.ipy ?? g.NY)) * g.dpr) / unit);
  gl.uniform1f(U.t, S.t);
  gl.uniform1f(U.A, S.A);
  gl.uniform1f(U.B, S.B);
  gl.uniform1f(U.C, S.C);
  gl.uniform1f(U.D, S.D);
  gl.uniform1f(U.seed, S.seed);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  ctx.clearRect(0, 0, g.cw, g.ch);
  ctx.drawImage(cv, 0, cv.height - h, w, h, 0, 0, w, h);
}

// ---------- one effect on one host ----------

export interface FxParts {
  /** The row or card; the parts below are inside it. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  layer: HTMLElement;
  tint: HTMLElement;
  /** Holds the tag and the number; gets the class "lit" at the hit. */
  end: HTMLElement;
  num: HTMLElement;
}

/** The story for a type dealt this way, or the type's own story. */
export const storyKey = (type: string, via?: FxVia | null) => (via && STORIES[`${type}:${via}`] ? `${type}:${via}` : type);

/**
 * Play a type's animation on a host (`play`), or show its held last picture straight away (`rest`).
 * Returns a stop function and `redraw` (draw the held picture again at the host's new size).
 */
export function runFx(parts: FxParts, type: string, via: FxVia | null | undefined, mode: "play" | "rest") {
  const { host, canvas, layer, tint, end, num } = parts;
  const ctx = canvas.getContext("2d");
  const tag = end.querySelector<HTMLElement>(".fx-tag");
  const key = storyKey(type, via);
  let tl: gsap.core.Timeline | null = null;
  let slow: gsap.core.Tween | null = null;
  let tick: ((time: number, dt: number) => void) | null = null;
  const S: FxState = { t: 0, A: 0, B: 0, C: 0, D: 0, seed: rnd(1, 90) };
  let g: FxGeo | undefined;

  const measure = (): FxGeo => {
    const r = host.getBoundingClientRect();
    const W = host.clientWidth || r.width;
    const H = host.clientHeight || r.height;
    const z = r.width / W || 1;
    const n = num.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, (window.devicePixelRatio || 1) * z));
    const NH = parseFloat(getComputedStyle(num).fontSize) || 24;
    const geo: FxGeo = {
      W,
      H,
      dpr,
      NX: (n.left + n.width / 2 - r.left) / z,
      NY: (n.top + n.height / 2 - r.top) / z,
      NW: n.width / z,
      NH,
      sz: NH / 24,
      cw: Math.round(W * dpr),
      ch: Math.round(H * dpr),
    };
    canvas.width = geo.cw;
    canvas.height = geo.ch;
    return geo;
  };
  const render = () => {
    if (ctx && g) draw(type, g, S, ctx);
  };
  let wait = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(wait);
    tl?.kill();
    slow?.kill();
    if (tick) gsap.ticker.remove(tick);
    tl = slow = tick = null;
  };

  // A row that just came in opens from zero height (the list's slide-in): start once it has its full
  // size, or the effect would be drawn a few pixels tall and stretched into stripes.
  const since = performance.now();
  const ready = () => host.clientHeight > 0 && host.scrollHeight - host.clientHeight <= 1;
  const waitForSize = () => {
    if (stopped) return;
    if (ready() || performance.now() - since > 1500) begin();
    else wait = requestAnimationFrame(waitForSize);
  };

  const begin = () => {
    const G = measure();
    g = G;
    layer.textContent = "";
    end.classList.remove("lit");
    const shake = Array.from(host.children);
    gsap.set([num, ...(tag ? [tag] : [])], { clearProps: "transform,opacity" });
    gsap.set(shake, { x: 0, y: 0 });
    if (mode === "play") gsap.set(tint, { opacity: 0 });
    const k = G.sz;
    tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" } });
    const T = tl;
    const X: FxCtx = {
      tl: T,
      S,
      g: G,
      k,
      host,
      num,
      tint,
      tag,
      shake,
      el(cls, w, h, css) {
        const e = document.createElement("div");
        e.className = cls;
        e.style.cssText = (w ? `width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;` : "") + (css || "");
        layer.appendChild(e);
        return e;
      },
      bolt(at, dur, { to, c1, c2, ease = "power2.in", y = G.NY }) {
        const m = Math.min(k, 1.6);
        const s = 16 * m;
        const trail = X.el("fx-trail", 130 * m, 6 * m, `background:linear-gradient(90deg,transparent,${c2}b0 70%,${c1});margin-left:${-130 * m}px`);
        const orb = X.el("fx-orb", s, s, `background:radial-gradient(circle,#fff 0 25%,${c1} 45%,${c2} 70%,transparent 72%);filter:drop-shadow(0 0 6px ${c2}) drop-shadow(0 0 14px ${c2})`);
        T.set([orb, trail], { y, opacity: 1 }, at)
          .fromTo(orb, { x: 14 }, { x: to, duration: dur, ease, immediateRender: false }, at)
          .fromTo(trail, { x: 14, scaleX: 0.2 }, { x: to, scaleX: 1, duration: dur, ease, immediateRender: false }, at)
          .set([orb, trail], { opacity: 0 }, at + dur);
      },
      hit(at, { flash, punch = 1.5, jolt } = {}) {
        T.call(() => end.classList.add("lit"), undefined, at).fromTo(tint, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false }, at);
        if (flash) {
          const f = X.el("fx-flash", 150 * k, 110 * k, `background:radial-gradient(closest-side,${flash},rgba(0,0,0,0))`);
          T.set(f, { x: G.NX, y: G.NY }, 0).fromTo(f, { opacity: 1, scale: 0.4 }, { opacity: 0, scale: 1.3, duration: 0.5, immediateRender: false }, at);
        }
        if (punch) T.fromTo(num, { scale: punch }, { scale: 1, duration: 0.55, ease: "back.out(3)", immediateRender: false }, at);
        if (jolt) T.fromTo(shake, { x: jolt[0], y: jolt[1] }, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, .3)", immediateRender: false }, at);
      },
      // Little particles flung out on curves (x and y on different eases); `fall` drops them back down.
      sparks(at, { n = 10, every = 0.06, x = G.NX, y = G.NY, color, glow, up = [20, 40], side = [-30, 30], size = 3, fall = false }) {
        const m = Math.min(k, 1.8);
        for (let i = 0; i < n; i++) {
          const s = X.el("fx-spark", size * m, size * m, `background:${color};box-shadow:0 0 4px ${glow},0 0 8px ${glow}`);
          const t0 = at + i * every;
          const d = rnd(0.6, 1.1);
          const xs = x + rnd(-G.NW * 0.4, G.NW * 0.4);
          const dy = rnd(up[0], up[1]) * k;
          T.set(s, { x: xs, y, opacity: 1 }, t0).to(s, { x: xs + rnd(side[0], side[1]) * k, duration: d, ease: "sine.out" }, t0);
          if (fall) T.to(s, { y: y - dy, duration: d * 0.4, ease: "power2.out" }, t0).to(s, { y: y + dy * 0.6, duration: d * 0.6, ease: "power2.in" }, t0 + d * 0.4);
          else T.to(s, { y: y - dy, duration: d, ease: "power2.out" }, t0);
          T.to(s, { opacity: 0, duration: d * 0.5, ease: "power1.in" }, t0 + d * 0.5);
        }
      },
    };
    STORIES[key](X);
    T.to({}, { duration: RUN + SLOW }, 0); // the clock keeps going until the slow-down ends

    if (mode === "rest") {
      T.progress(1, false);
      T.kill();
      tl = null;
      S.t = END_T;
      render();
    } else {
      tick = (_time: number, dt: number) => {
        S.t += (dt / 1000) * T.timeScale();
        render();
      };
      gsap.ticker.add(tick);
      // The slow-out: the whole story, and the shader's clock with it, eases to a stop together.
      slow = gsap.to(T, {
        timeScale: 0,
        duration: SLOW,
        ease: "power2.out",
        delay: RUN,
        onComplete: () => {
          if (tick) gsap.ticker.remove(tick);
          tick = null;
          render();
        },
      });
    }
  };

  waitForSize();
  return {
    stop,
    /** Draw the held picture again (the host changed size). Only once it has stopped. */
    redraw() {
      if (tick || !g) return;
      g = measure();
      render();
    },
  };
}
