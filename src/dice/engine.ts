// The 3D dice table (REQUIREMENTS 4.6): real dice shapes drawn by the app on a 2D canvas (no 3D
// library). Each die is a rigid body: gravity, bounces off the floor, the screen edges and the
// other dice, friction, then it settles; the face on top is the result. Mockup: "Dice and Items"
// canvas (DiceTray board). Physics only (user, 2026-11-19); dice fade 2 s after they land.
import type { DieSpec, Tone } from "./roll";

type V = [number, number, number];
type Q = [number, number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const vAdd = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vMul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const vDot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vLen = (a: V) => Math.sqrt(vDot(a, a));
const vNorm = (a: V): V => {
  const l = vLen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const qMul = (a: Q, b: Q): Q => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qNorm = (q: Q): Q => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
const qAxis = (axis: V, ang: number): Q => {
  const a = vNorm(axis);
  const s = Math.sin(ang / 2);
  return [Math.cos(ang / 2), a[0] * s, a[1] * s, a[2] * s];
};
const qRot = (q: Q, v: V): V => {
  const u: V = [q[1], q[2], q[3]];
  const t = vMul(vCross(u, v), 2);
  return vAdd(vAdd(v, vMul(t, q[0])), vCross(u, t));
};
const qSlerp = (a: Q, b: Q, t: number): Q => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) {
    b = b.map((x) => -x) as Q;
    d = -d;
  }
  if (d > 0.9995) return qNorm(a.map((x, i) => x + (b[i] - x) * t) as Q);
  const th = Math.acos(d);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return a.map((x, i) => x * wa + b[i] * wb) as Q;
};
/** Rotation whose matrix rows are the given axes. */
function qFromRows(m: [V, V, V]): Q {
  const tr = m[0][0] + m[1][1] + m[2][2];
  let w: number, x: number, y: number, z: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = s / 4; x = (m[2][1] - m[1][2]) / s; y = (m[0][2] - m[2][0]) / s; z = (m[1][0] - m[0][1]) / s;
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    w = (m[2][1] - m[1][2]) / s; x = s / 4; y = (m[0][1] + m[1][0]) / s; z = (m[0][2] + m[2][0]) / s;
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    w = (m[0][2] - m[2][0]) / s; x = (m[0][1] + m[1][0]) / s; y = s / 4; z = (m[1][2] + m[2][1]) / s;
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    w = (m[1][0] - m[0][1]) / s; x = (m[0][2] + m[2][0]) / s; y = (m[1][2] + m[2][1]) / s; z = s / 4;
  }
  return qNorm([w, x, y, z]);
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const randUnit = () => vNorm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]);

// ---------- the dice shapes ----------
interface Face {
  idx: number[];
  c: V;
  n: V;
  /** Which way is "up" for the number printed on this face. */
  up: V;
  /** Inradius: how big the number can be. */
  rin: number;
  value: number;
}
interface Shape {
  sides: number;
  verts: V[];
  faces: Face[];
  /** d4: the number at each corner (the result is the corner on top). */
  vval: number[] | null;
  sizeK: number;
  fontK: number;
}

function triFaces(vs: V[]): number[][] {
  let L = Infinity;
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) L = Math.min(L, vLen(vSub(vs[i], vs[j])));
  const ok = (i: number, j: number) => Math.abs(vLen(vSub(vs[i], vs[j])) - L) < L * 0.01;
  const f: number[][] = [];
  for (let i = 0; i < vs.length; i++)
    for (let j = i + 1; j < vs.length; j++)
      if (ok(i, j)) for (let k = j + 1; k < vs.length; k++) if (ok(i, k) && ok(j, k)) f.push([i, j, k]);
  return f;
}

