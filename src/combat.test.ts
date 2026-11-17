import { describe, expect, it } from "vitest";
import { addFighter, concentrationDc, damageRule, extraFighter, monstersBeaten, newCombat, nextTurn, prevTurn, rollMonsters, rollPlayers, sortFighters, startCombat, updateFighter, xpEarned, type Combat } from "./combat";
import type { EncounterMonster } from "./encounters";

const goblins: EncounterMonster = { slug: "goblin", name: "Goblin", cr: "1/4", xp: 50, count: 3, ac: 15, hp: 7 };
const ogre: EncounterMonster = { slug: "ogre", name: "Ogre", cr: "2", xp: 450, count: 1, ac: 11, hp: 59 };
const players = [
  { id: "p1", name: "Aria", bonus: 3 },
  { id: "p2", name: "Bram", bonus: 0 },
];
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

function fight(): Combat {
  const c = newCombat([goblins, ogre], { goblin: { dex: 14, resist: "", immune: "" }, ogre: { dex: 8 } }, players);
  // goblin roll: 0.5 → d20 11, +2 = 13; ogre: 0 → 1, -1 = 0
  const rolled = rollMonsters(c, seq(0.5, 0));
  return {
    ...rolled,
    fighters: rolled.fighters.map((f) => (f.id === "p1" ? { ...f, init: 18 } : f.id === "p2" ? { ...f, init: 13 } : f)),
  };
}

describe("combat tracker", () => {
  it("adds every monster on its own, numbered, with stats", () => {
    const c = newCombat([goblins, ogre], {}, players);
    expect(c.fighters.map((f) => f.name)).toEqual(["Aria", "Bram", "Goblin 1", "Goblin 2", "Goblin 3", "Ogre"]);
    expect(c.fighters[2]).toMatchObject({ kind: "monster", ac: 15, hpMax: 7, xp: 50, group: "goblin" });
  });

  it("monsters of one kind share a roll; players are left to type theirs", () => {
    const c = rollMonsters(newCombat([goblins, ogre], { goblin: { dex: 14 }, ogre: { dex: 8 } }, players), seq(0.5, 0));
    const inits = Object.fromEntries(c.fighters.map((f) => [f.name, f.init]));
    expect(inits).toEqual({ Aria: null, Bram: null, "Goblin 1": 13, "Goblin 2": 13, "Goblin 3": 13, Ogre: 0 });
    expect(rollPlayers(c, seq(0.95)).fighters.find((f) => f.id === "p1")!.init).toBe(23);
  });

  it("sorts by initiative, then bonus, then players first, kinds together", () => {
    const order = sortFighters(fight().fighters).map((f) => f.name);
    // Bram (13, +0) and the goblins (13, +2): goblins have the higher bonus.
    expect(order).toEqual(["Aria", "Goblin 1", "Goblin 2", "Goblin 3", "Bram", "Ogre"]);
  });

  it("turns go round, skipping monsters at 0 HP but not players", () => {
    let c = startCombat(fight());
    expect(c.round).toBe(1);
    expect(c.fighters[c.turn].name).toBe("Aria");
    const g2 = c.fighters.find((f) => f.name === "Goblin 2")!.id;
    c = updateFighter(c, g2, (f) => ({ ...f, live: { hp: 0 } }));
    const p2 = "p2";
    c = updateFighter(c, p2, (f) => f); // players' HP isn't kept here
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      c = nextTurn(c);
      seen.push(`${c.round}:${c.fighters[c.turn].name}`);
    }
    expect(seen).toEqual(["1:Goblin 1", "1:Goblin 3", "1:Bram", "1:Ogre", "2:Aria"]);
    c = prevTurn(c);
    expect(`${c.round}:${c.fighters[c.turn].name}`).toBe("1:Ogre");
  });

  it("can't go back before the first turn", () => {
    const c = startCombat(fight());
    expect(prevTurn(c)).toEqual(c);
  });

  it("changing initiative mid-fight re-sorts but keeps whose turn it is", () => {
    let c = nextTurn(startCombat(fight())); // Goblin 1's turn
    c = updateFighter(c, "p2", (f) => ({ ...f, init: 25 }));
    expect(c.fighters[0].name).toBe("Bram");
    expect(c.fighters[c.turn].name).toBe("Goblin 1");
  });

  it("adding someone mid-fight slots them in without moving the turn", () => {
    let c = nextTurn(startCombat(fight()));
    c = addFighter(c, extraFighter("Captain Vex", 20, 30, 16));
    expect(c.fighters[0].name).toBe("Captain Vex");
    expect(c.fighters[c.turn].name).toBe("Goblin 1");
  });

  it("knows when the monsters are beaten and what XP they give", () => {
    let c = startCombat(fight());
    for (const f of c.fighters.filter((x) => x.kind === "monster" && x.name !== "Goblin 3")) c = updateFighter(c, f.id, (x) => ({ ...x, live: { hp: 0 } }));
    expect(monstersBeaten(c)).toBe(false);
    c = updateFighter(c, c.fighters.find((f) => f.name === "Goblin 3")!.id, (x) => ({ ...x, out: true }));
    expect(monstersBeaten(c)).toBe(true);
    const xp = xpEarned(c, 2);
    expect(xp.total).toBe(550); // 2 goblins + the ogre; the one that fled gives nothing
    expect(xp.each).toBe(275);
    expect(xp.defeated).toEqual([
      { name: "Goblin", count: 2 },
      { name: "Ogre", count: 1 },
    ]);
  });

  it("reads resistances and immunities from the stat block", () => {
    const f = { ...newCombat([ogre], {}, []).fighters[0], resist: "cold; bludgeoning, piercing, and slashing from nonmagical attacks", immune: "fire, poison", vulnerable: "radiant" };
    expect(damageRule(f, "Fire")).toMatchObject({ kind: "immune", conditional: false });
    expect(damageRule(f, "Cold")).toMatchObject({ kind: "resist", conditional: false });
    expect(damageRule(f, "Slashing")).toMatchObject({ kind: "resist", conditional: true });
    expect(damageRule(f, "Radiant")).toMatchObject({ kind: "vulnerable" });
    expect(damageRule(f, "Acid")).toBeNull();
  });

  it("concentration DC is 10 or half the damage", () => {
    expect(concentrationDc(7)).toBe(10);
    expect(concentrationDc(31)).toBe(15);
  });
});
