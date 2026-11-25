// GLSL for the progression tree (copied from the mockup canvas, page "Progression Tree", boards
// "Class trees, all 13 classes" and "Final level up story"). Coordinates are CSS px, y up.
// Rules (as in fxShaders.ts): never a reversed smoothstep (use sstep), colour <= alpha (premultiplied),
// no sine-based hash (phone GPUs turn it into stripes).

/** The living background of each class's tree, plus the level-up light (one branch per class). */
export const TREE_FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
// The tree's living background and its level-up stories. p is in CSS px, y up. Story positions come in
// y-down CSS px (as measured) and are flipped here. Never a reversed smoothstep (sstep instead).
uniform vec2 res, root;
uniform float px, t, cls, lvl, climbX, y0, head, headOn, rowY, burst, burstOn, flash, rflare;
uniform vec3 nd[4];
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash2(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
float sstep(float e0, float e1, float x){ float k = clamp((x - e0) / (e1 - e0), 0., 1.); return k * k * (3. - 2. * k); }
void over(inout vec4 acc, vec3 c, float a){ a = clamp(a, 0., 1.); acc.rgb = c * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }
vec3 fireCol(float f){ vec3 c = vec3(.75, .12, .02); c = mix(c, vec3(1., .42, .06), sstep(.25, .55, f)); c = mix(c, vec3(1., .72, .25), sstep(.55, .85, f)); return mix(c, vec3(1., .9, .6), sstep(.88, 1., f)); }
float seg(vec2 p, vec2 a, vec2 b){ vec2 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0., 1.); return length(p - a - ab * h); }
// twinkling points on a grid: embers, sparks, stars
float dots(vec2 p, float scale, float speedY, float driftX, float density, float size, float seed){
  vec2 sp = p / scale + vec2(sin(t * .7 + seed + p.y * .01) * driftX, -t * speedY);
  vec2 c = floor(sp); vec2 h = hash2(c + seed); vec2 o = fract(sp) - .5 - (h - .5) * .6;
  return step(1. - density, h.x) * sstep(size, size * .3, length(o)) * (.55 + .45 * sin(t * 5. + h.y * 30.)); }
// a four-point star
float star4(vec2 q, float k, float s){ return exp(-abs(q.x) * k) * exp(-abs(q.y) * s) + exp(-abs(q.y) * k) * exp(-abs(q.x) * s); }

