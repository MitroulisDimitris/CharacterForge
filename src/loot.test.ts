import { describe, expect, it } from "vitest";
import { coinText, coinValue, gpText, ITEM_CHANCE, MAGIC_ITEMS, noCoinsWhy, rollCoins, rollItem, rollLoot, tierOf, type Foe } from "./loot";

/** A repeatable random source. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const foe = (name: string, cr: number, type = "Humanoid", intelligence = 10, count = 1): Foe => ({ name, cr, type, intelligence, count });

describe("loot", () => {
  it("tiers follow challenge rating", () => {
    expect([0, 0.5, 1, 4, 5, 10, 11, 16, 17, 30].map(tierOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("animals, oozes, constructs and mindless creatures carry no coins", () => {
    expect(noCoinsWhy({ type: "Beast", intelligence: 3 })).toMatch(/Animals/);
    expect(noCoinsWhy({ type: "Ooze", intelligence: 1 })).toMatch(/Oozes/);
    expect(noCoinsWhy({ type: "Construct", intelligence: 10 })).toMatch(/Constructs/);
    expect(noCoinsWhy({ type: "Undead", intelligence: 3 })).toMatch(/mindless/);
    expect(noCoinsWhy({ type: "Undead", intelligence: 12 })).toBeNull();
    expect(noCoinsWhy({ type: "Humanoid", intelligence: 10 })).toBeNull();
    const l = rollLoot([foe("Wolf", 0.25, "Beast", 3, 3)], seeded(1));
    expect(l.lines[0].coins).toBeNull();
    expect(l.total).toBe(0);
    expect(l.item).toBeNull();
  });

  it("coins grow with challenge rating", () => {
    const avg = (cr: number) => {
      const rng = seeded(cr * 100 + 7);
      let t = 0;
      for (let i = 0; i < 400; i++) t += coinValue(rollCoins(cr, rng));
      return t / 400;
    };
    const a = [0, 2, 5, 11, 17].map(avg);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThan(a[i - 1]);
    expect(a[0]).toBeLessThan(1); // pocket change
    expect(a[1]).toBeGreaterThan(5);
    expect(a[1]).toBeLessThan(20);
  });

  it("magic items are rare and match the tier", () => {
    for (const p of ITEM_CHANCE) expect(p).toBeLessThanOrEqual(0.15);
    const rng = seeded(42);
    let found = 0;
    for (let i = 0; i < 2000; i++) if (rollLoot([foe("Bandit Captain", 2)], rng).item) found++;
    expect(found / 2000).toBeGreaterThan(0.02);
    expect(found / 2000).toBeLessThan(0.07);
    for (let i = 0; i < 200; i++) {
      expect(["common", "uncommon"]).toContain(rollItem(1, rng).rarity);
      expect(["very rare", "legendary"]).toContain(rollItem(20, rng).rarity);
    }
    for (const r of ["common", "uncommon", "rare", "very rare", "legendary"]) expect(MAGIC_ITEMS.some((i) => i.rarity === r)).toBe(true);
  });

  it("a group adds up its coins and the item comes from the toughest", () => {
    const rng = seeded(3);
    let withItem = null;
    for (let i = 0; i < 3000 && !withItem; i++) {
      const l = rollLoot([foe("Bandit", 0.125, "Humanoid", 10, 4), foe("Bandit Captain", 2), foe("Mastiff", 0.125, "Beast", 3, 2)], rng);
      expect(l.lines.map((x) => x.count)).toEqual([4, 1, 2]);
      expect(l.total).toBeCloseTo(coinValue(l.lines[0].coins!) + coinValue(l.lines[1].coins!));
      if (l.item) withItem = l.item;
    }
    expect(withItem?.from).toBe("Bandit Captain");
  });

  it("writes coins plainly", () => {
    expect(coinText({ cp: 12, sp: 0, gp: 37, pp: 0 })).toBe("37 gp, 12 cp");
    expect(coinText({ cp: 0, sp: 0, gp: 0, pp: 0 })).toBe("No coins");
    expect(gpText(0.4)).toBe("under 1 gp");
    expect(gpText(1234.4)).toBe("1,234 gp");
  });
});
