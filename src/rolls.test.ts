import { describe, expect, it } from "vitest";
import { diceFor, resultOf, type RollSpec } from "./dice/roll";
import { rollTag, tableRollOf } from "./rolls";

const roll = (spec: RollSpec, faces: number[]) => {
  const res = resultOf(spec, diceFor(spec), faces);
  return tableRollOf(spec, res);
};
const check: RollSpec = { label: "Perception (Wisdom)", kind: "check", groups: [{ n: 1, sides: 20 }], parts: [{ label: "Wisdom", value: 1 }, { label: "Proficiency", value: 2 }], tone: "player" };

describe("what the DM sees of a roll", () => {
  it("adds up a check and writes the dice and bonuses in one line", () => {
    const r = roll(check, [14]);
    expect(r.total).toBe(17);
    expect(r.detail).toBe("d20 14 + 1 + 2");
    expect(r.flag).toBeNull();
  });
  it("marks natural 20s and 1s", () => {
    expect(roll(check, [20]).flag).toBe("nat20");
    expect(roll(check, [1]).flag).toBe("nat1");
    expect(rollTag({ flag: "nat1", unit: "" })).toBe("Natural 1");
  });
  it("marks a Champion's 19 as a critical hit, not a natural 20", () => {
    const atk: RollSpec = { label: "Longsword · attack", kind: "attack", groups: [{ n: 1, sides: 20 }], bonus: 5, critOn: 19, tone: "player" };
    expect(roll(atk, [19]).flag).toBe("crit");
    expect(roll(atk, [20]).flag).toBe("nat20");
  });
  it("keeps the advantage dice and the damage type", () => {
    expect(roll({ ...check, adv: "adv" }, [5, 17]).detail).toMatch(/^2d20 5 and 17, kept 17 \(advantage\)/);
    const dmg: RollSpec = { label: "Shatter · damage", kind: "damage", groups: [{ n: 3, sides: 8 }], unit: "thunder", half: true, tone: "player" };
    const r = roll(dmg, [7, 2, 5]);
    expect(r.total).toBe(14);
    expect(r.unit).toBe("thunder");
    expect(r.sub).toBe("Half on a successful save: 7.");
    expect(r.flag).toBeNull();
    expect(rollTag(r)).toBe("thunder");
  });
});
