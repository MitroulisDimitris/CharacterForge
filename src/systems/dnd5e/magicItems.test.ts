// Equipped / attuned magic items change the numbers (REQUIREMENTS 4.5a).
import { describe, expect, it } from "vitest";
import { parry2014, type Character, type InventoryItem } from "./character";
import { deriveCharacter } from "./derive";
import { readItem } from "./magicItems";
import { attackRolls, savingThrow } from "./rollSpecs";

const inv = (...items: Partial<InventoryItem>[]): InventoryItem[] => items.map((x, i) => ({ id: `t${i}`, name: "", qty: 1, weight: 1, ...x }));
const withItems = (...items: Partial<InventoryItem>[]): Character => ({ ...parry2014(), inventory: inv(...items) });
const d0 = deriveCharacter(withItems(), ["PHB14"]);

describe("reading item names", () => {
  it("finds the weapon or armour and the bonus", () => {
    expect(readItem("Longsword +1")).toMatchObject({ base: "Longsword", effect: { weapon: 1 } });
    expect(readItem("+2 Dagger")).toMatchObject({ base: "Dagger", effect: { weapon: 2 } });
    expect(readItem("Chain Mail, +1")).toMatchObject({ base: "Chain Mail", effect: { armor: 1 } });
    expect(readItem("Shield, +2")).toMatchObject({ base: "Shield", effect: { armor: 2 } });
    expect(readItem("Flame Tongue (Longsword)")).toMatchObject({ base: "Longsword", effect: { attune: true } });
    expect(readItem("Cloak of Protection").effect).toMatchObject({ attune: true, ac: 1, saves: 1 });
    expect(readItem("Rod of the Pact Keeper, +2").effect).toMatchObject({ spellAttack: 2, spellDc: 2 });
    expect(readItem("Rope, hempen (50 feet)").effect).toBeNull();
  });
});

describe("equipped magic items", () => {
  it("a Cloak of Protection counts only when attuned and worn", () => {
    expect(deriveCharacter(withItems({ name: "Cloak of Protection" }), ["PHB14"]).ac).toBe(d0.ac);
    const d = deriveCharacter(withItems({ name: "Cloak of Protection", attuned: true }), ["PHB14"]);
    expect(d.ac).toBe(d0.ac + 1);
    expect(d.saves.map((s) => s.bonus)).toEqual(d0.saves.map((s) => s.bonus + 1));
    expect(d.acNote).toMatch(/\+ 1 Cloak of Protection/);
    expect(deriveCharacter(withItems({ name: "Cloak of Protection", attuned: true, equipped: false }), ["PHB14"]).ac).toBe(d0.ac);
    // The dice result window names it.
    const save = savingThrow(d, d.saves[0]);
    expect(save.parts?.some((p) => p.label === "Cloak of Protection" && p.value === 1)).toBe(true);
  });
  it("Gauntlets of Ogre Power set Strength to 19", () => {
    const d = deriveCharacter(withItems({ name: "Gauntlets of Ogre Power", attuned: true }), ["PHB14"]);
    expect(d.scores.STR).toBe(19);
    expect(d.mods.STR).toBe(4);
    expect(d.scoreFrom.STR).toBe("Gauntlets of Ogre Power");
  });
  it("a Stone of Good Luck adds to checks, initiative and saves", () => {
    const d = deriveCharacter(withItems({ name: "Stone of Good Luck", attuned: true }), ["PHB14"]);
    expect(d.initiative).toBe(d0.initiative + 1);
    expect(d.skills[0].bonus).toBe(d0.skills[0].bonus + 1);
  });
  it("a +1 weapon adds to attack and damage, and names itself", () => {
    const d = deriveCharacter(withItems({ name: "Dagger +1" }), ["PHB14"]);
    const plain = deriveCharacter(withItems({ name: "Dagger" }), ["PHB14"]);
    const a = d.attacks.find((x) => x.name === "Dagger +1")!;
    const p = plain.attacks.find((x) => x.name === "Dagger")!;
    expect(Number(a.bonus.replace("−", "-"))).toBe(Number(p.bonus.replace("−", "-")) + 1);
    expect(a.parts?.at(-1)).toEqual({ label: "Dagger +1", value: 1 });
    expect(attackRolls(d, a).damage?.parts?.some((x) => x.label === "Dagger +1")).toBe(true);
  });
  it("magic armour and the Worn box", () => {
    const leather = deriveCharacter(withItems({ name: "Leather" }), ["PHB14"]);
    const magic = deriveCharacter(withItems({ name: "Leather +1" }), ["PHB14"]);
    // Sorcerers aren't proficient with armour, so neither counts; the shape still reads.
    expect(magic.ac).toBe(leather.ac);
    expect(deriveCharacter(withItems({ name: "Bracers of Defense", attuned: true }), ["PHB14"]).ac).toBe(d0.ac + 2);
  });
  it("Flame Tongue's fire is an extra chip, not added to the damage", () => {
    const d = deriveCharacter(withItems({ name: "Flame Tongue (Dagger)", attuned: true }), ["PHB14"]);
    const a = d.attacks.find((x) => x.name === "Flame Tongue (Dagger)")!;
    expect(a.extra).toEqual([{ dice: "2d6", type: "fire", when: "while the flames are lit" }]);
    expect(attackRolls(d, a).extras?.[0].text).toBe("+ 2d6 fire while the flames are lit");
    expect(deriveCharacter(withItems({ name: "Flame Tongue", attuned: true }), ["PHB14"]).warnings.some((w) => w.text.includes("say which weapon"))).toBe(true);
  });
  it("more than 3 attuned items is a warning", () => {
    const d = deriveCharacter(withItems(...["Cloak of Protection", "Ring of Protection", "Stone of Good Luck", "Amulet of Health"].map((name) => ({ name, attuned: true }))), ["PHB14"]);
    expect(d.attunedCount).toBe(4);
    expect(d.warnings.some((w) => w.text.startsWith("Attuned to 4 items"))).toBe(true);
  });
  it("a Rod of the Pact Keeper raises spell attack and DC", () => {
    const d = deriveCharacter(withItems({ name: "Rod of the Pact Keeper, +1", attuned: true }), ["PHB14"]);
    expect(d.spellAttack).toBe(d0.spellAttack + 1);
    expect(d.spellDc).toBe(d0.spellDc + 1);
  });
});

