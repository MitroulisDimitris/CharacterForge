// Golden tests for the D&D 2024 engine. Values were checked by hand against the rules.
import { describe, expect, it } from "vitest";
import { blankCharacter, defaultCharacter, parry2014, type Character } from "./character";
import { deriveCharacter } from "./derive";

const parry = (patch: Partial<Character> = {}) => ({ ...defaultCharacter(), ...patch });
const scores = (d: ReturnType<typeof deriveCharacter>) => Object.values(d.scores).join(",");

describe("D&D 2024 Sorcerer — Parry Hotter", () => {
  it("level 5 matches the corrected sheet", () => {
    const d = deriveCharacter(parry());
    expect(d.hpMax).toBe(32);
    expect(d.ac).toBe(17);
    expect(d.initiative).toBe(2);
    expect(d.spellDc).toBe(16);
    expect(d.spellAttack).toBe(8);
    expect(d.slots).toEqual([4, 3, 2]);
    expect(d.sorceryPoints).toBe(5);
    expect(d.cantripLimit).toBe(5);
    expect(d.preparedLimit).toBe(9);
    expect(scores(d)).toBe("13,14,13,14,12,20");
    expect(d.saves.filter((s) => s.proficient).map((s) => s.ability)).toEqual(["CON", "CHA"]);
    expect(d.skills.filter((s) => s.proficient).map((s) => s.id).sort()).toEqual(
      ["deception", "insight", "perception", "persuasion", "sleightOfHand", "stealth"],
    );
    expect(d.passivePerception).toBe(14);
    // Only the Chromatic Orb diamond warning (Xanathar's is allowed by default).
    expect(d.warnings.map((w) => w.level)).toEqual(["warn"]);
  });

  it("level 3", () => {
    const d = deriveCharacter(parry({ level: 3 }));
    expect(d.hpMax).toBe(20);
    expect(d.ac).toBe(16);
    expect(d.spellDc).toBe(14);
    expect(d.slots).toEqual([4, 2]);
    expect(scores(d)).toBe("13,14,13,14,12,18");
  });

  it("level 1", () => {
    const d = deriveCharacter(parry({ level: 1 }));
    expect(d.hpMax).toBe(7);
    expect(d.ac).toBe(12);
    expect(d.slots).toEqual([2]);
    expect(d.warnings.some((w) => w.text.startsWith("Prepared spells: 9 of 2"))).toBe(true);
    expect(d.identity).toBe("Half-Elf · Sorcerer 1");
  });
});

describe("D&D 2024 Sorcerer — other builds", () => {
  it("Dwarf Sage with Tough and Magic Initiate", () => {
    const c = parry({
      species: "dwarf",
      lineage: "",
      speciesSkills: [],
      background: "sage",
      bgAsiMode: "2-1",
      bgPlus2: "CON",
      bgPlus1: "INT",
      level4Feat: "tough",
      languages: ["Common", "Dwarvish", "Draconic"],
      abilityMethod: "standard",
      base: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 15 },
    });
    c.bgFeatChoices = { ...c.bgFeatChoices, miCantrips: ["Light", "Mending"], miSpell: "Mage Armor", miAbility: "CHA" };
    const d = deriveCharacter(c);
    expect(d.hpMax).toBe(57);
    expect(d.ac).toBe(13);
    expect(scores(d)).toBe("8,13,16,11,12,15");
    expect(d.warnings.some((w) => w.text.includes("Magic Initiate"))).toBe(false);
  });

  it("Human Criminal (2024) with Alert, Skilled and Resilient", () => {
    const c = parry({
      species: "human",
      speciesSkills: ["arcana"],
      humanFeat: "skilled",
      background: "criminal",
      bgAsiMode: "1-1-1",
      level: 4,
      level4Feat: "resilient",
      level4PlusOne: "CON",
      subclass: "wild",
    });
    c.humanFeatChoices = { ...c.humanFeatChoices, skills: ["history", "nature", "medicine"] };
    const d = deriveCharacter(c);
    expect(d.hpMax).toBe(26);
    expect(d.ac).toBe(12);
    expect(d.initiative).toBe(4);
    expect(scores(d)).toBe("12,15,14,15,12,16");
    expect(d.skills.filter((s) => s.proficient).length).toBe(8);
    expect(d.warnings.some((w) => w.text.startsWith("Resilient (CON)"))).toBe(true);
  });

  it("Wood Elf speed and duplicate-skill warning", () => {
    const d = deriveCharacter(parry({ species: "elf", lineage: "wood", speciesSkills: ["perception"], background: "wayfarer", bgPlus2: "CHA", bgPlus1: "DEX" }));
    expect(d.speed).toBe(35);
    expect(d.warnings.some((w) => w.text.startsWith("Insight is granted twice"))).toBe(true);
  });
});

