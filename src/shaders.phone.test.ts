// Phone check for every WebGL effect (user, 2026-11-25: the tree's fire striped on their Android phone while
// it looked right on the PC). Desktop GPUs do shader maths exactly; phone GPUs are looser (coarse sin of big
// numbers, half-precision mediump), so a shader can look fine here and break on a phone.
//
// How: Chrome draws each effect twice. "pc" = SwiftShader (CPU, exact 32-bit maths: the reference).
// "phone" = ANGLE on Vulkan on this PC's GPU (an NVIDIA RTX 3060 here), which really does the looser maths
// (mediump in half precision, cheaper sin): it reproduced the striped fire seen on the phone. Each scene must
// look the same in both. A control scene (the tree with the old sine hash that broke on the phone) must be
// caught, which proves the phone mode works on this machine.
//
// Needs Google Chrome and a GPU with Vulkan; without them the tests are skipped (with a note why). Pictures
// of failing scenes go to test-results/phone-gpu/ (PHONE_GPU_SAVE=1: every scene). CHROME_PATH overrides where Chrome is.
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { FX_HEAD, FX_SHADERS } from "./dice/fxShaders";
import { PARTY_FS, STORY_FS, TREE_FS } from "./systems/dnd5e/tree/shaders";
import { GL_INDEX } from "./systems/dnd5e/tree/looks";

type U = Record<string, number | number[]>;
interface Scene { name: string; fs: string; w: number; h: number; u: U }

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p): p is string => !!p && existsSync(p));

/** Share of pixels that differ by more than this (0–255, any channel) before a scene counts as broken. */
const PIXEL = 48;
const MAX_SHARE = 0.01;
const OUT = "test-results/phone-gpu";

// ---------------------------------------------------------------- the scenes

const tree = (cls: string, story: boolean): Scene => {
  // phone size: 358 × 600 CSS px at the app's 1.5× cap; positions are CSS px from the top-left (as TreeFx sends them)
  const u: U = { res: [537, 900], px: 1.5, t: 7.3, cls: GL_INDEX.indexOf(cls), lvl: 0.6, root: [179, 572], climbX: 179, y0: 572, head: 572, headOn: 0, rowY: 266, burst: 0, burstOn: 0, flash: 0, rflare: 0, nd: Array(12).fill(0) };
  if (story) Object.assign(u, { head: 330, headOn: 1, burst: 0.6, burstOn: 1, flash: 0.3, rflare: 0.7, nd: [103, 266, 0.8, 255, 266, 0.8, 39, 266, 0.5, 319, 266, 0.5] });
  return { name: `tree ${cls}${story ? " level-up" : ""}`, fs: TREE_FS, w: 537, h: 900, u };
};
const party = (cls: number): Scene => ({
  name: `level-up card ${["sorcerer", "fighter", "wizard", "other"][cls]}`, fs: PARTY_FS, w: 412, h: 915,
  u: { res: [412, 915], px: 1, t: 2.4, cls, c: [206, 457], hs: [170, 120], A: 1, B: 0.8, C: 0.7, col: [1, 0.55, 0.25] },
});
const story = (cls: number, k: U): Scene => ({
  name: `final story ${["sorcerer", "fighter", "wizard"][cls]}`, fs: STORY_FS, w: 412, h: 915,
  u: { res: [412, 915], px: 1, t: 3.1, cls, lvl: 1, c: [206, 457], hs: [170, 160], nm: [206, 520], nh: [80, 25], chn: 3, cm: 1, "ch[0]": [150, 400, 0.6, 206, 400, 0.6, 262, 400, 0.6], pr: [1, 0.5, 0], sp: [0.6, 0.3, 0], E: 0, S: 1, F: 0, R: 0, G: 0, H: 0, Q: 0, FL: 0, A: 0, C: 0, B: 0, W: 0, K: 0, ...k },
});
const fx = (type: string, card: boolean): Scene => {
  // a roll line (one row, the number at the right) or the result card (the number 2.5× bigger); units of 56 px
  const [w, h, sz, num] = card ? [340, 220, 2.5, [4.5, 2]] : [400, 56, 1, [6.5, 0.5]];
  return { name: `damage ${type}${card ? " card" : " row"}`, fs: FX_HEAD + FX_SHADERS[type], w, h, u: { res: [w, h], unit: 56, sz, num, ip: [2, 0.5], t: 1.3, A: 0.7, B: 0.5, C: 0.4, D: 0.3, seed: 0.37 } };
};