const SHAPES = new Map<number, Shape>();
export function shapeOf(sides: number): Shape {
  const cached = SHAPES.get(sides);
  if (cached) return cached;
  let vs: V[];
  let fs: number[][];
  let apex: number[] | null = null;
  if (sides === 4) {
    vs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    fs = triFaces(vs);
  } else if (sides === 6) {
    vs = [];
    for (let i = 0; i < 8; i++) vs.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
    fs = [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]];
  } else if (sides === 8) {
    vs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    fs = triFaces(vs);
  } else if (sides === 10) {
    // Pentagonal trapezohedron; z0 keeps each kite face flat.
    const h = 1;
    const k = (1 - Math.cos(Math.PI / 5)) / 2;
    const z0 = (k * h) / (1 - k);
    vs = [[0, 0, h], [0, 0, -h]];
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      vs.push([Math.cos(a), Math.sin(a), z0]);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 + Math.PI / 5;
      vs.push([Math.cos(a), Math.sin(a), -z0]);
    }
    const U = (i: number) => 2 + (i % 5);
    const Lo = (i: number) => 7 + (i % 5);
    fs = [];
    apex = [];
    for (let i = 0; i < 5; i++) {
      fs.push([0, U(i), Lo(i), U(i + 1)]);
      apex.push(0);
    }
    for (let i = 0; i < 5; i++) {
      fs.push([1, Lo(i), U(i + 1), Lo(i + 1)]);
      apex.push(1);
    }
  } else {
    const ico: V[] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
    const it = triFaces(ico);
    if (sides === 20) {
      vs = ico;
      fs = it;
    } else {
      // d12: the dual of the icosahedron (a corner per icosahedron face).
      vs = it.map((t) => vMul(vAdd(vAdd(ico[t[0]], ico[t[1]]), ico[t[2]]), 1 / 3));
      fs = ico.map((a, i) => {
        const adj: number[] = [];
        it.forEach((t, j) => t.includes(i) && adj.push(j));
        const ax = vNorm(a);
        const e1 = vNorm(vCross(ax, Math.abs(ax[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
        const e2 = vCross(ax, e1);
        const ang = (p: number) => Math.atan2(vDot(vs[p], e2), vDot(vs[p], e1));
        return adj.sort((p, q) => ang(p) - ang(q));
      });
    }
  }
  const maxR = Math.max(...vs.map(vLen));
  vs = vs.map((v) => vMul(v, 1 / maxR));
  const faces: Face[] = fs.map((f0, fi) => {
    let f = f0;
    let c: V = [0, 0, 0];
    f.forEach((i) => (c = vAdd(c, vs[i])));
    c = vMul(c, 1 / f.length);
    let n: V = [0, 0, 0];
    for (let i = 0; i < f.length; i++) n = vAdd(n, vCross(vs[f[i]], vs[f[(i + 1) % f.length]]));
    n = vNorm(n);
    if (vDot(n, c) < 0) {
      f = [f[0], ...f.slice(1).reverse()];
      n = vMul(n, -1);
    }
    let rin = Infinity;
    for (let i = 0; i < f.length; i++) {
      const a = vs[f[i]];
      const e = vSub(vs[f[(i + 1) % f.length]], a);
      rin = Math.min(rin, vLen(vCross(e, vSub(c, a))) / vLen(e));
    }
    let up: V;
    if (sides === 6) up = vNorm(vSub(vMul(vAdd(vs[f[0]], vs[f[1]]), 0.5), c));
    else if (sides === 10) up = vNorm(vSub(vs[apex![fi]], c));
    else up = vNorm(vSub(vs[f[0]], c));
    up = vNorm(vSub(up, vMul(n, vDot(up, n))));
    return { idx: f, c, n, up, rin, value: 0 };
  });
  if (sides !== 4) {
    // Opposite faces add up to sides + 1, like real dice.
    let next = 1;
    faces.forEach((f) => {
      if (f.value) return;
      let best: Face | null = null;
      let bd = 2;
      faces.forEach((g) => {
        if (!g.value && g !== f) {
          const d = vDot(f.n, g.n);
          if (d < bd) {
            bd = d;
            best = g;
          }
        }
      });
      f.value = next;
      if (best) (best as Face).value = sides + 1 - next;
      next++;
    });
  }
  const sizeK = ({ 4: 1.22, 6: 1.06, 8: 1.04, 10: 1.02, 12: 1.06, 20: 1.12 } as Record<number, number>)[sides] ?? 1;
  const fontK = ({ 4: 0.62, 6: 0.98, 8: 0.92, 10: 0.78, 12: 0.86, 20: 0.88 } as Record<number, number>)[sides] ?? 0.9;
  const sh: Shape = { sides, verts: vs, faces, vval: sides === 4 ? [1, 2, 3, 4] : null, sizeK, fontK };
  SHAPES.set(sides, sh);
  return sh;
}

const TONES: Record<Tone, { body: [number, number, number]; ink: string }> = {
  monster: { body: [150, 30, 48], ink: "#f8e9c8" },
  fire: { body: [204, 96, 30], ink: "#fff3dc" },
  player: { body: [234, 216, 178], ink: "#3b2414" },
  tens: { body: [212, 166, 74], ink: "#2a1a0c" },
};
const LIGHT = vNorm([-0.35, -0.55, 0.76]);
const HALF = vNorm(vAdd(LIGHT, [0, 0, 1]));
const G = 2700;
/** How long the dice stay after they land, then how long they take to fade. */
export const DICE_STAY_MS = 2000;
const FADE_S = 0.5;

interface Die extends DieSpec {
  shape: Shape;
  R: number;
  I: number;
  p: V;
  v: V;
  w: V;
  q: Q;
  delay: number;
  alive: boolean;
  rest: number;
  age: number;
  face: number;
  dim: boolean;
  state: "fly" | "snap" | "done";
  q0?: Q;
  q1?: Q;
  snapT?: number;
}

export interface ThrowOptions {
  /** Phone layout: smaller dice, thrown up from the bottom. */
  compact: boolean;
  /** No throwing: the dice appear already landed. */
  reduced: boolean;
  /** Fixed faces (reduced motion picks them at random before calling). */
  faces?: number[];
}

/** Draws and simulates the dice on one canvas that covers the screen. */
export class DiceTable {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private W = 1;
  private H = 1;
  private dpr = 2;
  private dice: Die[] = [];
  private raf = 0;
  private last = 0;
  private t = 0;
  private fade = 1;
  private fading = false;
  private finished = false;
  private glowT = 0;
  private doneAt = 0;
  private compact = false;
  private onSettle: ((faces: number[]) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  resize() {
    this.W = this.cv.offsetWidth || window.innerWidth || 1;
    this.H = this.cv.offsetHeight || window.innerHeight || 1;
    this.dpr = Math.max(1.5, window.devicePixelRatio || 1);
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.draw();
  }

  /** Throw these dice. Resolves with the face each die landed on (same order). */
  throw(specs: DieSpec[], opts: ThrowOptions): Promise<number[]> {
    this.resize();
    this.compact = opts.compact;
    this.finished = false;
    this.fade = 1;
    this.fading = false;
    this.t = 0;
    this.glowT = 0;
    const n = specs.length;
    let R = opts.compact ? 23 : 31;
    if (n > 6) R *= Math.max(0.6, Math.sqrt(6 / n));
    this.dice = specs.map((s, i) => {
      const shape = shapeOf(s.sides);
      return {
        ...s,
        shape,
        R: R * shape.sizeK,
        I: 0.38 * Math.pow(R * shape.sizeK, 2),
        p: [0, 0, 0],
        v: [0, 0, 0],
        w: [0, 0, 0],
        q: qAxis(randUnit(), rnd(0, Math.PI * 2)),
        delay: i * (n > 8 ? 0.03 : 0.06),
        alive: false,
        rest: 0,
        age: 0,
        face: 0,
        dim: false,
        state: "fly",
      };
    });
    return new Promise((resolve) => {
      this.onSettle = resolve;
      if (opts.reduced) this.placeLanded(opts.faces ?? specs.map((s) => 1 + Math.floor(Math.random() * s.sides)));
      else this.dice.forEach((d, i) => this.launch(d, i, n));
      this.kick();
    });
  }

  /** Grey out dice that don't count (the dropped d20). */
  setDropped(idx: number[]) {
    this.dice.forEach((d, i) => (d.dim = idx.includes(i)));
    this.draw();
  }

  /** Fade the dice away now. */
  clear() {
    if (!this.dice.length) return;
    this.fading = true;
    this.kick();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.onSettle = null;
  }

  private launch(d: Die, i: number, n: number) {
    const R = d.R;
    const { W, H } = this;
    if (this.compact) {
      d.p = [W * (0.22 + 0.56 * ((i + 0.5) / n)) + rnd(-10, 10), H - R * 1.6 - (i % 2) * R * 1.4, R * rnd(1.4, 3)];
      d.v = [rnd(-260, 260), -rnd(950, 1350), rnd(150, 380)];
    } else {
      d.p = [W - R * 1.6 - (i % 2) * R * 1.6, H * (0.24 + 0.52 * ((i + 0.5) / n)) + rnd(-8, 8), R * rnd(1.4, 3)];
      d.v = [-rnd(1150, 1700), rnd(-320, 320), rnd(150, 380)];
    }
    d.w = vMul(randUnit(), rnd(16, 28));
    d.state = "fly";
  }

  /** Reduced motion: lay the dice out in rows, already showing their faces. */
  private placeLanded(faces: number[]) {
    const { W, H } = this;
    const n = this.dice.length;
    const gap = n ? this.dice[0].R * 2.5 : 60;
    const perRow = Math.max(1, Math.min(n, Math.floor((W * 0.84) / gap)));
    const rows = Math.ceil(n / perRow);
    const cy = this.compact ? H * 0.42 : H * 0.48;
    this.dice.forEach((d, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const col = i % perRow;
      d.face = faces[i];
      d.q = qMul(qAxis([0, 0, 1], rnd(-0.28, 0.28)), this.targetQ(d));
      d.p = [W / 2 + (col - (inRow - 1) / 2) * gap, cy + (row - (rows - 1) / 2) * gap * 0.95, 0];
      d.p[2] = -this.minZ(d);
      d.alive = true;
      d.state = "done";
    });
  }

  /** The rotation that shows `d.face` on top, its number upright. */
  private targetQ(d: Die): Q {
    const sh = d.shape;
    let n: V;
    let u: V;
    if (sh.sides === 4) {
      const vi = sh.vval!.indexOf(d.face);
      n = vNorm(sh.verts[vi]);
      const f = sh.faces.find((ff) => ff.idx.includes(vi))!;
      u = vNorm(vSub(vMul(n, vDot(f.c, n)), f.c));
    } else {
      const f = sh.faces.find((ff) => ff.value === d.face)!;
      n = f.n;
      u = f.up;
    }
    return qFromRows([vCross(n, u), vMul(u, -1), n]);
  }

  private minZ(d: Die) {
    let m = Infinity;
    for (const lv of d.shape.verts) m = Math.min(m, qRot(d.q, vMul(lv, d.R))[2]);
    return m;
  }

  private kick() {
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame((ts) => this.loop(ts));
    }
  }

  private loop(ts: number) {
    const now = ts / 1000;
    const dt = this.last ? Math.min(0.034, now - this.last) : 1 / 60;
    this.last = now;
    this.update(dt);
    this.draw();
    const busy = this.fading || this.dice.some((d) => d.state !== "done") || (this.finished && this.dice.length > 0);
    this.raf = busy ? requestAnimationFrame((t) => this.loop(t)) : 0;
  }

  private update(dt: number) {
    this.t += dt;
    if (this.fading) {
      this.fade = Math.max(0, this.fade - dt / FADE_S);
      if (this.fade <= 0) {
        this.fading = false;
        this.dice = [];
      }
      return;
    }
    const steps = 4;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const d of this.dice) {
        if (!d.alive) {
          if (this.t >= d.delay) d.alive = true;
          else continue;
        }
        if (d.state === "fly") this.stepFly(d, h);
      }
      this.collide();
    }
    for (const d of this.dice) {
      if (!d.alive || d.state !== "snap") continue;
      d.snapT = Math.min(1, (d.snapT ?? 0) + dt / 0.16);
      const e = 1 - Math.pow(1 - d.snapT, 3);
      d.q = qSlerp(d.q0!, d.q1!, e);
      d.p[2] = -this.minZ(d);
      if (d.snapT >= 1) d.state = "done";
    }
    if (!this.finished && this.dice.length && this.dice.every((d) => d.state === "done")) {
      this.finished = true;
      this.glowT = 0;
      this.doneAt = this.t;
      const cb = this.onSettle;
      this.onSettle = null;
      cb?.(this.dice.map((d) => d.face));
    }
    if (this.finished) {
      this.glowT = Math.min(1, this.glowT + dt / 0.5);
      if (this.dice.length && this.t - this.doneAt >= DICE_STAY_MS / 1000) this.fading = true;
    }
  }

  private stepFly(d: Die, h: number) {
    d.age += h;
    d.v[2] -= G * h;
    d.p = vAdd(d.p, vMul(d.v, h));
    const dq = qMul([0, d.w[0], d.w[1], d.w[2]], d.q);
    d.q = qNorm(d.q.map((x, i) => x + 0.5 * dq[i] * h) as Q);
    const onFloor = this.contact(d, [0, 0, 1], 0, 0.28, 0.5);
    this.contact(d, [1, 0, 0], 0, 0.45, 0.3);
    this.contact(d, [-1, 0, 0], -this.W, 0.45, 0.3);
    this.contact(d, [0, 1, 0], 0, 0.45, 0.3);
    this.contact(d, [0, -1, 0], -this.H, 0.45, 0.3);
    if (onFloor) {
      d.w = vMul(d.w, 1 - 2.4 * h);
      d.v[0] *= 1 - 0.9 * h;
      d.v[1] *= 1 - 0.9 * h;
    } else d.w = vMul(d.w, 1 - 0.2 * h);
    const slow = vLen(d.v) < 14 && vLen(d.w) < 0.9 && onFloor;
    d.rest = slow ? d.rest + h : 0;
    if (d.rest > 0.18 || d.age > 4.5) this.beginSnap(d);
  }

  /** Corner contacts with a plane: push out, bounce (e) and rub (mu). */
  private contact(d: Die, n: V, dist: number, e: number, mu: number) {
    const hits: V[] = [];
    let deepest = 0;
    for (const lv of d.shape.verts) {
      const r = qRot(d.q, vMul(lv, d.R));
      const pen = dist - vDot(n, vAdd(d.p, r));
      if (pen > 0) {
        hits.push(r);
        if (pen > deepest) deepest = pen;
      }
    }
    if (!hits.length) return false;
    d.p = vAdd(d.p, vMul(n, deepest));
    for (const r of hits) {
      let vc = vAdd(d.v, vCross(d.w, r));
      const vn = vDot(vc, n);
      if (vn >= 0) continue;
      const rn = vCross(r, n);
      const j = (-(1 + e) * vn) / (1 + vDot(rn, rn) / d.I);
      d.v = vAdd(d.v, vMul(n, j));
      d.w = vAdd(d.w, vMul(vCross(r, vMul(n, j)), 1 / d.I));
      vc = vAdd(d.v, vCross(d.w, r));
      const vt = vSub(vc, vMul(n, vDot(vc, n)));
      const vtl = vLen(vt);
      if (vtl > 1e-6) {
        const t = vMul(vt, 1 / vtl);
        const rt = vCross(r, t);
        const jt = Math.min(vtl / (1 + vDot(rt, rt) / d.I), mu * j);
        const J = vMul(t, -jt);
        d.v = vAdd(d.v, J);
        d.w = vAdd(d.w, vMul(vCross(r, J), 1 / d.I));
      }
    }
    return true;
  }

  /** Dice knock into each other (spheres are close enough at this size). */
  private collide() {
    const ds = this.dice;
    for (let i = 0; i < ds.length; i++)
      for (let k = i + 1; k < ds.length; k++) {
        const a = ds[i];
        const b = ds[k];
        if (!a.alive || !b.alive) continue;
        const rr = (a.R + b.R) * 0.8;
        const dv = vSub(b.p, a.p);
        const dist = vLen(dv);
        if (dist >= rr || dist < 0.001) continue;
        const aFree = a.state === "fly";
        const bFree = b.state === "fly";
        if (!aFree && !bFree) continue;
        const n = vMul(dv, 1 / dist);
        const pen = rr - dist;
        const sa = aFree && bFree ? 0.5 : aFree ? 1 : 0;
        const sb = 1 - sa;
        a.p = vSub(a.p, vMul(n, pen * sa));
        b.p = vAdd(b.p, vMul(n, pen * sb));
        const vrel = vDot(vSub(b.v, a.v), n);
        if (vrel < 0) {
          const j = -1.4 * vrel * 0.5;
          if (aFree) {
            a.v = vSub(a.v, vMul(n, j * 2 * sa));
            a.w = vAdd(a.w, vMul(randUnit(), j * 0.012));
          }
          if (bFree) {
            b.v = vAdd(b.v, vMul(n, j * 2 * sb));
            b.w = vAdd(b.w, vMul(randUnit(), j * 0.012));
          }
        }
      }
  }

  /** The die has stopped: read the face on top and turn it flat. */
  private beginSnap(d: Die) {
    const sh = d.shape;
    let dir: V;
    if (sh.sides === 4) {
      let best = -Infinity;
      let bi = 0;
      sh.verts.forEach((lv, i) => {
        const z = qRot(d.q, lv)[2];
        if (z > best) {
          best = z;
          bi = i;
        }
      });
      dir = vNorm(qRot(d.q, sh.verts[bi]));
      d.face = sh.vval![bi];
    } else {
      let best = -Infinity;
      let bf = sh.faces[0];
      for (const f of sh.faces) {
        const z = qRot(d.q, f.n)[2];
        if (z > best) {
          best = z;
          bf = f;
        }
      }
      dir = qRot(d.q, bf.n);
      d.face = bf.value;
    }
    const axis = vCross(dir, [0, 0, 1]);
    const s = vLen(axis);
    const qc: Q = s < 1e-6 ? [1, 0, 0, 0] : qAxis(axis, Math.atan2(s, dir[2]));
    d.q0 = d.q;
    d.q1 = qNorm(qMul(qc, d.q));
    d.snapT = 0;
    d.state = "snap";
    d.v = [0, 0, 0];
    d.w = [0, 0, 0];
  }

  // ---------- drawing ----------
  private cam() {
    return this.compact ? 1150 : 1600;
  }

  private proj(p: V): [number, number] {
    const cam = this.cam();
    const f = cam / (cam - Math.min(p[2], cam * 0.6));
    return [this.W / 2 + (p[0] - this.W / 2) * f, this.H / 2 + (p[1] - this.H / 2) * f];
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    const live = this.dice.filter((d) => d.alive);
    if (!live.length) return;
    for (const d of live) {
      // Shadow, offset away from the light; softer the higher the die is.
      const z = Math.max(0, d.p[2]);
      const s = this.proj([d.p[0] + z * 0.28, d.p[1] + z * 0.42, 0]);
      const r = d.R * (0.95 + z / 500);
      ctx.save();
      ctx.globalAlpha = this.fade * (d.dim ? 0.12 : 0.38) * Math.max(0.3, 1 - z / 260);
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(s[0], s[1], r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (this.finished && !d.dim) {
        // Gold glow under the dice that count.
        const c = this.proj([d.p[0], d.p[1], 0]);
        const rg = ctx.createRadialGradient(c[0], c[1], d.R * 0.3, c[0], c[1], d.R * 1.9);
        rg.addColorStop(0, `rgba(240,207,134,${0.34 * this.glowT})`);
        rg.addColorStop(1, "rgba(240,207,134,0)");
        ctx.save();
        ctx.globalAlpha = this.fade;
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(c[0], c[1], d.R * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    for (const d of live.slice().sort((a, b) => a.p[2] - b.p[2] || a.p[1] - b.p[1])) this.drawDie(ctx, d);
    ctx.globalAlpha = 1;
  }

  private drawDie(ctx: CanvasRenderingContext2D, d: Die) {
    const sh = d.shape;
    const tone = TONES[d.tone] ?? TONES.player;
    const cam: V = [this.W / 2, this.H / 2, this.cam()];
    const pv = sh.verts.map((lv) => this.proj(vAdd(d.p, qRot(d.q, vMul(lv, d.R)))));
    ctx.save();
    ctx.globalAlpha = this.fade * (d.dim ? 0.38 : 1);
    ctx.lineJoin = "round";
    for (const f of sh.faces) {
      const nw = qRot(d.q, f.n);
      const cw = vAdd(d.p, qRot(d.q, vMul(f.c, d.R)));
      const facing = vDot(nw, vNorm(vSub(cam, cw)));
      if (facing <= 0.002) continue;
      const lam = Math.max(0, vDot(nw, LIGHT));
      const spec = Math.pow(Math.max(0, vDot(nw, HALF)), 28) * 0.45;
      const k = 0.4 + 0.66 * lam;
      const fill = `rgb(${tone.body.map((c) => Math.min(255, Math.round(c * k + 255 * spec))).join(",")})`;
      ctx.beginPath();
      f.idx.forEach((vi, i) => (i ? ctx.lineTo(pv[vi][0], pv[vi][1]) : ctx.moveTo(pv[vi][0], pv[vi][1])));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = fill;
      ctx.stroke();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.stroke();
      const inkA = Math.min(1, 0.35 + facing * 0.9);
      if (sh.sides === 4) {
        for (const vi of f.idx) {
          const lv = sh.verts[vi];
          const lc = vAdd(f.c, vMul(vSub(lv, f.c), 0.56));
          const up = vNorm(vSub(lv, f.c));
          this.label(ctx, vAdd(d.p, qRot(d.q, vMul(lc, d.R))), qRot(d.q, up), nw, String(sh.vval![vi]), f.rin * d.R * sh.fontK, tone.ink, inkA);
        }
      } else this.label(ctx, cw, qRot(d.q, f.up), nw, this.text(d, f.value), f.rin * d.R * sh.fontK, tone.ink, inkA);
    }
    ctx.restore();
  }

  private text(d: Die, v: number) {
    if (d.role === "tens") return String((v % 10) * 10).padStart(2, "0");
    if (d.role === "units" || d.role === "d10") return String(v % 10);
    if ((v === 6 || v === 9) && d.shape.sides >= 8) return `${v}.`;
    return String(v);
  }

  /** A number printed flat on a face: an affine transform maps the text onto the face. */
  private label(ctx: CanvasRenderingContext2D, c: V, up: V, n: V, txt: string, size: number, ink: string, alpha: number) {
    const s = size;
    const right = vCross(n, up);
    const p0 = this.proj(c);
    const px = this.proj(vAdd(c, vMul(right, s)));
    const py = this.proj(vAdd(c, vMul(up, -s)));
    const dpr = this.dpr;
    ctx.save();
    ctx.setTransform((dpr * (px[0] - p0[0])) / s, (dpr * (px[1] - p0[1])) / s, (dpr * (py[0] - p0[0])) / s, (dpr * (py[1] - p0[1])) / s, dpr * p0[0], dpr * p0[1]);
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = ink;
    ctx.font = `700 ${s.toFixed(1)}px Cinzel, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, 0, s * 0.04);
    ctx.restore();
  }
}
