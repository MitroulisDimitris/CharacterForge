// Guided creation for the 2014 rules, following the Player's Handbook's chapter 1 order
// (with the class first, because it shapes every later step). Each step reuses the editor's tab.
import { ABILITIES, ABILITY_NAMES } from "./data/core";
import type { Character, Details } from "./character";
import type { Derived } from "./derive";
import { STANDARD_ARRAY } from "./derive";
import type { CreationStep, TabProps } from "../types";
import { Card, Field } from "../../components/ui";
import { ClassTab } from "./components/ClassTab";
import { SpeciesTab } from "./components/SpeciesTab";
import { AbilitiesTab } from "./components/AbilitiesTab";
import { BackgroundTab } from "./components/BackgroundTab";
import { SkillsTab } from "./components/SkillsTab";
import { SpellsTab } from "./components/SpellsTab";
import { DetailsTab } from "./components/DetailsTab";
import { StartingEquipment } from "./components/StartingEquipment";
import { goldFormula } from "./startingKit";

const ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];

function AbilitiesStep(props: TabProps<Character, Derived>) {
  const { c, d, set } = props;
  const rec = d.cls.recommended;
  const useSuggestion = () => set({ abilityMethod: "standard", base: Object.fromEntries(rec.map((a, i) => [a, STANDARD_ARRAY[i]])) as Character["base"] });
  return (
    <div className="stack">
      <Card title={`Suggested for a ${d.cls.name}`}>
        <p>
          Put your highest score in <strong>{d.cls.primary}</strong>. A common standard-array layout:{" "}
          {rec.map((a, i) => `${ABILITY_NAMES[a]} ${STANDARD_ARRAY[i]}`).join(", ")}. Your {d.rules.speciesWord.toLowerCase()} bonuses are added on top.
        </p>
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={useSuggestion}>
            Use this layout
          </button>
          <span className="muted">
            Current base: {ABILITIES.map((a) => `${a} ${c.base[a]}`).join(" · ")}
          </span>
        </div>
      </Card>
      <AbilitiesTab {...props} />
    </div>
  );
}

function PersonalityCard({ c, set }: TabProps<Character, Derived>) {
  const setD = (k: keyof Details, v: string) => set({ details: { ...c.details, [k]: v } });
  return (
    <Card title="Personality" aside={<span className="muted">Optional now; your background's tables in the book give ideas</span>}>
      <div className="grid-3">
        <Field label="Alignment" hint="Your moral and ethical outlook.">
          <select value={c.details.alignment} onChange={(e) => setD("alignment", e.target.value)}>
            <option value="">Choose…</option>
            {ALIGNMENTS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid-2">
        {(
          [
            ["personality", "Personality traits", "Two small habits or quirks, e.g. 'I quote old proverbs for every occasion.'"],
            ["ideals", "Ideal", "What you believe in most, e.g. freedom, tradition, power."],
            ["bonds", "Bond", "A person, place or promise you care about."],
            ["flaws", "Flaw", "A weakness others could exploit."],
          ] as [keyof Details, string, string][]
        ).map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <textarea rows={2} value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
          </Field>
        ))}
      </div>
    </Card>
  );
}

function BackgroundStep(props: TabProps<Character, Derived>) {
  return (
    <div className="stack">
      <BackgroundTab {...props} />
      <PersonalityCard {...props} />
    </div>
  );
}

function EquipmentStep(props: TabProps<Character, Derived>) {
  return (
    <div className="stack">
      <StartingEquipment {...props} applyLabel="Use this equipment" />
      {props.c.inventory.length > 0 && (
        <Card title="Your inventory">
          <p>{props.c.inventory.map((i) => `${i.qty > 1 ? `${i.qty} × ` : ""}${i.name}`).join(", ")}</p>
          <p className="muted">
            {props.c.coins.gp} GP · AC {props.d.ac} ({props.d.acNote}). You can fine-tune everything later on the Equipment tab.
          </p>
        </Card>
      )}
    </div>
  );
}

function DetailsStep(props: TabProps<Character, Derived>) {
  return <DetailsTab {...props} />;
}

export const CREATION_STEPS_2014: CreationStep<Character, Derived>[] = [
  {
    id: "class",
    title: "Class",
    tabs: ["class"],
    intro: () =>
      "Your class is what your character does best: fight, sneak, heal or cast spells. It sets your hit points, proficiencies and level-1 features, so it comes first. Pick one, then make its level-1 choices below it.",
    Component: ClassTab,
    blocker: (c, d) => (d.rules.classes.some((k) => k.id === c.cls) ? null : "Choose a class to continue."),
  },
  {
    id: "species",
    title: "Race",
    tabs: ["species"],
    intro: (_c, d) =>
      `Your race gives ability score bonuses, speed, senses and a few traits. Some have a subrace to pick. With Tasha's you can move the ability bonuses to any abilities, which helps a ${d.cls.name} put them where they matter.`,
    Component: SpeciesTab,
  },
  {
    id: "abilities",
    title: "Ability scores",
    tabs: ["abilities"],
    intro: () =>
      "Six scores describe your body and mind. The standard array (15, 14, 13, 12, 10, 8) is quick and fair; point buy lets you fine-tune with 27 points; rolling 4d6 (drop the lowest) is the classic gamble. Ask your DM which method the table uses.",
    Component: AbilitiesStep,
  },
  {
    id: "background",
    title: "Background",
    tabs: ["background"],
    intro: () =>
      "Your background is what you did before adventuring. It gives two skills, tools or languages, starting gear and a feature that helps in the story. Then add a few words of personality: it makes the character easy to play.",
    Component: BackgroundStep,
  },
  {
    id: "skills",
    title: "Skills & languages",
    tabs: ["skills"],
    intro: () =>
      "Check your skills and pick your languages. If two sources give you the same skill, the rules let you pick a different one instead; the app flags any duplicates.",
    Component: SkillsTab,
  },
  {
    id: "equipment",
    title: "Equipment",
    tabs: ["equipment"],
    intro: (_c, d) =>
      `Take the ${d.cls.name.toLowerCase()}'s starting equipment (choose between the options) plus your background's, or roll starting gold (${goldFormula(d.cls)}) and buy your own. Press the button to put it in your inventory.`,
    Component: EquipmentStep,
  },
  {
    id: "spells",
    title: "Spells",
    tabs: ["spells"],
    intro: (_c, d) =>
      d.caster
        ? `Pick your cantrips and level-1 spells from the ${d.cls.name.toLowerCase()} list. ${d.spellsKind === "Known" ? "You keep these until you level up." : "You can change prepared spells after every Long Rest, so don't worry about getting it perfect."}`
        : `${d.cls.name}s don't cast spells at level 1. You can skip this step.`,
    Component: SpellsTab,
  },
  {
    id: "details",
    title: "Details",
    tabs: ["details"],
    intro: () => "Name your character and describe them: looks, age, backstory. Everything here is optional and can be filled in later.",
    Component: DetailsStep,
  },
];
