import { describe, expect, it } from "vitest";
import { rate } from "./encounters";
import type { MonsterBrief } from "./lookup";
import { filterPool, suggestEncounter, type Target } from "./suggest";

const mon = (slug: string, cr: string, crNum: number, type = "Humanoid", env = ["Forest"]): MonsterBrief => ({
  slug,
  name: slug,
  size: "Medium",
  type,
  armor_class: 12,
  hit_points: 10,
  challenge_rating: cr,
  cr: crNum,
  environments: env,
});
const POOL = [
  mon("kobold", "1/8", 0.125, "Humanoid", ["Hill"]),
  mon("goblin", "1/4", 0.25),
  mon("wolf", "1/4", 0.25, "Beast"),
  mon("orc", "1/2", 0.5),
  mon("bugbear", "1", 1),
  mon("ogre", "2", 2, "Giant", ["Hill"]),
  mon("owlbear", "3", 3, "Monstrosity"),
  mon("troll", "5", 5, "Giant", ["Swamp"]),
  mon("young-dragon", "10", 10, "Dragon", ["Mountains"]),
];

// a fixed, repeatable "random" source
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

describe("suggest an encounter", () => {
  const party = [3, 3, 3, 3];
  for (const target of ["Easy", "Medium", "Hard", "Deadly"] as Target[])
    it(`lands exactly on ${target} for 4 level-3 characters`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const s = suggestEncounter(POOL, party, target, seeded(seed));
        expect(s).not.toBeNull();
        expect(rate(s!.monsters, party).difficulty).toBe(target);
        expect(s!.monsters.every((m) => m.slug !== "young-dragon")).toBe(true); // far above the party
      }
    });

  it("filters by creature type and place", () => {
    expect(filterPool(POOL, "Giant", []).map((m) => m.slug)).toEqual(["ogre", "troll"]);
    expect(filterPool(POOL, "", ["Hill", "Hills"]).map((m) => m.slug)).toEqual(["kobold", "ogre"]);
    expect(filterPool(POOL, "Beast", ["Swamp"])).toEqual([]);
  });

  it("says when nothing fits", () => {
    expect(suggestEncounter([], party, "Medium")).toBeNull();
    expect(suggestEncounter(POOL, [], "Medium")).toBeNull();
  });
});
