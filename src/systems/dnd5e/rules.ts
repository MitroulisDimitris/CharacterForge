// Everything that differs between the 2014 and 2024 D&D 5e rules, in one place.
import { BACKGROUNDS, type Background } from "./data/backgrounds";
import { FEATS_2024, type Feat, type FeatId } from "./data/feats";
import {
  METAMAGIC_2024,
  SORCERER_2024,
  SORCERER_FEATURES_2024,
  SUBCLASSES_2024,
  type LevelFeature,
  type Metamagic,
  type SorcererTable,
  type Subclass,
} from "./data/sorcerer";
import { SPECIES, type Species } from "./data/species";
import { SPELLS, type Spell } from "./data/spells";
import { BACKGROUNDS_2014 } from "./data2014/backgrounds";
import { FEATS_2014 } from "./data2014/feats";
import { RACES_2014 } from "./data2014/races";
import { METAMAGIC_2014, SORCERER_2014, SORCERER_FEATURES_2014, SUBCLASSES_2014 } from "./data2014/sorcerer";
import { SPELLS_2014 } from "./data2014/spells";
import { CLASSES_2014 } from "./data2014/classes";
import { sorcererClass, type ClassDef } from "./data/classes";

export type Edition = "2014" | "2024";

export interface EditionRules {
  edition: Edition;
  /** Word for species in this edition. */
  speciesWord: "Species" | "Race";
  sorcerer: SorcererTable;
  features: LevelFeature[];
  metamagic: Metamagic[];
  subclasses: Subclass[];
  species: Species[];
  backgrounds: Background[];
  feats: Feat[];
  /** Feats a Human (2024 Versatile / 2014 Variant) can take. */
  speciesFeats: Feat[];
  level4Feats: Feat[];
  spells: Spell[];
  /** Classes offered in this edition (2024: Sorcerer only). */
  classes: ClassDef[];
  getSpell(name: string): Spell | undefined;
}

const make = (r: Omit<EditionRules, "getSpell">): EditionRules => {
  const map = new Map(r.spells.map((s) => [s.name, s]));
  return { ...r, getSpell: (n) => map.get(n) };
};

export const RULES: Record<Edition, EditionRules> = {
  "2024": make({
    edition: "2024",
    speciesWord: "Species",
    sorcerer: SORCERER_2024,
    features: SORCERER_FEATURES_2024,
    metamagic: METAMAGIC_2024,
    subclasses: SUBCLASSES_2024,
    species: SPECIES,
    backgrounds: BACKGROUNDS,
    feats: FEATS_2024,
    speciesFeats: FEATS_2024.filter((f) => f.category === "origin"),
    level4Feats: [...FEATS_2024.filter((f) => f.category === "general"), ...FEATS_2024.filter((f) => f.category === "origin")],
    spells: SPELLS,
    classes: [sorcererClass(SORCERER_2024, SORCERER_FEATURES_2024, SUBCLASSES_2024, METAMAGIC_2024, "2024")],
  }),
  "2014": make({
    edition: "2014",
    speciesWord: "Race",
    sorcerer: SORCERER_2014,
    features: SORCERER_FEATURES_2014,
    metamagic: METAMAGIC_2014,
    subclasses: SUBCLASSES_2014,
    species: RACES_2014,
    backgrounds: BACKGROUNDS_2014,
    feats: FEATS_2014,
    speciesFeats: FEATS_2014.filter((f) => f.id !== "asi"),
    level4Feats: FEATS_2014,
    spells: SPELLS_2014,
    classes: CLASSES_2014,
  }),
};

export const featIn = (r: EditionRules, id: FeatId) => r.feats.find((f) => f.id === id) ?? r.feats[0];
export const inBooks = (books: string[], book: string | undefined) => !book || books.includes(book);
/** Is this spell on the sorcerer list with these books? */
export const onSorcererList = (s: Spell, books: string[]) => s.sorcerer && inBooks(books, s.book) && inBooks(books, s.listBook);

/** The character's class (falls back to the edition's first class with a Sorcerer default). */
export const classOf = (r: EditionRules, id: string): ClassDef => r.classes.find((c) => c.id === id) ?? r.classes.find((c) => c.id === "sorcerer") ?? r.classes[0];

/** Is this spell on a class's list with these books? `extra` = spells a subclass adds (warlock patrons). */
export function onClassList(s: Spell, list: string, books: string[], extra: string[] = []) {
  if (!inBooks(books, s.book)) return false;
  if (extra.includes(s.name)) return true;
  if (list === "sorcerer") return onSorcererList(s, books);
  return (s.lists ?? []).some((l) => {
    const [cls, book] = l.split("@");
    return cls === list && inBooks(books, book);
  });
}
