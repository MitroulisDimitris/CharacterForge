import { describe, expect, it } from "vitest";
import { FX_TYPES, fxTypeOf } from "./components/DamageFx";
import { storyKey } from "./dice/fxEngine";
import { FX_SHADERS } from "./dice/fxShaders";
import { STORIES } from "./dice/fxStories";
import { spellTextRolls, viaOfText } from "./dice/rollText";
import { tableRollOf } from "./rolls";
import { spellDiceBits, spellVia } from "./systems/dnd5e/rollSpecs";
import type { RollResult } from "./dice/roll";

describe("which animation a roll gets", () => {
  it("reads the damage type from the unit", () => {
    expect(fxTypeOf("fire")).toBe("fire");
    expect(fxTypeOf("Piercing")).toBe("piercing");
    expect(fxTypeOf("lightning or thunder")).toBe("lightning");
  });
  it("healing and temporary hit points glow green", () => {
    expect(fxTypeOf("hit points back")).toBe("healing");
    expect(fxTypeOf("temporary hit points")).toBe("healing");
  });
  it("no animation without a type", () => {
    expect(fxTypeOf("extra damage")).toBeNull();
    expect(fxTypeOf("damage")).toBeNull();
    expect(fxTypeOf("")).toBeNull();
  });
  it("every type has a shader and a story", () => {
    for (const t of [...FX_TYPES, "healing"]) {
      expect(FX_SHADERS[t], t).toBeTruthy();
      expect(STORIES[t], t).toBeTypeOf("function");
    }
  });
  it("fire and piercing open differently by how the damage was dealt; others keep their story", () => {
    expect(storyKey("fire", "melee")).toBe("fire:melee");
    expect(storyKey("piercing", "area")).toBe("piercing:area");
    expect(storyKey("fire", "ranged")).toBe("fire");
    expect(storyKey("fire", null)).toBe("fire");
    expect(storyKey("cold", "melee")).toBe("cold");
  });
  it("shaders avoid what breaks on some GPUs", () => {
    for (const [t, src] of Object.entries(FX_SHADERS)) {
      // smoothstep with reversed edges is undefined in GLSL: the shaders use sstep instead
      expect(/\bsmoothstep\(/.test(src), t).toBe(false);
    }
  });
});

describe("how damage was dealt", () => {
  it("reads stat block and spell text", () => {
    expect(viaOfText("Melee Weapon Attack: +5 to hit, reach 5 ft.")).toBe("melee");
    expect(viaOfText("Ranged Weapon Attack: +4 to hit, range 80/320 ft.")).toBe("ranged");
    expect(viaOfText("Melee or Ranged Weapon Attack: +4 to hit")).toBe("melee");
    expect(viaOfText("Make a ranged spell attack against the target.")).toBe("ranged");
    expect(viaOfText("Each creature in the area must make a Dexterity saving throw.")).toBe("area");
    expect(viaOfText("You regain hit points.")).toBeUndefined();
  });
  it("spell text rolls carry it on their damage", () => {
    const bolt = spellTextRolls("You hurl a mote of fire. Make a ranged spell attack. On a hit, the target takes 1d10 fire damage.", "Fire Bolt");
    expect(bolt.find((b) => b.spec)?.spec?.via).toBe("ranged");
    const ball = spellTextRolls("Each creature must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.", "Fireball");
    expect(ball.find((b) => b.spec)?.spec?.via).toBe("area");
  });
  it("character spells: their attack, else area; healing has none", () => {
    expect(spellVia({ attack: "melee" })).toBe("melee");
    expect(spellVia({ save: "DEX" })).toBe("area");
    const [dmg] = spellDiceBits("1d10 Fire", { label: "Fire Bolt", mod: 3, via: "ranged" });
    expect(dmg.spec?.via).toBe("ranged");
    const heal = spellDiceBits("1d8 + mod healing", { label: "Cure Wounds", mod: 3, via: "melee" }).find((b) => b.spec);
    expect(heal?.spec?.via).toBeUndefined();
  });
  it("goes to the DM with the roll", () => {
    const res: RollResult = { total: 7, unit: "fire", note: "", gold: false, lines: [], sub: "", dropped: [] };
    expect(tableRollOf({ label: "Flame Tongue · fire", kind: "damage", groups: [{ n: 2, sides: 6 }], unit: "fire", via: "melee", tone: "player" }, res).via).toBe("melee");
    expect(tableRollOf({ label: "Bless", kind: "free", groups: [{ n: 1, sides: 4 }], tone: "player" }, res).via).toBeNull();
  });
});
