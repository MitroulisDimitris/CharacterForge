import { describe, expect, it } from "vitest";
import { assignRoll, assignedCount, baseFromRolls, roll4d6, rollTotal } from "./rolls";
import { dnd2014 } from "./index";
import { freshCharacter2014, type Character } from "./character";

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("rolled ability scores", () => {
  it("rolls 4d6 and drops the lowest", () => {
    const dice = roll4d6(seq(0.99, 0, 0.5, 0.2)); // 6, 1, 4, 2
    expect(dice).toEqual([6, 4, 2, 1]);
    expect(rollTotal(dice)).toBe(12);
    expect(rollTotal([3, 3, 3, 3])).toBe(9);
  });

  it("puts a roll on an ability, swapping when another ability had it", () => {
    let f = assignRoll({}, "STR", 0);
    f = assignRoll(f, "DEX", 1);
    expect(f).toEqual({ STR: 0, DEX: 1 });
    f = assignRoll(f, "DEX", 0); // STR had roll 0: it gets DEX's old roll
    expect(f).toEqual({ STR: 1, DEX: 0 });
    f = assignRoll(f, "CON", 1); // STR had roll 1, CON had none: STR is emptied
    expect(f).toEqual({ DEX: 0, CON: 1 });
    f = assignRoll(f, "CON", undefined);
    expect(f).toEqual({ DEX: 0 });
  });

  it("sets the base scores from the rolls; unused abilities stay at 10", () => {
    const rolls = [
      [6, 6, 5, 1],
      [4, 4, 4, 4],
    ];
    expect(baseFromRolls(rolls, { CHA: 0, STR: 1 })).toEqual({ STR: 12, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 17 });
    expect(assignedCount({ rolls, rollFor: { CHA: 0, STR: 1, DEX: 5 } })).toBe(2);
  });

  it("the To do says what's left: roll, then put the rolls on abilities", () => {
    const base = { ...freshCharacter2014(), cls: "fighter", species: "human14", background: "soldier14", abilityMethod: "rolled" } as Character;
    const text = (c: Character) => dnd2014.derive(c, ["PHB14"]).warnings.filter((w) => w.tab === "abilities").map((w) => w.text);
    expect(text({ ...base, rolls: [], rollFor: {}, base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } })).toEqual(["Roll 6 more ability scores (0 of 6)."]);
    const six = Array.from({ length: 6 }, () => [5, 5, 5, 1]);
    expect(text({ ...base, rolls: six.slice(0, 2), rollFor: {} })).toEqual(["Roll 4 more ability scores (2 of 6)."]);
    expect(text({ ...base, rolls: six, rollFor: { STR: 0, DEX: 1 } })).toEqual(["Put 4 more rolls on an ability (2 of 6)."]);
    expect(text({ ...base, rolls: six, rollFor: { STR: 0, DEX: 1, CON: 2, INT: 3, WIS: 4, CHA: 5 }, base: baseFromRolls(six, { STR: 0, DEX: 1, CON: 2, INT: 3, WIS: 4, CHA: 5 }) })).toEqual([]);
  });
});
