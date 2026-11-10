import { SKILLS, type SkillId } from "../data/core";
import { MAGIC_INITIATE_LISTS, type FeatId, type MagicInitiateList } from "../data/feats";
import type { CasterAbility, FeatChoices } from "../character";
import type { Edition } from "../rules";
import { ChipPicker, Field, Select } from "../../../components/ui";
import { FIGHTING_STYLES } from "../data2014/classes";

/** Extra inputs for feats that need picks (Skilled, Magic Initiate, Fey Touched). */
export function FeatChoicesEditor({
  feat,
  value,
  onChange,
  fixedList,
  takenSkills,
  edition,
}: {
  feat: FeatId;
  value: FeatChoices;
  onChange: (v: FeatChoices) => void;
  fixedList?: MagicInitiateList;
  takenSkills: SkillId[];
  edition: Edition;
}) {
  if (feat === "skilled") {
    return (
      <div className="feat-choices">
        <p className="muted">Skilled: choose three skills (tools are allowed too; add them under Skills &amp; Languages → Other tools).</p>
        <ChipPicker
          options={SKILLS.map((s) => ({ value: s.id as SkillId, label: s.name }))}
          selected={value.skills}
          max={3}
          locked={takenSkills.filter((s) => !value.skills.includes(s))}
          lockedLabel="proficient"
          onChange={(skills) => onChange({ ...value, skills })}
        />
      </div>
    );
  }
  if (feat === "skillExpert" || feat === "prodigy" || feat === "squatNimbleness") {
    const pool = feat === "squatNimbleness" ? SKILLS.filter((x) => x.id === "athletics" || x.id === "acrobatics") : SKILLS;
    return (
      <div className="feat-choices">
        <p className="muted">Choose the skill you gain{feat === "squatNimbleness" ? "." : ", then a skill you're proficient in for expertise (double PB)."}</p>
        <ChipPicker
          options={pool.map((x) => ({ value: x.id as SkillId, label: x.name }))}
          selected={value.skills.slice(0, 1)}
          max={1}
          locked={takenSkills.filter((x) => !value.skills.includes(x))}
          lockedLabel="proficient"
          onChange={(skills) => onChange({ ...value, skills })}
        />
        {feat !== "squatNimbleness" && (
          <div className="grid-3">
            <Field label="Expertise in">
              <Select
                value={value.expertise ?? ""}
                options={[{ value: "", label: "Choose…" }, ...SKILLS.filter((x) => takenSkills.includes(x.id as SkillId) || value.skills.includes(x.id as SkillId)).map((x) => ({ value: x.id as string, label: x.name }))]}
                onChange={(v) => onChange({ ...value, expertise: v as SkillId | "" })}
              />
            </Field>
          </div>
        )}
      </div>
    );
  }
  if (feat === "fightingInitiate") {
    return (
      <div className="feat-choices grid-3">
        <Field label="Fighting style">
          <Select value={value.style ?? ""} options={[{ value: "", label: "Choose…" }, ...FIGHTING_STYLES.map((x) => ({ value: x.id, label: x.name }))]} onChange={(style) => onChange({ ...value, style })} />
        </Field>
      </div>
    );
  }
  if (feat === "shadowTouched") {
    return (
      <div className="feat-choices grid-3">
        <Field label="Invisibility" hint="Always learned">
          <input value="Invisibility" disabled />
        </Field>
        <Field label="1st-level illusion or necromancy spell">
          <input value={value.miSpell} onChange={(e) => onChange({ ...value, miSpell: e.target.value })} placeholder="e.g. Silent Image" />
        </Field>
      </div>
    );
  }
  if (feat === "artificerInitiate" || feat === "woodElfMagic") {
    return (
      <div className="feat-choices grid-3">
        <Field label={feat === "woodElfMagic" ? "Druid cantrip" : "Artificer cantrip"}>
          <input value={value.miCantrips[0]} onChange={(e) => onChange({ ...value, miCantrips: [e.target.value, value.miCantrips[1]] })} placeholder="e.g. Guidance" />
        </Field>
        {feat === "artificerInitiate" && (
          <Field label="1st-level artificer spell">
            <input value={value.miSpell} onChange={(e) => onChange({ ...value, miSpell: e.target.value })} placeholder="e.g. Cure Wounds" />
          </Field>
        )}
      </div>
    );
  }
  if (feat === "feyTouched") {
    return (
      <div className="feat-choices grid-3">
        <Field label="Granted spell">
          <input value="Misty Step" disabled />
        </Field>
        <Field label="1st-level divination or enchantment spell">
          <input value={value.miSpell} onChange={(e) => onChange({ ...value, miSpell: e.target.value })} placeholder="e.g. Bless" />
        </Field>
      </div>
    );
  }
  if (feat === "magicInitiate") {
    const lists: readonly MagicInitiateList[] = edition === "2014" ? MAGIC_INITIATE_LISTS : ["Cleric", "Druid", "Wizard"];
    const list = fixedList ?? value.miList;
    return (
      <div className="feat-choices grid-3">
        <Field label="Spell list">
          {fixedList ? (
            <input value={fixedList} disabled />
          ) : (
            <Select<MagicInitiateList> value={lists.includes(value.miList) ? value.miList : lists[0]} options={lists.map((v) => ({ value: v, label: v }))} onChange={(miList) => onChange({ ...value, miList })} />
          )}
        </Field>
        {edition === "2024" ? (
          <Field label="Spellcasting ability">
            <Select<CasterAbility> value={value.miAbility} options={(["INT", "WIS", "CHA"] as const).map((v) => ({ value: v, label: v }))} onChange={(miAbility) => onChange({ ...value, miAbility })} />
          </Field>
        ) : (
          <Field label="Spellcasting ability">
            <input value={`Uses the ${list}'s ability`} disabled />
          </Field>
        )}
        <Field label={`${list} cantrip 1`}>
          <input value={value.miCantrips[0]} onChange={(e) => onChange({ ...value, miCantrips: [e.target.value, value.miCantrips[1]] })} placeholder="e.g. Guidance" />
        </Field>
        <Field label={`${list} cantrip 2`}>
          <input value={value.miCantrips[1]} onChange={(e) => onChange({ ...value, miCantrips: [value.miCantrips[0], e.target.value] })} placeholder="e.g. Light" />
        </Field>
        <Field label={`${list} 1st-level spell`}>
          <input value={value.miSpell} onChange={(e) => onChange({ ...value, miSpell: e.target.value })} placeholder="e.g. Bless" />
        </Field>
      </div>
    );
  }
  return null;
}
