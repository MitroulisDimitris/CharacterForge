import { ABILITY_NAMES, SKILL_IDS, mod, skillName, type SkillId } from "../data/core";
import { ARTISAN_TOOLS, MUSICAL_INSTRUMENTS } from "../data/equipment";
import type { ClassDef } from "../data/classes";
import { FAVORED_ENEMIES, FAVORED_TERRAINS, stylesFor } from "../data2014/classes";
import { INFUSIONS, INVOCATIONS, PACT_BOONS } from "../data2014/warlock";
import type { Character } from "../character";
import type { Derived } from "../derive";
import { inBooks, onClassList } from "../rules";
import type { TabProps } from "../../types";
import { Card, ChipPicker, Counter, Field, Segmented, Select } from "../../../components/ui";

/** Everything a class choice resets (picks that belong to the old class). */
export const classResetPatch = (cls: ClassDef, level: number): Partial<Character> => ({
  cls: cls.id,
  subclass: "",
  subclassOption: "",
  classSkills: [],
  cantrips: [],
  prepared: [],
  spellbook: [],
  metamagic: [],
  fightingStyle: "",
  expertise: [],
  favoredEnemy: "",
  favoredTerrain: "",
  deftExpertise: "",
  classTools: [],
  subclassSkills: [],
  subclassCantrip: "",
  subclassPicks: [],
  invocations: [],
  pactBoon: "",
  tomeCantrips: [],
  infusions: [],
  styleCantrips: [],
  equipPicks: {},
  level: Math.min(level, cls.maxLevel),
});

/** Class picker (2014): one card per class, with its role in plain words. */
export function ClassPicker({ c, d, set, books }: TabProps<Character, Derived>) {
  const classes = d.rules.classes.filter((k) => inBooks(books, k.book));
  return (
    <div className="option-grid">
      {classes.map((k) => (
        <button
          type="button"
          key={k.id}
          className={`option ${c.cls === k.id ? "on" : ""}`}
          aria-pressed={c.cls === k.id}
          onClick={() => c.cls !== k.id && set(classResetPatch(k, c.level))}
        >
          <strong>
            {k.name} <span className="pill">d{k.hitDie}</span>
            {k.book !== "PHB14" && <span className="pill">{k.book}</span>}
          </strong>
          <span>{k.summary}</span>
          <small className="muted">
            Main ability: {k.primary} · Saves {k.saves.join(", ")}
            {k.spell ? ` · Spells from level ${k.spell.startLevel}` : " · No spells"}
          </small>
        </button>
      ))}
    </div>
  );
}

