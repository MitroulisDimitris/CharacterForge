import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Monster, Spell } from "./lookup";
import { PARTLY_RULES, SPELL_RULES, spellsPartly, spellsWithNoEffect } from "./spellImmunity";

const monsters = JSON.parse(readFileSync("public/srd-monsters.json", "utf8")) as Monster[];
const srdSpells = JSON.parse(readFileSync("public/srd-spells.json", "utf8")) as Spell[];
const bookText = JSON.parse(readFileSync("public/spell-text-2014.json", "utf8")) as Record<string, unknown>;
const m = (name: string) => monsters.find((x) => x.name === name)!;
const why = (name: string) => Object.fromEntries(spellsWithNoEffect(m(name)).map((x) => [x.spell, x.why]));

describe("spells that don't affect a monster", () => {
  it("every rule names a spell the Wiki has", () => {
    const names = new Set([...srdSpells.map((s) => s.name), ...Object.keys(bookText)]);
    expect([...SPELL_RULES, ...PARTLY_RULES].map((r) => r.spell).filter((n) => !names.has(n))).toEqual([]);
  });

  it("Wight: undead, so Sleep, healing and Cause Fear don't work; it still understands language", () => {
    const w = why("Wight");
    expect(w["Sleep"]).toBe("Undead aren't affected.");
    expect(w["Cure Wounds"]).toBe("Undead aren't affected.");
    expect(w["Cause Fear"]).toBe("Undead aren't affected.");
    expect(w["Hold Person"]).toBe("Works only on humanoids.");
    expect(w["Command"]).toBe("Undead aren't affected.");
    expect(w["Geas"]).toBeUndefined();
  });

  it("Unicorn: immune to charmed and paralyzed", () => {
    const u = why("Unicorn");
    expect(u["Sleep"]).toBe("Creatures immune to being charmed aren't affected.");
    expect(u["Suggestion"]).toBe("Creatures immune to being charmed aren't affected.");
    expect(u["Dominate Monster"]).toContain("immune to being charmed");
    expect(u["Hold Monster"]).toContain("immune to being paralyzed");
  });

  it("Goblin: a humanoid that can be slept and held", () => {
    const g = why("Goblin");
    expect(g["Sleep"]).toBeUndefined();
    expect(g["Hold Person"]).toBeUndefined();
    expect(g["Animal Friendship"]).toBe("Works only on beasts.");
  });

  it("Werewolf: a shapechanger", () => {
    expect(why("Werewolf")["Polymorph"]).toBe("A shapechanger succeeds on the save automatically.");
  });

  it("Wolf and Bat: Intelligence, language and size", () => {
    expect(why("Wolf")["Animal Friendship"]).toBeUndefined();
    expect(why("Wolf")["Tasha's Hideous Laughter"]).toContain("Intelligence of 4 or lower");
    expect(why("Wolf")["Command"]).toBe("It understands no language.");
    expect(why("Wolf")["Animal Messenger"]).toBe("Works only on Tiny beasts.");
    expect(why("Bat")["Animal Messenger"]).toBeUndefined();
  });

  it("Ancient Red Dragon: too many hit points for Power Word Kill", () => {
    expect(why("Ancient Red Dragon")["Power Word Kill"]).toContain("above 100 hit points");
    expect(why("Goblin")["Power Word Kill"]).toBeUndefined();
  });

  it("Lich: Weird does nothing, Wrathful Smite only loses the fear", () => {
    expect(why("Lich")["Weird"]).toContain("immune to being frightened");
    const partly = Object.fromEntries(spellsPartly(m("Lich")).map((x) => [x.spell, x.why]));
    expect(partly["Wrathful Smite"]).toBe("It can't be frightened; the extra 1d6 psychic damage still lands.");
  });

  it("Wight: Stinking Cloud fails on a creature immune to poison", () => {
    expect(why("Wight")["Stinking Cloud"]).toBe("Creatures immune to poison succeed on the save automatically.");
  });

  it("Gibbering Mouther: can't be knocked prone by Thunderous Smite, the damage still lands", () => {
    expect(spellsPartly(m("Gibbering Mouther")).map((x) => x.spell)).toContain("Thunderous Smite");
    expect(spellsPartly(m("Goblin"))).toEqual([]);
  });
});
