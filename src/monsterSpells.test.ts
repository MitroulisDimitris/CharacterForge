import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBuild, blockMap, cantripDice, checkBuild, cleanSpell, editableBlock, monsterSpells, spellIndex, strengthText, type SpellFacts } from "./monsterSpells";
import type { Monster } from "./lookup";

const monsters = JSON.parse(readFileSync("public/srd-monsters.json", "utf8")) as Monster[];
const spells = JSON.parse(readFileSync("public/srd-spells.json", "utf8")) as SpellFacts[];
const mon = (slug: string) => monsters.find((m) => m.slug === slug)!;
const index = spellIndex(spells);

describe("reading spell lists from stat blocks", () => {
  it("the lich: a wizard with slots", () => {
    const [b] = monsterSpells(mon("lich"));
    expect(b.kind).toBe("slots");
    expect(b.className).toBe("wizard");
    expect(b.casterLevel).toBe(18);
    expect(b.dc).toBe(20);
    expect(b.hit).toBe(12);
    expect(b.rows.map((r) => [r.key, r.slots, r.spells.length])).toEqual([
      ["0", 0, 3], ["1", 4, 4], ["2", 3, 4], ["3", 3, 4], ["4", 3, 2], ["5", 3, 2], ["6", 1, 2], ["7", 1, 2], ["8", 1, 2], ["9", 1, 1],
    ]);
    expect(b.rows[3].spells).toContain("fireball");
    expect(editableBlock([b])).toBe(b);
  });

  it("the archmage: missing spaces, stars and the note after the list", () => {
    const [b] = monsterSpells(mon("archmage"));
    expect(b.rows.find((r) => r.key === "3")!.spells).toEqual(["counterspell", "fly", "lightning bolt"]);
    expect(cleanSpell("mage armor*")).toEqual({ name: "mage armor", note: "", star: true });
    expect(b.after).toMatch(/casts these spells on itself before combat/);
  });

  it("the cult fanatic's cantrip line has no star", () => {
    const [b] = monsterSpells(mon("cult-fanatic"));
    expect(b.className).toBe("cleric");
    expect(b.rows[0]).toMatchObject({ key: "0", spells: ["light", "sacred flame", "thaumaturgy"] });
  });

  it("innate spells: at will and per day, notes kept", () => {
    const [b] = monsterSpells(mon("drow"));
    expect(b.kind).toBe("innate");
    expect(b.dc).toBe(11);
    expect(b.rows.map((r) => [r.label, r.perDay, r.spells])).toEqual([
      ["At will", 0, ["dancing lights"]],
      ["1/day each", 1, ["darkness", "faerie fire"]],
    ]);
    const djinni = monsterSpells(mon("djinni"))[0];
    expect(djinni.rows[1].spells[0]).toBe("create food and water (can create wine instead of water)");
    expect(cleanSpell(djinni.rows[1].spells[0]).name).toBe("create food and water");
    expect(editableBlock([b])).toBeNull();
  });

  it("one spell a day (mephits) and the coven's shared slots", () => {
    const [b] = monsterSpells(mon("ice-mephit"));
    expect(b.rows).toEqual([{ key: "1/day", label: "1/day", level: null, slots: 0, perDay: 1, spells: ["fog cloud"] }]);
    const hag = monsterSpells(mon("green-hag"));
    const coven = hag.find((x) => /shared/i.test(x.trait))!;
    expect(coven.kind).toBe("slots");
    expect(coven.className).toBe("wizard");
    expect(editableBlock(hag)).toBeNull();
  });

  it("every SRD monster with a spell trait gets rows", () => {
    for (const m of monsters) for (const b of monsterSpells(m)) expect(b.rows.length, m.slug).toBeGreaterThan(0);
    expect(monsters.filter((m) => monsterSpells(m).length).length).toBeGreaterThan(30);
  });
});

describe("builds against the book", () => {
  const [lich] = monsterSpells(mon("lich"));
  const orig = blockMap(lich);
  const swap = (lvl: string, from: string, to: string) => ({ ...orig, [lvl]: orig[lvl].map((s) => (s === from ? to : s)) });

  it("same-level wizard swaps are by the book", () => {
    const storm = { ...swap("3", "fireball", "lightning bolt"), 2: orig[2].map((s) => (s === "acid arrow" ? "shatter" : s)) };
    expect(checkBuild(orig, storm, "wizard", index).kind).toBe("");
  });

  it("removing spells makes it weaker, adding makes it stronger", () => {
    const glass = { ...orig, 9: [], 6: ["globe of invulnerability"] };
    const c = checkBuild(orig, glass, "wizard", index);
    expect(c.kind).toBe("down");
    expect(c.removed).toEqual(["Disintegrate (6th)", "Power Word Kill (9th)"]);
    const more = { ...orig, 9: [...orig[9], "wish"] };
    expect(checkBuild(orig, more, "wizard", index)).toMatchObject({ kind: "up", added: ["Wish (9th)"] });
    expect(strengthText(checkBuild(orig, more, "wizard", index))).toMatch(/^Stronger than the books allow\. Monster Manual, page 10: .* Added: Wish \(9th\)\.$/);
  });

  it("a cleric spell of the same level is outside the rule but not stronger", () => {
    const c = checkBuild(orig, swap("3", "fireball", "spirit guardians"), "wizard", index);
    expect(c).toEqual({ kind: "off", added: ["Spirit Guardians (3rd, cleric)"], removed: ["Fireball (3rd)"] });
  });

  it("a higher-level spell in a lower slot counts as stronger", () => {
    const moved = { ...orig, 3: orig[3].filter((s) => s !== "fireball"), 5: [...orig[5], "cone of cold"] };
    expect(checkBuild(orig, moved, "wizard", index).kind).toBe("up");
  });

  it("a build's spells go on the rows; new levels get no slots", () => {
    const mage = monsterSpells(mon("mage"))[0];
    const b = applyBuild(mage, { ...blockMap(mage), 9: ["wish"] });
    expect(b.rows.at(-1)).toMatchObject({ key: "9", slots: 0, spells: ["wish"] });
    expect(b.rows.find((r) => r.key === "1")!.slots).toBe(4);
  });

  it("cantrips grow with the caster's level", () => {
    expect(cantripDice("1d8 cold", 18)).toBe("4d8 cold");
    expect(cantripDice("1d10", 9)).toBe("2d10");
    expect(cantripDice("1d10", 4)).toBe("1d10");
  });
});
