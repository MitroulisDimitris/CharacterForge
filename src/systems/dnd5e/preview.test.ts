import { describe, expect, it } from "vitest";
import { freshCharacter2014, type Character } from "./character";
import { deriveCharacter } from "./derive";
import { deriveWith, diffDerived } from "./preview";
import { startingEquipment } from "./startingKit";

const ALL = ["PHB14", "XGE", "TCE"];
const sorc = (): Character => ({ ...freshCharacter2014(), cls: "sorcerer", base: { STR: 8, DEX: 13, CON: 14, INT: 12, WIS: 10, CHA: 15 } });
const labels = (c: Character, patch: Partial<Character>) => diffDerived(deriveCharacter(c, ALL), deriveWith(c, patch, ALL)).map((l) => `${l.label}${l.from ? ` ${l.from}` : ""}${l.to ? ` → ${l.to}` : ""}`);

describe("what-changes previews", () => {
  it("race: Tiefling raises CHA and INT, the spell DC, and adds darkvision and fire resistance", () => {
    const out = labels(sorc(), { species: "tiefling14" });
    expect(out).toContain("Charisma 15 → 17");
    expect(out).toContain("Intelligence 12 → 13");
    expect(out).toContain("Spell save DC 12 → 13");
    expect(out).toContain("Darkvision none → 60 ft");
    expect(out).toContain("Resistance: Fire");
  });

  it("race: Hill Dwarf is slower but tougher", () => {
    const out = labels(sorc(), { species: "dwarf14", lineage: "hill" });
    expect(out).toContain("Speed 30 ft → 25 ft");
    expect(out).toContain("Hit points 8 → 10"); // CON 14→16 (+1 mod) and +1 HP per level
  });

  it("background: Sage gives Arcana and History", () => {
    const out = labels(sorc(), { background: "sage14" });
    expect(out).toContain("New skill: Arcana");
    expect(out).toContain("New skill: History");
  });

  it("equipment: chain mail vs leather armor and a longbow (Fighter kit)", () => {
    const f: Character = { ...freshCharacter2014(), cls: "fighter", base: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 12, CHA: 10 }, species: "human14", background: "soldier14" };
    const d0 = deriveCharacter(f, ALL);
    const kit = (option: number) => {
      const cc = { ...f, equipPicks: { ...f.equipPicks, armor: { option, picks: [] } } };
      return { ...cc, inventory: startingEquipment({ ...cc, equipMode: "kit" }, d0.cls, d0.bg).inventory };
    };
    const choice = d0.cls.equipment.choices[0].id;
    expect(choice).toBe("armor");
    const out = diffDerived(deriveCharacter(kit(0), ALL), deriveCharacter(kit(1), ALL)).map((l) => `${l.label}${l.from ? ` ${l.from}` : ""}${l.to ? ` → ${l.to}` : ""}`);
    expect(out).toContain("Armor Class 18 → 15"); // chain mail 16 + shield 2 vs leather 11 + DEX 2 (13+1 human) + shield 2
    expect(out.some((l) => l.startsWith("New attack: Longbow"))).toBe(true);
  });

  it("no change, no lines", () => {
    const c = sorc();
    expect(diffDerived(deriveCharacter(c, ALL), deriveCharacter(c, ALL))).toEqual([]);
  });
});
