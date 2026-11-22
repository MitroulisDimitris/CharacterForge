import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fold, foldIndex, greekKeysToLatin } from "./text";
import { normalizeCode } from "./sessions";
import { fileSafe } from "./storage";
import { countMatches } from "./notes";
import { clean, createDoc, needsUnicode } from "./pdf/primitives";

describe("Greek text", () => {
  it("folds case and accents, keeping positions", () => {
    expect(fold("Άρης Ωραίος")).toBe("αρησ ωραιοσ");
    expect(fold("Ϊ ΰ")).toBe("ι υ");
    expect(fold("Άρης").length).toBe("Άρης".length);
    expect(foldIndex("Ο Άρης ήρθε", "αρης")).toBe(2);
    expect(foldIndex("Café", "cafe")).toBe(0);
  });

  it("finds notes without caring about tonos or case", () => {
    expect(countMatches("Ο Άρης και ο ΑΡΗΣ και ο αρης", "Αρης")).toBe(3);
  });

  it("reads invite codes typed on a Greek keyboard", () => {
    // K, 7, P, 2, Q-less… typed with the Greek layout on: κ 7 π 2 ρ ς
    expect(greekKeysToLatin("κ7π2ρς")).toBe("K7P2RW");
    expect(normalizeCode("κ7π 2ρς")).toBe("K7P-2RW");
    expect(normalizeCode("k7p-2qx")).toBe("K7P-2QX");
  });

  it("keeps Greek letters in file names", () => {
    expect(fileSafe("Άρης ο Μάγος")).toBe("Άρης_ο_Μάγος");
    expect(fileSafe("a/b:c*?")).toBe("abc");
    expect(fileSafe("???")).toBe("character");
  });

  it("PDF: Greek switches to the Noto fonts and keeps the letters", async () => {
    expect(needsUnicode("Parry Hotter")).toBe(false);
    expect(needsUnicode("Café − ✓")).toBe(false);
    expect(needsUnicode("Άρης")).toBe(true);
    const load = async (f: string) => {
      const b = readFileSync(`public/fonts/pdf/${f}`);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    };
    const { doc, fonts } = await createDoc("Άρης", "Δημήτρης", "", load);
    expect(clean("Άρης − ok")).toBe("Άρης - ok");
    const page = doc.addPage();
    page.drawText(clean("Άρης ο Μάγος · Ωραίο"), { x: 40, y: 700, size: 14, font: fonts.reg });
    page.drawText(clean("Κληρικός"), { x: 40, y: 680, size: 14, font: fonts.head });
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(1000);
    // Back to the built-in fonts for a Latin-only sheet: Greek would be "?" there.
    await createDoc("Parry", "Me", "{}");
    expect(clean("Άρης")).toBe("????");
  });
});
