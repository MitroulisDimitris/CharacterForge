// D&D 5th edition plugins: one engine, two rule sets (2024 and 2014).
import type { GameSystem } from "../types";
import { blankCharacter, defaultCharacter, freshCharacter2014, normalizeCharacter, type Character } from "./character";
import { RULES, classOf } from "./rules";
import { CREATION_STEPS_2014 } from "./creation";
import { deriveCharacter, type Derived } from "./derive";
import { progression5e } from "./progression";
import { MAX_LEVEL } from "./data/sorcerer";
import { AbilitiesTab } from "./components/AbilitiesTab";
import { BackgroundTab } from "./components/BackgroundTab";
import { ClassTab } from "./components/ClassTab";
import { DetailsTab } from "./components/DetailsTab";
import { EquipmentTab } from "./components/EquipmentTab";
import { SkillsTab } from "./components/SkillsTab";
import { SpeciesTab } from "./components/SpeciesTab";
import { SpellsTab } from "./components/SpellsTab";
import { Summary } from "./components/Summary";

const tabs = (speciesWord: string) => [
  { id: "class", label: "Class", Component: ClassTab },
  { id: "species", label: speciesWord, Component: SpeciesTab },
  { id: "background", label: "Background", Component: BackgroundTab },
  { id: "abilities", label: "Abilities", Component: AbilitiesTab },
  { id: "skills", label: "Skills & Languages", Component: SkillsTab },
  { id: "spells", label: "Spells", Component: SpellsTab },
  { id: "equipment", label: "Equipment", Component: EquipmentTab },
  { id: "details", label: "Details", Component: DetailsTab },
];

const CREDITS_2024 =
  "Includes material from the System Reference Document 5.2 by Wizards of the Coast LLC (CC-BY-4.0). Other rules are summarized in our own words; see the Player's Handbook.";
const CREDITS_2014 =
  "Includes material from the System Reference Document 5.1 by Wizards of the Coast LLC (CC-BY-4.0). Other rules are summarized in our own words; see the Player's Handbook, Xanathar's and Tasha's.";

export const dnd2024: GameSystem<Character, Derived> = {
  id: "dnd2024",
  name: "D&D 5e — 2024 rules",
  short: "D&D 2024",
  tagline: "The current Player's Handbook (2024). Backgrounds give ability increases and an origin feat.",
  books: [
    { id: "PHB24", name: "Player's Handbook (2024)", abbr: "PHB'24", core: true },
    { id: "PHB14", name: "Legacy options from the Player's Handbook (2014)", abbr: "PHB'14", note: "e.g. the Half-Elf and the 2014 Criminal / Spy background" },
    { id: "XGE", name: "Xanathar's Guide to Everything", abbr: "XGE", note: "Extra spells such as Melf's Minute Meteors" },
  ],
  maxLevel: MAX_LEVEL,
  templates: [
    { id: "parry", name: "Parry Hotter (level 5)", description: "Half-Elf Draconic Sorcerer, the corrected level 5 sheet.", books: ["PHB24", "PHB14", "XGE"], make: defaultCharacter },
    { id: "blank", name: "Blank Sorcerer", description: "Level 1 with nothing chosen yet.", books: ["PHB24"], make: () => blankCharacter("2024") },
  ],
  normalize: (raw) => normalizeCharacter(raw, "2024"),
  derive: (c, books) => deriveCharacter({ ...c, edition: "2024" }, books),
  tabs: tabs("Species"),
  Summary,
  progression: progression5e,
  buildPdf: async (c, d) => (await import("./pdf")).buildPdf(c, d, CREDITS_2024),
  credits: CREDITS_2024,
};

export const dnd2014: GameSystem<Character, Derived> = {
  id: "dnd2014",
  name: "D&D 5e — 2014 rules",
  short: "D&D 2014",
  tagline: "The original 5th edition Player's Handbook, with Xanathar's and Tasha's. All 12 classes plus the Artificer, built step by step from level 1.",
  books: [
    { id: "PHB14", name: "Player's Handbook (2014)", abbr: "PHB", core: true },
    { id: "XGE", name: "Xanathar's Guide to Everything", abbr: "XGE", note: "More subclasses (e.g. Forge and Grave domains, Celestial and Hexblade patrons, Divine Soul), racial feats, many spells" },
    { id: "TCE", name: "Tasha's Cauldron of Everything", abbr: "TCE", note: "The Artificer, more subclasses, optional class features, custom origin and Custom Lineage, new feats and spells" },
  ],
  maxLevel: MAX_LEVEL,
  maxLevelFor: (c) => classOf(RULES["2014"], c.cls).maxLevel,
  templates: [],
  creation: { fresh: freshCharacter2014, steps: CREATION_STEPS_2014 },
  normalize: (raw) => {
    const c = normalizeCharacter(raw, "2014");
    return { ...c, level: Math.min(c.level, classOf(RULES["2014"], c.cls).maxLevel) };
  },
  derive: (c, books) => deriveCharacter({ ...c, edition: "2014" }, books),
  tabs: tabs("Race"),
  Summary,
  progression: progression5e,
  buildPdf: async (c, d) => (await import("./pdf")).buildPdf(c, d, CREDITS_2014),
  credits: CREDITS_2014,
};
