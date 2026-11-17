import { describe, expect, it } from "vitest";
import { atTheTable, attacks, average, initiative, mmPage, passivePerception, rollAttack, rollDice, signed } from "./monsters";
import type { Monster } from "./lookup";

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

// The SRD Owlbear, as Open5e returns it (only what these helpers read).
const owlbear = {
  slug: "owlbear",
  name: "Owlbear",
  dexterity: 12,
  senses: "darkvision 60 ft., passive Perception 13",
  damage_vulnerabilities: "",
  damage_resistances: "",
  damage_immunities: "",
  legendary_actions: null,
  actions: [
    { name: "Multiattack", desc: "The owlbear makes two attacks: one with its beak and one with its claws." },
    { name: "Beak", desc: "Melee Weapon Attack: +7 to hit…", attack_bonus: 7, damage_dice: "1d10", damage_bonus: 5 },
    { name: "Claws", desc: "Melee Weapon Attack: +7 to hit…", attack_bonus: 7, damage_dice: "2d8", damage_bonus: 5 },
  ],
} as unknown as Monster;

describe("monster page helpers", () => {
  it("averages dice like the stat block", () => {
    expect(average("1d10", 5)).toBe(10);
    expect(average("2d8", 5)).toBe(14);
    expect(average(undefined, 3)).toBe(3);
  });

  it("rolls dice within range, doubling on a natural 20", () => {
    expect(rollDice("2d6", seq(0))).toBe(2);
    expect(rollDice("2d6", seq(0.99))).toBe(12);
    const crit = rollAttack(7, "2d8", 5, seq(0.99));
    expect(crit).toMatchObject({ d20: 20, toHit: 27, crit: true, damage: 16 + 16 + 5 });
    const miss = rollAttack(7, "2d8", 5, seq(0));
    expect(miss).toMatchObject({ d20: 1, miss: true });
  });

  it("reads the numbers for the page", () => {
    expect(passivePerception(owlbear)).toBe(13);
    expect(initiative(owlbear)).toBe(1);
    expect(signed(-2)).toBe("−2");
    expect(attacks(owlbear).map((a) => a.name)).toEqual(["Beak", "Claws"]);
  });

  it("sums up what matters at the table", () => {
    expect(atTheTable(owlbear)).toEqual([
      "Attacks two times a turn (Multiattack).",
      "Hardest hit: Claws, +7 to hit, about 14 damage.",
      "No resistances or immunities: every damage type works.",
      "Sees in the dark (60 ft).",
    ]);
  });

  it("knows Monster Manual pages (page numbers only)", () => {
    expect(mmPage("owlbear")).toBe(249);
    expect(mmPage("brown-bear")).toBe(319);
    expect(mmPage("not-a-monster")).toBeUndefined();
  });
});
