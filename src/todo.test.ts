import { describe, expect, it } from "vitest";
import { actionText, buildTodos, findWords } from "./todo";
import type { Unlock, Warning } from "./systems/types";

describe("one To do list", () => {
  it("says exactly how many picks are left, from the sheet", () => {
    expect(actionText("Cantrips: 0 of 2 chosen.")).toBe("Choose 2 more cantrips (0 of 2)");
    expect(actionText("Prepared spells: 3 of 5 chosen.")).toBe("Prepare 2 more spells (3 of 5)");
    expect(actionText("Prepared spells: 4 of 5 chosen.")).toBe("Prepare 1 more spell (4 of 5)");
    expect(actionText("Spells known: 9 of 6 chosen.")).toBe("Remove 3 spells (9 of 6)");
    expect(actionText("Spellbook: 6 of 8 spells written in.")).toBe("Copy 2 more spells into your spellbook (6 of 8)");
    expect(actionText("Metamagic: 0 of 2 chosen.")).toBe("Choose 2 more Metamagic options (0 of 2)");
    expect(actionText("Choose your Druid Circle.")).toBe("Choose your Druid Circle");
  });

  it("points at the right section", () => {
    expect(findWords("Cantrips: 0 of 2 chosen.")).toEqual(["Cantrips"]);
    expect(findWords("Prepared spells: 3 of 5 chosen.")[0]).toBe("level spells");
    expect(findWords("Choose 2 more Druid skill(s).")).toEqual(["Druid skills", "Skills"]);
    expect(findWords("Choose your Dragon Ancestor.")).toEqual(["dragon ancestor"]);
    expect(findWords("Metamagic: 1 of 2 chosen.")).toEqual(["Metamagic"]);
    expect(findWords("You can know 3 languages; 2 chosen.")).toEqual(["Languages"]);
  });

  it("merges postponed choices with the sheet's checks and uses the sheet's numbers", () => {
    const warnings: Warning[] = [
      { level: "warn", tab: "spells", text: "Cantrips: 0 of 2 chosen." },
      { level: "warn", tab: "class", text: "Choose 2 more Druid skill(s)." },
      { level: "warn", tab: "class", text: "Choose your Druid Circle." },
      { level: "info", tab: "spells", text: "Prepared spells: 3 of 5 chosen." },
      { level: "info", tab: "skills", text: "You can know 3 languages; 2 chosen." },
    ];
    const waiting = [
      { id: "2:subclass", level: 2, title: "Choose your Druid Circle", detail: "", tab: "class" },
      { id: "2:spells", level: 2, title: "Prepare 1 more spell", detail: "", tab: "spells" },
    ] as Unlock[];
    const { todos, notes } = buildTodos(warnings, waiting);
    expect(todos.map((t) => t.text)).toEqual(["Choose 2 more cantrips (0 of 2)", "Choose 2 more Druid skill(s)", "Choose your Druid Circle", "Prepare 2 more spells (3 of 5)"]);
    expect(todos.find((t) => t.text === "Choose your Druid Circle")?.unlockId).toBe("2:subclass");
    expect(todos.find((t) => t.text.startsWith("Prepare"))).toMatchObject({ unlockId: "2:spells", tab: "spells", find: ["level spells", "Your spells"] });
    expect(notes.map((t) => t.text)).toEqual(["You can know 3 languages; 2 chosen"]);
  });

  it("drops a postponed number of picks that the sheet says is done", () => {
    const { todos } = buildTodos([], [{ id: "3:spells", level: 3, title: "Learn 1 new spell", detail: "", tab: "spells" } as Unlock]);
    expect(todos).toEqual([]);
  });
});
