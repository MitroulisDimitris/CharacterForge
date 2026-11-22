import { describe, expect, it } from "vitest";
import { getSystem } from "../registry";
import { parseUses } from "./resources";

const sys = getSystem("dnd2014")!;
const pools = (raw: Record<string, unknown>) => {
  const c = sys.normalize(raw);
  return sys.resources!(c, sys.derive(c, ["PHB14", "XGE", "TCE"])).map((p) => `${p.label} ${p.max}/${p.refresh}`);
};
const mods = { STR: 3, DEX: 1, CON: 2, INT: 0, WIS: 2, CHA: -1 };

describe("limited-use features as trackers", () => {
  it("reads the uses text", () => {
    expect(parseUses("1 / Short Rest", 2, mods)).toEqual({ max: 1, refresh: "short", die: undefined });
    expect(parseUses("PB / Long Rest", 3, mods)?.max).toBe(3);
    expect(parseUses("1 + CHA mod / Long Rest", 2, { ...mods, CHA: 3 })?.max).toBe(4);
    expect(parseUses("CHA mod / Long Rest (min 1)", 2, mods)?.max).toBe(1);
    expect(parseUses("2 × PB d6 / Long Rest", 2, mods)).toEqual({ max: 4, refresh: "long", die: "d6" });
    expect(parseUses("4 d8 / Short Rest", 2, mods)).toEqual({ max: 4, refresh: "short", die: "d8" });
    expect(parseUses("1 / day", 2, mods)?.refresh).toBe("long");
    expect(parseUses("whenever you like", 2, mods)).toBeNull();
  });

  it("class features, by level", () => {
    expect(pools({ cls: "cleric", level: 2, subclass: "life" })).toContain("Channel Divinity 1/short");
    expect(pools({ cls: "cleric", level: 1, subclass: "life" }).join()).not.toMatch(/Channel Divinity/);
    expect(pools({ cls: "barbarian", level: 2 })).toContain("Rage 2/long");
    expect(pools({ cls: "barbarian", level: 3, subclass: "berserker" })).toContain("Rage 3/long");
    expect(pools({ cls: "monk", level: 4, subclass: "openHand" })).toContain("Ki points 4/short");
    expect(pools({ cls: "fighter", level: 3, subclass: "battleMaster" })).toEqual(["Action Surge 1/short", "Second Wind 1/short", "Superiority dice (d8) 4/short"]);
    expect(pools({ cls: "druid", level: 2 })).toContain("Wild Shape 2/short");
    expect(pools({ cls: "wizard", level: 2, subclass: "evocation" })).toContain("Arcane Recovery 1/long");
    const paladin = pools({ cls: "paladin", level: 3, subclass: "devotion", base: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 14 } });
    expect(paladin).toEqual(expect.arrayContaining(["Channel Divinity 1/short", "Lay on Hands (HP) 15/long"]));
    expect(paladin.find((p) => p.startsWith("Divine Sense"))).toMatch(/^Divine Sense \d+\/long$/);
  });

  it("Bardic Inspiration comes back on a short rest from level 5", () => {
    expect(pools({ cls: "bard", level: 4, subclass: "lore" }).find((p) => p.startsWith("Bardic"))).toMatch(/\/long$/);
    expect(pools({ cls: "bard", level: 5, subclass: "lore" }).find((p) => p.startsWith("Bardic"))).toMatch(/\/short$/);
  });

  it("race traits, racial spells and the Lucky feat", () => {
    expect(pools({ cls: "fighter", level: 1, species: "dragonborn14" })).toContain("Breath Weapon 1/short");
    expect(pools({ cls: "barbarian", level: 1, species: "halfOrc14" })).toContain("Relentless Endurance 1/long");
    expect(pools({ cls: "sorcerer", level: 3, subclass: "draconic", species: "tiefling14" })).toContain("Hellish Rebuke (Infernal Legacy) 1/long");
    expect(pools({ cls: "fighter", level: 1, species: "humanVariant14", humanFeat: "lucky" })).toContain("Luck points 3/long");
    // The halfling's Lucky trait has no limit: no tracker.
    expect(pools({ cls: "rogue", level: 1, species: "halfling14", lineage: "lightfoot" }).join()).not.toMatch(/Luck/);
  });
});
