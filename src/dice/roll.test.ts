import { describe, expect, it } from "vitest";
import { diceFor, parseDice, resultOf, type RollSpec } from "./roll";
import { shapeOf } from "./engine";

const d20 = (extra: Partial<RollSpec> = {}): RollSpec => ({ label: "x", kind: "check", groups: [{ n: 1, sides: 20 }], tone: "player", ...extra });

describe("parseDice", () => {
  it("reads dice and a bonus", () => {
    expect(parseDice("2d10 + 6")).toEqual({ groups: [{ n: 2, sides: 10 }], bonus: 6 });
    expect(parseDice("17d10+85")).toEqual({ groups: [{ n: 17, sides: 10 }], bonus: 85 });
    expect(parseDice("1d6 − 1")).toEqual({ groups: [{ n: 1, sides: 6 }], bonus: -1 });
    expect(parseDice("d20")).toEqual({ groups: [{ n: 1, sides: 20 }], bonus: 0 });
    expect(parseDice("1d8 + 1d6 + 2")).toEqual({ groups: [{ n: 1, sides: 8 }, { n: 1, sides: 6 }], bonus: 2 });
  });
  it("refuses things that aren't real dice", () => {
    expect(parseDice("3d7")).toBeNull();
    expect(parseDice("DC 15")).toBeNull();
    expect(parseDice("")).toBeNull();
  });
});

describe("diceFor", () => {
  it("throws two d20s with advantage and two d10s for a d100", () => {
    expect(diceFor(d20({ adv: "adv" })).length).toBe(2);
    expect(diceFor(d20({ adv: "normal" })).length).toBe(1);
    const pct = diceFor({ label: "x", kind: "free", groups: [{ n: 1, sides: 100 }], tone: "player" });
    expect(pct.map((d) => d.role)).toEqual(["tens", "units"]);
  });
  it("damage never gets advantage", () => {
    expect(diceFor({ label: "x", kind: "damage", groups: [{ n: 1, sides: 20 }], adv: "adv", tone: "player" }).length).toBe(1);
  });
});

describe("resultOf", () => {
  it("adds the bonus parts to a check and lists them", () => {
    const spec = d20({ parts: [{ label: "Dexterity", value: 3 }, { label: "Proficiency", value: 2 }] });
    const r = resultOf(spec, diceFor(spec), [14]);
    expect(r.total).toBe(19);
    expect(r.lines.map((l) => l.v)).toEqual(["14", "Dexterity", "Proficiency"]);
  });
  it("keeps the higher d20 with advantage, the lower with disadvantage", () => {
    const adv = d20({ adv: "adv", bonus: 1 });
    const r = resultOf(adv, diceFor(adv), [4, 17]);
    expect(r.total).toBe(18);
    expect(r.dropped).toEqual([0]);
    const dis = d20({ adv: "dis" });
    expect(resultOf(dis, diceFor(dis), [4, 17]).total).toBe(4);
  });
  it("marks criticals (a Champion's 19 too) and natural 1s on attacks", () => {
    const atk = d20({ kind: "attack", bonus: 5 });
    expect(resultOf(atk, diceFor(atk), [20]).gold).toBe(true);
    expect(resultOf(atk, diceFor(atk), [19]).gold).toBe(false);
    const champ = d20({ kind: "attack", critOn: 19 });
    expect(resultOf(champ, diceFor(champ), [19]).note).toMatch(/Critical/);
    expect(resultOf(atk, diceFor(atk), [1]).note).toMatch(/misses/);
    expect(resultOf(atk, diceFor(atk), [1]).sub).toBe("");
    expect(resultOf(atk, diceFor(atk), [12]).sub).toBe("Hits armour class 17 or lower.");
  });
  it("sums damage dice and says half on a save", () => {
    const spec: RollSpec = { label: "Fire Breath", kind: "damage", groups: [{ n: 3, sides: 6 }], half: true, unit: "fire", tone: "monster" };
    const r = resultOf(spec, diceFor(spec), [6, 5, 4]);
    expect(r.total).toBe(15);
    expect(r.lines[0]).toEqual({ k: "3d6", v: "6 + 5 + 4 = 15" });
    expect(r.sub).toBe("Half on a successful save: 7.");
  });
  it("damage is at least 1", () => {
    const spec: RollSpec = { label: "x", kind: "damage", groups: [{ n: 1, sides: 4 }], bonus: -3, tone: "player" };
    expect(resultOf(spec, diceFor(spec), [1]).total).toBe(1);
  });
  it("reads a d100 from its tens and units dice (00 + 0 is 100)", () => {
    const spec: RollSpec = { label: "x", kind: "free", groups: [{ n: 1, sides: 100 }], tone: "player" };
    expect(resultOf(spec, diceFor(spec), [7, 3]).total).toBe(73);
    expect(resultOf(spec, diceFor(spec), [10, 10]).total).toBe(100);
    expect(resultOf(spec, diceFor(spec), [10, 4]).total).toBe(4);
  });
  it("recharges on the needed number", () => {
    const spec: RollSpec = { label: "x", kind: "recharge", groups: [{ n: 1, sides: 6 }], need: 5, tone: "monster" };
    expect(resultOf(spec, diceFor(spec), [5]).gold).toBe(true);
    expect(resultOf(spec, diceFor(spec), [4]).note).toMatch(/Not yet/);
  });
});

