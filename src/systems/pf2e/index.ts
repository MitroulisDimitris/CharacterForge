import type { GameSystem } from "../types";
import { blankPF2, normalizePF2, parryPF2, type CharacterPF2 } from "./character";
import { derivePF2, type DerivedPF2 } from "./derive";
import { progressionPF2 } from "./progression";
import { MAX_LEVEL_PF2 } from "./data";
import { AncestryTab, AttributesTab, BackgroundTabPF2, ClassTabPF2, DetailsTabPF2, EquipmentTabPF2, FeatsTabPF2, SkillsTabPF2, SpellsTabPF2, SummaryPF2 } from "./tabs";

const CREDITS =
  "Pathfinder 2e Remaster rules (Player Core, Player Core 2) by Paizo Inc., used under the ORC License. Checked against Archives of Nethys; summaries in our own words.";

export const pf2e: GameSystem<CharacterPF2, DerivedPF2> = {
  id: "pf2e",
  name: "Pathfinder 2e (Remaster)",
  short: "Pathfinder 2e",
  tagline: "Paizo's Player Core rules: ancestries and heritages, attribute boosts, proficiency ranks and the three-action economy.",
  books: [
    { id: "PC", name: "Player Core", abbr: "PC", core: true, note: "Ancestries, backgrounds, spells" },
    { id: "PC2", name: "Player Core 2", abbr: "PC2", core: true, note: "The Sorcerer class and bloodlines, plus more ancestries" },
  ],
  maxLevel: MAX_LEVEL_PF2,
  templates: [
    { id: "parry", name: "Parry Hotter (level 5)", description: "Human (Aiuvarin, his half-elf heritage) Criminal with the Draconic bloodline (arcane).", books: ["PC", "PC2"], make: parryPF2 },
    { id: "blank", name: "Blank Sorcerer", description: "Level 1 Human with nothing chosen yet.", books: ["PC", "PC2"], make: blankPF2 },
  ],
  normalize: normalizePF2,
  derive: (c) => derivePF2(c),
  tabs: [
    { id: "class", label: "Class & Bloodline", Component: ClassTabPF2 },
    { id: "ancestry", label: "Ancestry & Heritage", Component: AncestryTab },
    { id: "background", label: "Background", Component: BackgroundTabPF2 },
    { id: "abilities", label: "Attributes", Component: AttributesTab },
    { id: "skills", label: "Skills", Component: SkillsTabPF2 },
    { id: "feats", label: "Feats", Component: FeatsTabPF2 },
    { id: "spells", label: "Spells", Component: SpellsTabPF2 },
    { id: "equipment", label: "Equipment", Component: EquipmentTabPF2 },
    { id: "details", label: "Details", Component: DetailsTabPF2 },
  ],
  Summary: SummaryPF2,
  progression: progressionPF2,
  buildPdf: async (c, d) => (await import("./pdf")).buildPdfPF2(c, d, CREDITS),
  credits: CREDITS,
  dataNote: "Ancestry, class and skill feats are typed in by name for now; the app applies Toughness, Fleet and other simple general feats automatically.",
};
