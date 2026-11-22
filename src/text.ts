// Text helpers for anything people type (Greek support, user 2026-11-21).

/**
 * Lower case without accents, keeping the length (so a match's position is also its position in
 * the original): "Άρης" → "αρης", "Ωραίο" → "ωραιο", final ς → σ. Lets "αρης" find "Άρης".
 */
export function fold(s: string): string {
  let out = "";
  for (const unit of s) {
    const base = unit.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    // One code point in, one out: a lone accent mark or anything that grows stays as it was.
    const one = [...base].length === 1 ? base : unit.toLowerCase();
    out += one === "ς" ? "σ" : one.length === unit.length ? one : unit;
  }
  return out;
}

/** Where `needle` appears in `hay`, ignoring case and accents (Greek tonos too). */
export const foldIndex = (hay: string, needle: string, from = 0) => fold(hay).indexOf(fold(needle), from);

// On a Greek keyboard layout, these letters sit on the keys of the Latin ones (ρ on R, π on P…).
const GREEK_KEYS: Record<string, string> = {
  Α: "A", Β: "B", Ψ: "C", Δ: "D", Ε: "E", Φ: "F", Γ: "G", Η: "H", Ι: "I", Ξ: "J", Κ: "K", Λ: "L", Μ: "M",
  Ν: "N", Ο: "O", Π: "P", Ρ: "R", Σ: "S", Τ: "T", Θ: "U", Ω: "V", Χ: "X", Υ: "Y", Ζ: "Z",
};
/** Letters typed with a Greek keyboard layout, as the Latin keys pressed ("κρ7" → "KR7"; ς is on W). */
export const greekKeysToLatin = (s: string) =>
  [...s].map((c) => (c === "ς" ? "W" : (GREEK_KEYS[fold(c).toUpperCase()] ?? c))).join("");
