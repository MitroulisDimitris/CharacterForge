// The damage animations' WebGL fragment shaders (user, 2026-11-25; mockup canvas "Session Versions and
// Table Dice", page "Damage animations", boards "Every damage type" and "How it was dealt").
// p is in roll-line heights (56 px); num is where the number is; sz is how big the number is (1 on a roll
// line, 2.5 on the result card); A–D are what the story animates; t is the clock (it slows with the story).
// GLSL rule: never use smoothstep with reversed edges (undefined in the spec; some phone GPUs draw
// garbage) — use sstep. Never write `distance * step(…)` (0 = full brightness outside the mask).

export const FX_HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 res, num, ip; uniform float t, unit, sz, A, B, C, D, seed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
float sstep(float e0, float e1, float x){ float k = clamp((x - e0) / (e1 - e0), 0., 1.); return k * k * (3. - 2. * k); }
float ramp(float x){ float r = sstep(.05, 1., x); return r * r; }
void over(inout vec4 acc, vec3 c, float a){ a = clamp(a, 0., 1.); acc.rgb = c * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }
#define BEGIN vec2 uv = gl_FragCoord.xy / res; vec2 p = gl_FragCoord.xy / unit; vec4 acc = vec4(0.); float rr = ramp(uv.x);
#define END gl_FragColor = vec4(min(acc.rgb, vec3(acc.a)), acc.a);
`;

export const FX_SHADERS: Record<string, string> = {
  // FIRE  A: how far the line has caught (0..1 across, a bolt flying in)  B: the flare at the hit  C: the column behind the number  D: how far it has spread out from the number both ways (a melee swing; 0 = not used)
  fire: `void main(){ BEGIN
  float w = fbm(vec2(p.x * 2.0, p.y * 1.6 - t * 1.3));
  float n = fbm(vec2(p.x * 3.4 + w * .9, p.y * 1.1 - t * 2.4));
  float nu = num.x * unit / res.x;
  float behind = D > 0. ? 1. - sstep(D - .04, D + .02, abs(uv.x - nu)) : 1. - sstep(A - .05, A + .01, uv.x);
  float col = exp(-pow((p.x - num.x) / (.75 * sz), 2.)) * C;
  float amount = max(rr * .8 * behind, col);
  float height = mix(.15, 1.05, amount) * sz * (1. + B * .8 * col);
  float f = clamp((1. - p.y / height) + (n - .5) * 1.7, 0., 1.) * sstep(0., .25, amount);
  vec3 c = vec3(.75, .12, .02);
  c = mix(c, vec3(1., .42, .06), sstep(.25, .55, f));
  c = mix(c, vec3(1., .72, .25), sstep(.55, .85, f));
  c = mix(c, vec3(1., .88, .55), sstep(.88, 1., f));
  over(acc, c, sstep(.04, .4, f) * .92);
END }`,
  // COLD  A: frost spread  B: the hit glow  C: snow
  cold: `void main(){ BEGIN
  vec2 q = (p - num) / sz * vec2(.55, 1.);
  float r = length(q);
  float inside = sstep(0., .5, A * 7. - r + (fbm(p * 2.2 + seed) - .5) * 1.4);
  vec2 g = floor(p * 2.6), f = fract(p * 2.6); float F1 = 8., F2 = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)); vec2 dd = o + hash2(g + o) - f; float dist = dot(dd, dd);
    if (dist < F1) { F2 = F1; F1 = dist; } else if (dist < F2) { F2 = dist; } }
  float crack = 1. - sstep(0., .07, sqrt(F2) - sqrt(F1));
  float top = res.y / unit;
  float edge = 1. - sstep(0., .32 * sz, min(p.y, top - p.y));
  float rime = fbm(p * 7.);
  float frost = inside * rr * (.12 + .32 * crack + .45 * edge * rime + .15 * rime);
  over(acc, mix(vec3(.45, .7, 1.), vec3(.93, .98, 1.), crack * .6 + edge * .4), frost);
  float snow = 0.;
  for (int L = 0; L < 2; L++) { float sc = 3.2 + float(L) * 2.4;
    vec2 sp = p * sc + vec2(sin(t * .7 + float(L)) * .6, t * (1.3 - .3 * float(L)));
    vec2 cell = floor(sp), fr = fract(sp) - .5; vec2 h = hash2(cell + float(L) * 17.);
    snow += step(.5, h.x) * sstep(.13, .03, length(fr - (h - .5) * .6)); }
  over(acc, vec3(.95, .98, 1.), snow * C * (.25 + .75 * rr) * .9);
  over(acc, vec3(.75, .9, 1.), B * exp(-dot(q, q) * 1.6) * .8);
