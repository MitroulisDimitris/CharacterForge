import { ABILITY_NAMES, SKILL_IDS, skillName, type Ability, type SkillId } from "../data/core";
import { BACKGROUND_FEATURES } from "../data2014/backgrounds";
import type { Character } from "../character";
import type { Derived } from "../derive";
import { featIn, inBooks } from "../rules";
import type { TabProps } from "../../types";
import { FeatChoicesEditor } from "./FeatChoicesEditor";
import { Card, ChipPicker, Counter, Field, Segmented, Select } from "../../../components/ui";

export function BackgroundTab({ c, d, set, books }: TabProps<Character, Derived>) {
  const R = d.rules;
  const bg = d.bg;
  const is2014 = c.edition === "2014";
  const takenSkills = d.skills.filter((s) => s.proficient).map((s) => s.id);
  const list = R.backgrounds.filter((b) => inBooks(books, b.book));

  const pick = (id: string) => {
    const next = R.backgrounds.find((b) => b.id === id)!;
    const patch: Partial<Character> = { background: id };
    if (next.abilities) {
      // Default to the background's best pick for a Sorcerer: CHA if offered.
      const p2 = next.abilities.includes("CHA") ? "CHA" : next.abilities.includes("CON") ? "CON" : next.abilities[0];
      patch.bgPlus2 = p2;
      patch.bgPlus1 = next.abilities.find((a) => a !== p2 && a === "CON") ?? next.abilities.find((a) => a !== p2)!;
    }
    set(patch);
  };

  return (
    <div className="stack">
      <Card title="Background">
        <div className="option-grid">
          {list.map((b) => (
            <button type="button" key={b.id} className={`option ${c.background === b.id ? "on" : ""}`} aria-pressed={c.background === b.id} onClick={() => pick(b.id)}>
              <strong>{b.name}</strong>
              <span>{b.custom ? "Any two skills, two tools or languages, and a feature from any background" : b.skills.map(skillName).join(", ")}</span>
              <small className="muted">
                {b.abilities ? `${b.abilities.join(" / ")} · ${featIn(R, b.feat!).name}` : is2014 ? (b.feature?.name ?? "") : "No ability increases or feat"}
              </small>
            </button>
          ))}
        </div>
      </Card>

      {bg.abilities && !is2014 ? (
        <Card title="Ability score increases" aside={<span className="muted">{bg.abilities.join(", ")}</span>}>
          <Segmented
            value={c.bgAsiMode}
            options={[
              { value: "2-1", label: "+2 and +1" },
              { value: "1-1-1", label: "+1 to all three" },
            ]}
            onChange={(bgAsiMode) => set({ bgAsiMode })}
          />
          {c.bgAsiMode === "2-1" && (
            <div className="grid-3">
              <Field label="+2 to">
                <Select<Ability>
                  value={bg.abilities.includes(c.bgPlus2) ? c.bgPlus2 : bg.abilities[0]}
                  options={bg.abilities.map((a) => ({ value: a, label: ABILITY_NAMES[a] }))}
                  onChange={(bgPlus2) => set({ bgPlus2, bgPlus1: bgPlus2 === c.bgPlus1 ? bg.abilities!.find((a) => a !== bgPlus2)! : c.bgPlus1 })}
                />
              </Field>
              <Field label="+1 to">
                <Select<Ability>
                  value={bg.abilities.includes(c.bgPlus1) ? c.bgPlus1 : bg.abilities[1]}
                  options={bg.abilities.map((a) => ({ value: a, label: ABILITY_NAMES[a], disabled: a === c.bgPlus2 }))}
                  onChange={(bgPlus1) => set({ bgPlus1 })}
                />
              </Field>
            </div>
          )}
        </Card>
      ) : !is2014 ? (
        <Card title="Legacy background">
          <p className="muted">
            2014 backgrounds don't give ability increases or an origin feat. Your ability increases come from a legacy species like the Half-Elf. Switch to a 2024 background to get a free
            origin feat (for example, the 2024 Criminal gives Alert).
          </p>
        </Card>
      ) : null}

      {!is2014 && !bg.legacy && bg.feat && (
        <Card title={`Origin feat: ${featIn(R, bg.feat).name}`}>
          <p>{featIn(R, bg.feat).text}</p>
          <FeatChoicesEditor feat={bg.feat} value={c.bgFeatChoices} fixedList={bg.featList} onChange={(bgFeatChoices) => set({ bgFeatChoices })} takenSkills={takenSkills} edition={c.edition} />
        </Card>
      )}

      {is2014 && bg.custom && (
        <Card title="Custom background" aside={<span className="muted">Player's Handbook rule: agree it with your DM</span>}>
          <p className="muted">Build a background that fits your story: any two skills, a total of two tool proficiencies or languages, and the feature of any background.</p>
          <div className="sub-head">
            <strong>Skills</strong>
            <Counter count={c.bgCustomSkills.length} max={2} label="Chosen" />
          </div>
          <ChipPicker<SkillId>
            options={SKILL_IDS.map((id) => ({ value: id, label: skillName(id) }))}
            selected={c.bgCustomSkills}
            max={2}
            locked={takenSkills.filter((s) => !c.bgCustomSkills.includes(s))}
            lockedLabel="proficient"
            onChange={(bgCustomSkills) => set({ bgCustomSkills })}
          />
          <div className="grid-3">
            <Field label="Languages (the rest are tools)">
              <Select
                value={String(c.bgCustomLanguages)}
                options={[0, 1, 2].map((n) => ({ value: String(n), label: `${n} language${n === 1 ? "" : "s"}, ${2 - n} tool${2 - n === 1 ? "" : "s"}` }))}
                onChange={(v) => set({ bgCustomLanguages: Number(v) })}
              />
            </Field>
            <Field label="Tools" hint="e.g. Thieves' Tools, Dice Set">
              <input value={c.bgCustomTools} onChange={(e) => set({ bgCustomTools: e.target.value })} placeholder="Tool proficiencies" />
            </Field>
            <Field label="Feature" hint={BACKGROUND_FEATURES.find((f) => f.id === c.bgCustomFeature)?.text}>
              <Select
                value={c.bgCustomFeature}
                options={[{ value: "", label: "Choose…" }, ...BACKGROUND_FEATURES.map((f) => ({ value: f.id, label: `${f.name} (${f.from})` }))]}
                onChange={(bgCustomFeature) => set({ bgCustomFeature })}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card title="Proficiencies & equipment">
        <dl className="kv wide">
          <dt>Skills</dt>
          <dd>{(bg.custom ? c.bgCustomSkills : bg.skills).map(skillName).join(", ") || "—"}</dd>
          <dt>Tools</dt>
          <dd>{(bg.custom ? c.bgCustomTools : bg.tools) || "—"}</dd>
          {is2014 && (
            <>
              <dt>Languages</dt>
              <dd>{(bg.custom ? c.bgCustomLanguages : bg.languages) ? `${bg.custom ? c.bgCustomLanguages : bg.languages} of your choice` : "—"}</dd>
            </>
          )}
          <dt>Starting equipment</dt>
          <dd>{bg.equipment}</dd>
          {bg.feature && !bg.custom && (
            <>
              <dt>{bg.feature.name}</dt>
              <dd>{bg.feature.text}</dd>
            </>
          )}
        </dl>
      </Card>
    </div>
  );
}
