import { describe, expect, it } from "vitest";
import { countMatches, htmlToText, moveItem, nextNoteTitle, pickNoteColor } from "./notes";

describe("session notes helpers", () => {
  it("names a new tab Notes N+1", () => {
    expect(nextNoteTitle([])).toBe("Notes 1");
    expect(nextNoteTitle(["Notes 1"])).toBe("Notes 2");
    expect(nextNoteTitle(["Notes"])).toBe("Notes 2");
    expect(nextNoteTitle(["NPCs", "Notes 1", "notes 4", "Loot"])).toBe("Notes 5");
    expect(nextNoteTitle(["NPCs"])).toBe("Notes 1");
  });

  it("picks the least-used colour, randomly on a tie", () => {
    expect(pickNoteColor([], () => 0)).toBe("parchment");
    expect(pickNoteColor([], () => 0.99)).toBe("stone");
    const allButGold = ["parchment", "crimson", "green", "blue", "violet", "teal", "stone"];
    expect(pickNoteColor(allButGold, () => 0.5)).toBe("gold");
    // Every colour used once, crimson twice: crimson is never picked.
    const used = [...allButGold, "gold", "crimson"];
    for (let r = 0; r < 1; r += 0.1) expect(pickNoteColor(used, () => r)).not.toBe("crimson");
  });

  it("turns editor HTML into plain text", () => {
    const html = '<p>Last time: <strong>Aldo</strong> &amp; the bell</p><p></p><ul><li><p>one</p></li></ul><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>done</p></div></li></ul>';
    expect(htmlToText(html)).toBe("Last time: Aldo & the bell\n\n• one\n[x] done");
  });

  it("counts matches without caring about case", () => {
    expect(countMatches("Aldo lies. ALDO hides the key.", "aldo")).toBe(2);
    expect(countMatches("anything", "  ")).toBe(0);
  });

  it("moves a tab to a new place", () => {
    const list = ["a", "b", "c", "d"].map((id) => ({ id }));
    expect(moveItem(list, "a", 2).map((x) => x.id).join("")).toBe("bcad");
    expect(moveItem(list, "d", 0).map((x) => x.id).join("")).toBe("dabc");
    expect(moveItem(list, "b", 9).map((x) => x.id).join("")).toBe("acdb");
  });
});