describe("dice shapes", () => {
  it.each([4, 6, 8, 10, 12, 20])("d%i has the right faces, each number once, opposite faces adding to N + 1", (n) => {
    const sh = shapeOf(n);
    expect(sh.faces.length).toBe(n);
    if (n === 4) return;
    const values = sh.faces.map((f) => f.value).sort((a, b) => a - b);
    expect(values).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    for (const f of sh.faces) {
      const opp = sh.faces.reduce((best, g) => (g.n[0] * f.n[0] + g.n[1] * f.n[1] + g.n[2] * f.n[2] < best.d ? { g, d: g.n[0] * f.n[0] + g.n[1] * f.n[1] + g.n[2] * f.n[2] } : best), { g: f, d: 2 }).g;
      expect(f.value + opp.value).toBe(n + 1);
    }
  });
});

import { halfOnSave, segmentsOf } from "./rollText";

describe("rolls inside stat block text", () => {
  it("finds the to-hit, the damage dice and their type", () => {
    const s = segmentsOf("Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage.");
    const rolls = s.filter((x) => x.kind !== "text");
    expect(rolls).toEqual([
      { kind: "hit", text: "+10 to hit", bonus: 10 },
      { kind: "dice", text: "2d10 + 6", dice: "2d10 + 6", unit: "piercing" },
      { kind: "dice", text: "1d6", dice: "1d6", unit: "fire" },
    ]);
    expect(s.map((x) => x.text).join("")).toBe("Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage.");
  });
  it("finds a recharge and half damage on a save", () => {
    const t = "Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.";
    expect(segmentsOf(t).filter((x) => x.kind === "dice")).toEqual([{ kind: "dice", text: "16d6", dice: "16d6", unit: "fire" }]);
    expect(halfOnSave(t)).toBe(true);
    expect(segmentsOf("Fire Breath (Recharge 5–6)")).toEqual([{ kind: "text", text: "Fire Breath " }, { kind: "recharge", text: "Recharge 5–6", need: 5 }]);
  });
  it("leaves DCs and plain numbers alone", () => {
    expect(segmentsOf("DC 15 Wisdom saving throw").every((x) => x.kind === "text")).toBe(true);
  });
});

import { quipFor, rareQuips } from "./quips";

describe("quips", () => {
  const atk: RollSpec = { label: "x", kind: "attack", groups: [{ n: 1, sides: 20 }], bonus: 5, tone: "player" };
  const q = (spec: RollSpec, faces: number[], rnd = () => 0) => quipFor(spec, diceFor(spec), faces, resultOf(spec, diceFor(spec), faces), rnd);
  it("natural 20s and 1s always get one, monsters their own", () => {
    expect(q(atk, [20], () => 0)).toBe("The dice gods have chosen you.");
    expect(q(atk, [1], () => 0)).toBe("The weapon had other plans.");
    expect(q(d20(), [20], () => 0)).toBe("Flawless.");
    expect(q({ ...atk, tone: "monster" }, [1], () => 0)).toBe("The monster trips over its own ambition.");
    const rc: RollSpec = { label: "x", kind: "recharge", groups: [{ n: 1, sides: 6 }], need: 5, tone: "monster" };
    expect(q(rc, [6], () => 0)).toBe("It's warming up again…");
  });
  it("rare ones show only 12% of the time", () => {
    expect(q(d20(), [10], () => 0.5)).toBe("");
    expect(q(d20(), [10], () => 0.05)).toBe("Not bad, not great.");
  });
  it("picks the most specific rare quip", () => {
    const dis = d20({ adv: "dis" });
    expect(rareQuips(dis, diceFor(dis), [20, 4], resultOf(dis, diceFor(dis), [20, 4]))[0]).toBe("A 20, thrown away. Painful.");
    const dmg: RollSpec = { label: "x", kind: "damage", groups: [{ n: 2, sides: 6 }], tone: "player" };
    expect(rareQuips(dmg, diceFor(dmg), [6, 6], resultOf(dmg, diceFor(dmg), [6, 6]))[0]).toBe("Maximum damage. Every die gave its all.");
    const pct: RollSpec = { label: "x", kind: "free", groups: [{ n: 1, sides: 100 }], tone: "player" };
    expect(rareQuips(pct, diceFor(pct), [10, 10], resultOf(pct, diceFor(pct), [10, 10]))[0]).toBe("One hundred. Make a wish. Not that kind.");
  });
});
