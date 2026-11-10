// Tracking things that get used up in play (spell slots, sorcery points, …) and come back on a rest.
// Systems declare their pools with `GameSystem.resources`; the character stores what's spent in
// `spent` (pool id → number used since the last rest).
import type { BaseCharacter, ResourcePool } from "./systems/types";

export const usedOf = (c: BaseCharacter, p: ResourcePool) => Math.max(0, Math.min(p.max, c.spent?.[p.id] ?? 0));
export const availableOf = (c: BaseCharacter, p: ResourcePool) => p.max - usedOf(c, p);

/** Patch that sets how many of a pool are still available. */
export const setAvailable = (c: BaseCharacter, p: ResourcePool, available: number): Partial<BaseCharacter> => ({
  spent: { ...(c.spent ?? {}), [p.id]: p.max - Math.max(0, Math.min(p.max, available)) },
});

/** Clicking pip i (0-based): a filled pip spends from there on; an empty pip refills up to it. */
export const clickPip = (c: BaseCharacter, p: ResourcePool, i: number) => setAvailable(c, p, i < availableOf(c, p) ? i : i + 1);

/** Patch for a rest: a long rest refills everything, a short rest only the short-rest pools. */
export function rest(c: BaseCharacter, pools: ResourcePool[], kind: "short" | "long"): Partial<BaseCharacter> {
  const spent = { ...(c.spent ?? {}) };
  for (const p of pools) if (kind === "long" || p.refresh === "short") delete spent[p.id];
  return { spent };
}
