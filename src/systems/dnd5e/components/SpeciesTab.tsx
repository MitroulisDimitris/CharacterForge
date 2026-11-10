import { ABILITIES, ABILITY_NAMES, SKILLS, type Ability, type SkillId } from "../data/core";
import type { FeatId } from "../data/feats";
import type { CasterAbility, Character } from "../character";
import type { Derived } from "../derive";
import { featIn, inBooks, onClassList } from "../rules";
import type { TabProps } from "../../types";
import { FeatChoicesEditor } from "./FeatChoicesEditor";
import { Card, ChipPicker, Counter, Field, Segmented, Select } from "../../../components/ui";

const asiSummary = (fixed: Partial<Record<Ability, number>> | undefined) =>
  Object.entries(fixed ?? {})
    .map(([a, n]) => `${a} +${n}`)
    .join(", ");

export function SpeciesTab({ c, d, set, books }: TabProps<Character, Derived>) {
  const R = d.rules;
  const sp = d.species;
  const is2014 = c.edition === "2014";
  const word = R.speciesWord;
  const takenSkills = d.skills.filter((s) => s.proficient).map((s) => s.id);
  const otherSkills = d.skills.filter((s) => s.proficient && !s.sources.includes(sp.name)).map((s) => s.id);
  const list = R.species.filter((s) => inBooks(books, s.book));
  const feat = featIn(R, c.humanFeat);
  const skillCount = sp.skillChoice?.count ?? d.lineage?.skillChoiceCount ?? 0;
  /** Racial feats only for the right race (2014 Xanathar's feats). */
  const raceOk = (f: { req?: { species?: string[]; lineage?: string[]; small?: boolean } }) =>
    !f.req || (!f.req.species && !f.req.lineage && !f.req.small) || !!f.req.species?.includes(sp.id) || !!f.req.lineage?.includes(c.lineage) || (!!f.req.small && c.size === "Small");
  const asiApplies = is2014 || d.bg.legacy;
  const amounts = [
    ...Object.values(sp.asi?.fixed ?? {}),
    ...Object.values(d.lineage?.asi ?? {}),
    ...Array(sp.asi?.chooseCount ?? 0).fill(sp.asi?.chooseAmount ?? 1),
  ].sort((a, b) => b - a) as number[];

  const pickSpecies = (id: string) => {
    const next = R.species.find((s) => s.id === id)!;
    set({
      species: id,
      lineage: next.lineages?.[0]?.id ?? "",
      size: next.sizes.includes(c.size) ? c.size : next.sizes[0],
      speciesSkills: [],
      legacyAsi: [],
      customAsi: [],
      speciesCantrip: "",
      languages: next.languages ? [...next.languages] : c.languages.includes("Common") ? c.languages : ["Common", ...c.languages],
    });
  };

  return (
    <div className="stack">
      <Card title={word}>
        <div className="option-grid">
          {list.map((s) => (
            <button type="button" key={s.id} className={`option ${c.species === s.id ? "on" : ""}`} aria-pressed={c.species === s.id} onClick={() => pickSpecies(s.id)}>
              <strong>{s.name}</strong>
              <span>
                {s.sizes.join("/")} · {s.speed} ft{s.darkvision ? ` · Darkvision ${s.darkvision} ft` : ""}
                {is2014 && s.asi ? ` · ${asiSummary(s.asi.fixed) || "+1 to two"}` : ""}
              </span>
              <small className="muted">{s.traits.map((t) => t.name).join(", ")}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card title={`${sp.name} choices`}>
        <div className="grid-3">
          {sp.sizes.length > 1 && (
            <Field label="Size">
              <Segmented value={c.size} options={sp.sizes.map((s) => ({ value: s, label: s }))} onChange={(size) => set({ size })} />
            </Field>
          )}
          {sp.lineages && (
            <Field label={sp.lineageLabel ?? "Lineage"} hint={d.lineage?.text}>
              <Select value={c.lineage} options={[{ value: "", label: "Choose…" }, ...sp.lineages.map((l) => ({ value: l.id, label: l.name }))]} onChange={(lineage) => set({ lineage, speciesCantrip: "" })} />
            </Field>
          )}
          {sp.spellAbilityChoice && (
            <Field label={`Spellcasting ability for ${word.toLowerCase()} spells`}>
              <Select<CasterAbility>
                value={c.speciesSpellAbility}
                options={(["INT", "WIS", "CHA"] as const).map((v) => ({ value: v, label: ABILITY_NAMES[v] }))}
                onChange={(speciesSpellAbility) => set({ speciesSpellAbility })}
              />
            </Field>
          )}
          {d.lineage?.cantripChoice && (
            <Field label={`${d.lineage.cantripChoice} cantrip`} hint="Uses Intelligence.">
              <Select
                value={c.speciesCantrip}
                options={[
                  { value: "", label: "Choose…" },
                  ...R.spells.filter((x) => x.level === 0 && onClassList(x, d.lineage!.cantripChoice!.toLowerCase(), books)).map((x) => ({ value: x.name, label: x.name })),
                  ...(c.speciesCantrip && !R.getSpell(c.speciesCantrip) ? [{ value: c.speciesCantrip, label: c.speciesCantrip }] : []),
                ]}
                onChange={(speciesCantrip) => set({ speciesCantrip })}
              />
            </Field>
          )}
        </div>

        {(sp.asi || d.lineage?.asi) && (
          <div className="sub-block">
            <div className="sub-head">
              <strong>Ability Score Increase</strong>
              <span className="muted">
                {[asiSummary(sp.asi?.fixed), asiSummary(d.lineage?.asi), sp.asi?.chooseCount ? `+${sp.asi.chooseAmount ?? 1} to ${sp.asi.chooseCount} of your choice` : ""].filter(Boolean).join(", ")}
              </span>
            </div>
            {!asiApplies ? (
              <p className="muted">You have a 2024 background, so ability increases come from the background instead.</p>
            ) : (
              <>
                {is2014 && books.includes("TCE") && (
                  <label className="check">
                    <input type="checkbox" checked={c.customOrigin} onChange={(e) => set({ customOrigin: e.target.checked, customAsi: [] })} /> Customize your origin (Tasha's): move
                    these increases to any abilities
                  </label>
                )}
                {c.customOrigin && is2014 && books.includes("TCE") ? (
                  <div className="grid-3">
                    {amounts.map((n, i) => (
                      <Field key={i} label={`+${n} to`}>
                        <Select<Ability | "">
                          value={c.customAsi[i] ?? ""}
                          options={[{ value: "", label: "Choose…" }, ...ABILITIES.map((a) => ({ value: a, label: ABILITY_NAMES[a], disabled: c.customAsi.includes(a) && c.customAsi[i] !== a }))]}
                          onChange={(v) => {
                            const next = [...c.customAsi];
                            next[i] = v as Ability;
                            set({ customAsi: next });
                          }}
                        />
                      </Field>
                    ))}
                  </div>
                ) : (
                  (sp.asi?.chooseCount ?? 0) > 0 && (
                    <ChipPicker<Ability>
                      options={ABILITIES.filter((a) => !(sp.asi?.exclude ?? []).includes(a)).map((a) => ({ value: a, label: ABILITY_NAMES[a], sub: `+${sp.asi?.chooseAmount ?? 1}` }))}
                      selected={c.legacyAsi}
                      max={sp.asi!.chooseCount!}
                      onChange={(legacyAsi) => set({ legacyAsi })}
                    />
                  )
                )}
              </>
            )}
          </div>
        )}

        {skillCount > 0 && (
          <div className="sub-block">
            <div className="sub-head">
              <strong>Skill proficiency</strong>
              <Counter count={c.speciesSkills.length} max={skillCount} label="Chosen" />
            </div>
            <ChipPicker<SkillId>
              options={(sp.skillChoice?.from ?? SKILLS.map((s) => s.id as SkillId)).map((id) => ({ value: id, label: SKILLS.find((s) => s.id === id)!.name }))}
              selected={c.speciesSkills}
              max={skillCount}
              locked={otherSkills.filter((s) => !c.speciesSkills.includes(s))}
              lockedLabel="proficient"
              onChange={(speciesSkills) => set({ speciesSkills })}
            />
          </div>
        )}

        {sp.originFeat && (
          <div className="sub-block">
            <div className="sub-head">
              <strong>{is2014 ? "Feat" : "Versatile: Origin feat"}</strong>
            </div>
            <div className="grid-3">
              <Field label="Feat" hint={feat.text}>
                <Select<FeatId> value={c.humanFeat} options={R.speciesFeats.filter((f) => inBooks(books, f.book) && (raceOk(f) || f.id === c.humanFeat)).map((f) => ({ value: f.id, label: f.name + (f.book !== (is2014 ? "PHB14" : "PHB24") ? ` (${f.book})` : "") }))} onChange={(humanFeat) => set({ humanFeat })} />
              </Field>
              {feat.plusOne && (
                <Field label="+1 to">
                  <Select<Ability>
                    value={feat.plusOne.includes(c.humanFeatPlusOne) ? c.humanFeatPlusOne : feat.plusOne[0]}
                    options={feat.plusOne.map((a) => ({ value: a, label: ABILITY_NAMES[a] }))}
                    onChange={(humanFeatPlusOne) => set({ humanFeatPlusOne })}
                  />
                </Field>
              )}
            </div>
            <FeatChoicesEditor feat={c.humanFeat} value={c.humanFeatChoices} onChange={(humanFeatChoices) => set({ humanFeatChoices })} takenSkills={takenSkills} edition={c.edition} />
          </div>
        )}
      </Card>

      <Card title="Traits">
        <ul className="feature-list">
          {sp.traits.map((t) => (
            <li key={t.name} className={t.minLevel && t.minLevel > c.level ? "future" : ""}>
              <strong>{t.name}</strong>
              {t.uses && <span className="pill">{t.uses}</span>}
              {t.minLevel && t.minLevel > 1 && <span className="pill">Level {t.minLevel}</span>}
              <p>{t.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
