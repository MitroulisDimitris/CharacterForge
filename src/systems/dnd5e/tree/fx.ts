// The progression tree's motion, copied from the approved mockup (canvas "Progression Tree", boards
// 4–6): one WebGL canvas behind the tree draws each class's living background and the level-up
// light; GSAP tells the level-up story (gather at the root, climb the trunk, spread along the new
// level, the new steps appear). The "Level up!" card and the final level's big story each get their
// own short-lived canvas. Coordinates handed to the shaders are CSS px with y up.
import { gsap } from "gsap";
import { PARTY_FS, STORY_FS, TREE_FS } from "./shaders";
import { GL_INDEX } from "./looks";

/* eslint-disable @typescript-eslint/no-explicit-any */
const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
export const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function program(gl: WebGLRenderingContext, fs: string): WebGLProgram | null {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  try {
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) ?? "link");
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return pr;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

/** Give the context back once its canvas has really left the page (React may unmount and mount the
 *  same canvas again at once, e.g. StrictMode in development: a lost context can't be used again). */
const lose = (gl: WebGLRenderingContext | null | undefined) => {
  if (!gl) return;
  window.setTimeout(() => {
    if (!(gl.canvas as HTMLCanvasElement).isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, 0);
};

/** Size the canvas to its box (capped at 1.5× for phones' sake); returns the CSS size and scale. */
function fit(cv: HTMLCanvasElement) {
  const r = cv.getBoundingClientRect(), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return null;
  const z = r.width / w || 1, dpr = Math.min(1.5, (window.devicePixelRatio || 1) * z);
  const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
  if (cv.width !== cw || cv.height !== ch) {
    cv.width = cw;
    cv.height = ch;
  }
  return { r, w, h, z, dpr, cw, ch };
}

// ---------------------------------------------------------------- the tree

interface Light {
  headOn: number; head: number; y0: number; climbX: number; rowY: number; burst: number; burstOn: number; flash: number; rflare: number;
  n: { x: number; y: number; z: number }[];
}

export class TreeFx {
  private gl: WebGLRenderingContext | null = null;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private dead = false;
  private tl: gsap.core.Timeline | null = null;
  private timer = 0;
  readonly U: Light = { headOn: 0, head: 0, y0: 0, climbX: 0, rowY: 0, burst: 0, burstOn: 0, flash: 0, rflare: 0, n: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 0 })) };

  constructor(private cv: HTMLCanvasElement, private card: HTMLElement, private now: () => { cls: string; lv: number; maxLevel: number }) {
    this.start();
  }

  private start() {
    const gl = this.cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    const pr = program(gl, TREE_FS);
    if (!pr) return;
    ["res", "px", "t", "cls", "lvl", "root", "climbX", "y0", "head", "headOn", "rowY", "burst", "burstOn", "flash", "rflare", "nd"].forEach((k) => (this.uni[k] = gl.getUniformLocation(pr, k)));
    this.gl = gl;
    const reduce = reducedMotion();
    const start = performance.now();
    let rootAt = { x: 0, y: 0 }, measured = 0;
    const U = this.uni;
    const frame = (now: number) => {
      if (this.dead) return;
      const cv = this.cv;
      const f = cv.isConnected ? fit(cv) : null;
      if (f) {
        // where the root sits (re-measured now and then: the layout may change)
        if (now - measured > 400) {
          const rb = this.card.querySelector('[data-node="root"] button');
          if (rb) {
            const q = rb.getBoundingClientRect();
            rootAt = { x: (q.left + q.width / 2 - f.r.left) / f.z, y: (q.top + q.height / 2 - f.r.top) / f.z };
          }
          measured = now;
        }
        const st = this.now(), S = this.U;
        gl.viewport(0, 0, f.cw, f.ch);
        gl.uniform2f(U.res, f.cw, f.ch);
        gl.uniform1f(U.px, f.dpr);
        gl.uniform1f(U.t, reduce ? 3 : (now - start) / 1000);
        gl.uniform1f(U.cls, Math.max(0, GL_INDEX.indexOf(st.cls)));
        gl.uniform1f(U.lvl, st.lv / Math.max(1, st.maxLevel));
        gl.uniform2f(U.root, rootAt.x, rootAt.y);
        gl.uniform1f(U.climbX, S.climbX); gl.uniform1f(U.y0, S.y0); gl.uniform1f(U.head, S.head); gl.uniform1f(U.headOn, S.headOn);
        gl.uniform1f(U.rowY, S.rowY); gl.uniform1f(U.burst, S.burst); gl.uniform1f(U.burstOn, S.burstOn); gl.uniform1f(U.flash, S.flash); gl.uniform1f(U.rflare, S.rflare);
        gl.uniform3fv(U.nd, S.n.flatMap((n) => [n.x, n.y, n.z]));
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // with reduced motion the picture holds still: draw again only while measuring settles or a story runs
      if (!reduce || this.tl || now - start < 1500) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  get ready() {
    return !!this.gl;
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.timer);
    this.tl?.kill();
    lose(this.gl);
    this.gl = null;
  }

  /** A level-up tells its class's story on the tree; `finish` runs once it's told (or can't be). */
  tell(level: number, cls: string, finish: () => void) {
    let done = false;
    const end = () => {
      if (done || this.dead) return;
      done = true;
      finish();
    };
    const card = this.card, cv = this.cv;
    if (!this.gl || reducedMotion()) return end();
    const cr = cv.getBoundingClientRect(), z = cr.width / cv.clientWidth || 1;
    const pos = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - cr.left) / z, y: (r.top + r.height / 2 - cr.top) / z };
    };
    const rootBtn = card.querySelector('[data-node="root"] button'), tick = card.querySelector(`[data-tick="${level}"]`), rail = card.querySelector("[data-rail]");
    if (!rootBtn || !tick || !rail) return end();
    const root = pos(rootBtn), climbX = pos(rail).x, rowY = pos(tick).y;
    const nodes = [...card.querySelectorAll(`[data-level="${level}"]`)]
      .map((w) => {
        const p = pos(w.querySelector("button")!);
        return { el: w, x: p.x, y: p.y, d: Math.abs(p.x - climbX) };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    const edges = [...card.querySelectorAll(`[data-row="${level}"]`)];
    const U = this.U;
    this.tl?.kill();
    U.headOn = 0; U.burst = 0; U.burstOn = 0; U.flash = 0; U.rflare = 0;
    U.y0 = root.y; U.head = root.y; U.climbX = climbX; U.rowY = rowY;
    U.n.forEach((n, i) => {
      const q = nodes[i];
      n.x = q ? q.x : 0; n.y = q ? q.y : 0; n.z = 0;
    });
    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: () => { if (this.tl === tl) this.tl = null; } });
    this.tl = tl;
    tl.set(edges, { opacity: 0 }, 0);
    if (cls === "sorcerer") {
      // The dragon wakes: fire gathers at the root, a column of flame climbs to the new level,
      // runs along it, and each new step catches fire.
      tl.to(U, { rflare: 1, duration: 0.35, ease: "power2.in" }, 0)
        .to(rootBtn, { scale: 1.14, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.2)
        .set(U, { headOn: 1 }, 0.3)
        .to(U, { head: rowY, duration: 0.7, ease: "power2.in" }, 0.3)
        .to(U, { rflare: 0.15, duration: 0.9 }, 0.55)
        .set(U, { burstOn: 1 }, 1)
        .fromTo(U, { flash: 1 }, { flash: 0, duration: 0.6, immediateRender: false }, 1)
        .fromTo(U, { burst: 0 }, { burst: 1, duration: 0.75, immediateRender: false }, 1)
        .to(U, { headOn: 0, duration: 0.6 }, 1.05)
        .fromTo(tick, { scale: 1.7 }, { scale: 1, duration: 0.5, ease: "back.out(3)", immediateRender: false }, 1)
        .fromTo(edges, { opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0, duration: 0.45, stagger: 0.1 }, 1.02);
      nodes.forEach((n, i) => {
        const at = 1.08 + i * 0.13;
        tl.fromTo(n.el, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(2.4)" }, at)
          .to(U.n[i], { z: 1, duration: 0.15 }, at)
          .to(U.n[i], { z: 0.3, duration: 1.1, ease: "power1.out" }, at + 0.15);
      });
      tl.to(U, { burstOn: 0, duration: 1.1 }, 1.6).call(end, undefined, 2.45).to(U.n, { z: 0, duration: 1.2 }, 3.2);
    } else if (cls === "fighter") {
      // Forged: an anvil strike at the root, a blade of light shoots up, a clang sends a shockwave
      // along the new level, and each new step is stamped down hard.
      tl.to(U, { rflare: 1, duration: 0.12, ease: "power3.in" }, 0)
        .fromTo(card, { x: -3 }, { x: 0, duration: 0.35, ease: "elastic.out(1, .3)", immediateRender: false }, 0.12)
        .to(U, { rflare: 0, duration: 0.5 }, 0.14)
        .set(U, { headOn: 1 }, 0.2)
        .to(U, { head: rowY, duration: 0.5, ease: "power3.in" }, 0.2)
        .set(U, { burstOn: 1 }, 0.7)
        .fromTo(U, { flash: 1 }, { flash: 0, duration: 0.45, immediateRender: false }, 0.7)
        .fromTo(U, { burst: 0 }, { burst: 1, duration: 0.42, ease: "power3.out", immediateRender: false }, 0.7)
        .to(U, { headOn: 0, duration: 0.3 }, 0.74)
        .fromTo(card, { y: 4 }, { y: 0, duration: 0.45, ease: "elastic.out(1, .3)", immediateRender: false }, 0.7)
        .fromTo(tick, { scale: 1.8 }, { scale: 1, duration: 0.3, ease: "power4.in", immediateRender: false }, 0.63)
        .fromTo(edges, { opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0, duration: 0.25, stagger: 0.08 }, 0.74);
      nodes.forEach((n, i) => {
        const at = 0.78 + i * 0.1;
        tl.fromTo(n.el, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in" }, at)
          .to(U.n[i], { z: 1, duration: 0.05 }, at + 0.18)
          .to(U.n[i], { z: 0.25, duration: 0.8 }, at + 0.23);
      });
      tl.to(U, { burstOn: 0, duration: 0.6 }, 1.35).call(end, undefined, 1.85).to(U.n, { z: 0, duration: 1.2 }, 2.6);
    } else if (cls === "wizard") {
      // The spellbook opens: the rune circle wakes, a thread of starlight climbs, and constellation
      // lines reach out to each new step, which appears in a flare of starlight.
      tl.to(U, { rflare: 1, duration: 0.6, ease: "sine.inOut" }, 0)
        .set(U, { headOn: 1 }, 0.45)
        .to(U, { head: rowY, duration: 0.9, ease: "sine.inOut" }, 0.45)
        .set(U, { burstOn: 1 }, 1.35)
        .fromTo(U, { flash: 0.7 }, { flash: 0, duration: 0.8, immediateRender: false }, 1.35)
        .fromTo(U, { burst: 0 }, { burst: 1, duration: 0.95, ease: "power1.inOut", immediateRender: false }, 1.35)
        .to(U, { headOn: 0, duration: 0.8 }, 1.4)
        .to(U, { rflare: 0.25, duration: 1 }, 1.4)
        .fromTo(tick, { scale: 0.4, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)", immediateRender: false }, 1.3)
        .fromTo(edges, { opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0, duration: 0.6, stagger: 0.2 }, 1.45);
      nodes.forEach((n, i) => {
        const at = 1.55 + i * 0.2;
        tl.fromTo(n.el, { opacity: 0, scale: 0.5, rotation: -90 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.8)" }, at)
          .to(U.n[i], { z: 1, duration: 0.3 }, at)
          .to(U.n[i], { z: 0.4, duration: 1.2 }, at + 0.3);
      });
      tl.to(U, { burstOn: 0, duration: 1 }, 2.6).call(end, undefined, 2.9).to(U.n, { z: 0, duration: 1.2 }, 3.6);
    } else {
      // Every other class tells the same beats with its own timing, easing and entrance; the shader draws its look.
      const c = CFG[cls] ?? CFG.bard;
      const REST: Record<string, any> = { opacity: 1, scale: 1, rotation: 0, x: 0, y: 0, filter: "blur(0px)" };
      const toOf = (from: Record<string, any>, extra: Record<string, any>) => ({ ...Object.fromEntries(Object.keys(from).map((k) => [k, REST[k]])), ...extra });
      // the cleric's light comes down from the top of the tree instead of climbing from the root
      if (c.descend) { U.y0 = 0; U.head = 0; }
      tl.to(U, { rflare: 1, duration: c.pre, ease: c.preEase }, 0).to(rootBtn, { scale: 1.12, duration: c.pre * 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0);
      if (c.shake) tl.fromTo(card, { x: -c.shake }, { x: 0, duration: 0.45, ease: "elastic.out(1, .3)", immediateRender: false }, c.pre);
      const t1 = c.pre * 0.85, tb = t1 + c.climb;
      tl.set(U, { headOn: 1 }, t1)
        .to(U, { head: rowY, duration: c.climb, ease: c.ease }, t1)
        .to(U, { rflare: c.rest, duration: 0.8 }, t1 + 0.2)
        .set(U, { burstOn: 1 }, tb)
        .fromTo(U, { flash: c.flash }, { flash: 0, duration: 0.6, immediateRender: false }, tb)
        .fromTo(U, { burst: 0 }, { burst: 1, duration: c.burst, ease: c.burstEase, immediateRender: false }, tb)
        .to(U, { headOn: 0, duration: 0.4 }, tb + 0.05)
        .fromTo(tick, c.tick, toOf(c.tick, { duration: 0.5, ease: "back.out(2.5)", immediateRender: false }), tb - 0.05)
        .fromTo(edges, { opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0, duration: 0.45, stagger: 0.1 }, tb + 0.05);
      if (c.slam) tl.fromTo(card, { y: c.slam }, { y: 0, duration: 0.45, ease: "elastic.out(1, .3)", immediateRender: false }, tb);
      nodes.forEach((n, i) => {
        const at = tb + c.nodeDelay + i * c.gap;
        tl.fromTo(n.el, c.from, toOf(c.from, { duration: c.nodeDur, ease: c.nodeEase }), at)
          .to(U.n[i], { z: 1, duration: 0.15 }, at)
          .to(U.n[i], { z: 0.3, duration: 1.1, ease: "power1.out" }, at + 0.15);
      });
      const e = tb + c.nodeDelay + nodes.length * c.gap + Math.max(0.5, c.nodeDur);
      // the story's lights go out once it is told: nothing glows where nothing is
      tl.to(U, { burstOn: 0, duration: 0.8 }, e - 0.3).call(end, undefined, e + 0.2).to(U.n, { z: 0, duration: 1.2 }, e + 1);
    }
    // the root's own hover lift comes back once its pulse is over
    tl.set(rootBtn, { clearProps: "transform" }, ">");
    // never leave the level half told
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(end, 4500);
  }
}

interface Cfg {
  pre: number; preEase: string; shake?: number; descend?: boolean; climb: number; ease: string; burst: number; burstEase: string; flash: number; slam?: number;
  tick: Record<string, number>; from: Record<string, any>; nodeEase: string; nodeDur: number; nodeDelay: number; gap: number; rest: number;
}
const CFG: Record<string, Cfg> = {
  barbarian: { pre: 0.25, preEase: "power4.in", shake: 7, climb: 0.32, ease: "power4.in", burst: 0.5, burstEase: "power3.out", flash: 1, slam: 6, tick: { scale: 2 }, from: { opacity: 0, scale: 1.9 }, nodeEase: "power4.in", nodeDur: 0.2, nodeDelay: 0.05, gap: 0.08, rest: 0.2 },
  bard: { pre: 0.5, preEase: "sine.inOut", climb: 0.85, ease: "sine.inOut", burst: 1, burstEase: "sine.out", flash: 0.6, tick: { scale: 0.5, rotation: -30 }, from: { opacity: 0, scale: 0.4, y: 12 }, nodeEase: "elastic.out(1, .5)", nodeDur: 0.9, nodeDelay: 0.15, gap: 0.16, rest: 0.3 },
  cleric: { pre: 0.5, preEase: "sine.inOut", descend: true, climb: 0.75, ease: "power2.in", burst: 0.9, burstEase: "power2.out", flash: 1, tick: { scale: 0.4 }, from: { opacity: 0, scale: 0.6, y: -16 }, nodeEase: "power2.out", nodeDur: 0.7, nodeDelay: 0.1, gap: 0.15, rest: 0.35 },
  druid: { pre: 0.45, preEase: "sine.inOut", climb: 1, ease: "power1.inOut", burst: 1.1, burstEase: "power1.out", flash: 0.4, tick: { scale: 0 }, from: { opacity: 0, scale: 0 }, nodeEase: "back.out(2.2)", nodeDur: 0.7, nodeDelay: 0.2, gap: 0.18, rest: 0.25 },
  monk: { pre: 0.35, preEase: "power2.inOut", climb: 0.5, ease: "power3.inOut", burst: 0.4, burstEase: "power4.out", flash: 0.8, tick: { scale: 0.3, rotation: 180 }, from: { opacity: 0, scale: 0.5, rotation: -120 }, nodeEase: "power3.out", nodeDur: 0.45, nodeDelay: 0.05, gap: 0.09, rest: 0.2 },
  paladin: { pre: 0.4, preEase: "power2.in", climb: 0.6, ease: "power2.in", burst: 0.8, burstEase: "power2.out", flash: 1, slam: 3, tick: { scale: 1.8 }, from: { opacity: 0, scale: 1.5 }, nodeEase: "power3.in", nodeDur: 0.3, nodeDelay: 0.1, gap: 0.12, rest: 0.3 },
  ranger: { pre: 0.3, preEase: "power2.in", climb: 0.28, ease: "power3.in", burst: 0.55, burstEase: "power2.out", flash: 1, slam: 3, tick: { scale: 1.6 }, from: { opacity: 0, scale: 1.3 }, nodeEase: "power3.out", nodeDur: 0.3, nodeDelay: 0.05, gap: 0.1, rest: 0.15 },
  rogue: { pre: 0.3, preEase: "power2.in", climb: 0.45, ease: "power2.inOut", burst: 0.35, burstEase: "power3.out", flash: 0.5, tick: { opacity: 0, scale: 0.6 }, from: { opacity: 0, scale: 1.1, filter: "blur(8px)" }, nodeEase: "power2.out", nodeDur: 0.5, nodeDelay: 0.05, gap: 0.12, rest: 0.1 },
  warlock: { pre: 0.6, preEase: "sine.inOut", climb: 0.9, ease: "sine.in", burst: 0.5, burstEase: "power3.out", flash: 0.8, tick: { scale: 0.3, rotation: -180 }, from: { opacity: 0, scale: 0.3, rotation: 90 }, nodeEase: "back.out(1.6)", nodeDur: 0.6, nodeDelay: 0.1, gap: 0.15, rest: 0.35 },
  artificer: { pre: 0.4, preEase: "steps(4)", climb: 0.7, ease: "power1.inOut", burst: 0.7, burstEase: "none", flash: 0.6, tick: { scale: 0.3, rotation: -90 }, from: { opacity: 0, scale: 0.4, rotation: -60 }, nodeEase: "back.out(2)", nodeDur: 0.5, nodeDelay: 0.1, gap: 0.14, rest: 0.3 },
};

// ---------------------------------------------------------------- the "Level up!" card

/** The card rises in its class's style; returns a cleanup. */
export function partyFx(dlg: HTMLElement, cls: string, glowRgb: string): () => void {
  const q = (k: string) => dlg.querySelector(`[data-p="${k}"]`) as HTMLElement | null;
  const card = q("card"), label = q("label"), num = q("num"), sub = q("sub"), go = q("go"), sheen = q("sheen");
  const chips = [...dlg.querySelectorAll('[data-p="chips"] > *')];
  if (reducedMotion() || !card) return () => {}; // the card simply shows
  const P = { A: 0, B: 0, C: 0 };
  const stopGL = partyGL(dlg, P, cls, glowRgb);
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
  if (cls === "sorcerer") {
    // The card stands up out of a ring of dragon fire; the number forges in the heat.
    tl.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
      .to(P, { A: 1, duration: 0.5 }, 0)
      .to(P, { B: 1, duration: 0.8 }, 0.2)
      .fromTo(card, { opacity: 0, scale: 0.88, filter: "brightness(2.2)" }, { opacity: 1, scale: 1, filter: "brightness(1)", duration: 0.6 }, 0.3)
      .to(P, { A: 0.45, duration: 1.2, ease: "sine.inOut" }, 0.65)
      .fromTo(label, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, 0.55)
      .fromTo(num, { opacity: 0, scale: 2.2, textShadow: "0 0 30px rgba(255,140,60,1)" }, { opacity: 1, scale: 1, textShadow: "0 0 0px rgba(255,140,60,0)", duration: 0.7, ease: "back.out(2.2)" }, 0.65)
      .fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.95)
      .fromTo(chips, { opacity: 0, y: 10, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.12, ease: "back.out(2)" }, 1.05)
      .fromTo(go, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, 1.3);
  } else if (cls === "fighter") {
    // The card slams down; a shockwave and sparks run out, a steel gleam sweeps it, the new powers are stamped on.
    tl.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0)
      .fromTo(card, { y: -380, rotation: -5 }, { y: 0, rotation: 0, duration: 0.38, ease: "power4.in" }, 0.05)
      .fromTo(P, { A: 0 }, { A: 1, duration: 0.08, immediateRender: false }, 0.43)
      .to(P, { A: 0.35, duration: 0.9 }, 0.51)
      .fromTo(P, { B: 0 }, { B: 1, duration: 0.95, immediateRender: false }, 0.43)
      .fromTo(dlg, { x: -7, y: 4 }, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, .3)", immediateRender: false }, 0.43)
      .fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5)
      .fromTo(num, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in" }, 0.55)
      .fromTo(sheen, { xPercent: -120 }, { xPercent: 120, duration: 0.75, ease: "power2.inOut" }, 0.72)
      .fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.75)
      .fromTo(chips, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.18, stagger: 0.1, ease: "power4.in" }, 0.85)
      .fromTo(go, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, 1.15);
  } else if (cls === "wizard") {
    // A rune circle draws itself and stars spiral in; the card unfolds like a page; the number comes into focus.
    tl.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
      .to(P, { A: 1, duration: 0.85, ease: "sine.inOut" }, 0.05)
      .to(P, { C: 1, duration: 1.4, ease: "power1.out" }, 0.3)
      .fromTo(card, { opacity: 0, scaleY: 0.04, scaleX: 0.6 }, { opacity: 1, scaleY: 1, scaleX: 1, duration: 0.55, ease: "power3.out" }, 0.7)
      .fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.05)
      .fromTo(num, { opacity: 0, scale: 0.9, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7 }, 1.1)
      .fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.35)
      .fromTo(chips, { opacity: 0, scale: 0.6, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, stagger: 0.15, ease: "back.out(2)" }, 1.4)
      .fromTo(go, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, 1.75);
  } else {
    // every other class: the card rises in its colour, a glow gathers round it, the powers pop in
    tl.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
      .to(P, { A: 1, duration: 0.5 }, 0)
      .fromTo(card, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" }, 0.1)
      .to(P, { A: 0.4, duration: 1.2, ease: "sine.inOut" }, 0.7)
      .fromTo(label, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, 0.35)
      .fromTo(num, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.45)
      .fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.7)
      .fromTo(chips, { opacity: 0, y: 10, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(2)" }, 0.8)
      .fromTo(go, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, 1.05);
  }
  return () => {
    tl.kill();
    stopGL();
  };
}

function partyGL(dlg: HTMLElement, P: { A: number; B: number; C: number }, cls: string, glowRgb: string): () => void {
  const cv = dlg.querySelector("canvas[data-pfx]") as HTMLCanvasElement | null;
  const gl = cv?.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!cv || !gl) return () => {};
  const pr = program(gl, PARTY_FS);
  if (!pr) return () => {};
  const U: Record<string, WebGLUniformLocation | null> = {};
  ["res", "px", "t", "cls", "c", "hs", "A", "B", "C", "col"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  const col = glowRgb.split(",").map((v) => +v / 255);
  const card = dlg.querySelector('[data-p="card"]') as HTMLElement;
  const start = performance.now();
  let raf = 0, live = true;
  const frame = (now: number) => {
    if (!live || !cv.isConnected) return;
    const f = fit(cv);
    if (f) {
      // the card's resting box (its offset size, not its animated transform)
      const cx = card.offsetLeft + card.offsetWidth / 2, cy = card.offsetTop + card.offsetHeight / 2;
      gl.viewport(0, 0, f.cw, f.ch);
      gl.uniform2f(U.res, f.cw, f.ch); gl.uniform1f(U.px, f.dpr); gl.uniform1f(U.t, (now - start) / 1000);
      gl.uniform1f(U.cls, cls === "sorcerer" ? 0 : cls === "fighter" ? 1 : cls === "wizard" ? 2 : 3);
      gl.uniform3f(U.col, col[0], col[1], col[2]);
      gl.uniform2f(U.c, cx, f.h - cy); gl.uniform2f(U.hs, card.offsetWidth / 2, card.offsetHeight / 2);
      gl.uniform1f(U.A, P.A); gl.uniform1f(U.B, P.B); gl.uniform1f(U.C, P.C);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    live = false;
    cancelAnimationFrame(raf);
    lose(gl);
  };
}

// ---------------------------------------------------------------- the final level's big story

/** Plays the class's final-level story; returns { skip, stop }. */
export function storyFx(dlg: HTMLElement, cls: string): { skip: () => void; stop: () => void } {
  const q = (k: string) => dlg.querySelector(`[data-p="${k}"]`) as HTMLElement | null;
  const card = q("card"), label = q("label"), num = q("num"), line = q("line"), sub = q("sub"), go = q("go");
  const heat = q("heat"), sheen = q("sheen"), hammer = q("hammer"), book = q("book");
  const chips = [...dlg.querySelectorAll('[data-p="chips"] > *')];
  const P: Record<string, number> = { E: 0, S: 1, F: 0, R: 0, G: 0, H: 0, Q: 0, FL: 0, A: 0, C: 0, B: 0, W: 0, K: 0, p0: 0, p1: 0, p2: 0, s0: 0, s1: 0, s2: 0, z0: 0, z1: 0, z2: 0 };
  // with reduced motion the card simply shows, with a quiet light around it
  if (reducedMotion() || !card || !num) {
    if (cls === "sorcerer") P.R = 0.35;
    else if (cls === "fighter") P.H = 0.12;
    else { P.A = 1; P.K = 0.35; }
    const stop = card && num ? storyGL(dlg, P, cls) : () => {};
    return { skip: () => {}, stop };
  }
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
  const Z = (i: number, v: number) => ({ ["z" + i]: v });
  const PR = (i: number, v: number) => ({ ["p" + i]: v });
  gsap.set(dlg, { opacity: 0 });
  gsap.set([label, num, line, sub, go], { opacity: 0 });
  gsap.set(chips, { opacity: 0 });
  const n = chips.length;

  if (cls === "sorcerer") {
    // A heartbeat in the dark. An eye opens where the card will stand; the pupil narrows. The dragon
    // roars: fire fills the window, then burns down to a ring around the card. The number forges in
    // the heat, and embers carry each new power out of it.
    gsap.set(card, { opacity: 0 });
    gsap.set(num, { scale: 2, color: "#fff6e0", textShadow: "0 0 28px rgba(255,150,60,1)" });
    tl.to(dlg, { opacity: 1, duration: 0.3 }, 0)
      .to(P, { G: 0.55, duration: 0.12, ease: "power2.in" }, 0.3).to(P, { G: 0.15, duration: 0.3 }, 0.42)
      .to(P, { G: 0.95, duration: 0.12, ease: "power2.in" }, 0.75).to(P, { G: 0.35, duration: 0.35 }, 0.87)
      .to(P, { E: 1, duration: 0.6, ease: "power3.out" }, 1.1)
      .to(P, { S: 0.3, duration: 0.35, ease: "power2.in" }, 1.75)
      .to(P, { F: 1.3, duration: 0.5, ease: "power2.in" }, 2.05)
      .fromTo(dlg, { x: -7 }, { x: 0, duration: 0.6, ease: "elastic.out(1, .3)", immediateRender: false }, 2.45)
      .to(P, { E: 0, G: 0, duration: 0.2 }, 2.45)
      .to(card, { opacity: 1, duration: 0.5 }, 2.5)
      .fromTo(card, { scale: 0.86, filter: "brightness(2.4)" }, { scale: 1, filter: "brightness(1)", duration: 0.7, immediateRender: false }, 2.5)
      .to(P, { R: 1, duration: 0.4 }, 2.5)
      .to(P, { F: 0, duration: 0.9, ease: "power2.in" }, 2.6)
      .to(P, { R: 0.35, duration: 1.4, ease: "sine.inOut" }, 3.2)
      .to(label, { opacity: 1, duration: 0.4 }, 2.9)
      .to(num, { opacity: 1, scale: 1, color: "#ffd28a", textShadow: "0 0 0px rgba(255,150,60,0)", duration: 0.8, ease: "back.out(2)" }, 3.0)
      .to(line, { opacity: 1, duration: 0.5 }, 3.35)
      .to(sub, { opacity: 1, duration: 0.4 }, 3.5);
    chips.forEach((ch, i) => {
      const at = 3.65 + i * 0.32;
      tl.to(P, { ...PR(i, 1), duration: 0.5, ease: "power1.inOut" }, at)
        .fromTo(ch, { scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)", immediateRender: false }, at + 0.47)
        .fromTo(P, Z(i, 1), { ...Z(i, 0), duration: 0.9, immediateRender: false }, at + 0.47);
    });
    tl.fromTo(go, { y: 8 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: false }, 3.65 + n * 0.32 + 0.35);
  } else if (cls === "fighter") {
    // The blank drops onto the anvil, glowing hot. The hammer comes down three times, sparks fly
    // off the top edge, and on the third blow the number is stamped in. Quenched in steam, it cools
    // to steel; a gleam runs over it; each new power is stamped on.
    gsap.set(card, { opacity: 0 });
    gsap.set(heat, { opacity: 1 });
    gsap.set(hammer, { rotation: 62, opacity: 0, transformOrigin: "240px 36px" });
    gsap.set(num, { scale: 1.5, color: "#3a1606" });
    tl.to(dlg, { opacity: 1, duration: 0.25 }, 0)
      .fromTo(card, { y: -70 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.in", immediateRender: false }, 0.1)
      .to(P, { H: 1, duration: 0.3 }, 0.2)
      .fromTo(card, { scaleY: 0.94 }, { scaleY: 1, transformOrigin: "50% 100%", duration: 0.45, ease: "elastic.out(1, .4)", immediateRender: false }, 0.45)
      .to(hammer, { opacity: 1, duration: 0.25 }, 0.55);
    [1.05, 1.6, 2.15].forEach((at, j) => {
      tl.to(hammer, { rotation: 66, duration: 0.22, ease: "power2.out" }, at - 0.32)
        .to(hammer, { rotation: 0, duration: 0.1, ease: "power4.in" }, at - 0.1)
        .to(hammer, { rotation: 22, duration: 0.25, ease: "power2.out" }, at)
        .fromTo(P, { ["s" + j]: 0 }, { ["s" + j]: 1, duration: 0.9, ease: "none", immediateRender: false }, at)
        .fromTo(P, { FL: 1 }, { FL: 0, duration: 0.35, immediateRender: false }, at)
        .fromTo(card, { scaleY: 0.95 }, { scaleY: 1, duration: 0.35, ease: "elastic.out(1, .35)", immediateRender: false }, at)
        .fromTo(dlg, { y: 4 }, { y: 0, duration: 0.35, ease: "elastic.out(1, .3)", immediateRender: false }, at)
        .to(heat, { opacity: [0.72, 0.5, 0.32][j], duration: 0.2 }, at);
    });
    tl.to(num, { opacity: 1, scale: 1, duration: 0.1, ease: "power4.in" }, 2.05)
      .to(label, { opacity: 1, duration: 0.25 }, 2.2)
      .to(hammer, { rotation: 80, opacity: 0, duration: 0.45, ease: "power2.in" }, 2.45)
      .to(P, { Q: 1, duration: 0.3 }, 2.5).to(P, { Q: 0, duration: 1.4, ease: "power1.in" }, 2.9)
      .to(heat, { opacity: 0, duration: 0.9 }, 2.55)
      .to(P, { H: 0.12, duration: 1 }, 2.55)
      .to(num, { color: "#f0dca8", duration: 0.9 }, 2.55)
      .fromTo(sheen, { xPercent: -120, opacity: 1 }, { xPercent: 120, duration: 0.8, ease: "power2.inOut", immediateRender: false }, 3.0)
      .to(line, { opacity: 1, duration: 0.4 }, 3.05)
      .to(sub, { opacity: 1, duration: 0.3 }, 3.2);
    chips.forEach((ch, i) => {
      const at = 3.4 + i * 0.24;
      tl.fromTo(ch, { scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.16, ease: "power4.in", immediateRender: false }, at)
        .fromTo(P, Z(i, 1), { ...Z(i, 0), duration: 0.6, immediateRender: false }, at + 0.16);
    });
    tl.fromTo(go, { y: 8 }, { opacity: 1, y: 0, duration: 0.35, immediateRender: false }, 3.4 + n * 0.24 + 0.3);
  } else {
    // Stars come out. A spellbook appears and falls open, its pages turn, light rises off the page
    // and a rune circle draws itself. The page becomes the card; a quill of light writes the number;
    // a constellation reaches out from it to each new power.
    const cover = q("cover"), left = q("left"), ink = q("ink");
    const pages = [...dlg.querySelectorAll("[data-pg]")];
    gsap.set(card, { opacity: 0 });
    gsap.set(book, { opacity: 0, scale: 0.8, transformOrigin: "50% 50%" });
    gsap.set(cover, { svgOrigin: "110 70", scaleX: 1 });
    gsap.set(pages, { svgOrigin: "110 70", scaleX: 1 });
    tl.to(dlg, { opacity: 1, duration: 0.3 }, 0)
      .to(P, { C: 0.3, duration: 0.8 }, 0)
      .to(book, { opacity: 1, scale: 1, duration: 0.5 }, 0.15)
      .to(cover, { scaleX: -1, duration: 0.55, ease: "power2.inOut" }, 0.7)
      .set([left, ...pages], { opacity: 1 }, 0.97);
    pages.forEach((pg, i) => tl.to(pg, { scaleX: -1, duration: 0.34, ease: "power1.inOut" }, 1.1 + i * 0.12));
    tl.to(ink, { opacity: 1, duration: 0.4 }, 1.45)
      .to(P, { B: 1, duration: 0.4 }, 1.4)
      .to(P, { A: 1, K: 1, duration: 0.9, ease: "sine.inOut" }, 1.45)
      .to(P, { C: 0.999, duration: 1.3 }, 1.5)
      .to(book, { opacity: 0, scale: 0.9, y: 30, duration: 0.4, ease: "power2.in" }, 2.25)
      .to(P, { B: 0, duration: 0.6 }, 2.35)
      .to(card, { opacity: 1, duration: 0.3 }, 2.3)
      .fromTo(card, { scaleY: 0.05, scaleX: 0.7 }, { scaleY: 1, scaleX: 1, duration: 0.55, ease: "power3.out", immediateRender: false }, 2.3)
      .to(label, { opacity: 1, duration: 0.4 }, 2.7)
      .set(num, { opacity: 1, clipPath: "inset(0 100% 0 0)" }, 2.85)
      .to(num, { clipPath: "inset(0 0% 0 0)", duration: 0.75, ease: "none" }, 2.85)
      .fromTo(P, { W: 0 }, { W: 1, duration: 0.75, ease: "none", immediateRender: false }, 2.85)
      .to(line, { opacity: 1, duration: 0.5 }, 3.5)
      .to(sub, { opacity: 1, duration: 0.4 }, 3.65)
      .to(P, { C: 0, duration: 0.01 }, 3.7);
    chips.forEach((ch, i) => {
      const at = 3.8 + i * 0.32;
      tl.to(P, { ...PR(i, 1), duration: 0.45, ease: "power1.inOut" }, at)
        .fromTo(ch, { scale: 0.6, rotation: -15 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: "back.out(2)", immediateRender: false }, at + 0.42)
        .fromTo(P, Z(i, 1), { ...Z(i, 0), duration: 1, immediateRender: false }, at + 0.42);
    });
    tl.to(P, { K: 0.35, duration: 1.2 }, 4.2).fromTo(go, { y: 8 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: false }, 3.8 + n * 0.32 + 0.35);
  }
  const stopGL = storyGL(dlg, P, cls);
  return {
    skip: () => {
      if (tl.progress() < 1) tl.progress(1);
    },
    stop: () => {
      tl.kill();
      stopGL();
    },
  };
}

function storyGL(dlg: HTMLElement, P: Record<string, number>, cls: string): () => void {
  const cv = dlg.querySelector("canvas[data-pfx]") as HTMLCanvasElement | null;
  const gl = cv?.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!cv || !gl) return () => {};
  const pr = program(gl, STORY_FS);
  if (!pr) return () => {};
  const U: Record<string, WebGLUniformLocation | null> = {};
  ["res", "c", "hs", "nm", "nh", "px", "t", "cls", "lvl", "chn", "cm", "ch[0]", "pr", "sp", "E", "S", "F", "R", "G", "H", "Q", "FL", "A", "C", "B", "W", "K"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  const card = dlg.querySelector('[data-p="card"]') as HTMLElement, num = dlg.querySelector('[data-p="num"]') as HTMLElement;
  const chips = ([...dlg.querySelectorAll('[data-p="chips"] > *')] as HTMLElement[]).slice(0, 3);
  // where a thing rests in the window: its layout box, not its animated transform
  const at = (el: HTMLElement) => {
    let x = 0, y = 0, e: HTMLElement | null = el;
    while (e && e !== dlg) {
      x += e.offsetLeft;
      y += e.offsetTop;
      e = e.offsetParent as HTMLElement | null;
    }
    return [x + el.offsetWidth / 2, y + el.offsetHeight / 2];
  };
  const chv = new Float32Array(9), start = performance.now();
  let raf = 0, live = true;
  const frame = (now: number) => {
    if (!live || !cv.isConnected) return;
    const f = fit(cv);
    if (f) {
      const h = f.h, cc = at(card), nn = at(num);
      for (let i = 0; i < 3; i++) {
        const ch = chips[i];
        if (ch) {
          const cp = at(ch);
          chv[i * 3] = cp[0]; chv[i * 3 + 1] = h - cp[1]; chv[i * 3 + 2] = P["z" + i];
        } else {
          chv[i * 3] = -9999; chv[i * 3 + 1] = -9999; chv[i * 3 + 2] = 0;
        }
      }
      const op = +gsap.getProperty(card, "opacity");
      gl.viewport(0, 0, f.cw, f.ch);
      gl.uniform2f(U.res, f.cw, f.ch); gl.uniform1f(U.px, f.dpr); gl.uniform1f(U.t, (now - start) / 1000);
      gl.uniform1f(U.cls, cls === "sorcerer" ? 0 : cls === "fighter" ? 1 : 2);
      gl.uniform1f(U.lvl, 1); gl.uniform1f(U.chn, chips.length); gl.uniform1f(U.cm, isNaN(op) ? 1 : op);
      gl.uniform2f(U.c, cc[0], h - cc[1]); gl.uniform2f(U.hs, card.offsetWidth / 2, card.offsetHeight / 2);
      gl.uniform2f(U.nm, nn[0], h - nn[1]); gl.uniform2f(U.nh, num.offsetWidth / 2, num.offsetHeight / 2);
      gl.uniform3fv(U["ch[0]"], chv);
      gl.uniform3f(U.pr, P.p0, P.p1, P.p2); gl.uniform3f(U.sp, P.s0, P.s1, P.s2);
      ["E", "S", "F", "R", "G", "H", "Q", "FL", "A", "C", "B", "W", "K"].forEach((k) => gl.uniform1f(U[k], P[k]));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    live = false;
    cancelAnimationFrame(raf);
    lose(gl);
  };
}