void main(){
  vec2 p = gl_FragCoord.xy / px;
  vec2 R = res / px;
  vec4 acc = vec4(0.);
  float Y0 = R.y - y0, HD = R.y - head, RY = R.y - rowY;
  vec2 RT = vec2(root.x, R.y - root.y);
  float dx = abs(p.x - climbX);
  float along = sstep(Y0 - 6., Y0 + 6., p.y) * (1. - sstep(HD - 2., HD + 14., p.y));
  float reachX = burst * R.x;
  float inReach = 1. - sstep(reachX - 30., reachX + 6., dx);
  float dyr = p.y - RY;
  if (cls < .5) {
    // SORCERER: living flames along the bottom (taller as the dragon wakes, level by level), embers rising
    float under = exp(-pow((p.x - RT.x) / (R.x * .5), 2.));
    float w = fbm(vec2(p.x * .02, p.y * .014 - t * .5));
    float n = fbm(vec2(p.x * .034 + w * 1.2, p.y * .02 - t * 1.25));
    float hgt = (14. + 46. * under) * (.55 + .7 * lvl) + rflare * 60. * under;
    float f = clamp((1. - p.y / hgt) + (n - .5) * 1.6, 0., 1.);
    over(acc, fireCol(f), sstep(.04, .4, f) * .8);
    over(acc, vec3(1., .62, .25), dots(p, 26., .9, .5, .18, .09, 1.) * (.25 + .5 * lvl) * sstep(R.y, R.y * .2, p.y));
    float dr = length(p - RT);
    over(acc, vec3(1., .55, .2), rflare * exp(-dr * dr / 2600.) * .8);
    // the climb: a column of fire up the level line, a fireball at its head
    float nn = fbm(vec2(p.x * .07, p.y * .035 - t * 3.2));
    float col = exp(-pow(dx / (7. + 9. * nn), 2.)) * along * headOn;
    over(acc, fireCol(.45 + .55 * col), col * .9);
    float hd = length(vec2(dx, p.y - HD));
    over(acc, vec3(1., .5, .15), exp(-hd * hd / 1400.) * headOn * .6);
    over(acc, vec3(1., .92, .7), exp(-hd * hd / 160.) * headOn);
    // the burst: flames run along the new level
    float n2 = fbm(vec2(p.x * .045, p.y * .03 - t * 2.4));
    // tall licking tongues, not a bar: the height wanders along the level
    float hb = (34. + 26. * fbm(vec2(p.x * .02, t * .8))) * (1. - .3 * burst) + 8.;
    float fb = clamp((1. - dyr / hb) + (n2 - .5) * 1.9, 0., 1.) * sstep(-14., -2., dyr) * inReach * burstOn;
    over(acc, fireCol(fb), sstep(.05, .4, fb) * .9);
    over(acc, vec3(1., .85, .55), flash * exp(-dyr * dyr / 300.) * inReach * .7);
    // the new steps catch fire
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      float fl = fbm(vec2(atan(p.y - c.y, p.x - c.x) * 2., d * .05 - t * 2.));
      float ring = exp(-pow((d - 30. - fl * 10.) / 9., 2.));
      over(acc, fireCol(.5 + .5 * q.z), (ring * .8 + exp(-d * d / 900.) * .5) * q.z);
    }
  } else if (cls < 1.5) {
    // FIGHTER: a forge glow at the bottom (hotter each level), slow smoke, sparks drifting up
    over(acc, vec3(1., .55, .2), sstep(110., 0., p.y) * (.18 + .18 * lvl) * (.85 + .15 * noise(vec2(t * 1.5, 0.))));
    float sm = fbm(vec2(p.x * .012 + t * .03, p.y * .01 - t * .12));
    over(acc, vec3(.55, .55, .58), sstep(.55, .85, sm) * .12 * sstep(R.y, R.y * .3, p.y));
    over(acc, vec3(1., .8, .45), dots(p, 30., .8, 1.4, .12, .07, 3.) * (.3 + .5 * lvl));
    float dr = length(p - RT);
    over(acc, vec3(1., .95, .8), rflare * (exp(-dr * dr / 900.) + star4(p - RT, .3, .03) * .6));
    // the climb: a blade of light, a white core with a gold glow, a star at its head
    over(acc, vec3(1., .8, .4), exp(-dx / 5.) * along * headOn * .55);
    over(acc, vec3(1.), exp(-dx * dx / 1.6) * along * headOn);
    over(acc, vec3(1., .97, .9), star4(vec2(dx, p.y - HD), .35, .08) * headOn);
    // the clang: a shockwave runs along the new level with a bright front
    float front = exp(-pow((dx - reachX) / 14., 2.)) * (1. - burst * .6);
    over(acc, vec3(1., .93, .75), (exp(-dyr * dyr / 3.) * inReach * .8 + front * exp(-dyr * dyr / 120.)) * burstOn);
    over(acc, vec3(1., .85, .5), flash * exp(-dyr * dyr / 500.) * inReach * .6);
    // the new steps are stamped: a ring closes in on each
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      float ring = exp(-pow((d - 26. - (1. - q.z) * 26.) / 3., 2.));
      over(acc, vec3(1., .9, .65), (ring + exp(-d * d / 500.) * .5) * q.z);
    }
  } else if (cls < 2.5) {
    // WIZARD: a slow nebula, stars (more each level), a rune circle turning around the root
    float nb = fbm(p * .006 + vec2(t * .01, 0.)); float nb2 = fbm(p * .011 - vec2(0., t * .015) + 4.);
    over(acc, mix(vec3(.25, .35, .9), vec3(.55, .35, .85), nb2), sstep(.45, .8, nb) * (.12 + .1 * lvl));
    over(acc, vec3(.88, .92, 1.), dots(p, 22., 0., 0., .22 + .2 * lvl, .06, 5.));
    vec2 q0 = p - RT; float dr = length(q0); float ang = atan(q0.y, q0.x);
    float ringA = exp(-pow((dr - 50.) / 1.5, 2.)) + exp(-pow((dr - 62.) / 1.2, 2.)) * .7;
    float ticks = step(.82, fract(ang / 6.2832 * 24. + t * (.05 + .25 * rflare))) * exp(-pow((dr - 56.) / 4., 2.));
    over(acc, vec3(.65, .78, 1.), (ringA * .35 + ticks * .4) * (.5 + .8 * rflare));
    over(acc, vec3(.7, .8, 1.), rflare * exp(-dr * dr / 2200.) * .45);
    // the climb: a thread of starlight with small stars along it
    over(acc, vec3(.75, .85, 1.), (exp(-dx * dx / 1.2) + exp(-dx / 6.) * .35) * along * headOn);
    over(acc, vec3(.95, .97, 1.), dots(vec2(p.x - climbX + 20., p.y), 9., 0., 0., .5, .12, 9.) * along * headOn * exp(-dx / 10.));
    over(acc, vec3(1.), star4(vec2(dx, p.y - HD), .5, .1) * headOn);
    // the constellation: lines from the new level on the line out to each new step, then a star there
    vec2 A = vec2(climbX, RY);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.x <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y);
      float pr = clamp(burst * 1.6 - float(i) * .22, 0., 1.);
      float dl = seg(p, A, A + (c - A) * pr);
      over(acc, vec3(.75, .85, 1.), (exp(-dl * dl) + exp(-dl / 7.) * .3) * burstOn * step(.001, pr));
      if (q.z > 0.) {
        float d = length(p - c);
        over(acc, vec3(.92, .95, 1.), (star4(p - c, .25, .05) * .8 + exp(-pow((d - 32.) / 1.5, 2.)) * .6) * q.z);
      }
    }
    over(acc, vec3(.8, .88, 1.), flash * exp(-dyr * dyr / 400.) * inReach * .5);
  } else if (cls < 3.5) {
    // BARBARIAN: red dust on the wind, cracked earth glowing under the tree (hotter each level), a war-drum pulse
    float pulse = pow(.5 + .5 * sin(t * 2.4), 6.);
    over(acc, vec3(.55, .12, .06), sstep(.5, .85, fbm(vec2(p.x * .01 - t * .25, p.y * .02))) * .16);
    float cn = noise(p * .03) * .7 + noise(p * .09 + 3.) * .3;
    over(acc, vec3(1., .35, .12), exp(-abs(cn - .5) * 55.) * sstep(140., 0., p.y) * (.3 + .5 * lvl) * (.65 + .35 * pulse));
    vec2 uv = p / R - .5;
    over(acc, vec3(.7, .08, .04), sstep(.42, .75, length(uv)) * .22 * pulse);
    float dr = length(p - RT);
    over(acc, vec3(1., .3, .1), rflare * (exp(-dr * dr / 1800.) * .8 + exp(-pow((dr - 40. - rflare * 30.) / 4., 2.)) * .6));
    // the climb: a crack of red light tears up the level line
    float jx = (noise(vec2(p.y * .08, 3.)) - .5) * 16.;
    float dj = abs(p.x - climbX - jx);
    over(acc, vec3(1., .42, .16), (exp(-dj * dj / 3.) + exp(-dj / 8.) * .4) * along * headOn);
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(1., .25, .08), exp(-hd * hd / 900.) * headOn * .8);
    over(acc, vec3(1., .85, .6), exp(-hd * hd / 80.) * headOn);
    // the roar: a shockwave rolls out along the new level, the ground cracks under it
    float rr = length((p - vec2(climbX, RY)) * vec2(1., 2.4));
    over(acc, vec3(1., .5, .25), exp(-pow((rr - burst * R.x * .9) / 10., 2.)) * (1. - burst) * burstOn * .9);
    float cr = abs(dyr - (noise(vec2(p.x * .06, 7.)) - .5) * 12.);
    over(acc, vec3(1., .4, .15), exp(-cr * cr / 2.) * inReach * burstOn);
    over(acc, vec3(1., .75, .55), flash * exp(-dyr * dyr / 400.) * inReach * .6);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c); float a = atan(p.y - c.y, p.x - c.x);
      float ray = pow(max(cos(a * 4. + 1.), 0.), 14.) * exp(-d / 45.);
      over(acc, vec3(1., .4, .15), (ray * .8 + exp(-pow((d - 28.) / 4., 2.)) * .7 + exp(-d * d / 600.) * .4) * q.z);
    }
  } else if (cls < 4.5) {
    // BARD: a stave of five lines waving like a ribbon, notes drifting up, colour sliding magenta to teal
    float wv = sin(p.x * .012 + t * .6) * 30. + sin(p.x * .005 - t * .3) * 40.;
    float sy = p.y - R.y * .62 - wv;
    float st = 0.;
    for (int k = 0; k < 5; k++) { float d = abs(sy - float(k) * 9.); st += exp(-d * d / .8); }
    vec3 hue = mix(vec3(.9, .45, .8), vec3(.4, .85, .9), .5 + .5 * sin(p.x * .004 + t * .2));
    over(acc, hue, st * .14 * (.6 + .6 * lvl));
    over(acc, vec3(1., .78, .95), dots(p, 34., .35, 1.2, .12, .1, 6.) * (.35 + .45 * lvl));
    float dr = length(p - RT);
    over(acc, vec3(1., .6, .9), exp(-pow(fract(dr / 22. - t * 1.5) - .5, 2.) * 40.) * exp(-dr / 70.) * rflare * .6);
    // the climb: a melody line rides up, notes along it
    float dm = abs(p.x - climbX - sin(p.y * .07 - t * 9.) * 9.);
    over(acc, vec3(1., .6, .9), (exp(-dm * dm / 2.) + exp(-dm / 7.) * .35) * along * headOn);
    over(acc, vec3(1., .9, .98), dots(vec2(p.x - climbX + 30., p.y), 12., 0., 0., .45, .12, 4.) * along * headOn * exp(-dm / 12.));
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(.9, .4, .8), exp(-hd * hd / 700.) * headOn * .6);
    over(acc, vec3(1., .9, .98), exp(-hd * hd / 60.) * headOn);
    // the chord: sound ripples run out along the new level
    float da = length(p - vec2(climbX, RY));
    float rip = exp(-pow(fract((da - burst * 240.) / 26.) - .5, 2.) * 60.) * sstep(burst * R.x * .8 + 10., burst * R.x * .8 - 40., da) * exp(-abs(dyr) / 26.);
    over(acc, hue, rip * burstOn * (1. - burst * .5));
    over(acc, vec3(1., .85, .95), flash * exp(-dyr * dyr / 300.) * inReach * .5);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      float ph = fract(t * 1.2);
      over(acc, hue, (exp(-pow((d - 24. - ph * 26.) / 2.5, 2.)) * (1. - ph) + exp(-pow((d - 26.) / 2., 2.)) * .6 + exp(-d * d / 700.) * .3) * q.z);
    }
  } else if (cls < 5.5) {
    // CLERIC: rays of light from above (brighter each level), warm motes; the light comes DOWN to the new level
    vec2 v = p - vec2(R.x * .5, R.y + 80.);
    float ang = atan(v.x, -v.y);
    over(acc, vec3(1., .9, .65), sstep(.5, .85, fbm(vec2(ang * 9., t * .15))) * sstep(0., R.y, p.y) * .15 * (.6 + .6 * lvl));
    over(acc, vec3(1., .93, .72), dots(p, 28., .25, .4, .14, .08, 8.) * (.3 + .4 * lvl));
    float dr = length(p - RT);
    over(acc, vec3(1., .88, .55), exp(-pow((dr - 44.) / 2., 2.)) * (.25 + .7 * rflare) + rflare * exp(-dr * dr / 1800.) * .55);
    // the beam: from the top of the tree down to the new level, a bright point at its foot
    float alongD = sstep(HD - 10., HD + 4., p.y);
    over(acc, vec3(1., .95, .8), (exp(-dx * dx / 8.) * .9 + exp(-dx / 18.) * .4) * alongD * headOn);
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(1., .85, .5), exp(-hd * hd / 1500.) * headOn * .6);
    over(acc, vec3(1.), exp(-hd * hd / 90.) * headOn);
    // it lands: light pools along the new level and rises off it in rays
    over(acc, vec3(1., .93, .7), exp(-dyr * dyr / 20.) * inReach * burstOn * .8);
    over(acc, vec3(1., .9, .6), exp(-abs(fract(p.x / 26.) - .5) * 14.) * sstep(0., 8., dyr) * exp(-dyr / 50.) * inReach * burstOn * .4);
    over(acc, vec3(1., .95, .8), flash * exp(-dyr * dyr / 500.) * inReach * .6);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      float hq = length((p - c - vec2(0., 34.)) * vec2(1., 3.2));
      over(acc, vec3(1., .9, .6), (exp(-pow((hq - 18.) / 2.5, 2.)) + exp(-d * d / 700.) * .45 + star4(p - c, .3, .06) * .4) * q.z);
    }
  } else if (cls < 6.5) {
    // DRUID: dappled canopy light, mist low on the ground, fireflies; a vine climbs and leafs out
    over(acc, vec3(.6, .85, .45), sstep(.55, .8, fbm(p * .015 + vec2(t * .03, t * .02))) * .09 * (.6 + .6 * lvl));
    over(acc, vec3(.4, .6, .45), sstep(.4, .8, fbm(vec2(p.x * .008 + t * .05, p.y * .02))) * sstep(160., 0., p.y) * .22);
    over(acc, vec3(.85, 1., .5), dots(p, 30., .12, 1.6, .16, .08, 11.) * (.4 + .5 * lvl));
    vec2 q0 = p - RT; float dr = length(q0); float a0 = atan(q0.y, q0.x);
    float pet0 = .5 + .5 * cos(a0 * 6. + t * .4);
    over(acc, vec3(.6, .95, .5), exp(-pow((dr - 46. - 8. * pet0) / 2.5, 2.)) * (.2 + .7 * rflare) + rflare * exp(-dr * dr / 1800.) * .5);
    // the climb: a vine, a leaf every few steps, a bud at its tip
    float vw = sin(p.y * .09) * 7.;
    float dv = abs(p.x - climbX - vw);
    over(acc, vec3(.45, .8, .4), (exp(-dv * dv / 3.) + exp(-dv / 8.) * .25) * along * headOn);
    float side = mod(floor(p.y / 22.), 2.) * 2. - 1.;
    vec2 lq = vec2(p.x - climbX - vw - side * 9., mod(p.y, 22.) - 11.);
    over(acc, vec3(.55, .9, .45), sstep(7., 5., length(vec2(lq.x * .8, lq.y * 1.7))) * along * headOn);
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(.8, 1., .6), exp(-hd * hd / 70.) * headOn);
    over(acc, vec3(.5, .9, .4), exp(-hd * hd / 800.) * headOn * .5);
    // the vine runs along the new level, leafing as it goes
    float dvr = abs(dyr - sin(p.x * .08) * 5.);
    over(acc, vec3(.45, .82, .4), exp(-dvr * dvr / 3.) * inReach * burstOn);
    float sd2 = mod(floor(p.x / 24.), 2.) * 2. - 1.;
    vec2 lr = vec2(mod(p.x, 24.) - 12., dyr - sin(p.x * .08) * 5. - sd2 * 8.);
    over(acc, vec3(.55, .9, .45), sstep(7., 5., length(vec2(lr.x * 1.7, lr.y * .8))) * inReach * burstOn);
    over(acc, vec3(.8, 1., .6), flash * exp(-dyr * dyr / 400.) * inReach * .4);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c); float a = atan(p.y - c.y, p.x - c.x);
      float pet = .5 + .5 * cos(a * 5.);
      over(acc, vec3(.75, 1., .6), (exp(-pow((d - (24. + 12. * pet) * (.6 + .4 * q.z)) / 3., 2.)) + exp(-d * d / 700.) * .35) * q.z);
    }
  } else if (cls < 7.5) {
    // MONK: ink-wash mist, threads of incense smoke, an ensō brushed around the root; ki spirals up
    over(acc, vec3(.75, .72, .68), sstep(.5, .85, fbm(vec2(p.x * .006 + t * .02, p.y * .01))) * .1);
    float sx = p.x + sin(p.y * .03 + t) * 12. + fbm(vec2(p.y * .01, t * .2)) * 30.;
    over(acc, vec3(.8, .78, .74), exp(-abs(fract(sx / 90.) - .5) * 40.) * .07);
    vec2 q0 = p - RT; float dr = length(q0); float a0 = atan(q0.y, q0.x);
    float f0 = fract((a0 + 1.2) / 6.2832);
    float brush = sstep(0., .05, f0) * sstep(.97, .85, f0);
    over(acc, vec3(.95, .7, .3), exp(-pow((dr - 52.) / (3. + 4. * noise(vec2(a0 * 3., 1.))), 2.)) * brush * (.35 + .6 * rflare));
    // the climb: two strands of ki twist round each other, an orb at the top
    float sw = sin(p.y * .09 - t * 10.) * 9.;
    float h1 = abs(p.x - climbX - sw), h2 = abs(p.x - climbX + sw);
    over(acc, vec3(1., .72, .32), ((exp(-h1 * h1 / 2.) + exp(-h2 * h2 / 2.)) * .9 + exp(-dx / 10.) * .25) * along * headOn);
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(1., .65, .25), exp(-hd * hd / 600.) * headOn * .7);
    over(acc, vec3(1., .95, .8), exp(-hd * hd / 70.) * headOn);
    // the strike: one brush stroke sweeps along the new level, dry at its edges
    float bw = 6. + 5. * fbm(vec2(p.x * .05, 2.));
    float dry = .55 + .45 * sstep(.35, .6, noise(vec2(p.x * .01, p.y * .6)));
    over(acc, vec3(.98, .72, .32), sstep(bw, bw - 2.5, abs(dyr)) * dry * inReach * burstOn * .85);
    over(acc, vec3(1., .9, .7), flash * exp(-dyr * dyr / 300.) * inReach * .5);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c); float a = atan(p.y - c.y, p.x - c.x);
      float f = fract((a + 2. + float(i)) / 6.2832);
      float th = 2.5 + 3. * noise(vec2(a * 3., float(i)));
      over(acc, vec3(1., .75, .35), (exp(-pow((d - 30.) / th, 2.)) * sstep(0., .05, f) * sstep(.12 + .85 * q.z, .06 + .85 * q.z, f) + exp(-d * d / 700.) * .3) * q.z);
    }
  } else if (cls < 8.5) {
    // PALADIN: a holy glow from below, a column of blue light from above, radiant motes rising
    over(acc, vec3(1., .85, .5), sstep(140., 0., p.y) * (.12 + .14 * lvl));
    over(acc, vec3(.6, .75, 1.), exp(-abs(p.x - R.x * .5) / 90.) * sstep(R.y * .2, R.y, p.y) * .07 * (.8 + .2 * sin(t * .8)));
    over(acc, vec3(1., .9, .6), dots(p, 26., .5, .3, .14, .08, 13.) * (.3 + .5 * lvl));
    float dr = length(p - RT);
    over(acc, vec3(1., .92, .7), rflare * (star4(p - RT, .12, .03) * .7 + exp(-dr * dr / 1500.) * .6));
    // the climb: a sword of light, its cross-guard at the top
    over(acc, vec3(1., .85, .45), exp(-dx / 7.) * along * headOn * .5);
    over(acc, vec3(1.), exp(-dx * dx / 2.2) * along * headOn);
    float gy = p.y - HD;
    over(acc, vec3(1., .95, .8), (exp(-gy * gy / 4.) * sstep(24., 14., dx) + star4(vec2(dx, gy), .3, .05) * .7) * headOn);
    // the vow: wings of light open from the new level, feathers rising off it
    float fx = abs(p.x - climbX);
    float feather = exp(-abs(fract(fx / 14.) - .5) * 9.);
    float wing = sstep(0., 4., dyr) * exp(-dyr / (8. + 46. * exp(-fx / 130.))) * (.5 + .5 * feather);
    over(acc, vec3(1., .9, .6), (wing * .8 + exp(-dyr * dyr / 6.) * .7) * inReach * burstOn);
    over(acc, vec3(1., .95, .8), flash * exp(-dyr * dyr / 500.) * inReach * .6);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      over(acc, vec3(1., .92, .7), (star4(p - c, .18, .03) * .7 + exp(-pow((d - 28.) / 2.5, 2.)) * .6) * q.z);
      over(acc, vec3(.55, .7, 1.), exp(-d * d / 800.) * q.z * .4);
    }
  } else if (cls < 9.5) {
    // RANGER: moonlit woods: the moon, pines along the bottom, wind in the grass, fireflies
    vec2 mo = vec2(R.x * .84, R.y * .88); float dm = length(p - mo);
    over(acc, vec3(.85, .9, .8), exp(-dm * dm / 3000.) * .22 + sstep(20., 18., dm) * .3);
    float tx = p.x / 34.; float tf = fract(tx) - .5; float th2 = 30. + 45. * hash(vec2(floor(tx), 2.));
    over(acc, vec3(.04, .07, .05), step(p.y, th2 * (1. - abs(tf) * 2.) + 6.) * .55);
    over(acc, vec3(.8, .9, .7), sstep(.62, .8, fbm(vec2(p.x * .004 - t * .6, p.y * .05))) * .07);
    over(acc, vec3(.9, 1., .6), dots(p, 32., .1, 1.4, .1, .07, 17.) * (.25 + .4 * lvl));
    float dr = length(p - RT);
    over(acc, vec3(.85, 1., .6), rflare * (exp(-pow((dr - 30.) / 2., 2.)) + exp(-pow((dr - 46.) / 1.5, 2.)) * .7 + exp(-dr * dr / 900.) * .4));
    // the climb: an arrow, fast: a streak behind it, the head a bright point
    float behind = HD - p.y;
    over(acc, vec3(.9, 1., .7), exp(-dx * dx / 1.5) * exp(-max(behind, 0.) / 70.) * step(0., behind) * along * headOn);
    vec2 ah = vec2(p.x - climbX, p.y - HD);
    over(acc, vec3(1.), step(-12., ah.y) * step(ah.y, 0.) * step(abs(ah.x), -ah.y * .45) * headOn);
    over(acc, vec3(.8, 1., .6), exp(-dot(ah, ah) / 300.) * headOn * .6);
    // it hits: a flash at the new level and gusts of wind running out along it
    over(acc, vec3(1., 1., .85), star4(p - vec2(climbX, RY), .2, .04) * flash);
    float gst = exp(-pow(fract((dx - burst * 200.) / 40.) - .5, 2.) * 30.) * exp(-dyr * dyr / 30.);
    over(acc, vec3(.85, 1., .7), (gst * .7 + exp(-dyr * dyr / 3.) * .5) * inReach * burstOn);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      float k = 1. - q.z;
      over(acc, vec3(.85, 1., .65), (exp(-pow((d - 30. - k * 24.) / 1.8, 2.)) + exp(-pow((d - 20. - k * 16.) / 1.5, 2.)) * .7 + exp(-d * d / 500.) * .3) * q.z);
    }
  } else if (cls < 10.5) {
    // ROGUE: fog rolling through the dark, the edges dimmer, a knife glint now and then
    over(acc, vec3(.45, .4, .6), sstep(.45, .85, fbm(vec2(p.x * .006 + t * .04, p.y * .012 - t * .01))) * .14);
    vec2 uv = p / R - .5;
    over(acc, vec3(0.), sstep(.3, .75, length(uv * vec2(1.1, 1.))) * .35);
    over(acc, vec3(1.), dots(p, 60., 0., 0., .08, .04, 19.) * pow(.5 + .5 * sin(t * 1.7 + floor(p.x / 60.) * 2.3), 30.) * 2.);
    float dr = length(p - RT);
    over(acc, vec3(.12, .08, .2), rflare * exp(-dr * dr / 2500.) * .6);
    over(acc, vec3(.75, .65, 1.), rflare * exp(-pow((dr - 36.) / 3., 2.)) * .5);
    // the climb: a smear of shadow rises, a glint at its tip
    float sm = fbm(vec2(p.x * .05, p.y * .04 - t * 2.));
    float w = 10. + 12. * sm;
    over(acc, vec3(.1, .07, .17), exp(-pow(dx / w, 2.)) * along * headOn * .75);
    over(acc, vec3(.62, .52, .95), exp(-pow(dx / w - 1., 2.) * 8.) * along * headOn * .3);
    over(acc, vec3(1.), star4(vec2(p.x - climbX, p.y - HD), .45, .1) * headOn);
    // the cut: one thin bright slash runs along the new level
    over(acc, vec3(.92, .88, 1.), exp(-dyr * dyr / 1.2) * sstep(reachX - 160., reachX, dx) * inReach * burstOn);
    over(acc, vec3(.7, .6, 1.), exp(-dyr * dyr / 40.) * inReach * burstOn * .2);
    over(acc, vec3(1.), flash * exp(-dyr * dyr / 200.) * inReach * .4);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c);
      over(acc, vec3(.1, .07, .16), exp(-d * d / 900.) * q.z * .55);
      over(acc, vec3(1.), star4(p - c - vec2(14., 14.), .4, .08) * q.z);
      over(acc, vec3(.7, .6, 1.), exp(-pow((d - 28.) / 2., 2.)) * q.z * .6);
    }
  } else if (cls < 11.5) {
    // WARLOCK: the void ripples, tendrils reach up from below (further each level), eldritch motes
    float dv = length(p - vec2(R.x * .5, R.y * 1.05));
    over(acc, vec3(.45, .25, .7), sstep(.75, 1., .5 + .5 * sin(dv * .05 - t * .8 + fbm(p * .01) * 4.)) * .08);
    float tx = p.x / 70.; float tid = floor(tx);
    float tw = (fract(tx) - .5) * 70. + sin(p.y * .03 + t * 1.2 + tid * 3.) * 14.;
    float tlen = 90. + 120. * hash(vec2(tid, 5.)) * (.5 + .5 * lvl);
    over(acc, vec3(.32, .16, .48), exp(-tw * tw / (30. * max(1. - p.y / tlen, .05))) * sstep(tlen, 0., p.y) * .45);
    over(acc, vec3(.5, 1., .65), dots(p, 30., .3, .8, .12, .08, 23.) * (.3 + .4 * lvl));
    vec2 q0 = p - RT; float dr = length(q0); float a0 = atan(q0.y, q0.x);
    float tk = step(.8, fract(a0 / 6.2832 * 10. + t * .1)) * exp(-pow((dr - 48.) / 4., 2.));
    over(acc, vec3(.5, 1., .65), (exp(-pow((dr - 54.) / 1.5, 2.)) * .5 + tk * .5) * (.4 + .6 * rflare) + rflare * exp(-dr * dr / 1500.) * .4);
    // the climb: an eldritch tendril twists up, its tip a green orb in a purple haze
    float tw2 = sin(p.y * .06 - t * 6.) * (4. + 8. * sstep(Y0, HD, p.y));
    float dt = abs(p.x - climbX - tw2);
    over(acc, vec3(.55, .3, .85), exp(-dt / 9.) * along * headOn * .4);
    over(acc, vec3(.6, 1., .7), exp(-dt * dt / 2.) * along * headOn);
    float hd = length(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(.6, .3, .9), exp(-hd * hd / 900.) * headOn * .7);
    over(acc, vec3(.75, 1., .8), exp(-hd * hd / 70.) * headOn);
    // the blast: a crackling beam along the new level
    float cr = abs(dyr - (noise(vec2(p.x * .1, t * 8.)) - .5) * 8.);
    over(acc, vec3(.6, 1., .72), exp(-cr * cr / 1.5) * inReach * burstOn);
    over(acc, vec3(.6, .3, .9), exp(-abs(dyr) / 12.) * inReach * burstOn * .3);
    over(acc, vec3(.8, 1., .85), flash * exp(-dyr * dyr / 300.) * inReach * .5);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c); float a = atan(p.y - c.y, p.x - c.x);
      float tk2 = step(.75, fract(a / 6.2832 * 10. - t * .4)) * exp(-pow((d - 25.) / 3., 2.));
      over(acc, vec3(.6, 1., .7), (exp(-pow((d - 31.) / 1.5, 2.)) * .8 + tk2 * .7) * q.z);
      over(acc, vec3(.55, .3, .85), exp(-d * d / 700.) * q.z * .45);
    }
  } else {
    // ARTIFICER: a blueprint grid whose traces light up with running pulses, a slow gear in the corner
    vec2 g = p / 22.;
    float dY = abs(fract(g.y + .5) - .5) * 22., dX = abs(fract(g.x + .5) - .5) * 22.;
    vec2 cH = vec2(floor(g.x), floor(g.y + .5)), cV = vec2(floor(g.x + .5), floor(g.y));
    float onH = step(.72, hash(cH + 1.)) * exp(-dY * dY), onV = step(.72, hash(cV + 9.)) * exp(-dX * dX);
    float pH = pow(.5 + .5 * sin(p.x * .05 - t * 3. + hash(cH) * 6.), 8.), pV = pow(.5 + .5 * sin(p.y * .05 - t * 3. + hash(cV) * 6.), 8.);
    over(acc, vec3(.3, .8, .9), (onH * (.1 + .6 * pH) + onV * (.1 + .6 * pV)) * (.45 + .55 * lvl));
    vec2 gc = vec2(R.x - 30., 40.); float gd = length(p - gc); float ga = atan(p.y - gc.y, p.x - gc.x) + t * .15;
    float gr = 44. + 7. * step(.5, fract(ga / 6.2832 * 14.));
    over(acc, vec3(.85, .55, .3), sstep(gr + 1., gr - 1., gd) * step(18., gd) * .1);
    float dr = length(p - RT); float ar = atan(p.y - RT.y, p.x - RT.x) - t * .3;
    float rg = 48. + 6. * step(.5, fract(ar / 6.2832 * 16.));
    over(acc, vec3(.85, .55, .3), exp(-pow((dr - rg) / 1.6, 2.)) * (.25 + .6 * rflare) + rflare * exp(-dr * dr / 1500.) * .45);
    // the climb: a trace up the level line with packets of light running on it
    float pk = pow(.5 + .5 * sin(p.y * .15 - t * 20.), 12.);
    over(acc, vec3(.3, .8, .95), exp(-dx / 7.) * along * headOn * .35);
    over(acc, vec3(.5, .95, 1.), exp(-dx * dx / 2.5) * (.55 + .45 * pk) * along * headOn);
    vec2 hq = abs(vec2(p.x - climbX, p.y - HD));
    over(acc, vec3(.75, .97, 1.), sstep(6., 4., max(hq.x, hq.y)) * headOn);
    over(acc, vec3(.3, .8, .95), exp(-dot(hq, hq) / 500.) * headOn * .6);
    // it powers the new level: traces run out along it, packets racing to each step
    over(acc, vec3(.4, .9, 1.), exp(-dyr * dyr / 1.5) * (.45 + .55 * pow(.5 + .5 * sin(dx * .15 - t * 20.), 10.)) * inReach * burstOn);
    over(acc, vec3(.9, .6, .35), exp(-dyr * dyr / 80.) * inReach * burstOn * .2);
    over(acc, vec3(.8, .97, 1.), flash * exp(-dyr * dyr / 300.) * inReach * .5);
    for (int i = 0; i < 4; i++) {
      vec3 q = nd[i]; if (q.z <= 0.) continue;
      vec2 c = vec2(q.x, R.y - q.y); float d = length(p - c); float a = atan(p.y - c.y, p.x - c.x) + t * .8 + float(i);
      float gr2 = 27. + 4. * step(.5, fract(a / 6.2832 * 12.));
      over(acc, vec3(.9, .6, .35), exp(-pow((d - gr2) / 1.5, 2.)) * q.z);
      over(acc, vec3(.4, .9, 1.), exp(-d * d / 600.) * q.z * .4);
    }
  }
  gl_FragColor = vec4(min(acc.rgb, vec3(acc.a)), acc.a);
}
`;

/** The light behind the "Level up!" card. */
export const PARTY_FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
// Behind the "Level up!" card: each class's moment. p in CSS px, y up; card centre c, half size hs.
uniform vec2 res, c, hs;
uniform float px, t, cls, A, B, C;
uniform vec3 col;
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash2(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
float sstep(float e0, float e1, float x){ float k = clamp((x - e0) / (e1 - e0), 0., 1.); return k * k * (3. - 2. * k); }
void over(inout vec4 acc, vec3 col, float a){ a = clamp(a, 0., 1.); acc.rgb = col * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }
vec3 fireCol(float f){ vec3 k = vec3(.75, .12, .02); k = mix(k, vec3(1., .42, .06), sstep(.25, .55, f)); k = mix(k, vec3(1., .72, .25), sstep(.55, .85, f)); return mix(k, vec3(1., .9, .6), sstep(.88, 1., f)); }
float sdBox(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
float dots(vec2 p, float scale, float speedY, float density, float size, float seed){
  vec2 sp = p / scale + vec2(sin(t * .7 + seed + p.y * .01) * .5, -t * speedY);
  vec2 g = floor(sp); vec2 h = hash2(g + seed); vec2 o = fract(sp) - .5 - (h - .5) * .6;
  return step(1. - density, h.x) * sstep(size, size * .3, length(o)) * (.55 + .45 * sin(t * 5. + h.y * 30.)); }

void main(){
  vec2 p = gl_FragCoord.xy / px;
  vec2 q = p - c;
  float d = sdBox(q, hs, 22.);
  vec4 acc = vec4(0.);
  if (cls < .5) {
    // SORCERER: the card stands in a ring of dragon fire that catches (A up) and burns down to a glow
    float w = fbm(vec2(p.x * .012, p.y * .01 - t * .6));
    float n = fbm(vec2(p.x * .026 + w, p.y * .02 - t * 1.5));
    float up = sstep(-hs.y - 30., hs.y + 10., q.y) * .6 + .4;          // taller above than below
    float h = (22. + 46. * w) * up * A;
    float f = clamp(1. - d / max(h, 1.) + (n - .5) * 1.5, 0., 1.) * step(-2., d);
    over(acc, vec3(1., .45, .15), exp(-max(d, 0.) / 70.) * .35 * A);
    over(acc, fireCol(f), sstep(.05, .4, f) * .92);
    over(acc, vec3(1., .65, .3), dots(p, 24., 1.1, .2, .1, 2.) * B * sstep(-40., 120., d));
  } else if (cls < 1.5) {
    // FIGHTER: the card lands: a shockwave and a spray of sparks run out (B), light falls from above (A)
    float r = length(q / vec2(1., .55));
    float R = B * 720.;
    over(acc, vec3(1., .85, .55), exp(-abs(q.x) / 150.) * sstep(-hs.y, hs.y + 260., q.y) * .22 * A);
    over(acc, vec3(1., .93, .75), exp(-pow((r - R) / 16., 2.)) * (1. - B) * .9 * step(.001, B));
    float ang = atan(q.y, q.x), k = ang / 6.2832 * 64.;
    float id = floor(k), hb = hash(vec2(id, 3.));
    float lane = exp(-pow((fract(k) - .5) * 10., 2.));
    float sr = (.35 + .65 * hb) * R + hs.x * .6;
    float spark = lane * exp(-pow((length(q) - sr) / (6. + 10. * hb), 2.)) * step(.55, hb) * (1. - B);
    over(acc, vec3(1., .8, .45), spark * 1.2);
    over(acc, vec3(1., .75, .4), dots(p, 30., .6, .1, .07, 4.) * .6 * A);
  } else if (cls < 2.5) {
    // WIZARD: a rune circle draws itself around the card (A), stars spiral in (C), glyphs turn
    float r = length(q), ang = atan(q.y, q.x);
    float R1 = hs.y + 64.;
    float drawn = step(fract((ang + 1.5708) / 6.2832), A);
    float ring = (exp(-pow((r - R1) / 1.6, 2.)) + exp(-pow((r - R1 + 16.) / 1.2, 2.)) * .7) * drawn;
    float ticks = step(.86, fract(ang / 6.2832 * 36. + t * .04)) * exp(-pow((r - R1 + 8.) / 4., 2.)) * drawn;
    float a8 = fract(ang / 6.2832 * 8. - t * .03) - .5;
    float glyph = exp(-pow(a8 * 40., 2.)) * exp(-pow((r - R1 - 18.) / 7., 2.)) * step(.999, A);
    over(acc, vec3(.55, .68, 1.), exp(-abs(d) / 60.) * .25 * A);
    over(acc, vec3(.72, .82, 1.), ring * .8 + ticks * .6 + glyph * .7);
    float sa = ang + (1. - C) * 3. + r * .004;
    vec2 sp = vec2(sa * 6., r * .03 + C * 4.);
    vec2 g = floor(sp); vec2 h = hash2(g + 7.);
    float st = step(.82, h.x) * sstep(.12, .03, length(fract(sp) - .5 - (h - .5) * .5)) * (.5 + .5 * sin(t * 6. + h.y * 20.));
    over(acc, vec3(.9, .94, 1.), st * C * sstep(R1 + 260., R1 - 40., r) * step(R1 * .5, r));
  } else {
    // every other class: a glow in the class's colour gathers round the card, motes rise off it
    over(acc, col, exp(-max(d, 0.) / 60.) * .45 * A * step(0., d));
    over(acc, mix(col, vec3(1.), .4), exp(-pow(d / 3., 2.)) * .5 * A);
    over(acc, mix(col, vec3(1.), .3), dots(p, 26., .5, .12, .08, 6.) * A * sstep(150., 0., d) * step(0., d));
  }
  gl_FragColor = vec4(min(acc.rgb, vec3(acc.a)), acc.a);
}
`;

