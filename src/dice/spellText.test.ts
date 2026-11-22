import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { spellTextRolls } from "./rollText";

type S = { name: string; desc: string; higher_level: string };
const srd = JSON.parse(readFileSync("public/srd-spells.json", "utf8")) as S[];
const get = (n: string) => srd.find((s) => s.name === n)!;
const rolls = (text: string, name = "X") => spellTextRolls(text, name).filter((b) => b.spec);

describe("dice in spell text (Wiki)", () => {
  it("Fireball: fire damage, half on a save", () => {
    const [r] = rolls(get("Fireball").desc, "Fireball");
    expect(r.text).toBe("8d6");
    expect(r.fire).toBe(true);
    expect(r.spec).toMatchObject({ kind: "damage", unit: "fire", half: true, label: "Fireball · fire damage" });
  });

  it("Cure Wounds: healing", () => {
    const [r] = rolls(get("Cure Wounds").desc);
    expect(r.spec).toMatchObject({ kind: "heal", unit: "hit points back", groups: [{ n: 1, sides: 8 }] });
  });

  it("Magic Missile: 1d4 + 1 force", () => {
    const [r] = rolls(get("Magic Missile").desc);
    expect(r.text).toBe("1d4 + 1");
    expect(r.spec).toMatchObject({ kind: "damage", unit: "force", bonus: 1, half: false });
  });

  it("Bless: a plain roll, not damage", () => {
    const [r] = rolls(get("Bless").desc);
    expect(r.spec).toMatchObject({ kind: "free", groups: [{ n: 1, sides: 4 }] });
  });

  it("False Life: temporary hit points", () => {
    const [r] = rolls(get("False Life").desc);
    expect(r.spec).toMatchObject({ kind: "heal", unit: "temporary hit points", bonus: 4 });
  });

  it("a list of damage types isn't one type", () => {
    const [r] = rolls("Ranged spell attack for 3d8 acid, cold, fire, lightning, poison or thunder damage.");
    expect(r.spec).toMatchObject({ kind: "damage", unit: "damage" });
    expect(r.fire).toBe(false);
  });

  it("every SRD spell's text keeps its words", () => {
    for (const s of srd) for (const t of [s.desc, s.higher_level]) expect(spellTextRolls(t, s.name).map((b) => b.text).join(""), s.name).toBe(t);
  });
});
