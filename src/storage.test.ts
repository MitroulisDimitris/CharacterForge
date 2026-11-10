// Import/export and old-save migration.
import { describe, expect, it } from "vitest";
import { LEGACY_V1_BOOKS, parseImport } from "./storage";
import { getSystem } from "./systems/registry";
import { defaultCharacter } from "./systems/dnd5e/character";
import { parryPF2 } from "./systems/pf2e/character";

describe("import", () => {
  it("reads a version-1 save (from before rules selection) as D&D 2024 with identical numbers", () => {
    const v1 = { ...defaultCharacter() } as Record<string, unknown>;
    delete v1.edition;
    const rec = parseImport(JSON.stringify(v1));
    expect(rec.system).toBe("dnd2024");
    expect(rec.books).toEqual(LEGACY_V1_BOOKS);
    const sys = getSystem("dnd2024")!;
    const d = sys.derive(sys.normalize(rec.data), rec.books) as { hpMax: number; ac: number; spellDc: number };
    expect([d.hpMax, d.ac, d.spellDc]).toEqual([32, 17, 16]);
  });

  it("round-trips a version-2 export and keeps core books", () => {
    const file = { format: "character-forge", version: 2, system: "pf2e", books: ["PC2"], character: parryPF2() };
    const rec = parseImport(JSON.stringify(file));
    expect(rec.system).toBe("pf2e");
    expect(rec.books.sort()).toEqual(["PC", "PC2"]);
    expect((rec.data as { name: string }).name).toBe("Parry Hotter");
  });

  it("rejects unknown systems and junk", () => {
    expect(() => parseImport(JSON.stringify({ format: "character-forge", version: 2, system: "gurps", books: [], character: {} }))).toThrow(/doesn't know/);
    expect(() => parseImport("{nope")).toThrow(/valid JSON/);
    expect(() => parseImport(JSON.stringify({ hello: 1 }))).toThrow(/doesn't look like/);
  });
});
