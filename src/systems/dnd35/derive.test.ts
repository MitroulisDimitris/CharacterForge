// Golden tests for the D&D 3.5 engine (values checked by hand against the 3.5 SRD tables).
import { describe, expect, it } from "vitest";
import { blank35, parry35 } from "./character";
import { derive35 } from "./derive";
import { bonusSpells } from "./data";

describe("3.5 bonus spells", () => {
  it("matches the ability modifier table", () => {
    expect([1, 2, 3, 4].map((l) => bonusSpells(4, l))).toEqual([1, 1, 1, 1]);
    expect([1, 2, 3, 4, 5].map((l) => bonusSpells(5, l))).toEqual([2, 1, 1, 1, 1]);
    expect(bonusSpells(2, 1)).toBe(1);
    expect(bonusSpells(2, 3)).toBe(0);
    expect(bonusSpells(5, 0)).toBe(0);
  });
});

describe("D&D 3.5 Sorcerer — Parry Hotter", () => {
  it("level 5", () => {
    const d = derive35(parry35());
    expect(Object.values(d.scores).join(",")).toBe("12,14,13,14,12,18");
    expect(d.hpMax).toBe(21); // 4+1, then 4 × (3+1)
    expect(d.bab).toBe(2);
    expect(d.saves.map((s) => s.total)).toEqual([2, 3, 5]);
    expect(d.ac).toBe(12);
    expect(d.flatAc).toBe(10);
    expect(d.initiative).toBe(6);
    expect(d.grapple).toBe(3);
    expect(d.pointsAvailable).toBe(32);
    expect(d.pointsSpent).toBe(32);
    expect(d.perDay).toEqual([6, 7, 5]);
    expect(d.known).toEqual([6, 4, 2]);
    const sleep = d.spellRows.find((r) => r.name === "Sleep")!;
    expect(sleep.dc).toBe(10 + 1 + 4 + 1); // Spell Focus (Enchantment)
    expect(d.spellRows.find((r) => r.name === "Magic Missile")!.effect).toBe("3 missiles, 1d4+1 force each");
    expect(d.skills.find((s) => s.id === "bluff")!.total).toBe(8 + 4);
    expect(d.skills.find((s) => s.id === "diplomacy")!.total).toBe(4 + 2 + 2); // CHA, half-elf, Bluff synergy
    expect(d.skills.find((s) => s.id === "sleightOfHand")!.ranks).toBe(2);
    expect(d.warnings.filter((w) => w.level !== "info")).toEqual([]);
  });

  it("level 1 limits", () => {
    const d = derive35({ ...parry35(), level: 1 });
    expect(d.hpMax).toBe(5);
    expect(d.perDay).toEqual([5, 4]);
    expect(d.known).toEqual([4, 2]);
    expect(d.warnings.some((w) => w.level === "error" && w.text.startsWith("Bluff: 8 ranks, max is 4"))).toBe(true);
  });
});

describe("D&D 3.5 — Human and Small races", () => {
  it("Human gets a bonus feat slot and extra skill points", () => {
    const d = derive35({ ...blank35(), feat1: { id: "toughness", choice: "" }, featHuman: { id: "improvedInitiative", choice: "" } });
    // elite array: INT 12 (+1) → (2+1)×4 + 4 = 16
    expect(d.pointsAvailable).toBe(16);
    expect(d.hpMax).toBe(4 + 2 + 3);
    expect(d.initiative).toBe(1 + 4);
    expect(d.featSlots.length).toBe(2);
  });

  it("Gnome: Small size modifiers and illusion DC", () => {
    const c = { ...blank35(), race: "gnome35", spellsKnown: ["Ghost Sound"] };
    const d = derive35(c);
    expect(d.ac).toBe(10 + 1 + 1); // DEX 13 → +1, size +1
    expect(d.scores.STR).toBe(6);
    expect(d.grapple).toBe(0 - 2 - 4); // BAB 0, STR -2, Small -4
    expect(d.skills.find((s) => s.id === "hide")!.total).toBe(1 + 4);
    expect(d.spellRows[0].dc).toBe(10 + 0 + 2 + 1); // CHA 15, gnome illusion bonus
  });
});
