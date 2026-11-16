import { describe, expect, it } from "vitest";
import { multiplier, rate, xpForCr } from "./encounters";

const m = (cr: string, count: number) => ({ slug: cr, name: cr, cr, xp: xpForCr(cr), count });

describe("encounter difficulty (2014 DMG)", () => {
  it("knows XP by challenge rating", () => {
    expect(xpForCr("1/4")).toBe(50);
    expect(xpForCr("3")).toBe(700);
    expect(xpForCr(0.5)).toBe(100);
    expect(xpForCr("30")).toBe(155000);
  });

  it("uses the group multiplier, shifted for party size", () => {
    expect(multiplier(1, 4)).toBe(1);
    expect(multiplier(2, 4)).toBe(1.5);
    expect(multiplier(4, 4)).toBe(2);
    expect(multiplier(8, 4)).toBe(2.5);
    expect(multiplier(12, 4)).toBe(3);
    expect(multiplier(15, 4)).toBe(4);
    expect(multiplier(1, 2)).toBe(1.5); // small party: one step up
    expect(multiplier(15, 1)).toBe(5);
    expect(multiplier(1, 6)).toBe(0.5); // big party: one step down
  });

  it("rates the DMG example: 4 level-3 characters", () => {
    // Thresholds for 4 × level 3: Easy 300, Medium 600, Hard 900, Deadly 1600.
    const party = [3, 3, 3, 3];
    expect(rate([m("1/4", 4)], party)).toMatchObject({ totalXp: 200, adjustedXp: 400, difficulty: "Easy", perPlayer: 50 });
    expect(rate([m("2", 1), m("1/4", 2)], party)).toMatchObject({ totalXp: 550, adjustedXp: 1100, difficulty: "Hard" });
    expect(rate([m("3", 2)], party)).toMatchObject({ adjustedXp: 2100, difficulty: "Deadly" });
    expect(rate([m("1/8", 1)], party).difficulty).toBe("Trivial");
    expect(rate([], party).difficulty).toBe("None");
  });
});