/** The final level's big story (Sorcerer, Fighter, Wizard). */
export const STORY_FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
// The level-up story, drawn over the whole window. p is in CSS px, y up. Every light is pinned to
// something on screen: the card (c, hs), its number (nm, nh) or a new power (ch[i]). Backdrop effects
// are masked off the card face once the card shows (cm = its opacity), so nothing glows over empty space
// and nothing lingers: each effect has its own uniform and the story takes it back to 0.
uniform vec2 res, c, hs, nm, nh;
uniform float px, t, cls, lvl, chn, cm;
uniform vec3 ch[3];
uniform vec3 pr, sp;
uniform float E, S, F, R, G, H, Q, FL, A, C, B, W, K;
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash2(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
// smoothstep that also runs downhill (e0 > e1): never call the built-in that way
float sstep(float e0, float e1, float x){ float k = clamp((x - e0) / (e1 - e0), 0., 1.); return k * k * (3. - 2. * k); }
void over(inout vec4 acc, vec3 col, float a){ a = clamp(a, 0., 1.); acc.rgb = col * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }
vec3 fireCol(float f){ vec3 k = vec3(.75, .12, .02); k = mix(k, vec3(1., .42, .06), sstep(.25, .55, f)); k = mix(k, vec3(1., .72, .25), sstep(.55, .85, f)); return mix(k, vec3(1., .9, .6), sstep(.88, 1., f)); }
float sdBox(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
float seg(vec2 p, vec2 a, vec2 b){ vec2 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0., 1.); return length(p - a - ab * h); }
float star4(vec2 q, float k, float s){ return exp(-abs(q.x) * k) * exp(-abs(q.y) * s) + exp(-abs(q.y) * k) * exp(-abs(q.x) * s); }
float dots(vec2 p, float scale, float speedY, float density, float size, float seed){
  vec2 sp2 = p / scale + vec2(sin(t * .7 + seed + p.y * .01) * .5, -t * speedY);
  vec2 g = floor(sp2); vec2 h = hash2(g + seed); vec2 o = fract(sp2) - .5 - (h - .5) * .6;
  return step(1. - density, h.x) * sstep(size, size * .3, length(o)) * (.55 + .45 * sin(t * 5. + h.y * 30.)); }
float pick(vec3 v, int i){ return i == 0 ? v.x : (i == 1 ? v.y : v.z); }
// a thrown arc from a to b, lifted at the middle
vec2 arc(vec2 a, vec2 b, float u, float lift){ vec2 m = (a + b) * .5 + vec2((b.x - a.x) * .35, lift); return mix(mix(a, m, u), mix(m, b, u), u); }

void main(){
  vec2 p = gl_FragCoord.xy / px;
  vec2 RS = res / px;
  vec2 q = p - c;
  float d = sdBox(q, hs, 22.);
  float bgm = 1. - cm * sstep(2., -2., d);   // backdrop effects stay off the card face
  vec4 acc = vec4(0.);
  if (cls < .5) {
    // ---------------- SORCERER · the dragon wakes
    // a heartbeat, then an eye opens where the card will stand; the pupil narrows; fire roars up
    float ew = min(RS.x * .36, 200.) * (.9 + .2 * lvl), eh = ew * .44;
    float x = q.x / ew;
    over(acc, vec3(.85, .16, .06), G * exp(-dot(q, q) / (ew * ew * .35)) * .6);
    over(acc, vec3(1., .6, .25), G * (1. - E) * exp(-abs(q.y) / 1.6) * sstep(1., .1, abs(x)));
    if (E > .001) {
      float lid = eh * E * (1. - x * x);
      float de = abs(q.y) - lid;
      float inside = sstep(1.2, -1.2, de) * step(abs(x), 1.);
      float r = length(q), ri = eh * .9;
      float ang = atan(q.y, q.x);
      float sw = fbm(vec2(ang * 2.2 + t * .25, r * .045 - t * .9));
      float fi = clamp(1.05 - r / ri + (sw - .5) * .6, 0., 1.);
      vec3 col = mix(vec3(.22, .03, .02), fireCol(.3 + .7 * fi), sstep(ri + 2.5, ri - 2.5, r));
      float pw = ri * .3 * S + 1.;
      float pu = length(vec2(q.x / pw, q.y / (ri * .95)));
      col = mix(col, vec3(.03, 0., 0.), sstep(1.12, .88, pu));
      over(acc, vec3(1., .38, .1), exp(-max(de, 0.) / 34.) * .5 * E);
      over(acc, col, inside);
      over(acc, vec3(1., .72, .38), exp(-abs(de) / 2.2) * step(abs(x), 1.02) * sstep(0., .3, E) * .9);
    }
    if (F > .001) {
      float n = fbm(vec2(p.x * .011, p.y * .008 - t * 1.4));
      float n2 = fbm(vec2(p.x * .028 + n * 1.5, p.y * .02 - t * 2.8));
      float f = clamp(1. - p.y / max(F * RS.y, 1.) + (n2 - .5) * 1.4, 0., 1.);
      over(acc, fireCol(f), sstep(.04, .35, f) * .96 * bgm);
    }
    if (R > .001) {
      // the fire burns down to a ring hugging the card, embers rising off it (near the card only)
      float w = fbm(vec2(p.x * .012, p.y * .01 - t * .6));
      float n = fbm(vec2(p.x * .026 + w, p.y * .02 - t * 1.5));
      float up = sstep(-hs.y - 30., hs.y + 10., q.y) * .6 + .4;
      float h = (20. + 44. * w) * up * R;
      float f = clamp(1. - d / max(h, 1.) + (n - .5) * 1.5, 0., 1.) * step(-2., d);
      over(acc, vec3(1., .45, .15), exp(-max(d, 0.) / 70.) * .35 * R * bgm);
      over(acc, fireCol(f), sstep(.05, .4, f) * .9);
      over(acc, vec3(1., .65, .3), dots(p, 24., 1.1, .2, .1, 2.) * R * sstep(150., 0., d) * bgm);
    }
    // embers carry each new power out of the number and land on it
    for (int i = 0; i < 3; i++) {
      if (float(i) >= chn) break;
      vec3 k = ch[i];
      float u = pick(pr, i);
      if (u > .001 && u < .999) {
        float g = 0.;
        for (int j = 0; j < 6; j++) {
          vec2 b = arc(nm, k.xy, max(u - float(j) * .045, 0.), 110.);
          float dd = length(p - b);
          g += exp(-dd * dd / (10. + float(j) * 6.)) * (1. - float(j) * .15);
          if (j == 0) over(acc, vec3(1., .5, .15), exp(-dd * dd / 700.) * .5);
        }
        over(acc, vec3(1., .85, .55), g);
      }
      if (k.z > .001) {
        float dc = length(p - k.xy);
        over(acc, vec3(1., .55, .2), exp(-dc * dc / 1100.) * k.z * .6);
        over(acc, vec3(1., .8, .45), exp(-pow((dc - 16. - (1. - k.z) * 46.) / 3.5, 2.)) * k.z);
      }
    }
  } else if (cls < 1.5) {
    // ---------------- FIGHTER · forged on the anvil
    // the blank glows hot; three hammer blows throw sparks off its top edge; it is quenched in steam
    vec2 ip = c + vec2(0., hs.y);
    over(acc, vec3(1., .45, .12), exp(-max(d, 0.) / 55.) * .65 * H * bgm);
    over(acc, vec3(1., .55, .2), exp(-pow(q.x / (hs.x * 1.1), 2.)) * exp(-max(-hs.y - q.y, 0.) / 45.) * sstep(-hs.y + 24., -hs.y - 4., q.y) * .5 * H);
    for (int j = 0; j < 3; j++) {
      float u = pick(sp, j);
      if (u <= .001 || u >= .999) continue;
      float s = 0.;
      float T = u * .85, T2 = max(T - .03, 0.);
      for (int k = 0; k < 22; k++) {
        vec2 h = hash2(vec2(float(k) * 1.7 + float(j) * 13.1, 4.2));
        float a = mix(.12, 3.02, h.x);
        vec2 dir = vec2(cos(a), sin(a)) * mix(240., 620., h.y);
        vec2 a1 = ip + dir * T - vec2(0., 900. * T * T);
        vec2 a2 = ip + dir * T2 - vec2(0., 900. * T2 * T2);
        float dl = seg(p, a1, a2);
        s += exp(-dl * dl / 1.5) * (1. - u) * (.6 + .4 * h.x);
      }
      over(acc, vec3(1., .82, .5), s * 1.3);
      over(acc, vec3(1., .6, .25), exp(-dot(p - ip, p - ip) / 4000.) * (1. - u) * .5);
    }
    over(acc, vec3(1., .95, .8), FL * exp(-dot(p - ip, p - ip) / 2200.));
    if (Q > .001) {
      vec2 sq = p - vec2(c.x, c.y + hs.y);
      // steam lifts off the card's top edge and thins out as it rises
      float m = sstep(hs.x * 1.1, hs.x * .4, abs(sq.x)) * sstep(-40., 0., sq.y) * exp(-max(sq.y, 0.) / 70.);
      float sm = fbm(vec2(p.x * .02, p.y * .016 - t * 1.1));
      over(acc, vec3(.86, .86, .9), sstep(.4, .75, sm) * m * .38 * Q);
    }
    // each new power is stamped on: a ring closes in on it
    for (int i = 0; i < 3; i++) {
      if (float(i) >= chn) break;
      vec3 k = ch[i];
      if (k.z > .001) {
        float dc = length(p - k.xy);
        over(acc, vec3(1., .9, .65), (exp(-pow((dc - 18. - (1. - k.z) * 30.) / 2.5, 2.)) + exp(-dc * dc / 700.) * .4) * k.z);
      }
    }
  } else {
    // ---------------- WIZARD · a new page in the spellbook
    // the book falls open, light rises off the page, a rune circle draws itself, stars spiral in,
    // a quill writes the number, and lines of a constellation reach out to each new power
    float r = length(q), ang = atan(q.y, q.x);
    over(acc, vec3(.88, .92, 1.), dots(p, 22., 0., .12 + .14 * lvl, .06, 5.) * (.3 + .7 * C) * bgm);
    float R1 = min(RS.x * .47, hs.y + 58.);
    if (A > .001) {
      float drawn = step(fract((ang + 1.5708) / 6.2832), A);
      float ring = (exp(-pow((r - R1) / 1.6, 2.)) + exp(-pow((r - R1 + 14.) / 1.2, 2.)) * .7) * drawn;
      float ticks = step(.86, fract(ang / 6.2832 * 36. + t * .04)) * exp(-pow((r - R1 + 7.) / 3.5, 2.)) * drawn;
      float a8 = fract(ang / 6.2832 * 8. - t * .03) - .5;
      float glyph = exp(-pow(a8 * 40., 2.)) * exp(-pow((r - R1 - 16.) / 6., 2.)) * sstep(.95, 1., A);
      over(acc, vec3(.55, .68, 1.), exp(-abs(r - R1) / 40.) * .2 * K * drawn * bgm);
      over(acc, vec3(.72, .82, 1.), (ring * .85 + ticks * .6 + glyph * .7) * K * bgm);
    }
    if (C > .001 && C < .999) {
      float sa = ang + (1. - C) * 3. + r * .004;
      vec2 sg = vec2(sa * 6., r * .03 + C * 4.);
      vec2 g = floor(sg); vec2 h = hash2(g + 7.);
      float st = step(.82, h.x) * sstep(.12, .03, length(fract(sg) - .5 - (h - .5) * .5)) * (.5 + .5 * sin(t * 6. + h.y * 20.));
      over(acc, vec3(.9, .94, 1.), st * sin(C * 3.1416) * sstep(R1 + 240., R1 - 30., r) * step(R1 * .45, r) * bgm);
    }
    if (B > .001) {
      over(acc, vec3(.75, .85, 1.), B * (exp(-abs(q.x) / 24.) * sstep(-10., 40., q.y) * exp(-max(q.y, 0.) / 230.) * .75 + exp(-dot(q, q) / 2500.) * .6));
    }
    if (W > .001 && W < .999) {
      vec2 pp = vec2(nm.x - nh.x + 2. * nh.x * W, nm.y + sin(W * 34.) * nh.y * .35);
      vec2 dq = p - pp;
      over(acc, vec3(.8, .88, 1.), exp(-dot(dq, dq) / 220.) * .7);
      over(acc, vec3(1.), star4(dq, .45, .09));
    }
    for (int i = 0; i < 3; i++) {
      if (float(i) >= chn) break;
      vec3 k = ch[i];
      float u = pick(pr, i);
      float live = u < .999 ? 1. : k.z;   // a finished line fades with its star
      if (u > .001 && live > .001) {
        vec2 a = nm - vec2(0., nh.y);
        float dl = seg(p, a, mix(a, k.xy, u));
        over(acc, vec3(.75, .85, 1.), (exp(-dl * dl / 1.2) + exp(-dl / 6.) * .25) * live);
      }
      if (k.z > .001) {
        float dc = length(p - k.xy);
        over(acc, vec3(.92, .95, 1.), (star4(p - k.xy, .22, .045) * .8 + exp(-pow((dc - 22.) / 1.5, 2.)) * .5) * k.z);
      }
    }
  }
  gl_FragColor = vec4(min(acc.rgb, vec3(acc.a)), acc.a);
}
`;
