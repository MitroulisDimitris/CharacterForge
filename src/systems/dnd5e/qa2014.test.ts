// Fixes from the player QA run (2026-11-21): proficiency summary, the dwarf's warhammer and tools,
// and the starting kit that Next now puts in.
import { describe, expect, it } from "vitest";
import { getSystem } from "../registry";
import type { Character } from "./character";
import type { Derived } from "./derive";
import { classKit } from "./startingKit";

const sys = getSystem("dnd2014")!;
const make = (raw: Record<string, unknown>) => {
  const c = sys.normalize(raw) as Character;
  return { c, d: sys.derive(c, ["PHB14", "XGE", "TCE"]) as Derived };
};

describe("QA fixes", () => {
  it("a hill dwarf cleric's proficiencies", () => {
    const { d } = make({ cls: "cleric", level: 1, subclass: "life", species: "dwarf14", lineage: "hill" });
    expect(d.armorText.split(", ").sort()).toEqual(["heavy armor", "light armor", "medium armor", "shields"]);
    expect(d.weaponText.toLowerCase()).toContain("warhammer");
    expect(d.warnings.map((w) => w.text).join(" ")).toMatch(/Dwarf: choose your tool proficiency/);
    const picked = make({ cls: "cleric", level: 1, subclass: "life", species: "dwarf14", lineage: "hill", speciesTool: "Mason's tools" }).d;
    expect(picked.tools).toContain("Mason's tools");
    expect(picked.warnings.map((w) => w.text).join(" ")).not.toMatch(/tool proficiency/);
  });

  it("exhaustion from the tracker changes speed and HP max (PHB appendix A)", () => {
    const base = { cls: "cleric", level: 2, subclass: "life", species: "dwarf14", lineage: "hill" };
    const fresh = make(base).d;
    expect(fresh.speed).toBe(25);
    expect(make({ ...base, play: { exhaustion: 1 } }).d.speed).toBe(25);
    expect(make({ ...base, play: { exhaustion: 2 } }).d.speed).toBe(12);
    const four = make({ ...base, play: { exhaustion: 4 } }).d;
    expect(four.hpMax).toBe(Math.floor(fresh.hpMax / 2));
    expect(make({ ...base, play: { exhaustion: 5 } }).d.speed).toBe(0);
  });

  it("no equipment and no money at level 1 is a to-do", () => {
    const empty = make({ cls: "cleric", level: 1, subclass: "life", inventory: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } }).d;
    expect(empty.warnings.some((w) => w.section === "starting-equipment")).toBe(true);
  });

  it("Next on the equipment step puts the picked kit in", () => {
    const step = sys.creation!.steps.find((s) => s.id === "equipment")!;
    const base = { cls: "cleric", level: 1, subclass: "life", inventory: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } };
    const { c, d } = make(base);
    const open = classKit(c, d.cls).missing.length;
    const patch = step.onNext!(c, d) as Partial<Character> | null;
    if (open) expect(patch).toBeNull();
    else expect(patch?.inventory?.length).toBeGreaterThan(0);
    // Gold instead of the kit: the gold goes in.
    const gold = make({ ...base, equipMode: "gold", startGold: 120 });
    expect((step.onNext!(gold.c, gold.d) as Partial<Character>).coins?.gp).toBe(120);
    // Something already in the pack: Next leaves it alone.
    const has = make({ ...base, inventory: [{ id: "x", name: "Rope", qty: 1, weight: 10 }] });
    expect(step.onNext!(has.c, has.d)).toBeNull();
  });
});