export function ClassTab(props: TabProps<Character, Derived>) {
  const { c, d, set, books } = props;
  const R = d.rules;
  const CL = d.cls;
  const is2014 = c.edition === "2014";
  const grantedElsewhere = d.skills.filter((s) => s.proficient && !s.sources.includes(CL.name)).map((s) => s.id);
  const conMod = mod(d.scores.CON);
  const subclasses = CL.subclasses.filter((s) => inBooks(books, s.book));
  const metamagic = (CL.sorcery?.metamagic ?? []).filter((m) => inBooks(books, m.book));
  const features = CL.features.filter((f) => inBooks(books, f.book));
  const sub = d.subclass;
  const skillPool: SkillId[] = CL.skills.from === "any" ? SKILL_IDS : CL.skills.from;
  const SP = CL.spell;
  const levels = Array.from({ length: Math.max(CL.maxLevel, c.level) }, (_, i) => i + 1);
  const tashaOk = books.includes("TCE");
  const proficientSkills = d.skills.filter((s) => s.proficient).map((s) => s.id);

  return (
    <div className="stack">
      {/* The class is picked at level 1; past that, changing it would mean multiclassing (not supported). */}
      {is2014 && c.level === 1 && (
        <Card title="Class" aside={<span className="muted">Changing it clears your class choices</span>}>
          <ClassPicker {...props} />
        </Card>
      )}

      <Card title={`${CL.name} (${c.edition} rules)`} aside={<span className="muted">Hit Die d{CL.hitDie} · Saves {CL.saves.join(", ")}</span>}>
        <p className="lead">{CL.summary}</p>
        <dl className="prof-list">
          <dt>Armor</dt>
          <dd>{d.armorText}</dd>
          <dt>Weapons</dt>
          <dd>{d.weaponText}</dd>
          <dt>Tools</dt>
          <dd>{d.tools || "None"}</dd>
          <dt>Raise first</dt>
          <dd>{CL.primary}</dd>
        </dl>
        <table className="level-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>PB</th>
              <th>Features</th>
              {CL.sorcery && <th>SP</th>}
              {SP && <th>Cantrips</th>}
              {SP && <th>{SP.label}</th>}
              {SP && <th>Slots</th>}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l} className={l === c.level ? "current" : l > c.level ? "future" : ""}>
                <td>{l}</td>
                <td>+{2 + Math.floor((l - 1) / 4)}</td>
                <td>{features.filter((f) => f.level === l && !f.replaces).map((f) => f.name).join(", ")}</td>
                {CL.sorcery && <td>{CL.sorcery.points[l] || "—"}</td>}
                {SP && <td>{SP.cantrips[l] || "—"}</td>}
                {SP && <td>{l < SP.startLevel ? "—" : SP.table ? SP.table[l] : `${ABILITY_NAMES[SP.ability].slice(0, 3).toUpperCase()} mod + ${SP.formula === "half" ? "½ " : ""}level`}</td>}
                {SP && <td>{l < SP.startLevel ? "—" : SP.slots[l].map((n, i) => (n ? `${n}×${i + 1}` : "")).filter(Boolean).join(" ") + (SP.pact ? " (pact)" : "")}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {CL.maxLevel < 5 && <p className="muted note">Levels above {CL.maxLevel} for the {CL.name} are coming with level-up support. Until then the character stays at level {CL.maxLevel}.</p>}
      </Card>

      <Card title={`${CL.name} skills`} aside={<Counter count={c.classSkills.length} max={CL.skills.count} label="Chosen" />}>
        <p className="muted">{CL.skills.from === "any" ? `Choose any ${CL.skills.count} skills.` : `Choose ${CL.skills.count} from the ${CL.name.toLowerCase()} list.`}</p>
        <ChipPicker
          options={skillPool.map((s) => ({ value: s, label: skillName(s) }))}
          selected={c.classSkills}
          max={CL.skills.count}
          locked={grantedElsewhere.filter((s) => !c.classSkills.includes(s))}
          lockedLabel={`from ${R.speciesWord.toLowerCase()}/background`}
          onChange={(classSkills) => set({ classSkills })}
        />
      </Card>

      {CL.toolChoice && (
        <Card title="Tool proficiencies" aside={<Counter count={c.classTools.filter(Boolean).length} max={CL.toolChoice.count} label="Chosen" />}>
          <p className="muted">{CL.toolChoice.label}.</p>
          <ChipPicker
            options={(CL.toolChoice.pool === "instrument" ? MUSICAL_INSTRUMENTS : CL.toolChoice.pool === "artisan" ? ARTISAN_TOOLS : [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS]).map((t) => ({ value: t, label: t }))}
            selected={c.classTools}
            max={CL.toolChoice.count}
            onChange={(classTools) => set({ classTools })}
          />
        </Card>
      )}

      {CL.fightingStyle && (
        <Card title="Fighting Style" aside={<span className="muted">{c.level < CL.fightingStyle.level ? `At level ${CL.fightingStyle.level}` : "Pick one"}</span>}>
          <div className={`option-grid compact ${c.level < CL.fightingStyle.level ? "disabled" : ""}`}>
            {stylesFor(CL).filter((s) => inBooks(books, s.book)).map((s) => (
              <button type="button" key={s.id} disabled={c.level < CL.fightingStyle!.level} className={`option ${c.fightingStyle === s.id ? "on" : ""}`} aria-pressed={c.fightingStyle === s.id} onClick={() => set({ fightingStyle: s.id, styleCantrips: [] })}>
                <strong>
                  {s.name} {s.book !== "PHB14" && <span className="pill">{s.book}</span>}
                </strong>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {(c.fightingStyle === "blessedWarrior" || c.fightingStyle === "druidicWarrior") && CL.fightingStyle && c.level >= CL.fightingStyle.level && (
        <Card title={c.fightingStyle === "blessedWarrior" ? "Blessed Warrior cantrips" : "Druidic Warrior cantrips"} aside={<Counter count={c.styleCantrips.length} max={2} label="Chosen" />}>
          <ChipPicker
            options={R.spells.filter((s) => s.level === 0 && onClassList(s, c.fightingStyle === "blessedWarrior" ? "cleric" : "druid", books)).map((s) => ({ value: s.name, label: s.name }))}
            selected={c.styleCantrips}
            max={2}
            onChange={(styleCantrips) => set({ styleCantrips })}
          />
        </Card>
      )}

      {CL.expertise && (
        <Card title="Expertise" aside={c.level >= CL.expertise.level ? <Counter count={c.expertise.length} max={CL.expertise.count} label="Chosen" /> : <span className="muted">At level {CL.expertise.level}</span>}>
          <p className="muted">
            Double your Proficiency Bonus for {CL.expertise.count} of your skill proficiencies{CL.expertise.thieves ? ", or one skill and thieves' tools" : ""}. Pick your skills first.
          </p>
          {c.level >= CL.expertise.level && (
            <ChipPicker
              options={[...proficientSkills.map((s) => ({ value: s as string, label: skillName(s) })), ...(CL.expertise.thieves ? [{ value: "thieves", label: "Thieves' Tools" }] : [])]}
              selected={c.expertise}
              max={CL.expertise.count}
              onChange={(expertise) => set({ expertise })}
            />
          )}
        </Card>
      )}

      {CL.invocations && (
        <Card title="Eldritch Invocations" aside={c.level >= 2 ? <Counter count={c.invocations.length} max={CL.invocations[c.level]} label="Known" /> : <span className="muted">At level 2</span>}>
          <div className={`option-grid compact ${c.level < 2 ? "disabled" : ""}`}>
            {INVOCATIONS.filter((x) => inBooks(books, x.book)).map((x) => {
              const on = c.invocations.includes(x.id);
              const needs = [x.level && `warlock ${x.level}`, x.eldritchBlast && "Eldritch Blast", x.pact && `Pact of the ${x.pact[0].toUpperCase() + x.pact.slice(1)}`, x.hex && "Hex or a curse feature"].filter(Boolean).join(", ");
              const unmet = (!!x.level && c.level < x.level) || (x.eldritchBlast && !c.cantrips.includes("Eldritch Blast")) || (!!x.pact && c.pactBoon !== x.pact) || (!!x.hex && !c.prepared.includes("Hex") && c.subclass !== "hexblade");
              return (
                <button
                  type="button"
                  key={x.id}
                  className={`option ${on ? "on" : ""}`}
                  aria-pressed={on}
                  disabled={c.level < 2 || (!on && (unmet || c.invocations.length >= CL.invocations![c.level]))}
                  onClick={() => set({ invocations: on ? c.invocations.filter((i) => i !== x.id) : [...c.invocations, x.id] })}
                >
                  <strong>
                    {x.name} {x.book !== "PHB14" && <span className="pill">{x.book}</span>}
                  </strong>
                  <span>{x.text}</span>
                  {needs && <small className="muted">Needs {needs}</small>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {CL.pactBoonLevel && (
        <Card title="Pact Boon" aside={c.level < CL.pactBoonLevel ? <span className="muted">At level {CL.pactBoonLevel}</span> : undefined}>
          <div className={`option-grid compact ${c.level < CL.pactBoonLevel ? "disabled" : ""}`}>
            {PACT_BOONS.filter((b) => inBooks(books, b.book)).map((b) => (
              <button type="button" key={b.id} disabled={c.level < CL.pactBoonLevel!} className={`option ${c.pactBoon === b.id ? "on" : ""}`} aria-pressed={c.pactBoon === b.id} onClick={() => set({ pactBoon: b.id })}>
                <strong>{b.name}</strong>
                <span>{b.text}</span>
              </button>
            ))}
          </div>
          {c.pactBoon === "tome" && c.level >= CL.pactBoonLevel && (
            <>
              <h4>Book of Shadows: three cantrips from any class</h4>
              <ChipPicker options={R.spells.filter((s) => s.level === 0 && inBooks(books, s.book)).map((s) => ({ value: s.name, label: s.name }))} selected={c.tomeCantrips} max={3} onChange={(tomeCantrips) => set({ tomeCantrips })} />
            </>
          )}
        </Card>
      )}

      {CL.infusions && (
        <Card title="Infusions" aside={c.level >= 2 ? <Counter count={c.infusions.length} max={CL.infusions[c.level]} label="Known" /> : <span className="muted">At level 2</span>}>
          <div className={`option-grid compact ${c.level < 2 ? "disabled" : ""}`}>
            {INFUSIONS.map((x) => {
              const on = c.infusions.includes(x.id);
              return (
                <button type="button" key={x.id} className={`option ${on ? "on" : ""}`} aria-pressed={on} disabled={c.level < 2 || (!on && c.infusions.length >= CL.infusions![c.level])} onClick={() => set({ infusions: on ? c.infusions.filter((i) => i !== x.id) : [...c.infusions, x.id] })}>
                  <strong>{x.name}</strong>
                  <span>{x.text}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {(CL.choices?.includes("favoredEnemy") || CL.choices?.includes("naturalExplorer")) && (
        <Card title="Ranger: Favored Enemy & Natural Explorer">
          {tashaOk && (
            <label className="check">
              <input type="checkbox" checked={c.rangerTasha} onChange={(e) => set({ rangerTasha: e.target.checked })} /> Use Tasha's optional replacements instead: Favored Foe (extra 1d4 damage on a marked creature) and Deft Explorer (expertise in one skill, two languages). Most players find these stronger in play.
            </label>
          )}
          {c.rangerTasha && tashaOk ? (
            <div className="grid-3">
              <Field label="Deft Explorer: expertise skill" hint="A skill you're proficient in.">
                <Select value={c.deftExpertise} options={[{ value: "", label: "Choose…" }, ...proficientSkills.map((s) => ({ value: s as string, label: skillName(s) }))]} onChange={(deftExpertise) => set({ deftExpertise })} />
              </Field>
            </div>
          ) : (
            <div className="grid-3">
              <Field label="Favored enemy" hint="You also learn one language your favored enemy speaks.">
                <Select value={c.favoredEnemy} options={[{ value: "", label: "Choose…" }, ...FAVORED_ENEMIES.map((e) => ({ value: e, label: e }))]} onChange={(favoredEnemy) => set({ favoredEnemy })} />
              </Field>
              <Field label="Favored terrain">
                <Select value={c.favoredTerrain} options={[{ value: "", label: "Choose…" }, ...FAVORED_TERRAINS.map((e) => ({ value: e, label: e }))]} onChange={(favoredTerrain) => set({ favoredTerrain })} />
              </Field>
            </div>
          )}
        </Card>
      )}

      {CL.subclasses.length > 0 || c.level < CL.subclassLevel ? (
        <Card title={CL.subclassLabel} aside={c.level < CL.subclassLevel ? <span className="muted">Chosen at level {CL.subclassLevel}</span> : undefined}>
          {c.level < CL.subclassLevel && <p className="muted">You choose your {CL.subclassLabel.toLowerCase()} at level {CL.subclassLevel}; here's a preview of the options.</p>}
          {subclasses.length === 0 ? null : (
            <div className="option-grid">
              {subclasses.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`option ${c.subclass === s.id ? "on" : ""}`}
                  onClick={() =>
                    s.id !== c.subclass && set({ subclass: s.id, subclassOption: "", subclassSkills: [], subclassCantrip: "", subclassPicks: [], ...(s.spell || d.cls.spell ? {} : { cantrips: [], prepared: [] }) })
                  }
                  aria-pressed={c.subclass === s.id}
                >
                  <strong>
                    {s.name} {s.book !== "PHB14" && s.book !== "PHB24" && <span className="pill">{s.book}</span>}
                  </strong>
                  <span>{s.summary}</span>
                  {s.spells.length > 0 && <small className="muted">Spells: {s.spells.filter((g) => g.minLevel <= 1).map((g) => g.spell).join(", ")}{s.spells.some((g) => g.minLevel > 1) ? "…" : ""}</small>}
                  {s.expanded && <small className="muted">Adds to your list: {s.expanded.filter(([, l]) => l <= 1).map(([n]) => n).join(", ")}…</small>}
                </button>
              ))}
            </div>
          )}
          {sub && d.subclassActive && sub.options && (
            <div className="grid-3">
              <Field label={sub.optionLabel ?? "Option"} hint={d.subOption?.text ?? (d.subOption?.spell ? `Grants ${d.subOption.spell}.` : undefined)}>
                <Select
                  value={c.subclassOption}
                  options={[{ value: "", label: "Choose…" }, ...sub.options.map((o) => ({ value: o.id, label: o.name + (o.spell ? ` — ${o.spell}` : "") }))]}
                  onChange={(subclassOption) => set({ subclassOption })}
                />
              </Field>
            </div>
          )}
          {sub && d.subclassActive && sub.skillChoice && (
            <>
              <h4>
                {sub.name}: {sub.skillChoice.expertise ? "skills with expertise" : "skill"}
              </h4>
              <ChipPicker
                options={sub.skillChoice.from.map((s) => ({ value: s, label: skillName(s) }))}
                selected={c.subclassSkills}
                max={sub.skillChoice.count}
                locked={grantedElsewhere.filter((s) => !c.subclassSkills.includes(s) && !d.skills.find((x) => x.id === s)?.sources.includes(sub.name))}
                onChange={(subclassSkills) => set({ subclassSkills })}
              />
            </>
          )}
          {sub && d.subclassActive && sub.cantripOptions && (
            <div className="grid-3">
              <Field label={`${sub.name}: bonus cantrip`}>
                <Select value={c.subclassCantrip} options={[{ value: "", label: "Choose…" }, ...sub.cantripOptions.map((n) => ({ value: n, label: n }))]} onChange={(subclassCantrip) => set({ subclassCantrip })} />
              </Field>
            </div>
          )}
          {sub && d.subclassActive && sub.picks && (
            <>
              <h4>
                {sub.picks.label} <Counter count={c.subclassPicks.length} max={sub.picks.count[c.level] ?? 0} label="Chosen" />
              </h4>
              <div className="option-grid compact">
                {sub.picks.options.map((o) => {
                  const on = c.subclassPicks.includes(o.id);
                  return (
                    <button type="button" key={o.id} className={`option ${on ? "on" : ""}`} aria-pressed={on} disabled={!on && c.subclassPicks.length >= (sub.picks!.count[c.level] ?? 0)} onClick={() => set({ subclassPicks: on ? c.subclassPicks.filter((p) => p !== o.id) : [...c.subclassPicks, o.id] })}>
                      <strong>{o.name}</strong>
                      <span>{o.text}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {sub && d.subclassActive && sub.cantripChoice && (
            <div className="grid-3">
              <Field label={`${sub.name}: ${sub.cantripChoice} cantrip`} hint="Doesn't count against your cantrips known.">
                <Select
                  value={c.subclassCantrip}
                  options={[{ value: "", label: "Choose…" }, ...R.spells.filter((s) => s.level === 0 && onClassList(s, sub.cantripChoice!, books)).map((s) => ({ value: s.name, label: s.name }))]}
                  onChange={(subclassCantrip) => set({ subclassCantrip })}
                />
              </Field>
            </div>
          )}
        </Card>
      ) : null}

      {CL.sorcery && (
        <Card
          title="Metamagic"
          aside={c.level >= d.metamagicLevel ? <Counter count={c.metamagic.length} max={d.metamagicLimit} label="Known" /> : <span className="muted">Unlocks at level {d.metamagicLevel}</span>}
        >
          <div className={`option-grid compact ${c.level < d.metamagicLevel ? "disabled" : ""}`}>
            {metamagic.map((m) => {
              const on = c.metamagic.includes(m.id);
              const full = c.metamagic.length >= d.metamagicLimit;
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`option ${on ? "on" : ""}`}
                  disabled={c.level < d.metamagicLevel || (!on && full)}
                  aria-pressed={on}
                  onClick={() => set({ metamagic: on ? c.metamagic.filter((x) => x !== m.id) : [...c.metamagic, m.id] })}
                >
                  <strong>
                    {m.name} <span className="pill">{m.cost}</span>
                  </strong>
                  <span>{m.text}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Hit Points" aside={<strong className="hp-total">{d.hpMax} HP</strong>}>
        <p className="muted">At level 1 you get the maximum of your hit die ({CL.hitDie}) plus your Constitution modifier. Each later level adds a roll (or the average) plus CON.</p>
        <Segmented
          value={c.hpMethod}
          options={[
            { value: "average", label: `Average (${CL.hitDie / 2 + 1} per level)` },
            { value: "rolled", label: "Rolled" },
          ]}
          onChange={(hpMethod) => set({ hpMethod })}
        />
        <div className="hp-rows">
          <div className="hp-row">
            <span>Level 1</span>
            <span className="muted">{CL.hitDie} (max)</span>
            <span>
              {CL.hitDie} {conMod >= 0 ? "+" : "−"} {Math.abs(conMod)} CON
            </span>
          </div>
          {Array.from({ length: c.level - 1 }, (_, i) => i + 2).map((l) => (
            <div className="hp-row" key={l}>
              <span>Level {l}</span>
              {c.hpMethod === "rolled" ? (
                <input
                  type="number"
                  min={1}
                  max={CL.hitDie}
                  value={c.hpRolls[l - 2] ?? 1}
                  aria-label={`Hit die roll for level ${l}`}
                  onChange={(e) => {
                    const rolls = [...c.hpRolls];
                    rolls[l - 2] = Math.min(CL.hitDie, Math.max(1, Number(e.target.value) || 1));
                    set({ hpRolls: rolls });
                  }}
                />
              ) : (
                <span className="muted">{CL.hitDie / 2 + 1} (average)</span>
              )}
              <span>
                {d.hpPerLevel[l - 2]} {conMod >= 0 ? "+" : "−"} {Math.abs(conMod)} CON
              </span>
            </div>
          ))}
          {d.hpExtras.map((x) => (
            <div className="hp-row extra" key={x}>
              <span>{x}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
