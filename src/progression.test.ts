// Level-up unlocks and level-down clean-up for every system.
import { describe, expect, it } from "vitest";
import { getSystem } from "./systems/registry";
import { unlocksBetween, openUnlocks } from "./components/LevelChange";
import type { BaseCharacter } from "./systems/types";
import { parry2014 } from "./systems/dnd5e/character";

const sys = (id: string) => getSystem(id)!;
// D&D 2014 has no templates any more (guided creation); Parry is built directly.
const parry = (id: string) => (id === "dnd2014" ? parry2014() : sys(id).templates.find((t) => t.id === "parry")!.make()) as BaseCharacter;
const booksOf = (id: string) => [...new Set([...sys(id).books.filter((b) => b.core).map((b) => b.id), ...(sys(id).templates[0]?.books ?? ["PHB14"])])];
const ids = (id: string, c: BaseCharacter, from: number, to: number) => unlocksBetween(sys(id), c, booksOf(id), from, to).map((u) => u.id);

describe("D&D 2024 level-ups", () => {
  it("lists the right choices per level", () => {
    const c = parry("dnd2024");
    expect(ids("dnd2024", c, 1, 2)).toEqual(["2:spells", "2:metamagic", "2:swap"]);
    expect(ids("dnd2024", c, 2, 3)).toEqual(["3:subclass", "3:spells", "3:swap"]);
    expect(ids("dnd2024", c, 3, 4)).toEqual(["4:cantrips", "4:spells", "4:asi", "4:swap"]);
    expect(ids("dnd2024", c, 4, 5)).toEqual(["5:spells", "5:swap"]);
  });

  it("knows Parry's level 5 choices are already made", () => {
    const c = parry("dnd2024");
    expect(openUnlocks(sys("dnd2024"), c, booksOf("dnd2024"), ["5:spells", "4:cantrips"])).toEqual([]);
    // A blank level 1 character promoted to 2 has open choices.
    const blank = { ...sys("dnd2024").templates[1].make(), level: 2 } as BaseCharacter;
    expect(openUnlocks(sys("dnd2024"), blank, ["PHB24"], ["2:spells", "2:metamagic"]).map((u) => u.id)).toEqual(["2:spells", "2:metamagic"]);
  });

  it("shows gains with plain-words tips", () => {
    const c = { ...parry("dnd2024"), level: 5 };
    const gains = sys("dnd2024").progression.gainsAt(c, sys("dnd2024").derive(c, booksOf("dnd2024")), 5);
    expect(gains.map((g) => g.name)).toContain("Sorcerous Restoration");
    expect(gains.map((g) => g.name)).toContain("3rd-level spell slots");
    expect(gains.find((g) => g.name === "Sorcerous Restoration")!.tip).toBeTruthy();
  });

  it("level down 5 → 3 removes what no longer fits", () => {
    const { c, removed } = sys("dnd2024").progression.demote(parry("dnd2024"), 3, booksOf("dnd2024")) as { c: { level: number; prepared: string[]; cantrips: string[] }; removed: string[] };
    expect(c.level).toBe(3);
    expect(c.prepared).toEqual(["Shield", "Magic Missile", "Invisibility", "Suggestion", "Misty Step", "Hold Person"]);
    expect(c.cantrips).toHaveLength(4);
    expect(removed.some((r) => r.startsWith("Fireball"))).toBe(true);
    expect(removed.some((r) => r.startsWith("Chill Touch"))).toBe(true);
  });
});

describe("D&D 2014 level-ups", () => {
  it("Metamagic arrives at 3, subclass already at 1", () => {
    const c = parry("dnd2014");
    expect(ids("dnd2014", c, 2, 3)).toEqual(["3:spells", "3:metamagic", "3:swap"]);
    expect(ids("dnd2014", c, 1, 2)).toEqual(["2:spells", "2:swap"]);
  });
});

describe("D&D 3.5 level-ups", () => {
  it("skill points every level, feat at 3, ability at 4", () => {
    const c = parry("dnd35");
    expect(ids("dnd35", c, 2, 3)).toEqual(["3:skills", "3:known1", "3:feat"]);
    expect(ids("dnd35", c, 3, 4)).toEqual(["4:skills", "4:known0", "4:known2", "4:ability"]);
  });

  it("level down 5 → 3 trims spells known", () => {
    const { c, removed } = sys("dnd35").progression.demote(parry("dnd35"), 3, ["PHB35"]) as { c: { spellsKnown: string[] }; removed: string[] };
    expect(c.spellsKnown).toEqual(["Acid Splash", "Ray of Frost", "Prestidigitation", "Mage Hand", "Ghost Sound", "Magic Missile", "Shield", "Charm Person"]);
    expect(removed).toHaveLength(4);
  });
});

describe("Pathfinder 2e level-ups", () => {
  it("feats, skill increases, boosts and repertoire", () => {
    const c = parry("pf2e");
    expect(ids("pf2e", c, 1, 2)).toEqual(["2:classFeat", "2:skillFeat", "2:rank1"]);
    expect(ids("pf2e", c, 2, 3)).toEqual(["3:generalFeat", "3:skillIncrease", "3:rank2", "3:signature"]);
    expect(ids("pf2e", c, 4, 5)).toEqual(["5:skillIncrease", "5:boosts", "5:ancestryFeat", "5:rank3"]);
  });

  it("level down 5 → 3 trims the repertoire and signature spells", () => {
    const { c, removed } = sys("pf2e").progression.demote(parry("pf2e"), 3, ["PC", "PC2"]) as { c: { spells: string[]; signature: string[] }; removed: string[] };
    expect(c.spells).toEqual(["Force Barrage", "Sleep", "Charm", "Invisibility", "Resist Energy"]);
    expect(c.signature).toEqual(["Force Barrage", "Invisibility"]);
    expect(removed).toEqual(["Dispel Magic (rank 2, over the repertoire limit)", "Fireball (rank 3)", "Paralyze (rank 3)"]);
  });
});