const SCENES: Scene[] = [
  ...GL_INDEX.flatMap((k) => [tree(k, false), tree(k, true)]),
  ...[0, 1, 2, 3].map(party),
  story(0, { E: 0.8, S: 0.5, F: 1, R: 1, G: 0.5, p0: 1 }),
  story(1, { H: 1, Q: 0.6, FL: 0.5 }),
  story(2, { A: 1, C: 0.6, B: 1, W: 0.5, K: 1 }),
  ...Object.keys(FX_SHADERS).flatMap((k) => [fx(k, false), fx(k, true)]),
];

/** The hash the tree used before 2026-11-25 (sin of big numbers): striped on the user's phone. */
const OLD_HASH = TREE_FS.replace(/float hash\(vec2 p\)\{[^}]*\}/, "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }").replace(
  /vec2 hash2\(vec2 p\)\{[^}]*\}/,
  "vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }",
);

// ---------------------------------------------------------------- drawing in Chrome

/** Draws a scene; returns its pixels (RGBA, base64) and a PNG. Runs in the page. */
function drawInPage(s: { fs: string; w: number; h: number; u: Record<string, number | number[]> }) {
  const cv = document.createElement("canvas");
  cv.width = s.w;
  cv.height = s.h;
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return { error: "no WebGL" };
  const sh = (t: number, src: string) => {
    const x = gl.createShader(t)!;
    gl.shaderSource(x, src);
    gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || "compile");
    return x;
  };
  try {
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, s.fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || "link");
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const [k, v] of Object.entries(s.u)) {
      const l = gl.getUniformLocation(pr, k);
      if (!l) continue;
      if (typeof v === "number") gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      else gl.uniform3fv(l, new Float32Array(v));
    }
    gl.viewport(0, 0, s.w, s.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(s.w * s.h * 4);
    gl.readPixels(0, 0, s.w, s.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let bin = "";
    for (let i = 0; i < px.length; i += 0x8000) bin += String.fromCharCode(...px.subarray(i, i + 0x8000));
    const png = cv.toDataURL("image/png");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { px: btoa(bin), png };
  } catch (e) {
    return { error: String(e) };
  }
}

/** Does this Chrome do mediump in half precision (the phone-like maths)? fract(1000.37) is .37 exactly, .5 or 0 in half. */
function halfProbe() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (window as any).drawInPage({ fs: "precision mediump float; uniform float big; void main(){ gl_FragColor = vec4(fract(big + 0.37), 0., 0., 1.); }", w: 1, h: 1, u: { big: 1000 } });
  return "px" in r && r.px ? Math.abs(atob(r.px).charCodeAt(0) / 255 - 0.37) > 0.05 : false;
}

async function open(args: string[]): Promise<{ browser: Browser; page: Page }> {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", ...args] });
  const page = await browser.newPage();
  await page.goto("about:blank");
  // the drawing code runs in the page (plus a stand-in for the bundler's name helper)
  await page.addScriptTag({ content: `window.__name = (f) => f; window.drawInPage = ${drawInPage.toString()};` });
  return { browser, page };
}

type Shot = { px?: string; png?: string; error?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const draw = (page: Page, s: Scene): Promise<Shot> => page.evaluate((x) => (window as any).drawInPage(x), { fs: s.fs, w: s.w, h: s.h, u: s.u });

/** Share of pixels that differ by more than PIXEL in any channel. */
function differ(a: string, b: string) {
  const x = Buffer.from(a, "base64"), y = Buffer.from(b, "base64");
  let bad = 0;
  for (let i = 0; i < x.length; i += 4) {
    const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]), Math.abs(x[i + 3] - y[i + 3]));
    if (d > PIXEL) bad++;
  }
  return bad / (x.length / 4);
}

