// Every To do item must land on a section that's really on its tab (user, 2026-11-17: "fix it
// properly"). For every 2014 class at levels 1–5, with every choice left empty and every level-up
// choice postponed (plus a few races, backgrounds and class options), build the To do list, render
// each item's tab and check its section id is there.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { dnd2014 } from "./systems/dnd5e";
import { freshCharacter2014, type Character } from "./systems/dnd5e/character";
import { RULES } from "./systems/dnd5e/rules";
import { openUnlocks } from "./components/LevelChange";
import { buildTodos } from "./todo";
import type { Warning } from "./systems/types";

const ALL_BOOKS = ["PHB14", "XGE", "TCE"];
/** Every (tab/section :: text) checked, to see what the test covers. */
export const seen = new Set<string>();

function allUnlockIds(c: Character, books: string[]): string[] {
  const ids: string[] = [];
  for (let l = 1; l <= c.level; l++) {
    const atL = { ...c, level: l };
    ids.push(...dnd2014.progression.unlocksAt(atL, dnd2014.derive(atL, books), l).map((u) => u.id));
  }
  return ids;
}

function check(c: Character, books: string[], label: string): string[] {
  const d = dnd2014.derive(c, books);
  const waiting = openUnlocks(dnd2014, c, books, allUnlockIds(c, books));
  const { todos, notes } = buildTodos(d.warnings as Warning[], waiting);
  const problems: string[] = [];
  for (const t of [...todos, ...notes]) seen.add(`${t.tab}/${t.section} :: ${t.text.replace(/\d+/g, "N")}`);
  const pages = new Map<string, string>();
  for (const t of [...todos, ...notes]) {
    if (!t.tab) {
      problems.push(`${label}: "${t.text}" has no tab`);
      continue;
    }
    if (!t.section) {
      problems.push(`${label}: "${t.text}" has no section`);
      continue;
    }
    if (!pages.has(t.tab)) {
      const Tab = dnd2014.tabs.find((x) => x.id === t.tab)?.Component;
      if (!Tab) {
        problems.push(`${label}: "${t.text}" points at a tab that doesn't exist (${t.tab})`);
        continue;
      }
      pages.set(t.tab, renderToStaticMarkup(<Tab c={c} d={d} set={() => {}} books={books} />));
    }
    const html = pages.get(t.tab)!;
    const there = html.includes(`data-todo="${t.section}"`);
    const reveal = new RegExp(`data-todo-reveals="[^"]*\\b${t.section}\\b`).test(html);
    if (!there && !reveal) problems.push(`${label}: "${t.text}" → ${t.tab}/${t.section} is not on the tab`);
  }
  return problems;
}

const variants: { label: string; patch: Partial<Character>; books?: string[] }[] = [
  { label: "no race / background", patch: {} },
  { label: "half-elf, custom background", patch: { species: "halfElf", background: "custom14" } },
  { label: "elf (lineage open)", patch: { species: "elf14", lineage: "" } },
  { label: "custom lineage", patch: { species: "customLineage" }, books: ALL_BOOKS },
];

describe("every To do item lands on its section", () => {
  for (const cls of RULES["2014"].classes) {
    it(`${cls.name}, levels 1–5`, () => {
      const problems: string[] = [];
      for (let level = 1; level <= 5; level++) {
        for (const v of variants) {
          const books = v.books ?? (cls.book && cls.book !== "PHB14" ? ALL_BOOKS : ["PHB14", "XGE"]);
          const c: Character = { ...freshCharacter2014(), cls: cls.id, level, ...v.patch };
          problems.push(...check(c, books, `${cls.name} ${level}, ${v.label}`));
        }
      }
      expect(problems).toEqual([]);
    });
  }

  it("class options: Pact of the Tome, Blessed Warrior, Tasha's ranger, a level 4 feat", () => {
    const problems: string[] = [];
    const base = freshCharacter2014();
    problems.push(...check({ ...base, cls: "warlock", level: 3, pactBoon: "tome" } as Character, ALL_BOOKS, "Warlock tome"));
    problems.push(...check({ ...base, cls: "paladin", level: 2, fightingStyle: "blessedWarrior" } as Character, ALL_BOOKS, "Paladin blessed"));
    problems.push(...check({ ...base, cls: "ranger", level: 3, rangerTasha: true } as unknown as Character, ALL_BOOKS, "Ranger Tasha"));
    problems.push(...check({ ...base, cls: "fighter", level: 4, asiChoice: "feat", feat: "skilled" } as unknown as Character, ALL_BOOKS, "Fighter feat"));
    expect(problems).toEqual([]);
  });

  it("covers the checks that used to land in the wrong place", () => {
    const all = [...seen].join(" | ");
    if (process.env.TODO_COVERAGE) console.log([...seen].sort().join(" || "));
    for (const want of ["class/tools", "class/ranger", "class/pact-boon", "class/style-cantrips", "species/species-choices", "class/class-skills", "spells/spells-1", "spells/cantrips", "class/subclass", "class/metamagic"]) expect(all).toContain(want);
  });
});
