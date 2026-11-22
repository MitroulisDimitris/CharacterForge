import { describe, expect, it } from "vitest";
import { currentHp } from "./live";
import { deathSave, heal, hitDiceBack, longRest, setConc, spendHitDie, takeDamage, toggleCond } from "./play";

const strip = <T extends object>(p: T) => {
  const { log: _log, ...rest } = p as T & { log?: unknown };
  return rest;
};

describe("player's own tracker (PHB 196–198, 186)", () => {
  it("damage uses temp HP first and asks for a concentration save", () => {
    const r = takeDamage(setConc({ temp: 3 }, "Bless"), 21, 13, "Slashing");
    expect(currentHp(r.play, 21)).toBe(11);
    expect(r.play.temp).toBeUndefined();
    expect(r.notes[0]).toMatch(/Concentrating on Bless: make a Constitution save, DC 10/);
    expect(takeDamage(setConc({}, "Bless"), 40, 30, "Fire").notes[0]).toMatch(/DC 15/);
  });

  it("resistance halves, vulnerability doubles", () => {
    expect(currentHp(takeDamage({}, 20, 7, "Poison", true).play, 20)).toBe(17);
    expect(currentHp(takeDamage({}, 20, 4, "Fire", false, true).play, 20)).toBe(12);
  });

  it("dropping to 0: unconscious, concentration ends, death saves start", () => {
    const r = takeDamage(setConc({ hp: 5 }, "Bless"), 21, 9, "Piercing");
    expect(currentHp(r.play, 21)).toBe(0);
    expect(r.play.conditions).toEqual(["unconscious"]);
    expect(r.play.conc).toBeUndefined();
    expect(r.play.saves).toEqual({ ok: 0, fail: 0 });
    expect(r.notes.join(" ")).toMatch(/fall unconscious.*concentration on Bless ends/);
  });

  it("massive damage: left over at least your max is instant death", () => {
    // The book's example: max 12, at 6, takes 18 → 12 left over.
    expect(takeDamage({ hp: 6 }, 12, 18, "Slashing").notes[0]).toMatch(/instant death/);
    expect(takeDamage({ hp: 6 }, 12, 17, "Slashing").notes[0]).not.toMatch(/instant death/);
  });

  it("damage at 0 HP is a failed save, two on a critical", () => {
    const down = takeDamage({ hp: 1 }, 10, 5, "Fire").play;
    expect(takeDamage(down, 10, 2, "Fire").play.saves).toEqual({ ok: 0, fail: 1 });
    expect(takeDamage(down, 10, 2, "Fire", false, false, true).play.saves).toEqual({ ok: 0, fail: 2 });
  });

  it("death saves: 10+ success, 1 counts twice, 20 = 1 HP, three of a kind", () => {
    let p = takeDamage({ hp: 1 }, 10, 5, "Fire").play;
    p = deathSave(p, 10, 12).play;
    expect(p.saves).toEqual({ ok: 1, fail: 0 });
    p = deathSave(p, 10, 1).play;
    expect(p.saves).toEqual({ ok: 1, fail: 2 });
    expect(deathSave(p, 10, 5).notes[0]).toMatch(/dies/);
    const twenty = deathSave(p, 10, 20).play;
    expect(currentHp(twenty, 10)).toBe(1);
    expect(twenty.saves).toBeUndefined();
    expect(twenty.conditions).toBeUndefined();
    let s = deathSave(deathSave(deathSave({ hp: 0, saves: { ok: 0, fail: 0 } }, 10, 10).play, 10, 15).play, 10, 19);
    expect(s.play.stable).toBe(true);
    expect(s.play.saves).toBeUndefined();
    s = heal(s.play, 10, 3);
    expect(s.play.stable).toBeUndefined();
  });

  it("hit dice on a short rest, half back on a long rest", () => {
    let p = spendHitDie({ hp: 4 }, 21, 7, 3).play;
    expect(currentHp(p, 21)).toBe(11);
    expect(p.hdUsed).toBe(1);
    p = spendHitDie(spendHitDie(p, 21, 6, 3).play, 21, 2, 3).play;
    expect(p.hdUsed).toBe(3);
    expect(spendHitDie(p, 21, 5, 3).notes[0]).toMatch(/No Hit Dice left/);
    const r = longRest({ ...toggleCond(p, "poisoned"), temp: 4, exhaustion: 2 }, 3);
    // Exhaustion is only suggested, never lowered for you.
    expect(strip(r.play)).toEqual({ hdUsed: 2, exhaustion: 2, conditions: ["poisoned"] });
    expect(r.notes.join(" ")).toMatch(/If you ate and drank, lower your exhaustion by one level \(to 1\)/);
    expect(hitDiceBack(1)).toBe(1);
    expect(hitDiceBack(8)).toBe(4);
  });
});
