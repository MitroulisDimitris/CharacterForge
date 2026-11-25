// The story of each hit, told with GSAP (user, 2026-11-25; mockup boards "Every damage type" and "How it was
// dealt"). Each story builds on X.tl: what moves (DOM pieces in X's layer, the number) and the shader values
// it animates (X.S.A–D). "type:via" stories replace the type's own story for that way of dealing damage.
import { gsap } from "gsap";
import type { FxCtx } from "./fxEngine";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const STORIES: Record<string, (X: FxCtx) => void> = {
  fire(X: FxCtx) {
    const { tl, S, g } = X, HIT = .5;
    X.bolt(0, HIT, { to: g.NX - g.NW / 2, c1: '#ffd36a', c2: '#ff6a10' });
    tl.fromTo(S, { A: 14 / g.W }, { A: (g.NX - g.NW / 2) / g.W, duration: HIT, ease: 'power2.in' }, 0).set(S, { A: 1 }, HIT);
    X.hit(HIT, { flash: 'rgba(255,200,120,.95)', punch: 1.6, jolt: [-3, 0] });
    tl.to(S, { C: 1, duration: .18 }, HIT).fromTo(S, { B: 1 }, { B: 0, duration: 1.1, ease: 'power3.out', immediateRender: false }, HIT);
    X.sparks(HIT + .03, { n: 14, every: .08, color: '#ffe3a0', glow: '#ff7a18', up: [25, 50], side: [-45, 25] });
  },
  cold(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .45;
    const shard = X.el('', 24 * k, 7 * k, 'clip-path:polygon(0 50%,70% 0,100% 50%,70% 100%);background:linear-gradient(90deg,rgba(190,230,255,.2),#e8f7ff);filter:drop-shadow(0 0 4px #9fd8ff)');
    tl.set(shard, { x: 10, y: g.NY, opacity: 1 }, 0).to(shard, { x: g.NX - g.NW / 2 - 12 * k, duration: HIT, ease: 'power2.in' }, 0).set(shard, { opacity: 0 }, HIT);
    X.hit(HIT, { flash: 'rgba(220,240,255,.95)', punch: 1.35, jolt: [-2, 0] });
    tl.to(X.num, { x: 1.5 * k, duration: .045, repeat: 9, yoyo: true, ease: 'none' }, HIT + .1).set(X.num, { x: 0 }, HIT + .55);
    for (let i = 0; i < 8; i++) {   // the shard breaks into pieces
      const p = X.el('', rnd(4, 7) * k, rnd(3, 5) * k, 'clip-path:polygon(0 0,100% 40%,20% 100%);background:#dff3ff;box-shadow:0 0 6px #9fd8ff');
      const a = rnd(-2.6, 2.6), d = rnd(14, 34) * k;
      tl.set(p, { x: g.NX - g.NW / 2, y: g.NY, opacity: 1, rotation: rnd(0, 180) }, HIT)
        .to(p, { x: `+=${Math.cos(a) * d - 8 * k}`, y: `+=${Math.sin(a) * d}`, rotation: `+=${rnd(-200, 200)}`, duration: rnd(.5, .8), ease: 'power3.out' }, HIT)
        .to(p, { opacity: 0, duration: .3 }, HIT + .45);
    }
    tl.fromTo(S, { B: 1 }, { B: 0, duration: .7, immediateRender: false }, HIT).to(S, { A: 1, duration: 2.0 }, HIT).to(S, { C: 1, duration: .8 }, HIT + .2);
  },
  lightning(X: FxCtx) {
    const { tl, S } = X, HIT = .42;
    tl.to(S, { C: .7, duration: HIT, ease: 'power1.in' }, 0)
      .to(X.num, { opacity: .45, duration: .06, repeat: 5, yoyo: true, ease: 'none' }, 0)
      .set(X.num, { opacity: 1 }, HIT);
    const strike = (at: number, len: number) => tl.set(S, { A: 1, seed: rnd(1, 90) }, at).set(S, { A: .2 }, at + len * .4).set(S, { A: 1, seed: rnd(1, 90) }, at + len * .6).to(S, { A: 0, duration: .14 }, at + len);
    strike(HIT, .2); strike(HIT + .55, .16);
    tl.fromTo(S, { D: 1 }, { D: 0, duration: .35, immediateRender: false }, HIT).fromTo(S, { D: .6 }, { D: 0, duration: .3, immediateRender: false }, HIT + .55);
    X.hit(HIT, { punch: 1.45, jolt: [0, 3] });
    tl.fromTo(X.num, { scale: 1.3 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, HIT + .55);
    tl.to(S, { B: 1, duration: .3 }, HIT + .1).to(S, { B: .45, C: .35, duration: 1.4, ease: 'power1.inOut' }, HIT + .8);
  },
  thunder(X: FxCtx) {
    const { tl, S } = X, HIT = .5;
    tl.to(S, { C: 1, duration: HIT, ease: 'power1.in' }, 0)
      .to(X.shake, { x: () => rnd(-1.2, 1.2), y: () => rnd(-.6, .6), duration: .045, repeat: 10, repeatRefresh: true, ease: 'none' }, 0)
      .to(X.num, { y: 2, duration: HIT, ease: 'power1.in' }, 0);
    X.hit(HIT, { flash: 'rgba(225,220,255,.95)', punch: 1.8 });
    tl.set(X.num, { y: 0 }, HIT)
      .to(X.shake, { x: () => rnd(-5, 5), y: () => rnd(-3, 3), duration: .05, repeat: 6, repeatRefresh: true, ease: 'none' }, HIT)
      .to(X.shake, { x: 0, y: 0, duration: .3, ease: 'elastic.out(1, .3)' }, HIT + .35)
      .set(S, { C: 0 }, HIT)
      .fromTo(S, { A: 0, B: 1 }, { A: 1, B: .3, duration: 1.9, ease: 'power1.out', immediateRender: false }, HIT);
  },
  acid(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .55;
    const glob = X.el('orb', 13 * k, 13 * k, 'background:radial-gradient(circle at 35% 35%,#f4ffb0 0 15%,#b6f02a 45%,#4f8a10 75%,rgba(60,110,10,0) 78%);filter:drop-shadow(0 0 5px #9fe020)');
    const tx = g.NX - g.NW * .1, ty = g.NY - g.NH * .2;
    tl.set(glob, { x: 12, y: g.NY + 4 * k, opacity: 1 }, 0)
      .to(glob, { x: tx, duration: HIT, ease: 'none' }, 0)
      .to(glob, { y: Math.max(6, g.NY - 20 * k), duration: HIT * .5, ease: 'sine.out' }, 0)
      .to(glob, { y: ty, duration: HIT * .5, ease: 'sine.in' }, HIT * .5)
      .to(glob, { scaleX: 2.4, scaleY: .3, opacity: 0, duration: .25, ease: 'power2.out' }, HIT);
    X.hit(HIT, { flash: 'rgba(220,255,140,.8)', punch: 1.3, jolt: [0, 2] });
    X.sparks(HIT, { n: 10, every: 0, color: '#d8ff6a', glow: '#8fd010', up: [10, 26], side: [-30, 30], fall: true, size: 3.5 });
    tl.fromTo(S, { D: 1 }, { D: .35, duration: 1.2, immediateRender: false }, HIT)
      .to(S, { A: 1, duration: .9 }, HIT).to(S, { B: 1, duration: .5 }, HIT + .2).to(S, { C: 1, duration: 2.1, ease: 'power1.out' }, HIT + .1);
  },
  poison(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .6;
    for (let i = 0; i < 3; i++) {
      const c = X.el('orb', 18 * k, 18 * k, 'background:radial-gradient(circle,rgba(170,230,90,.85),rgba(110,170,50,.45) 50%,rgba(90,150,40,0) 70%);filter:blur(1px)');
      const y0 = g.NY + rnd(-8, 8) * k, at = i * .07;
      tl.set(c, { x: 8 + i * 10, y: y0, opacity: 1, scale: .7 }, at)
        .to(c, { x: g.NX - g.NW * .2 + rnd(-6, 6), duration: HIT - at, ease: 'power1.inOut' }, at)
        .to(c, { y: g.NY + rnd(-4, 4), duration: (HIT - at) / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at)
        .to(c, { scale: 3.2, opacity: 0, duration: .5, ease: 'power2.out' }, HIT);
    }
    X.hit(HIT, { punch: 1.2 });
    tl.to(X.num, { rotation: 6, duration: .2, ease: 'sine.inOut', yoyo: true, repeat: 5 }, HIT + .1)
      .to(X.num, { rotation: 0, duration: .3, ease: 'sine.out' }, HIT + 1.3)
      .to(S, { A: 1, duration: 1.7 }, HIT).fromTo(S, { B: 1 }, { B: .45, duration: 1.6, immediateRender: false }, HIT);
  },
  necrotic(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .55;
    tl.to(S, { A: 1, duration: HIT, ease: 'power1.in' }, 0);
    X.hit(HIT, { punch: 0 });
    tl.fromTo(X.num, { scale: 1 }, { scale: .82, opacity: .7, duration: .2, ease: 'power2.in', immediateRender: false }, HIT)
      .to(X.num, { scale: 1, opacity: 1, duration: .6, ease: 'back.out(2)' }, HIT + .25)
      .to(S, { B: 1, duration: .7 }, HIT).fromTo(S, { C: 1 }, { C: .3, duration: 1.4, immediateRender: false }, HIT);
    for (let i = 0; i < 12; i++) {   // pale wisps of life pulled out of the number, off to the left
      const w = X.el('spk', 3.5 * k, 3.5 * k, 'background:#dfeedd;box-shadow:0 0 5px #b8d8b0,0 0 10px #7a9a8a');
      const at = HIT + .05 + i * .07, d = rnd(.9, 1.3);
      tl.set(w, { x: g.NX + rnd(-4, 4) * k, y: g.NY + rnd(-6, 6) * k, opacity: .95 }, at)
        .to(w, { x: g.NX - rnd(90, 170) * k, duration: d, ease: 'power2.in' }, at)
        .to(w, { y: `+=${rnd(-14, 14) * k}`, duration: d, ease: 'sine.inOut' }, at)
        .to(w, { opacity: 0, duration: d * .6, ease: 'power1.in' }, at + d * .4);
    }
  },
  radiant(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .45;
    const star = X.el('', 16 * k, 16 * k, 'clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);background:#fffbe8;filter:drop-shadow(0 0 5px #ffd36a)');
    tl.set(star, { x: g.NX, y: Math.max(8 * k, g.NY - g.NH * .9), opacity: 1, scale: 0, rotation: 0 }, 0)
      .to(star, { scale: 1, rotation: 90, duration: HIT, ease: 'power2.in' }, 0)
      .to(star, { scale: 2.2, opacity: 0, duration: .25 }, HIT);
    X.hit(HIT, { punch: 1.45, jolt: [0, 2] });
    tl.set(S, { A: 1, D: 1 }, HIT).to(S, { A: .5, duration: 1.3 }, HIT + .1).to(S, { D: 0, duration: .5 }, HIT)
      .to(S, { B: 1, duration: .6 }, HIT).to(S, { C: 1, duration: .8 }, HIT + .2);
  },
  force(X: FxCtx) {
    const { tl, S, g } = X, HIT = .42, ix = g.NX - 1.25 * g.sz * 56;
    X.bolt(0, HIT, { to: ix, c1: '#e6d2ff', c2: '#a060ff', ease: 'power3.in' });
    tl.to(S, { A: .2, duration: HIT, ease: 'power2.in' }, 0)
      .to(S, { A: 1, duration: .1 }, HIT).to(S, { A: .4, duration: 1.4 }, HIT + .2)
      .fromTo(S, { B: 1 }, { B: 0, duration: .7, immediateRender: false }, HIT)
      .to(S, { C: 1, duration: .9, ease: 'power1.out' }, HIT).to(S, { D: 1, duration: .8, ease: 'power1.out' }, HIT);
    X.sparks(HIT, { n: 9, every: 0, x: ix, color: '#efe0ff', glow: '#a060ff', up: [-18, 18], side: [-40, -12], size: 2.5 });
    X.hit(HIT, { punch: 1.25, jolt: [4, 0] });
  },
  psychic(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .5;
    tl.to(S, { C: 1, duration: HIT, ease: 'power1.in' }, 0)
      .to(X.num, { x: () => rnd(-1, 1) * k, duration: .04, repeat: 11, repeatRefresh: true, ease: 'none' }, 0)
      .set(X.num, { x: 0 }, HIT).set(S, { C: 0 }, HIT);
    const fs = getComputedStyle(X.num).fontSize;
    ([['#ff4fd8', -1], ['#5fd8ff', 1]] as const).forEach(([c, s]) => {   // colour ghosts of the number
      const gh = X.el('', 0, 0, `font-family:Cinzel,serif;font-weight:700;font-size:${fs};line-height:1;color:${c};mix-blend-mode:screen;white-space:nowrap`);
      gh.textContent = X.num.textContent;
      tl.set(gh, { x: g.NX, y: g.NY, xPercent: -50, yPercent: -50, opacity: .85 }, HIT)
        .fromTo(gh, { x: g.NX + s * 9 * k }, { x: g.NX, duration: .9, ease: 'elastic.out(1, .35)', immediateRender: false }, HIT)
        .to(gh, { opacity: 0, duration: .35 }, HIT + .7);
    });
    X.hit(HIT, { flash: 'rgba(255,160,230,.85)', punch: 1.35 });
    tl.to(S, { A: 1, duration: .45 }, HIT).to(S, { A: .6, duration: 1.2 }, HIT + .5).to(S, { B: 1, duration: .8 }, HIT);
  },
  slashing(X: FxCtx) {
    const { tl, S } = X, at = [.15, .42, .66], keys = ['A', 'B', 'C'], dir = [[1, .6], [1, -.6], [1, .15]];
    at.forEach((t0, i) => {
      tl.fromTo(S, { [keys[i]]: 0 }, { [keys[i]]: 1, duration: .11, ease: 'power3.out', immediateRender: false }, t0);
      X.hit(t0, { punch: i === 0 ? 1.25 : 0, jolt: [dir[i][0] * 4, dir[i][1] * 3] });
      tl.fromTo(X.num, { rotation: (i % 2 ? -1 : 1) * 7 }, { rotation: 0, duration: .4, ease: 'elastic.out(1, .4)', immediateRender: false }, t0);
      X.sparks(t0 + .05, { n: 5, every: 0, color: '#fff1f1', glow: '#ff4050', side: [dir[i][0] * 10, dir[i][0] * 40], up: [-dir[i][1] * 25, -dir[i][1] * 5], size: 2.5 });
    });
    tl.to(S, { D: 1, duration: 1.2, ease: 'power1.inOut' }, .85);
  },
  piercing(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .32;
    const tipX = g.NX - g.NW / 2 - 6 * k, tipY = g.NY + 2 * k;
    S.ipx = tipX; S.ipy = tipY;
    const L = 64 * k, Hh = 12 * k;
    const ar = X.el('', L, Hh, `transform-origin:100% 50%`);
    ar.style.margin = `${-Hh / 2}px 0 0 ${-L}px`;
    ar.innerHTML = `<svg viewBox="0 0 64 12" width="${L}" height="${Hh}" style="display:block;overflow:visible"><path d="M2 2 L12 6 L2 10 L6 6 Z" fill="#c9a77a"/><path d="M5 6 H56" stroke="#8a6a46" stroke-width="1.8"/><path d="M55 2.5 L64 6 L55 9.5 Z" fill="#dfe6f0" stroke="#9aa6b8" stroke-width=".6"/></svg>`;
    tl.set(ar, { x: 10, y: tipY - 10 * k, rotation: 9, opacity: 1 }, 0)
      .to(ar, { x: tipX, y: tipY, duration: HIT, ease: 'power3.in' }, 0)
      .fromTo(ar, { rotation: 17 }, { rotation: 9, duration: .9, ease: 'elastic.out(1.4, .12)', immediateRender: false }, HIT);   // it quivers
    X.hit(HIT, { punch: 1.3, jolt: [4, 0] });
    tl.fromTo(S, { B: 1 }, { B: 0, duration: .3, immediateRender: false }, HIT)
      .to(S, { A: 1, duration: .5, ease: 'power3.out' }, HIT)
      .to(S, { C: 1, duration: .3 }, HIT).to(S, { C: .35, duration: 1.4 }, HIT + .35);
    X.sparks(HIT, { n: 7, every: 0, x: tipX, y: tipY, color: '#d8c3a0', glow: '#7a6040', side: [-35, -8], up: [-12, 14], size: 2.5, fall: true });
  },
  bludgeoning(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .48;
    const top = g.NY - g.NH * .42;
    S.ipx = g.NX; S.ipy = top;
    const W = 44 * k, H = 46 * k;
    const hm = X.el('', W, H, `transform-origin:${38 * k}px ${3 * k}px`);
    hm.style.margin = `${-44 * k}px 0 0 ${-13 * k}px`;     // the head's bottom-middle sits on the point
    hm.innerHTML = `<svg viewBox="0 0 44 46" width="${W}" height="${H}" style="display:block;overflow:visible;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))"><path d="M14 33 L38 3" stroke="#6b4a2c" stroke-width="4" stroke-linecap="round"/><rect x="1" y="32" width="25" height="12" rx="2" fill="#8c8f96" stroke="#4a4c52" stroke-width="1.2"/><rect x="3" y="34" width="21" height="3" rx="1" fill="#c4c8cf"/></svg>`;
    tl.set(hm, { x: g.NX, y: top, rotation: 55, opacity: 1 }, 0)
      .to(hm, { rotation: 72, duration: .26, ease: 'power1.out' }, 0)               // winds back
      .to(hm, { rotation: 0, duration: HIT - .26, ease: 'power3.in' }, .26)            // swings down
      .to(hm, { rotation: 9, duration: .12, ease: 'power2.out' }, HIT)                // bounces once
      .to(hm, { rotation: 0, duration: .3, ease: 'bounce.out' }, HIT + .12);           // and rests on the number
    X.hit(HIT, { punch: 0, jolt: [0, 4] });
    tl.fromTo(X.num, { y: 3 * k }, { y: 0, duration: .4, ease: 'elastic.out(1, .4)', immediateRender: false }, HIT)
      .fromTo(S, { B: 1 }, { B: 0, duration: .35, immediateRender: false }, HIT)
      .to(S, { A: 1, duration: 1.7, ease: 'power2.out' }, HIT);
    X.sparks(HIT, { n: 8, every: 0, x: g.NX, y: g.NY + g.NH * .45, color: '#cdb38c', glow: '#6b5030', side: [-30, 30], up: [10, 24], size: 3, fall: true });
  },
  healing(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .6;
    for (let i = 0; i < 12; i++) {   // motes spiral in
      const m = X.el('spk', 4 * k, 4 * k, 'background:#d8ffe0;box-shadow:0 0 6px #32eb50,0 0 12px #20a040');
      const x0 = rnd(20, g.NX - 40 * k), y0 = g.NY + rnd(-16, 16) * k, at = i * .025, d = HIT - at;
      tl.set(m, { x: x0, y: y0, opacity: 1 }, at)
        .to(m, { x: g.NX, duration: d, ease: 'power2.in' }, at)
        .to(m, { y: g.NY - rnd(12, 20) * k, duration: d * .5, ease: 'sine.out' }, at)
        .to(m, { y: g.NY, duration: d * .5, ease: 'sine.in' }, at + d * .5)
        .set(m, { opacity: 0 }, HIT);
    }
    X.hit(HIT, { flash: 'rgba(170,255,190,.85)', punch: 0 });
    tl.fromTo(X.num, { scale: 1 }, { scale: 1.3, duration: .25, ease: 'sine.out', immediateRender: false }, HIT)
      .to(X.num, { scale: 1, duration: .5, ease: 'sine.inOut' }, HIT + .25)
      .to(S, { A: 1, duration: .6 }, HIT).to(S, { B: 1, duration: 1.4, ease: 'power1.out' }, HIT).to(S, { C: 1, duration: .6 }, HIT + .1);
  },
  // FIRE, MELEE: a fiery swing across the number; flames burst from the cut and spread out both ways
  "fire:melee"(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .34;
    const W = 92 * k, H = 64 * k;
    const arc = X.el('', W, H, '');
    arc.innerHTML = `<svg viewBox="0 0 92 64" width="${W}" height="${H}" style="display:block;overflow:visible;filter:drop-shadow(0 0 4px #ff7a18) drop-shadow(0 0 10px #ff3d00)"><defs><linearGradient id="sw${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3d00" stop-opacity="0"/><stop offset=".6" stop-color="#ffb347"/><stop offset="1" stop-color="#fff6d6"/></linearGradient></defs><path d="M4 8 Q 50 4 86 56" fill="none" stroke="url(#sw${k})" stroke-width="5" stroke-linecap="round"/></svg>`;
    const path = arc.querySelector('path')!, len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    tl.set(arc, { x: g.NX - 6 * k, y: g.NY, opacity: 1 }, 0)
      .to(path, { strokeDashoffset: 0, duration: .16, ease: 'power2.in' }, HIT - .16)        // the swing
      .to(arc, { opacity: 0, duration: .35, ease: 'power1.in' }, HIT + .05);
    X.hit(HIT, { flash: 'rgba(255,200,120,.9)', punch: 1.4, jolt: [4, 2] });
    tl.to(S, { C: 1, duration: .15 }, HIT)
      .fromTo(S, { B: 1.1 }, { B: 0, duration: 1.1, ease: 'power3.out', immediateRender: false }, HIT)
      .fromTo(S, { D: .02 }, { D: 1, duration: 1.4, ease: 'power2.out', immediateRender: false }, HIT);
    X.sparks(HIT, { n: 12, every: .03, color: '#ffe3a0', glow: '#ff7a18', up: [10, 40], side: [5, 45] });
  },
  // FIRE, AREA: the heat builds, then the whole line erupts at once
  "fire:area"(X: FxCtx) {
    const { tl, S, g } = X, HIT = .45;
    tl.fromTo(X.tint, { opacity: 0 }, { opacity: .7, duration: HIT, ease: 'power1.in' }, 0)
      .to(X.num, { opacity: .55, duration: .07, repeat: 5, yoyo: true, ease: 'none' }, 0)
      .set(X.num, { opacity: 1 }, HIT)
      .set(S, { A: 1 }, HIT).fromTo(S, { C: 0 }, { C: .3, duration: HIT, ease: 'power2.in', immediateRender: false }, 0)
      .to(S, { C: 1, duration: .12 }, HIT)
      .fromTo(S, { B: 1.5 }, { B: 0, duration: 1.3, ease: 'power3.out', immediateRender: false }, HIT)
      .to(X.shake, { x: () => rnd(-4, 4), y: () => rnd(-3, 3), duration: .05, repeat: 6, repeatRefresh: true, ease: 'none' }, HIT)
      .to(X.shake, { x: 0, y: 0, duration: .3, ease: 'elastic.out(1, .3)' }, HIT + .35);
    X.hit(HIT, { flash: 'rgba(255,230,170,.95)', punch: 1.5 });
    for (const fx of [.5, .68, .84]) X.sparks(HIT + .02, { n: 5, every: .03, x: g.W * fx, color: '#ffe3a0', glow: '#ff7a18', up: [20, 45], side: [-25, 25] });
    X.sparks(HIT + .02, { n: 8, every: .04, color: '#ffe3a0', glow: '#ff7a18', up: [25, 50], side: [-35, 25] });
  },
  // PIERCING, MELEE: a blade draws back, thrusts in hard, and pulls out
  "piercing:melee"(X: FxCtx) {
    const { tl, S, g, k } = X, HIT = .42;
    const tipX = g.NX - g.NW / 2 - 6 * k, tipY = g.NY + 1 * k;
    S.ipx = tipX; S.ipy = tipY;
    const L = 96 * k, Hh = 11 * k;
    const sp = X.el('', L, Hh, '');
    sp.style.margin = `${-Hh / 2}px 0 0 ${-L}px`;          // the tip is at the element's right edge
    sp.innerHTML = `<svg viewBox="0 0 96 11" width="${L}" height="${Hh}" style="display:block;overflow:visible;filter:drop-shadow(0 1px 1px rgba(0,0,0,.7))"><rect x="0" y="4.4" width="40" height="2.2" rx="1" fill="#6b4a2c"/><rect x="38" y="1.5" width="3.5" height="8" rx="1" fill="#b89a5a"/><path d="M41 3.6 L90 4.9 L96 5.5 L90 6.1 L41 7.4 Z" fill="#dfe6f0" stroke="#8d98aa" stroke-width=".5"/><path d="M41 5.5 L92 5.5" stroke="#ffffff" stroke-width=".6" opacity=".8"/></svg>`;
    tl.set(sp, { x: tipX - 64 * k, y: tipY, opacity: 1 }, 0)
      .to(sp, { x: tipX - 86 * k, duration: .26, ease: 'power1.out' }, 0)              // draws back
      .to(sp, { x: tipX, duration: HIT - .26, ease: 'power4.in' }, .26)                 // thrusts
      .to(sp, { x: tipX - 70 * k, opacity: 0, duration: .4, ease: 'power2.in' }, HIT + .16);   // pulls out
    X.hit(HIT, { punch: 1.3, jolt: [5, 0] });
    tl.fromTo(S, { B: 1 }, { B: 0, duration: .3, immediateRender: false }, HIT)
      .to(S, { A: 1, duration: .5, ease: 'power3.out' }, HIT)
      .to(S, { C: 1, duration: .25 }, HIT).to(S, { C: .3, duration: 1.4 }, HIT + .3);
    X.sparks(HIT, { n: 6, every: 0, x: tipX, y: tipY, color: '#ffffff', glow: '#b8c8e0', side: [-30, -6], up: [-14, 14], size: 2.2 });
  },
  // PIERCING, AREA: a hail of points rains down across the line and sticks
  "piercing:area"(X: FxCtx) {
    const { tl, S, g, k } = X;
    const xs: number[] = [], n = 8;
    for (let i = 0; i < n; i++) xs.push(g.W * (.5 + .46 * i / (n - 1)) + rnd(-7, 7) * k);
    const order = xs.map((_x, i) => i).sort(() => Math.random() - .5);
    let last = 0;
    order.forEach((i, j) => {
      let x = xs[i];
      if (Math.abs(x - g.NX) < g.NW * .8 + 6 * k) x = g.NX - g.NW / 2 - 8 * k;   // none lands on the number itself
      const yl = i === order[order.length - 1] ? g.NY + 2 * k : rnd(g.H * .4, g.H - 5);
      const at = .08 + j * .05, d = .18;
      const pin = X.el('', 2.2 * k, 20 * k, `background:linear-gradient(180deg,rgba(220,230,245,0),#e8eef8 70%,#ffffff);transform-origin:50% 100%;border-radius:1px`);
      pin.style.margin = `${-20 * k}px 0 0 ${-1.1 * k}px`;    // the point is at the element's bottom
      tl.set(pin, { x: x - 16 * k, y: yl - 40 * k, rotation: -22, opacity: 1 }, at)
        .to(pin, { x, y: yl, duration: d, ease: 'power2.in' }, at)
        .to(pin, { opacity: .75, duration: .6 }, at + d + .4);
      X.sparks(at + d, { n: 2, every: 0, x, y: yl, color: '#cfd7e4', glow: '#8090a8', side: [-10, 10], up: [4, 10], size: 2, fall: true });
      last = Math.max(last, at + d);
    });
    const HIT = last;
    S.ipx = g.NX - g.NW / 2 - 8 * k; S.ipy = g.NY + 2 * k;
    X.hit(HIT, { punch: 1.25, jolt: [0, 3] });
    tl.fromTo(S, { B: 1 }, { B: 0, duration: .3, immediateRender: false }, HIT)
      .to(S, { A: .8, duration: .45, ease: 'power3.out' }, HIT)
      .to(S, { C: 1, duration: .5 }, .2).to(S, { C: .35, duration: 1.2 }, HIT + .2);
  },
};