import { classRolls } from "./rollSpecs";
import { BOOK_ITEMS } from "../../bookItems";

describe("class dice", () => {
  it("every character can roll a hit die; class features add their own", () => {
    const d = deriveCharacter(withItems(), ["PHB14"]);
    const rolls = classRolls(d);
    expect(rolls[0].name).toBe("Hit Die");
    expect(rolls[0].spec.groups).toEqual([{ n: 1, sides: d.cls.hitDie }]);
    const fighter = deriveCharacter({ ...parry2014(), cls: "fighter", level: 3, inventory: [] }, ["PHB14"]);
    expect(classRolls(fighter).find((r) => r.name === "Second Wind")?.text).toBe("1d10 + 3");
    const rogue = deriveCharacter({ ...parry2014(), cls: "rogue", level: 5, inventory: [] }, ["PHB14"]);
    expect(classRolls(rogue).find((r) => r.name === "Sneak Attack")?.text).toBe("3d6");
  });
});

describe("Xanathar's and Tasha's items", () => {
  it("are all there, named once, with +1/+2/+3 versions", () => {
    const names = BOOK_ITEMS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    expect(BOOK_ITEMS.filter((i) => i.source === "XGE").length).toBeGreaterThanOrEqual(48);
    expect(names).toContain("Arcane Grimoire, +2");
    expect(BOOK_ITEMS.find((i) => i.name === "Moon Sickle, +3")?.rarity).toBe("very rare");
  });
  it("their magic changes the numbers", () => {
    const d = deriveCharacter(withItems({ name: "Barrier Tattoo (very rare)", attuned: true }), ["PHB14"]);
    expect(d.ac).toBeGreaterThanOrEqual(18);
    const g = deriveCharacter(withItems({ name: "Bloodwell Vial, +2", attuned: true }), ["PHB14"]);
    expect(g.spellAttack).toBe(d0.spellAttack + 2);
    expect(readItem("Moon Sickle, +1")).toMatchObject({ base: "Sickle", effect: { weapon: 1 } });
  });
});

describe("Dungeon Master's Guide items outside the SRD", () => {
  it("are in, without clashing with SRD names", async () => {
    const { readFileSync } = await import("node:fs");
    const srd = (JSON.parse(readFileSync("public/srd-items.json", "utf8")) as { name: string }[]).map((i) => i.name.toLowerCase());
    const dmg = BOOK_ITEMS.filter((i) => i.source === "DMG");
    expect(dmg.length).toBeGreaterThanOrEqual(48);
    expect(dmg.filter((i) => srd.includes(i.name.toLowerCase()))).toEqual([]);
    expect(readItem("Efreeti Chain")).toMatchObject({ base: "Chain Mail", effect: { armor: 3 } });
    expect(readItem("Shield, +2")).toMatchObject({ base: "Shield", effect: { armor: 2 } });
  });
});