function save(name: string, pc: Shot, phone: Shot) {
  mkdirSync(OUT, { recursive: true });
  const file = name.replace(/[^a-z0-9]+/gi, "-");
  for (const [k, s] of [["pc", pc], ["phone", phone]] as const) if (s.png) writeFileSync(`${OUT}/${file}-${k}.png`, Buffer.from(s.png.split(",")[1], "base64"));
}

// ---------------------------------------------------------------- the tests

let pc: { browser: Browser; page: Page } | null = null;
let phone: { browser: Browser; page: Page } | null = null;
let why = CHROME ? "" : "Google Chrome not found (set CHROME_PATH)";
if (CHROME) {
  try {
    pc = await open(["--use-angle=swiftshader"]);
    phone = await open(["--use-angle=vulkan"]);
    if (!(await phone.page.evaluate(halfProbe))) why = "this GPU doesn't do phone-like maths on Vulkan (no half-precision mediump)";
  } catch (e) {
    why = "couldn't start Chrome: " + String(e).slice(0, 200);
  }
}
if (why) console.warn(`Phone GPU check skipped: ${why}`);
// pictures from an earlier run must never be mistaken for this one
if (!why && existsSync(OUT)) for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(`${OUT}/${f}`);

afterAll(async () => {
  await pc?.browser.close();
  await phone?.browser.close();
});

describe.skipIf(!!why)("effects look the same on a phone GPU", () => {
  it("the check catches the old striped tree (control)", async () => {
    const s = { ...tree("sorcerer", false), fs: OLD_HASH };
    const [a, b] = await Promise.all([draw(pc!.page, s), draw(phone!.page, s)]);
    expect(a.error ?? b.error).toBeUndefined();
    expect(differ(a.px!, b.px!), "the phone mode no longer shows the old stripes: it can't be trusted on this machine").toBeGreaterThan(MAX_SHARE);
  }, 60_000);

  it.each(SCENES.map((s) => [s.name, s] as const))("%s", async (name, s) => {
    const [a, b] = await Promise.all([draw(pc!.page, s), draw(phone!.page, s)]);
    expect(a.error, "compile (pc)").toBeUndefined();
    expect(b.error, "compile (phone)").toBeUndefined();
    const share = differ(a.px!, b.px!);
    if (share > MAX_SHARE || process.env.PHONE_GPU_SAVE) save(name, a, b);
    expect(share, `${(share * 100).toFixed(1)}% of pixels differ on the phone GPU; pictures in ${OUT}/`).toBeLessThanOrEqual(MAX_SHARE);
  }, 60_000);
});

/** Older phones have no highp in fragment shaders: everything runs in half precision. */
const mediumpOnly = (fs: string) => fs.replace("#ifdef GL_FRAGMENT_PRECISION_HIGH", "#ifdef NO_HIGHP_ON_THIS_PHONE");

// Opt-in (PHONE_GPU_OLD=1): most effects fail it today (2026-11-25, 5–55% of pixels), because sum-and-fract
// noise can't work in half precision; passing it means moving the noise to a small noise texture.
describe.skipIf(!!why || !process.env.PHONE_GPU_OLD)("effects look the same on an older phone (no highp)", () => {
  it.each(SCENES.map((s) => [s.name, s] as const))("%s", async (name, s) => {
    const [a, b] = await Promise.all([draw(pc!.page, s), draw(phone!.page, { ...s, fs: mediumpOnly(s.fs) })]);
    expect(b.error, "compile (phone)").toBeUndefined();
    const share = differ(a.px!, b.px!);
    if (share > MAX_SHARE || process.env.PHONE_GPU_SAVE) save("old phone " + name, a, b);
    expect(share, `${(share * 100).toFixed(1)}% of pixels differ on an older phone GPU; pictures in ${OUT}/`).toBeLessThanOrEqual(MAX_SHARE);
  }, 60_000);
});