END }`,
  // LIGHTNING  A: the strike (flickers)  B: arcs along the line  C: the charge around the number  D: the row flash
  lightning: `void main(){ BEGIN
  float top = res.y / unit;
  float above = sstep(num.y - .15 * sz, num.y + .3 * sz, p.y);
  float bx = num.x + (fbm(vec2(p.y * 1.8, seed)) - .5) * 1.1 * sz + (noise(vec2(p.y * 9., seed + 4.)) - .5) * .25 * sz;
  float dx = abs(p.x - bx);
  float bx2 = num.x - (p.y - num.y) * 1.1 + (fbm(vec2(p.y * 2.4, seed + 9.)) - .5) * .7 * sz;
  float d2 = abs(p.x - bx2) + (1. - step(num.y + .35 * sz, p.y)) * 9.;
  float ay = num.y + (fbm(vec2(p.x * 1.3 - t * .7, seed * 3.)) - .5) * .55 * sz + (noise(vec2(p.x * 14., t * 14.)) - .5) * .14 * sz;
  float ad = abs(p.y - ay);
  float flick = .55 + .45 * noise(vec2(t * 28., p.x * .6));
  float arc = (exp(-ad * ad * 1400. / (sz * sz)) + exp(-ad * 12. / sz) * .3) * B * rr * flick;
  float glowN = C * exp(-length((p - num) / sz) * 1.5);
  over(acc, vec3(.55, .62, 1.), D * (.12 + .4 * rr));
  over(acc, vec3(.35, .45, 1.), glowN * .7);
  over(acc, vec3(.5, .6, 1.), (exp(-dx * 6. / sz) * .6 + exp(-d2 * 9. / sz) * .3) * A * above);
  over(acc, vec3(.72, .8, 1.), arc * .85);
  over(acc, vec3(.97, .98, 1.), (exp(-dx * dx * 900. / (sz * sz)) + exp(-d2 * d2 * 2500. / (sz * sz)) * .7) * A * above);
END }`,
  // THUNDER  A: how far the rings have rolled  B: their strength  C: the rumble before
  thunder: `void main(){ BEGIN
  vec2 q = (p - num) / sz * vec2(.7, 1.);
  float r = length(q);
  float ring = 0.;
  for (int k = 0; k < 3; k++) { float R = A * 5.5 - float(k) * .75;
    ring += step(0., R) * (exp(-pow((r - R) * 7., 2.)) + exp(-pow((r - R) * 2.5, 2.)) * .15) * exp(-max(R, 0.) * .2); }
  float wob = fbm(vec2(atan(q.y, q.x) * 2., r * 2. - t * 1.5));
  float fade = .2 + .8 * rr;
  over(acc, vec3(.35, .3, .8), C * (.4 + .6 * noise(vec2(p.x * 3., t * 9.))) * .3 * fade);
  over(acc, vec3(.68, .64, 1.), ring * B * 1.2 * (.6 + .4 * wob) * fade);
  over(acc, vec3(.9, .88, 1.), B * B * exp(-r * r * 7.) * .6);
END }`,
  // ACID  A: the slime spreading  B: bubbles  C: how long the drips have stretched  D: the sizzle on the number
  acid: `void main(){ BEGIN
  float top = res.y / unit;
  float spread = exp(-pow((p.x - num.x) / (.6 * sz + A * 3.2), 2.));
  float surf = (.1 + .38 * spread) * sz * A + (fbm(vec2(p.x * 2.5, t * .7)) - .5) * .16 * sz * A;
  float goo = sstep(surf + .03, surf - .03, p.y) * max(rr, spread) * step(.01, A);
  vec3 gc = mix(vec3(.22, .5, .04), vec3(.78, 1., .28), sstep(surf - .22 * sz, surf, p.y));
  over(acc, gc, goo * .9);
  // drips hanging from the top edge, longest near the number
  float cx = floor(p.x * 2.8); float h1 = hash(vec2(cx, seed)), h2 = hash(vec2(cx, seed + 3.));
  float x0 = (cx + .25 + .5 * h1) / 2.8;
  float near = exp(-pow((x0 - num.x) / (1.5 * sz), 2.)) + rr * .2;
  float len = C * (.25 + .75 * h2) * .9 * sz * near;
  float tip = top - len;
  float yy = clamp((p.y - tip) / max(len, .001), 0., 1.);
  float wdt = (.045 + .03 * h1) * sz * (.55 + .45 * yy);
  float drip = sstep(wdt, wdt * .4, abs(p.x - x0)) * step(tip, p.y);
  drip = max(drip, sstep(wdt * 1.5, wdt * .8, length(vec2(p.x - x0, (p.y - tip) * 1.2))) * step(.02, len));
  over(acc, vec3(.62, .92, .16), drip * step(.62, hash(vec2(cx, seed + 7.))) * step(.25, near) * .95);
  // bubbles rising
  vec2 sp = vec2(p.x * 3., p.y * 3. - t * 1.3); vec2 cell = floor(sp), fr = fract(sp) - .5; vec2 h = hash2(cell + seed);
  float rad = .1 + .14 * h.x;
  float bub = sstep(.05, .0, abs(length(fr - (h - .5) * .35) - rad)) * step(.45, h.y);
  over(acc, vec3(.85, 1., .45), bub * B * rr * .85);
  over(acc, vec3(.7, 1., .2), D * exp(-dot((p - num) / sz, (p - num) / sz) * 2.) * .6);
END }`,
  // POISON  A: the fog creeping left  B: its density
  poison: `void main(){ BEGIN
  vec2 w = vec2(fbm(p * 1.3 + vec2(t * .25, 0.)), fbm(p * 1.3 + vec2(5.2, t * .2)));
  float fog = fbm(p * 1.6 + w * 1.8 + vec2(-t * .35, 0.));
  float front = num.x - A * 7.5 * sz;
  float m = sstep(front - .4, front + 1.6, p.x) * (.3 + .7 * rr) * step(.01, A);
  float dens = sstep(.3, .72, fog) * m * (.6 + .4 * B) * (.6 + .4 * exp(-pow((p.x - num.x) / (2. * sz), 2.)));
  vec3 c = mix(vec3(.35, .75, .15), vec3(.55, .3, .65), sstep(.48, .78, w.x));
  over(acc, c * .9, dens * .85);
  vec2 sp = vec2(p.x * 4.5, p.y * 4.5 - t * .8); vec2 cell = floor(sp); vec2 h = hash2(cell + 7.);
  float spore = sstep(.12, .03, length(fract(sp) - .5 - (h - .5) * .5)) * step(.72, h.y);
  over(acc, vec3(.75, 1., .45), spore * m * .7);
  over(acc, vec3(.45, .8, .2), B * exp(-length((p - num) / sz) * 1.8) * .35);
END }`,
  // NECROTIC  A: the darkness closing in  B: tendrils  C: the pale drain glow on the number
  necrotic: `void main(){ BEGIN
  float smoke = fbm(p * 1.8 + vec2(0., -t * .5));
  float m = A * (.3 + .7 * rr);
  over(acc, vec3(.03, .0, .05), m * (.45 + .4 * smoke) * .9);
  vec2 wq = vec2(p.x * .9 + fbm(p * .7 + t * .1) * 1.2, p.y * 1.4 - t * .55);
  float wisp = sstep(.4, .7, fbm(wq + vec2(fbm(wq * 1.3) * .8, 0.)));
  vec3 tc = mix(vec3(.36, .2, .5), vec3(.42, .55, .4), noise(p * .6 + t * .15));
  over(acc, tc * 1.25, wisp * B * m * 1.1);
  over(acc, vec3(.65, .78, .65), C * exp(-dot((p - num) / sz, (p - num) / sz) * 2.2) * .5);
END }`,
  // RADIANT  A: the beam  B: rays  C: motes  D: the flash
  radiant: `void main(){ BEGIN
  vec2 q = (p - num) / sz;
  float beam = exp(-pow(q.x / (.32 + .3 * (1. - A)), 2.)) * sstep(-.4, .6, q.y) * A;
  float ang = atan(q.y, q.x); float r = length(q * vec2(.55, 1.));
  float rays = pow(noise(vec2(ang * 5. + 3., t * .5 + seed)), 2.5) * exp(-r * .4) * B * (.25 + .75 * rr);
  vec2 sp = vec2(p.x * 4., p.y * 4. - t * .9); vec2 h = hash2(floor(sp) + 3.);
  float mote = sstep(.12, .02, length(fract(sp) - .5 - (h - .5) * .5)) * step(.7, h.y) * (.5 + .5 * sin(t * 7. + h.x * 30.));
  over(acc, vec3(1., .8, .35), rays * .6);
  over(acc, vec3(1., .9, .6), beam * .75);
  over(acc, vec3(1., .95, .75), mote * C * (.3 + .7 * rr));
  over(acc, vec3(1., .97, .88), (A * .3 + D * .7) * exp(-r * r * 3.5));
END }`,
  // FORCE  A: the shield  B: its flare  C: the ripple across it  D: the shockwave running back
  force: `void main(){ BEGIN
  vec2 q = (p - num) / sz;
  vec2 e = q / vec2(1.25, .62); float er = length(e);
  float inside = sstep(1.04, .96, er);
  float rim = exp(-pow((er - 1.) * 8., 2.));
  vec2 hp = q * 4.2; vec2 s = vec2(1., 1.732);
  vec2 a = mod(hp, s) - s * .5, b = mod(hp - s * .5, s) - s * .5; vec2 g = dot(a, a) < dot(b, b) ? a : b;
  float hd = max(dot(abs(g), vec2(.5, .866)), abs(g.x));
  float hex = sstep(.06, .0, abs(hd - .5));
  vec2 imp = vec2(-1.25, 0.);
  float rip = exp(-pow((length(q - imp) - C * 3.) * 4., 2.)) * (1. - C * .5);
  float sx = num.x - 1.25 * sz - D * 6.5 * sz;
  float shock = exp(-pow((p.x - sx) * 2.2 / sz, 2.)) * (1. - D) * sstep(0., .15, D) * (.4 + .6 * noise(vec2(p.y * 6., t)));
  over(acc, vec3(.55, .35, 1.), shock * .7);
  over(acc, vec3(.6, .42, 1.), inside * (B * .35 + A * .08));
  over(acc, vec3(.78, .62, 1.), hex * inside * (.18 + rip * 2.2 + B) * A);
  over(acc, vec3(.9, .82, 1.), rim * (.5 + B + rip) * A);
END }`,
  // PSYCHIC  A: waves out  B: swirl  C: rings pulled in, before the blast
  psychic: `void main(){ BEGIN
  vec2 q = (p - num) / sz; float r = length(q * vec2(.7, 1.)); float ang = atan(q.y, q.x);
  float warp = fbm(p * 1.2 + t * .3) * 3.;
  float waves = sstep(.55, 1., sin(r * 6.5 - t * 5. + warp)) * A * exp(-r * .22) * (.2 + .8 * rr);
  float conv = C * sstep(.6, 1., sin(r * 7. + t * 10.)) * exp(-r * .5) * (.2 + .8 * rr);
  float sw = B * pow(.5 + .5 * sin(ang * 3. + r * 2.5 - t * 3.), 5.) * exp(-r * .45);
  over(acc, vec3(.62, .35, 1.), sw * .55);
  over(acc, vec3(1., .42, .85), max(waves, conv) * .8);
  over(acc, vec3(1., .8, .95), (A * .25 + C * .2) * exp(-r * r * 2.));
END }`,
  // SLASHING  A, B, C: how far each cut has gone  D: the cuts cooling to red
  slashing: `
