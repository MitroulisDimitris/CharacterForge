// Golden tests for the 2014 classes at level 1 (values worked out by hand from the PHB/Tasha's rules).
import { describe, expect, it } from "vitest";
import { freshCharacter2014, newId, type Character } from "./character";
import { deriveCharacter } from "./derive";
import { RULES, classOf, onClassList } from "./rules";
import { classKit, expandKit, startingEquipment } from "./startingKit";

const ALL = ["PHB14", "XGE", "TCE"];
const item = (name: string, qty = 1) => ({ id: newId(), name, qty, weight: 0 });
/** Standard array laid out as the class suggests. */
const build = (patch: Partial<Character>): Character => {
  const c = { ...freshCharacter2014(), name: "Test", ...patch };
  const cls = classOf(RULES["2014"], c.cls);
  const arr = [15, 14, 13, 12, 10, 8];
  return { ...c, base: patch.base ?? (Object.fromEntries(cls.recommended.map((a, i) => [a, arr[i]])) as Character["base"]) };
};
const texts = (c: Character, books = ALL) => deriveCharacter(c, books).warnings.map((w) => w.text);

describe("2014 classes at level 1", () => {
  it("Fighter: Human, chain mail + shield, Defense", () => {
    const c = build({ cls: "fighter", species: "human14", background: "soldier14", fightingStyle: "defense", classSkills: ["perception", "survival"], inventory: [item("Chain Mail"), item("Shield"), item("Longsword")] });
    const d = deriveCharacter(c, ALL);
    expect(Object.values(d.scores).join(",")).toBe("16,14,15,9,13,11"); // STR DEX CON INT WIS CHA
    expect(d.hpMax).toBe(12); // d10 + CON 2
    expect(d.ac).toBe(19); // chain mail 16 + Defense 1 + shield 2
    expect(d.saves.filter((s) => s.proficient).map((s) => s.ability)).toEqual(["STR", "CON"]);
    expect(d.attacks.find((a) => a.name === "Longsword")).toMatchObject({ bonus: "+5", damage: "1d8+3 Slashing" });
    expect(d.caster).toBe(false);
  });

  it("Wizard: High Elf, spellbook of 6, prepares INT + level", () => {
    const c = build({ cls: "wizard", species: "elf14", lineage: "high", background: "sage14", speciesCantrip: "Light" });
    const d = deriveCharacter(c, ALL);
    expect(d.scores.INT).toBe(16);
    expect(d.scores.DEX).toBe(15);
    expect(d.hpMax).toBe(8); // d6 + CON 2
    expect(d.ac).toBe(12);
    expect(d.spellDc).toBe(13);
    expect(d.cantripLimit).toBe(3);
    expect(d.spellbookLimit).toBe(6);
    expect(d.preparedLimit).toBe(4); // INT 3 + level 1
    expect(d.slots).toEqual([2]);
    const w = texts({ ...c, spellbook: ["Shield"], prepared: ["Magic Missile"] });
    expect(w).toContain("Magic Missile is prepared but not in your spellbook.");
  });

  it("Cleric: Life domain gets heavy armor and always-prepared domain spells", () => {
    const c = build({ cls: "cleric", species: "dwarf14", lineage: "hill", subclass: "life", background: "acolyte14", inventory: [item("Chain Mail"), item("Shield"), item("Mace")] });
    const d = deriveCharacter(c, ALL);
    expect(d.scores.WIS).toBe(16); // 15 + hill dwarf 1
    expect(d.scores.CON).toBe(16); // 14 + dwarf 2
    expect(d.hpMax).toBe(12); // d8 + CON 3 + hill dwarf 1
    expect(d.ac).toBe(18); // chain mail 16 + shield 2 (heavy armor from Life)
    expect(d.preparedLimit).toBe(4); // WIS 3 + level 1
    expect(d.spellRows.filter((r) => r.kind === "Always").map((r) => r.name)).toEqual(["Bless", "Cure Wounds"]);
    // Without a domain the heavy armor isn't usable.
    // Without heavy armor proficiency (Trickery) the chain mail doesn't count: 10 + DEX 1 + shield 2.
    expect(deriveCharacter({ ...c, subclass: "trickery" }, ALL).ac).toBe(13);
  });

  it("Barbarian and Monk Unarmored Defense", () => {
    const barb = deriveCharacter(build({ cls: "barbarian", species: "halfOrc14", inventory: [item("Shield")] }), ALL);
    expect(barb.scores.STR).toBe(17);
    expect(barb.scores.CON).toBe(15);
    expect(barb.ac).toBe(10 + 1 + 2 + 2); // DEX 13 (+1), CON 15 (+2), shield
    expect(barb.hpMax).toBe(14);
    const monk = deriveCharacter(build({ cls: "monk", species: "elf14", lineage: "wood", inventory: [item("Shield")] }), ALL);
    expect(monk.scores.DEX).toBe(17);
    expect(monk.scores.WIS).toBe(15);
    expect(monk.ac).toBe(10 + 3 + 2); // no shield for Unarmored Defense; shield not proficient anyway
    expect(monk.speed).toBe(35);
  });

  it("Rogue Expertise doubles proficiency", () => {
    const c = build({ cls: "rogue", species: "halfling14", lineage: "lightfoot", background: "urchin14", classSkills: ["perception", "acrobatics", "insight", "investigation"], expertise: ["stealth", "thieves"] });
    const d = deriveCharacter(c, ALL);
    const stealth = d.skills.find((s) => s.id === "stealth")!;
    expect(stealth.expert).toBe(true);
    expect(stealth.bonus).toBe(d.mods.DEX + 4);
    expect(c.languages).toEqual(["Common"]);
    expect(texts(c)).not.toContain("Expertise: choose 2 more.");
  });

  it("Warlock: pact slot, patron spells on the list, Hexblade uses CHA for weapons", () => {
    const c = build({ cls: "warlock", species: "tiefling14", subclass: "hexblade", inventory: [item("Longsword")] });
    const d = deriveCharacter(c, ALL);
    expect(d.slots).toEqual([1]);
    expect(d.pact).toBe(true);
    expect(d.onList(RULES["2014"].getSpell("Shield")!)).toBe(true); // Hexblade expanded list
    expect(d.onList(RULES["2014"].getSpell("Magic Missile")!)).toBe(false);
    expect(d.attacks.find((a) => a.name === "Longsword")!.notes).toContain("Hex Warrior");
    expect(d.attacks.find((a) => a.name === "Longsword")!.bonus).toBe(`+${d.mods.CHA + 2}`);
  });

  it("Artificer needs Tasha's", () => {
    const c = build({ cls: "artificer", species: "gnome14", lineage: "rock" });
    expect(texts(c, ["PHB14"]).some((t) => t.startsWith("The Artificer class is from Tasha's"))).toBe(true);
    expect(deriveCharacter(c, ALL).preparedLimit).toBe(3); // INT 3 + half of 1 (0)
  });

  it("Class spell lists", () => {
    const sp = (n: string) => RULES["2014"].getSpell(n)!;
    expect(onClassList(sp("Eldritch Blast"), "warlock", ALL)).toBe(true);
    expect(onClassList(sp("Eldritch Blast"), "wizard", ALL)).toBe(false);
    expect(onClassList(sp("Color Spray"), "bard", ALL)).toBe(true);
    expect(onClassList(sp("Color Spray"), "bard", ["PHB14"])).toBe(false); // Tasha's expanded list
    expect(onClassList(sp("Healing Word"), "cleric", ["PHB14"])).toBe(true);
    expect(onClassList(sp("Toll the Dead"), "cleric", ["PHB14"])).toBe(false); // Xanathar's spell
    const w = texts(build({ cls: "wizard", species: "human14", cantrips: ["Eldritch Blast"] }));
    expect(w).toContain("Eldritch Blast isn't on the wizard spell list.");
  });

  it("Feat prerequisites and Custom Lineage", () => {
    const c = build({ cls: "wizard", species: "humanVariant14", legacyAsi: ["INT", "CON"], humanFeat: "grappler", base: { STR: 8, DEX: 14, CON: 14, INT: 15, WIS: 12, CHA: 10 } });
    expect(texts(c)).toContain("Grappler needs Strength 13 or higher.");
    const cl = deriveCharacter(build({ cls: "fighter", species: "customLineage", lineage: "darkvision", legacyAsi: ["STR"], humanFeat: "alert" }), ALL);
    expect(cl.scores.STR).toBe(17);
    expect(cl.darkvision).toBe(60);
    expect(cl.initiative).toBe(cl.mods.DEX + 5);
  });

  it("Ranger: Tasha's Deft Explorer replaces Natural Explorer", () => {
    const base = build({ cls: "ranger", species: "human14", classSkills: ["stealth", "survival", "perception"], favoredEnemy: "Beasts", favoredTerrain: "Forest" });
    const d1 = deriveCharacter(base, ALL);
    expect(d1.featureGroups[0].items.map((f) => f.name)).toEqual(["Favored Enemy", "Natural Explorer"]);
    expect(d1.languageLimit).toBe(3); // Common + human extra + favored enemy
    const d2 = deriveCharacter({ ...base, rangerTasha: true, deftExpertise: "stealth" }, ALL);
    expect(d2.featureGroups[0].items.map((f) => f.name)).toEqual(["Favored Foe", "Deft Explorer"]);
    expect(d2.languageLimit).toBe(4); // Common + human extra + two from Deft Explorer
    expect(d2.skills.find((s) => s.id === "stealth")!.expert).toBe(true);
  });

  it("Starting equipment: class choices + background, or gold", () => {
    const c = build({ cls: "fighter", background: "soldier14", equipPicks: { weapons: { option: 0, picks: ["Longsword"] } } });
    const cls = classOf(RULES["2014"], "fighter");
    const { items, missing } = classKit(c, cls);
    expect(missing).toEqual([]);
    expect(items.map((i) => i.name)).toEqual(["Chain Mail", "Shield", "Longsword", "Light Crossbow", "Crossbow Bolts", "Dungeoneer's Pack"]);
    expect(expandKit([{ name: "Explorer's Pack", qty: 1 }]).map((i) => i.name)).toContain("Bedroll");
    const d = deriveCharacter(c, ALL);
    const eq = startingEquipment(c, cls, d.bg);
    expect(eq.gp).toBe(10);
    expect(eq.inventory.some((i) => i.name === "Insignia of rank")).toBe(true);
    expect(startingEquipment({ ...c, equipMode: "gold", startGold: 0 }, cls, d.bg)).toEqual({ inventory: [], gp: 125 });
  });

  it("A fresh character asks for every choice", () => {
    const w = texts(freshCharacter2014());
    expect(w).toContain("Choose a class.");
    expect(w).toContain("Choose a race.");
    expect(w).toContain("Choose a background.");
  });
});
