// Full text of every 2014 spell in the app (user, 2026-11-23: "I'd like to have the full detail on
// everything"): public/spell-text-2014.json, made by scripts/spelltext.py + spelltextclean.py from
// the user's own books (SRD spells: the SRD 5.1 text, which is the book's). Loaded once, on demand.
import { useEffect, useState } from "react";

/** A paragraph, a small table (first row = heads) or a stat block (first line = its name). */
export type SpellPart = string | { table: string[][] } | { block: string[] };
export interface FullSpellText {
  /** PHB14, XGE or TCE. */
  book: string;
  /** Printed page (not known for the scanned PHB). */
  page?: number;
  text: SpellPart[];
  higher: string;
}
export type SpellTexts = Record<string, FullSpellText>;

const BOOKS: Record<string, string> = { PHB14: "Player's Handbook", XGE: "Xanathar's Guide to Everything", TCE: "Tasha's Cauldron of Everything" };
/** "Xanathar's Guide to Everything, page 157" */
export const bookRef = (t: FullSpellText) => `${BOOKS[t.book] ?? t.book}${t.page ? `, page ${t.page}` : ""}`;

let file: Promise<SpellTexts> | null = null;
export function loadSpellTexts(): Promise<SpellTexts> {
  file ??= fetch(`${import.meta.env.BASE_URL}spell-text-2014.json`)
    .then((r) => (r.ok ? (r.json() as Promise<SpellTexts>) : Promise.reject(new Error(`spell text ${r.status}`))))
    .catch((e) => {
      file = null;
      throw e;
    });
  return file;
}

/** The texts once loaded (null before, or when `on` is false: 2024 characters keep the summaries). */
export function useSpellTexts(on = true): SpellTexts | null {
  const [t, setT] = useState<SpellTexts | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true;
    loadSpellTexts().then(
      (x) => live && setT(x),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [on]);
  return on ? t : null;
}

/** Plain paragraphs only (search, dice reading). */
export const plainText = (t: FullSpellText) => t.text.filter((p): p is string => typeof p === "string").join("\n");
