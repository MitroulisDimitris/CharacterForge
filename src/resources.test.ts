import { describe, expect, it } from "vitest";
import { availableOf, clickPip, rest } from "./resources";
import type { BaseCharacter, ResourcePool } from "./systems/types";
import { resources5e } from "./systems/dnd5e/resources";
import { freshCharacter2014 } from "./systems/dnd5e/character";
import { deriveCharacter } from "./systems/dnd5e/derive";

const slots: ResourcePool = { id: "slot1", label: "1st-level slots", max: 4, refresh: "long", kind: "slot" };
const pact: ResourcePool = { id: "slot2", label: "Pact slots", max: 2, refresh: "short", kind: "slot" };
const base: BaseCharacter = { name: "T", playerName: "", level: 3 };

describe("resource tracking", () => {
  it("tapping pips spends and refills", () => {
    let c = { ...base };
    expect(availableOf(c, slots)).toBe(4);
    c = { ...c, ...clickPip(c, slots, 3) }; // tap the last filled pip: use one
    expect(availableOf(c, slots)).toBe(3);
    c = { ...c, ...clickPip(c, slots, 1) }; // tap the 2nd pip: only 1 left
    expect(availableOf(c, slots)).toBe(1);
    c = { ...c, ...clickPip(c, slots, 2) }; // tap an empty pip: back up to 3
    expect(availableOf(c, slots)).toBe(3);
  });

  it("short rest refills only short-rest pools; long rest refills all", () => {
    const c = { ...base, spent: { slot1: 3, slot2: 2 } };
    const s = { ...c, ...rest(c, [slots, pact], "short") };
    expect(availableOf(s, slots)).toBe(1);
    expect(availableOf(s, pact)).toBe(2);
    const l = { ...c, ...rest(c, [slots, pact], "long") };
    expect(availableOf(l, slots)).toBe(4);
  });

  it("5e pools: sorcerer slots and sorcery points; warlock pact slots refill on a short rest", () => {
    const sorc = { ...freshCharacter2014(), cls: "sorcerer", level: 3 };
    const pools = resources5e(sorc, deriveCharacter(sorc, ["PHB14"]));
    expect(pools.map((p) => `${p.id}:${p.max}:${p.refresh}`)).toEqual(["slot1:4:long", "slot2:2:long", "sorcery:3:long"]);
    const wl = { ...freshCharacter2014(), cls: "warlock", level: 3 };
    expect(resources5e(wl, deriveCharacter(wl, ["PHB14"])).map((p) => `${p.id}:${p.max}:${p.refresh}`)).toEqual(["slot2:2:short"]);
  });
});
