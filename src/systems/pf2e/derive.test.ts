// Golden tests for the Pathfinder 2e engine (values checked by hand against Player Core / Player Core 2).
import { describe, expect, it } from "vitest";
import { blankPF2, parryPF2 } from "./character";
import { derivePF2 } from "./derive";
import { dmgAt, spellPF2 } from "./data";

const mods = (d: ReturnType<typeof derivePF2>) => Object.values(d.mods).join(",");

describe("Pathfinder 2e Sorcerer — Parry Hotter", () => {
  it("level 5", () => {
    const d = derivePF2(parryPF2());
    expect(mods(d)).toBe("0,3,2,1,2,4");
    expect(d.partial.has("CHA")).toBe(true);
    expect(d.hpMax).toBe(8 + (6 + 2) * 5 + 5); // human 8, CON +2, Toughness
    expect(d.ac).toBe(10 + 3 + 7);
    expect(d.perception).toBe(2 + 7);
    expect(d.saves.map((s) => s.total)).toEqual([2 + 9, 3 + 7, 2 + 9]); // Fort expert at 5, Will expert
    expect(d.spellDc).toBe(21);
    expect(d.spellAttack).toBe(11);
    expect(d.vision).toBe("Low-light vision");
    expect(d.slots).toEqual([5, 4, 4, 3]);
    expect(d.cantripRank).toBe(3);
    expect(d.repertoire.find((r) => r.name === "Electric Arc")!.damage).toBe("4d4 electricity");
    expect(d.repertoire.filter((r) => r.gift).map((r) => r.name)).toEqual(["Shield", "Fear", "Blazing Bolt", "Haste"]);
    expect(d.skills.find((s) => s.id === "deception")!.total).toBe(4 + 9);
    expect(d.skills.find((s) => s.id === "stealth")!.rank).toBe(2);
    expect(d.skills.filter((s) => s.rank > 0).map((s) => s.id).sort()).toEqual(["arcana", "deception", "diplomacy", "intimidation", "stealth", "thievery"]);
    expect(d.warnings.filter((w) => w.level !== "info")).toEqual([]);
  });

  it("level 1 and 3", () => {
    const d1 = derivePF2({ ...parryPF2(), level: 1 });
    expect(mods(d1)).toBe("0,2,1,1,1,4");
    expect(d1.hpMax).toBe(8 + 6 + 1);
    expect(d1.ac).toBe(10 + 2 + 3);
    expect(d1.saves.map((s) => s.total)).toEqual([1 + 3, 2 + 3, 1 + 5]);
    const d3 = derivePF2({ ...parryPF2(), level: 3 });
    expect(d3.hpMax).toBe(8 + (6 + 1) * 3 + 3);
    expect(d3.slots).toEqual([5, 4, 3]);
    expect(d3.cantripRank).toBe(2);
  });
});

describe("Pathfinder 2e rules", () => {
  it("heightened damage", () => {
    expect(dmgAt(spellPF2("Fireball")!, 3)).toBe("6d6 fire");
    expect(dmgAt(spellPF2("Fireball")!, 5)).toBe("10d6 fire");
    expect(dmgAt(spellPF2("Daze")!, 3)).toBe("2d6 mental"); // heightens every 2 ranks
  });

  it("flaws, heritage HP and boost limits", () => {
    const c = { ...blankPF2(), ancestry: "goblin", heritage: "unbreakable", ancestryFree: ["CON"] as ReturnType<typeof blankPF2>["ancestryFree"], boosts1: ["CHA", "CON", "DEX", "INT"] as ReturnType<typeof blankPF2>["boosts1"] };
    const d = derivePF2(c);
    expect(d.mods.WIS).toBe(-1 + 1); // goblin flaw, acolyte background +WIS
    expect(d.ancestryHp).toBe(10);
    expect(d.vision).toBe("Darkvision");
    expect(d.warnings.some((w) => w.text.includes("maximum at 1st level is +4"))).toBe(false);
  });

  it("tradition check", () => {
    const c = { ...parryPF2(), cantrips: ["Electric Arc", "Ignition", "Telekinetic Projectile", "Divine Lance"] };
    expect(derivePF2(c).warnings.some((w) => w.text.startsWith("Divine Lance isn't a arcane spell"))).toBe(true);
  });
});