float cut(vec2 q, vec2 a, vec2 b, float prog, out float glow){
  vec2 ab = b - a; float h = clamp(dot(q - a, ab) / dot(ab, ab), 0., 1.);
  float d = length(q - a - ab * h); float on = step(h, prog) * step(.001, prog);
  float w = .055 * sin(3.1416 * h) + .006;
  glow = exp(-d * 14.) * on * sin(3.1416 * h);
  return sstep(w, w * .3, d) * on; }
void main(){ BEGIN
  vec2 q = (p - num) / sz; float g1, g2, g3;
  float c1 = cut(q, vec2(-1.5, .95), vec2(1.2, -.85), A, g1);
  float c2 = cut(q, vec2(-1.4, -.8), vec2(1.3, .9), B, g2);
  float c3 = cut(q, vec2(-2.4, .25), vec2(1.4, -.2), C, g3);
  float c = max(c1, max(c2, c3)), g = max(g1, max(g2, g3));
  over(acc, vec3(1., .2, .28), g * (.55 - .25 * D));
  over(acc, mix(vec3(1., .96, .96), vec3(1., .3, .36), D), c * (1. - .45 * D));
END }`,
  // PIERCING  A: cracks growing from the hit  B: the flash  C: dust
  piercing: `void main(){ BEGIN
  vec2 q = (p - ip) / sz; float r = length(q); float ang = atan(q.y, q.x);
  float crack = 0.;
  for (int i = 0; i < 7; i++) { float fi = float(i);
    float ai = (fi / 7.) * 6.2832 + hash(vec2(fi, seed)) * .7;
    float L = (.45 + .7 * hash(vec2(fi, seed + 2.))) * A * 1.15;
    float da = mod(ang - ai + 3.1416 + (noise(vec2(r * 9., fi * 3.)) - .5) * .25, 6.2832) - 3.1416;
    float d = r * abs(sin(da)) + (1. - step(abs(da), 1.2)) * 9.;
    crack += sstep(.018, .0, d) * step(r, L) * (1. - r / max(L, .001)) * step(.04, r); }
  float dust = C * sstep(.45, .8, fbm(p * 3. + vec2(t * .4, -t * .3))) * exp(-r * r * 1.4);
  over(acc, vec3(.62, .6, .58), dust * .7);
  over(acc, vec3(.82, .85, .9), clamp(crack, 0., 1.) * .65);
  over(acc, vec3(1., 1., 1.), B * exp(-r * r * 7.));
END }`,
  // BLUDGEONING  A: the dust wave rolling out  B: the impact flash
  bludgeoning: `void main(){ BEGIN
  float dx = abs(p.x - num.x) / sz;
  float spread = A * 5.;
  float dm = sstep(spread + .3, spread - .9, dx) * step(.01, A);
  float puff = fbm(vec2(abs(p.x - num.x) * 1.8 - t * .7, p.y * 2.3 - t * .35));
  float hgt = (.32 + .45 * exp(-dx * .7)) * sz * min(1., A * 2.5);
  float dust = sstep(.32, .72, puff) * sstep(hgt, hgt * .25, p.y) * dm * (.3 + .7 * rr);
  vec2 hp = (p - ip) / sz * vec2(.55, 1.); float r = length(hp);
  float ring = exp(-pow((r - A * 2.6) * 5., 2.)) * (1. - A) * step(.01, A);
  over(acc, vec3(.62, .5, .36), dust * .85);
  over(acc, vec3(1., .9, .72), ring * .6 + B * exp(-r * r * 4.) * .7);
END }`,
  // HEALING  A: the green glow  B: rings out  C: plus signs rising
  healing: `void main(){ BEGIN
  vec2 q = (p - num) / sz; float r = length(q * vec2(.7, 1.));
  over(acc, vec3(.15, .75, .3), A * sstep(.75 * sz, 0., p.y) * rr * .28);
  over(acc, vec3(.3, 1., .45), pow(.5 + .5 * sin(atan(q.y, q.x) * 8. + t * .8), 6.) * exp(-r * .75) * A * .3);
  float ring = 0.;
  for (int k = 0; k < 3; k++) { float R = B * 3.6 - float(k) * .7; ring += step(0., R) * exp(-pow((r - R) * 5., 2.)) * exp(-max(R, 0.) * .45); }
  over(acc, vec3(.45, 1., .55), ring * .8 * (.3 + .7 * rr));
  vec2 sp = vec2(p.x * 2.6, p.y * 2.6 - t * 1.1); vec2 cell = floor(sp); vec2 h = hash2(cell + seed);
  vec2 o = fract(sp) - .5 - (h - .5) * .45; float s = .11 + .09 * h.x;
  float pl = min(max(abs(o.x) - s, abs(o.y) - s * .33), max(abs(o.y) - s, abs(o.x) - s * .33));
  float plus = sstep(.025, .0, pl) * step(.45, h.y) * (.6 + .4 * sin(t * 4. + h.x * 20.));
  over(acc, vec3(.55, 1., .6), plus * C * (.25 + .75 * rr));
  over(acc, vec3(.75, 1., .8), A * exp(-r * r * 3.) * .35);
END }`,
};
