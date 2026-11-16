// "Suggest an encounter" (REQUIREMENTS §4.4): pick monsters that land in the chosen difficulty
// band for this party, in one of a few easy-to-run shapes. Pure functions: the monster pool and the
// random source are passed in, so it can be tested.
import { multiplier, rate, xpForCr, type Difficulty, type EncounterMonster } from "./encounters";
import type { MonsterBrief } from "./lookup";

export type Target = Exclude<Difficulty, "None" | "Trivial">;
export type Shape = "solo" | "group" | "leader" | "mixed";

export const SHAPE_TEXT: Record<Shape, string> = {
  solo: "One tough monster",
  group: "A pack of the same kind",
  leader: "A leader with followers",
  mixed: "Two kinds together",
};

export interface Suggestion {
  shape: Shape;
  monsters: EncounterMonster[];
}

const toEntry = (m: MonsterBrief, count: number): EncounterMonster => ({
  slug: m.slug,
  name: m.name,
  cr: m.challenge_rating,
  xp: xpForCr(m.challenge_rating),
  count,
  ac: m.armor_class,
  hp: m.hit_points,
});

const ORDER: Target[] = ["Easy", "Medium", "Hard", "Deadly"];

/**
 * Up to `tries` random encounters of random shapes from `pool`; keep the ones rated exactly
 * `target` for this party, prefer the middle of the band and few monsters, and return one of the
 * best few (so "Try another" gives variety). Null when nothing in the pool fits.
 */
export function suggestEncounter(pool: MonsterBrief[], partyLevels: number[], target: Target, rnd: () => number = Math.random, tries = 700): Suggestion | null {
  if (!partyLevels.length) return null;
  const empty = rate([], partyLevels);
  const i = ORDER.indexOf(target);
  const lo = empty.thresholds[i];
  const hi = i < 3 ? empty.thresholds[i + 1] : empty.thresholds[3] * 1.6;
  const avg = partyLevels.reduce((a, b) => a + b, 0) / partyLevels.length;
  // Nothing far above the party, nothing that alone overshoots the band.
  const usable = pool.filter((m) => {
    const xp = xpForCr(m.challenge_rating);
    return xp > 0 && m.cr <= avg + (target === "Deadly" ? 5 : 3) && xp * multiplier(1, partyLevels.length) < hi;
  });
  if (!usable.length) return null;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  // Mostly keep groups to one creature type (goblins with a bugbear, not ghouls with a pseudodragon).
  const kin = (xs: MonsterBrief[], like: MonsterBrief) => {
    const same = xs.filter((m) => m.type === like.type);
    return same.length && rnd() < 0.8 ? same : xs;
  };
  const fits = (ms: EncounterMonster[]) => rate(ms, partyLevels).difficulty === target;

  const found: { s: Suggestion; score: number }[] = [];
  const keep = (shape: Shape, ms: EncounterMonster[]) => {
    const r = rate(ms, partyLevels);
    const mid = (lo + hi) / 2;
    const score = Math.abs(r.adjustedXp - mid) / Math.max(1, hi - lo) + Math.max(0, r.monsterCount - 6) * 0.3;
    if (!found.some((f) => JSON.stringify(f.s.monsters) === JSON.stringify(ms))) found.push({ s: { shape, monsters: ms }, score });
  };

  for (let t = 0; t < tries && found.length < 40; t++) {
    const shape = pick<Shape>(["solo", "group", "group", "leader", "leader", "mixed"]);
    if (shape === "solo") {
      const ms = [toEntry(pick(usable), 1)];
      if (fits(ms)) keep(shape, ms);
    } else if (shape === "group") {
      const m = pick(usable);
      for (let n = 2; n <= 8; n++) {
        const ms = [toEntry(m, n)];
        if (fits(ms)) {
          keep(shape, ms);
          break;
        }
      }
    } else if (shape === "leader") {
      const lead = pick(usable);
      const followers = usable.filter((m) => m.cr < lead.cr && m.slug !== lead.slug);
      if (!followers.length) continue;
      const f = pick(kin(followers, lead));
      for (let n = 2; n <= 6; n++) {
        const ms = [toEntry(lead, 1), toEntry(f, n)];
        if (fits(ms)) {
          keep(shape, ms);
          break;
        }
      }
    } else {
      const a = pick(usable);
      const b = pick(kin(usable.filter((m) => m.slug !== a.slug), a));
      if (a.slug === b.slug) continue;
      const na = 1 + Math.floor(rnd() * 3);
      for (let nb = 1; nb <= 4; nb++) {
        const ms = [toEntry(a, na), toEntry(b, nb)];
        if (fits(ms)) {
          keep(shape, ms);
          break;
        }
      }
    }
  }
  if (!found.length) return null;
  found.sort((x, y) => x.score - y.score);
  return pick(found.slice(0, 6)).s;
}

/** The monsters matching a creature type and a place (data names from PLACES). */
export function filterPool(pool: MonsterBrief[], type: string, placeNames: string[]): MonsterBrief[] {
  return pool.filter((m) => (!type || m.type === type) && (!placeNames.length || m.environments?.some((e) => placeNames.includes(e))));
}