describe("Book filtering", () => {
  it("2024 Parry with only the 2024 PHB flags legacy and Xanathar's options", () => {
    const d = deriveCharacter(parry(), ["PHB24"]);
    const errors = d.warnings.filter((w) => w.level === "error").map((w) => w.text);
    expect(errors.some((t) => t.startsWith("Half-Elf (2014 legacy) is from the Player's Handbook (2014)"))).toBe(true);
    expect(errors.some((t) => t.startsWith("Criminal / Spy (2014 legacy) is from"))).toBe(true);
    expect(errors.some((t) => t.startsWith("Melf's Minute Meteors needs Xanathar's"))).toBe(true);
  });

  it("2014 Tasha's expanded spells need Tasha's", () => {
    const c = { ...parry2014(), prepared: ["Shield", "Magic Missile", "Misty Step", "Hold Person", "Fireball", "Vampiric Touch"] };
    expect(deriveCharacter(c, ["PHB14", "TCE"]).warnings.filter((w) => w.level === "error")).toEqual([]);
    expect(deriveCharacter(c, ["PHB14"]).warnings.some((w) => w.text.startsWith("Vampiric Touch needs Tasha's"))).toBe(true);
  });
});

describe("D&D 2014 Sorcerer", () => {
  it("Parry level 5 (Draconic Bloodline, green)", () => {
    const d = deriveCharacter(parry2014(), ["PHB14"]);
    expect(d.hpMax).toBe(32);
    expect(d.ac).toBe(15);
    expect(d.spellDc).toBe(16);
    expect(d.spellAttack).toBe(8);
    expect(d.slots).toEqual([4, 3, 2]);
    expect(d.preparedLimit).toBe(6);
    expect(d.spellsKind).toBe("Known");
    expect(d.languageLimit).toBe(4);
    expect(scores(d)).toBe("13,14,13,14,12,20");
    expect(d.warnings).toEqual([]);
  });

  it("Parry levels 1 and 3", () => {
    const d1 = deriveCharacter({ ...parry2014(), level: 1 }, ["PHB14"]);
    expect(d1.hpMax).toBe(8);
    expect(d1.ac).toBe(15);
    expect(d1.metamagicLimit).toBe(0);
    const d3 = deriveCharacter({ ...parry2014(), level: 3, prepared: ["Shield", "Magic Missile", "Misty Step", "Hold Person"] }, ["PHB14"]);
    expect(d3.hpMax).toBe(20);
    expect(d3.spellDc).toBe(14);
    expect(d3.metamagicLimit).toBe(2);
  });

  it("Variant Human with Alert and Fey Touched", () => {
    const c: Character = {
      ...blankCharacter("2014"),
      level: 4,
      species: "humanVariant14",
      legacyAsi: ["CON", "CHA"],
      speciesSkills: ["arcana"],
      humanFeat: "alert",
      level4Feat: "feyTouched",
      level4PlusOne: "CHA",
      subclass: "wild",
    };
    c.level4Choices = { ...c.level4Choices, miSpell: "Charm Person" };
    const d = deriveCharacter(c, ["PHB14", "TCE"]);
    expect(scores(d)).toBe("8,13,15,10,12,17");
    expect(d.initiative).toBe(1 + 5);
    expect(d.spellRows.some((r) => r.name === "Misty Step" && r.source === "Fey Touched")).toBe(true);
    expect(deriveCharacter(c, ["PHB14"]).warnings.some((w) => w.text.startsWith("The Fey Touched feat is from Tasha's"))).toBe(true);
  });

  it("Tasha's custom origin moves Half-Elf bonuses", () => {
    const c = { ...parry2014(), customOrigin: true, customAsi: ["CON", "CHA", "DEX"] as Character["customAsi"] };
    const d = deriveCharacter(c, ["PHB14", "TCE"]);
    // CON +2, CHA +1 (+2 ASI), DEX +1 on base 12/14/12/14/12/16
    expect(scores(d)).toBe("12,15,14,14,12,19");
    // Without Tasha's the option is ignored.
    expect(scores(deriveCharacter(c, ["PHB14"]))).toBe("13,14,13,14,12,20");
  });

  it("Divine Soul grants its affinity spell; Shadow Magic darkvision", () => {
    const ds = deriveCharacter({ ...parry2014(), subclass: "divineSoul", subclassOption: "good" }, ["PHB14", "XGE"]);
    expect(ds.spellRows.some((r) => r.name === "Cure Wounds" && r.kind === "Always")).toBe(true);
    const sh = deriveCharacter({ ...parry2014(), subclass: "shadow" }, ["PHB14", "XGE"]);
    expect(sh.darkvision).toBe(120);
    expect(sh.ac).toBe(12);
    expect(sh.spellRows.some((r) => r.name === "Darkness" && r.source === "Eyes of the Dark (known)")).toBe(true);
  });
});
