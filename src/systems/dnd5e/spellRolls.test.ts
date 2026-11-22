import { describe, expect, it } from "vitest";
import { spellDiceBits } from "./rollSpecs";

const rolls = (text: string, mod = 3, half = false) => spellDiceBits(text, { label: "Test", mod, half }).filter((b) => b.spec);

describe("spell dice", () => {
  it("Chromatic Orb: 3d8 of a chosen type", () => {
    const [r] = rolls("3d8 (chosen type)");
    expect(r.text).toBe("3d8");
    expect(r.spec).toMatchObject({ kind: "damage", groups: [{ n: 3, sides: 8 }], bonus: 0, unit: "damage" });
  });

  it("names the damage type and colours fire", () => {
    const [r] = rolls("8d6 Fire", 3, true);
    expect(r.fire).toBe(true);
    expect(r.spec).toMatchObject({ unit: "fire", half: true });
  });

  it("healing adds the casting modifier", () => {
    const bits = spellDiceBits("1d4 + mod healing", { label: "Healing Word", mod: 3 });
    expect(bits.map((b) => b.text).join("")).toBe("1d4 + 3 healing");
    expect(bits[0].spec).toMatchObject({ kind: "heal", bonus: 3, unit: "hit points back", half: false });
  });

  it("a negative modifier", () => {
    expect(rolls("1d8 + mod Force", -1)[0].spec).toMatchObject({ bonus: -1, unit: "force" });
  });

  it("temporary hit points", () => {
    expect(rolls("2d4+4 Temp HP")[0].spec).toMatchObject({ kind: "heal", groups: [{ n: 2, sides: 4 }], bonus: 4, unit: "temporary hit points" });
  });

  it("two damage rolls in one line", () => {
    const r = rolls("1d10 Piercing + 2d6 Cold");
    expect(r.map((x) => [x.text, x.spec!.unit])).toEqual([
      ["1d10", "piercing"],
      ["2d6", "cold"],
    ]);
  });

  it("Magic Missile and per-hit extras", () => {
    expect(rolls("3 x (1d4+1) Force")[0].spec).toMatchObject({ groups: [{ n: 1, sides: 4 }], bonus: 1, unit: "force" });
    expect(rolls("+1d4 Radiant per hit")[0].spec).toMatchObject({ unit: "radiant" });
  });

  it("text without dice stays text", () => {
    expect(rolls("Fire = spell mod (leap)")).toEqual([]);
  });
});
