import type { GameSystem } from "../types";
import { blank35, normalize35, parry35, type Character35 } from "./character";
import { derive35, type Derived35 } from "./derive";
import { progression35 } from "./progression";
import { MAX_LEVEL_35 } from "./data";
import { AbilitiesTab35, ClassTab35, DetailsTab35, EquipmentTab35, FeatsTab35, RaceTab, SkillsTab35, SpellsTab35, Summary35 } from "./tabs";

const CREDITS =
  "Rules from the D&D 3.5 System Reference Document (Open Game License v1.0a, Wizards of the Coast). Summaries in our own words; check the Player's Handbook v3.5.";

export const dnd35: GameSystem<Character35, Derived35> = {
  id: "dnd35",
  name: "D&D 3rd edition (3.5)",
  short: "D&D 3.5",
  tagline: "The classic 3.5 rules: skill ranks, feats every few levels, BAB and Fort/Ref/Will saves, spells per day.",
  books: [{ id: "PHB35", name: "Player's Handbook v3.5", abbr: "PHB 3.5", core: true }],
  maxLevel: MAX_LEVEL_35,
  templates: [
    { id: "parry", name: "Parry Hotter (level 5)", description: "Half-Elf Sorcerer 5. Core 3.5 has no draconic bloodline, so he's a plain Sorcerer.", books: ["PHB35"], make: parry35 },
    { id: "blank", name: "Blank Sorcerer", description: "Level 1 Human with the elite array.", books: ["PHB35"], make: blank35 },
  ],
  normalize: normalize35,
  derive: (c) => derive35(c),
  tabs: [
    { id: "class", label: "Class", Component: ClassTab35 },
    { id: "race", label: "Race & Languages", Component: RaceTab },
    { id: "abilities", label: "Abilities", Component: AbilitiesTab35 },
    { id: "skills", label: "Skills", Component: SkillsTab35 },
    { id: "feats", label: "Feats", Component: FeatsTab35 },
    { id: "spells", label: "Spells", Component: SpellsTab35 },
    { id: "equipment", label: "Equipment", Component: EquipmentTab35 },
    { id: "details", label: "Details", Component: DetailsTab35 },
  ],
  Summary: Summary35,
  progression: progression35,
  buildPdf: async (c, d) => (await import("./pdf")).buildPdf35(c, d, CREDITS),
  credits: CREDITS,
  dataNote:
    "3.5 data was written from the System Reference Document as I know it — the public SRD sites blocked automated checks. Double-check anything that looks off against your Player's Handbook.",
};
