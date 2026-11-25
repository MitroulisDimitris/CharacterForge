// The progression tree's content: every class, every level, both rule sets.
import { describe, expect, it } from "vitest";
import { freshCharacter2014, defaultCharacter, type Character } from "../character";
import { deriveCharacter } from "../derive";
import { RULES, classOf } from "../rules";
import { buildTree, nameOf, pickPatch, statusOf } from "./build";
import { LOOKS } from "./looks";

const ALL = ["PHB14", "XGE", "TCE"];
const build = (patch: Partial<Character>): Character => {
  const c = { ...freshCharacter2014(), name: "T", species: "human14", background: "sage14", ...patch };
  const cls = classOf(RULES["2014"], c.cls);
  const arr = [15, 14, 13, 12, 10, 8];
  return { ...c, base: Object.fromEntries(cls.recommended.map((a, i) => [a, arr[i]])) as Character["base"] };
};
const tree = (c: Character, books = ALL) => buildTree(c, deriveCharacter(c, books), books);

describe("progression tree", () => {
  it("every 2014 class: a look, a root, at most 4 steps a row, the subclass choice at its level", () => {
    for (const k of RULES["2014"].classes) {
      expect(LOOKS[k.id], k.id).toBeTruthy();
      for (const books of [["PHB14"], ALL].filter((b) => b.includes(k.book))) {
        for (let level = 1; level <= 5; level++) {
          const t = tree(build({ cls: k.id, level }), books);
          expect(t.nodes[0].id).toBe("root");
          for (let r = 1; r <= 5; r++) expect(t.nodes.filter((n) => n.r === r).length, `${k.id} row ${r}`).toBeLessThanOrEqual(4);
          const sub = t.nodes.find((n) => n.id === "sub")!;
          expect(sub.r, k.id).toBe(k.subclassLevel);
          expect(sub.choice!.length).toBeGreaterThan(1);
          expect(new Set(t.nodes.map((n) => n.id)).size, `${k.id} ids`).toBe(t.nodes.length);
        }
      }
    }
  });

  it("states follow the character: choose, then have and the power revealed", () => {
    const c = build({ cls: "fighter", level: 3 });
    let t = tree(c);
    const sub = t.nodes.find((n) => n.id === "sub")!;
    expect(statusOf(t, sub)).toBe("choose");
    expect(statusOf(t, t.nodes.find((n) => n.id === "subpow")!)).toBe("waiting");
    expect(statusOf(t, t.nodes.find((n) => n.r === 4)!)).toBe("later");
    const patch = pickPatch(c, deriveCharacter(c, ALL), sub, "champion")!;
    t = tree({ ...c, ...patch });
    expect(statusOf(t, sub)).toBe("have");
    expect(nameOf(t, sub)).toBe("Champion");
    expect(nameOf(t, t.nodes.find((n) => n.id === "subpow")!)).toBe("Improved Critical");
  });

  it("multi-picks count up to their limit", () => {
    const c = build({ cls: "sorcerer", level: 3, subclass: "draconic" });
    const t = tree(c);
    const meta = t.nodes.find((n) => n.id === "meta")!;
    expect(meta.n).toBe(2);
    const d = deriveCharacter(c, ALL);
    const one = { ...c, ...pickPatch(c, d, meta, "quickened")! };
    const two = { ...one, ...pickPatch(one, d, meta, "twinned")! };
    expect(pickPatch(two, d, meta, "careful")).toBeNull();
    expect(statusOf(tree(two), meta)).toBe("have");
    expect(tree(two).picks.meta).toEqual(["quickened", "twinned"]);
  });

  it("the 2024 sorcerer has a tree too", () => {
    const t = buildTree(defaultCharacter(), deriveCharacter(defaultCharacter(), ["PHB24", "PHB14", "XGE"]), ["PHB24", "PHB14", "XGE"]);
    expect(t.cls).toBe("sorcerer");
    for (let r = 1; r <= t.maxLevel; r++) expect(t.nodes.filter((n) => n.r === r).length).toBeLessThanOrEqual(4);
    expect(t.nodes.some((n) => n.id === "sub")).toBe(true);
  });
});
