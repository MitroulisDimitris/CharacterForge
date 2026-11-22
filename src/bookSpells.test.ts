import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withBookSpells, type Spell } from "./lookup";
import { RULES } from "./systems/dnd5e/rules";

const srd = JSON.parse(readFileSync("public/srd-spells.json", "utf8")) as Spell[];
const all = withBookSpells(srd, RULES["2014"].spells);

describe("Wiki spell list: SRD + the 2014 book spells", () => {
  it("adds Chromatic Orb from the Player's Handbook", () => {
    const orb = all.find((s) => s.name === "Chromatic Orb")!;
    expect(orb).toMatchObject({ slug: "chromatic-orb", level_int: 1, school: "Evocation", book: "Player's Handbook", casting_time: "1 action" });
    expect(orb.dnd_class.split(", ")).toEqual(["Sorcerer", "Wizard"]);
  });

  it("adds Xanathar's and Tasha's spells with their book", () => {
    expect(all.find((s) => s.name === "Toll the Dead")?.book).toBe("Xanathar's Guide to Everything");
    expect(all.find((s) => s.name === "Mind Sliver")?.book).toBe("Tasha's Cauldron of Everything");
  });

  it("keeps the SRD text where the SRD has the spell, with no duplicates", () => {
    const names = all.map((s) => s.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(all.map((s) => s.slug)).size).toBe(all.length);
    expect(all.find((s) => s.name === "Fireball")?.book).toBeUndefined();
    expect(all.length).toBeGreaterThan(srd.length + 80);
  });

  it("every 2014 spell a character can learn is in the list, with a class", () => {
    const names = new Set(all.map((s) => s.name.toLowerCase()));
    for (const s of RULES["2014"].spells) expect(names.has(s.name.toLowerCase()), s.name).toBe(true);
    for (const s of all.filter((x) => x.book)) expect(s.dnd_class, s.name).not.toBe("");
  });
});
