import { useState } from "react";
import { ABILITIES, ABILITY_NAMES, signed, type Ability } from "../dnd5e/data/core";
import type { TabProps } from "../types";
import { newItemId, type Character35, type FeatPick } from "./character";
import type { Derived35 } from "./derive";
import {
  ELITE_ARRAY,
  FAMILIARS_35,
  FEATS_35,
  GEAR_35,
  LANGUAGES_35,
  POINT_BUY_35,
  POINT_BUY_TOTALS,
  RACES_35,
  SCHOOLS_35,
  SKILLS_35,
  SORCERER_35,
  SPELLS_35,
  rangeAt,
} from "./data";
import { Card, ChipPicker, Counter, Field, Segmented, Select } from "../../components/ui";

type P = TabProps<Character35, Derived35>;

export function RaceTab({ c, d, set }: P) {
  return (
    <div className="stack">
      <Card title="Race">
        <div className="option-grid">
          {RACES_35.map((r) => (
            <button
              type="button"
              key={r.id}
              className={`option ${c.race === r.id ? "on" : ""}`}
              aria-pressed={c.race === r.id}
              onClick={() => set({ race: r.id, languages: [...r.languages], featHuman: { id: "", choice: "" } })}
            >
              <strong>{r.name}</strong>
              <span>
                {r.size} · {r.speed} ft · {Object.entries(r.adjust).map(([a, n]) => `${a} ${signed(n!)}`).join(", ") || "No adjustments"}
              </span>
              <small className="muted">{r.traits.map((t) => t.name).join(", ")}</small>
            </button>
          ))}
        </div>
      </Card>
      <Card title={`${d.race.name} traits`} aside={<span className="muted">Favored class: {d.race.favored}</span>}>
        <ul className="feature-list">
          <li>
            <strong>Size, speed & senses</strong>
            <p>
              {d.race.size}, {d.race.speed} ft. {d.race.vision}.
            </p>
          </li>
          {d.race.traits.map((t) => (
            <li key={t.name}>
              <strong>{t.name}</strong>
              <p>{t.text}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Languages" aside={<Counter count={c.languages.length} max={d.languageLimit} label="Known" />}>
        <p className="muted">
          Automatic: {d.race.languages.join(", ")}. Bonus languages (one per point of INT bonus): {d.race.bonusLanguages}.
        </p>
        <ChipPicker options={LANGUAGES_35.map((l) => ({ value: l, label: l }))} selected={c.languages} max={d.languageLimit} onChange={(languages) => set({ languages })} />
      </Card>
    </div>
  );
}

export function ClassTab35({ c, d, set }: P) {
  const conMod = d.mods.CON;
  return (
    <div className="stack">
      <Card title="Sorcerer (D&D 3.5)" aside={<span className="muted">Hit die d4 · Good save: Will · Simple weapons</span>}>
        <table className="level-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>BAB</th>
              <th>Fort</th>
              <th>Ref</th>
              <th>Will</th>
              <th>Spells/day (0/1/2)</th>
              <th>Known (0/1/2)</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((l) => (
              <tr key={l} className={l === c.level ? "current" : l > c.level ? "future" : ""}>
                <td>{l}</td>
                <td>+{SORCERER_35.bab[l]}</td>
                <td>+{SORCERER_35.fort[l]}</td>
                <td>+{SORCERER_35.ref[l]}</td>
                <td>+{SORCERER_35.will[l]}</td>
                <td>{SORCERER_35.perDay[l].join(" / ")}</td>
                <td>{SORCERER_35.known[l].join(" / ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Spells per day above are before bonus spells for high Charisma (see the Spells tab).</p>
      </Card>

      <Card title="Familiar" aside={<span className="muted">Optional</span>}>
        <div className="grid-3">
          <Field label="Familiar" hint={d.familiar.benefit || "Summoning one takes 24 hours and 100 GP of materials."}>
            <Select value={c.familiar} options={FAMILIARS_35.map((f) => ({ value: f.id, label: f.name }))} onChange={(familiar) => set({ familiar })} />
          </Field>
        </div>
      </Card>

      <Card title="Hit Points" aside={<strong className="hp-total">{d.hpMax} HP</strong>}>
        <Segmented
          value={c.hpMethod}
          options={[
            { value: "average", label: "Average (3 per level, house rule)" },
            { value: "rolled", label: "Rolled" },
          ]}
          onChange={(hpMethod) => set({ hpMethod })}
        />
        <div className="hp-rows">
          <div className="hp-row">
            <span>Level 1</span>
            <span className="muted">4 (max)</span>
            <span>
              4 {conMod >= 0 ? "+" : "−"} {Math.abs(conMod)} CON
            </span>
          </div>
          {Array.from({ length: c.level - 1 }, (_, i) => i + 2).map((l) => (
            <div className="hp-row" key={l}>
              <span>Level {l}</span>
              {c.hpMethod === "rolled" ? (
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={c.hpRolls[l - 2] ?? 1}
                  aria-label={`Hit die roll for level ${l}`}
                  onChange={(e) => {
                    const rolls = [...c.hpRolls];
                    rolls[l - 2] = Math.min(4, Math.max(1, Number(e.target.value) || 1));
                    set({ hpRolls: rolls });
                  }}
                />
              ) : (
                <span className="muted">3 (average)</span>
              )}
              <span>
                {d.hpLevels[l - 2]} {conMod >= 0 ? "+" : "−"} {Math.abs(conMod)} CON
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

const roll4d6 = () => {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
};

export function AbilitiesTab35({ c, d, set }: P) {
  const spent = ABILITIES.reduce((s, a) => s + (POINT_BUY_35[c.base[a]] ?? 0), 0);
  const setBase = (a: Ability, v: number) => set({ base: { ...c.base, [a]: v } });
  const pickElite = (a: Ability, v: number) => {
    const holder = ABILITIES.find((x) => x !== a && c.base[x] === v);
    set({ base: { ...c.base, [a]: v, ...(holder ? { [holder]: c.base[a] } : {}) } });
  };
  return (
    <div className="stack">
      <Card title="Ability scores" aside={c.abilityMethod === "pointbuy" ? <span className={`counter ${spent > c.pointBuyTotal ? "over" : spent === c.pointBuyTotal ? "ok" : "under"}`}>Points {spent} / {c.pointBuyTotal}</span> : undefined}>
        <Segmented
          value={c.abilityMethod}
          options={[
            { value: "rolled", label: "Rolled (4d6)" },
            { value: "pointbuy", label: "Point buy" },
            { value: "elite", label: "Elite array" },
            { value: "manual", label: "Manual" },
          ]}
          onChange={(abilityMethod) => set(abilityMethod === "elite" ? { abilityMethod, base: { STR: 8, DEX: 13, CON: 14, INT: 12, WIS: 10, CHA: 15 } } : abilityMethod === "pointbuy" ? { abilityMethod, base: { STR: 8, DEX: 12, CON: 14, INT: 12, WIS: 10, CHA: 16 } } : { abilityMethod })}
        />
        <div className="row-actions">
          {c.abilityMethod === "rolled" && (
            <button type="button" className="btn ghost" onClick={() => confirm("Roll 4d6 (drop lowest) for all six abilities?") && set({ base: Object.fromEntries(ABILITIES.map((a) => [a, roll4d6()])) as Character35["base"] })}>
              🎲 Roll 4d6 drop lowest
            </button>
          )}
          {c.abilityMethod === "pointbuy" && (
            <Select value={String(c.pointBuyTotal)} options={POINT_BUY_TOTALS.map((t) => ({ value: String(t.value), label: t.label }))} onChange={(v) => set({ pointBuyTotal: Number(v) })} ariaLabel="Point buy total" />
          )}
        </div>
        <table className="ability-table">
          <thead>
            <tr>
              <th>Ability</th>
              <th>Base</th>
              <th>Adjustments</th>
              <th>Score</th>
              <th>Mod</th>
            </tr>
          </thead>
          <tbody>
            {ABILITIES.map((a) => (
              <tr key={a}>
                <td>
                  <strong>{ABILITY_NAMES[a]}</strong>
                </td>
                <td>
                  {c.abilityMethod === "elite" ? (
                    <select value={c.base[a]} onChange={(e) => pickElite(a, Number(e.target.value))} aria-label={`${ABILITY_NAMES[a]} base`}>
                      {ELITE_ARRAY.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" min={3} max={18} value={c.base[a]} onChange={(e) => setBase(a, Number(e.target.value) || 0)} aria-label={`${ABILITY_NAMES[a]} base`} />
                  )}
                </td>
                <td className="muted">{d.adjustments[a].join(", ") || "—"}</td>
                <td>
                  <strong>{d.scores[a]}</strong>
                </td>
                <td>{signed(d.mods[a])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Ability increase at 4th level" aside={c.level < 4 ? <span className="muted">Unlocks at level 4</span> : undefined}>
        <div className="grid-3">
          <Field label="+1 to">
            <Select<Ability> value={c.level4Ability} options={ABILITIES.map((a) => ({ value: a, label: ABILITY_NAMES[a] }))} onChange={(level4Ability) => set({ level4Ability })} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

export function SkillsTab35({ c, d, set }: P) {
  const left = d.pointsAvailable - d.pointsSpent;
  const setPoints = (id: string, v: number) => set({ skillPoints: { ...c.skillPoints, [id]: Math.max(0, v) } });
  return (
    <div className="stack">
      <Card title="Skills" aside={<Counter count={d.pointsSpent} max={d.pointsAvailable} label="Points" />}>
        <p className="muted">
          Class skills cost 1 point per rank (max {c.level + 3}); cross-class skills cost 2 points per rank (max {(c.level + 3) / 2}). {left > 0 ? `${left} point(s) left.` : ""}
        </p>
        <table className="skill-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Ability</th>
              <th>Points</th>
              <th>Ranks</th>
              <th>Misc</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {d.skills.map((s) => (
              <tr key={s.id} className={s.classSkill ? "prof" : ""}>
                <td>
                  <span className="dot" /> {s.name}
                  {s.id === "craft" && c.craftName ? ` (${c.craftName})` : ""}
                  {s.id === "perform" && c.performName ? ` (${c.performName})` : ""}
                  {s.id === "profession" && c.professionName ? ` (${c.professionName})` : ""}
                  {s.trainedOnly && <small className="muted"> trained only</small>}
                </td>
                <td className="muted">{s.ability}</td>
                <td>
                  <div className="stepper">
                    <button type="button" onClick={() => setPoints(s.id, s.points - 1)} disabled={s.points <= 0} aria-label={`Fewer points in ${s.name}`}>
                      −
                    </button>
                    <span>{s.points}</span>
                    <button type="button" onClick={() => setPoints(s.id, s.points + 1)} disabled={s.ranks + (s.classSkill ? 1 : 0.5) > s.maxRanks} aria-label={`More points in ${s.name}`}>
                      +
                    </button>
                  </div>
                </td>
                <td>{s.ranks}</td>
                <td className="muted">{s.misc ? signed(s.misc) : ""}</td>
                <td>
                  <strong>{s.usable ? signed(s.total) : "—"}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid-3">
          <Field label="Craft specialty">
            <input value={c.craftName} onChange={(e) => set({ craftName: e.target.value })} placeholder="e.g. alchemy" />
          </Field>
          <Field label="Perform specialty">
            <input value={c.performName} onChange={(e) => set({ performName: e.target.value })} placeholder="e.g. sing" />
          </Field>
          <Field label="Profession">
            <input value={c.professionName} onChange={(e) => set({ professionName: e.target.value })} placeholder="e.g. sailor" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function FeatSlot({ label, pick, onChange, unlocked }: { label: string; pick: FeatPick; onChange: (p: FeatPick) => void; unlocked: boolean }) {
  const feat = FEATS_35.find((f) => f.id === pick.id);
  return (
    <div className="sub-block">
      <div className="grid-3">
        <Field label={label} hint={feat ? `${feat.text}${feat.prereq ? ` Requires: ${feat.prereq}.` : ""}` : undefined}>
          <Select
            value={pick.id}
            options={[{ value: "", label: unlocked ? "Choose…" : "Unlocks later" }, ...FEATS_35.map((f) => ({ value: f.id, label: `${f.name}${f.type !== "General" ? ` (${f.type})` : ""}` }))]}
            onChange={(id) => onChange({ id, choice: "" })}
          />
        </Field>
        {feat?.choice === "skill" && (
          <Field label="Skill">
            <Select value={pick.choice} options={[{ value: "", label: "Choose…" }, ...SKILLS_35.map((s) => ({ value: s.id, label: s.name }))]} onChange={(choice) => onChange({ ...pick, choice })} />
          </Field>
        )}
        {feat?.choice === "school" && (
          <Field label="School">
            <Select value={pick.choice} options={[{ value: "", label: "Choose…" }, ...SCHOOLS_35.map((s) => ({ value: s, label: s }))]} onChange={(choice) => onChange({ ...pick, choice })} />
          </Field>
        )}
      </div>
    </div>
  );
}

export function FeatsTab35({ c, d, set }: P) {
  return (
    <div className="stack">
      <Card title="Feats" aside={<span className="muted">1st level, 3rd level{d.race.bonusFeat ? ", plus the Human bonus feat" : ""}</span>}>
        <FeatSlot label="1st-level feat" pick={c.feat1} unlocked onChange={(feat1) => set({ feat1 })} />
        {d.race.bonusFeat && <FeatSlot label="Human bonus feat" pick={c.featHuman} unlocked onChange={(featHuman) => set({ featHuman })} />}
        {c.level >= 3 ? <FeatSlot label="3rd-level feat" pick={c.feat3} unlocked onChange={(feat3) => set({ feat3 })} /> : <p className="muted">Your next feat comes at 3rd level.</p>}
      </Card>
    </div>
  );
}

export function SpellsTab35({ c, d, set }: P) {
  const [query, setQuery] = useState("");
  const toggle = (name: string) => set({ spellsKnown: c.spellsKnown.includes(name) ? c.spellsKnown.filter((n) => n !== name) : [...c.spellsKnown, name] });
  return (
    <div className="stack">
      <Card title="Spellcasting" aside={<span className="muted">Caster level {d.cl} · Charisma {signed(d.mods.CHA)}</span>}>
        <table className="level-table">
          <thead>
            <tr>
              <th>Spell level</th>
              <th>Known</th>
              <th>Per day (incl. bonus)</th>
              <th>Save DC</th>
            </tr>
          </thead>
          <tbody>
            {d.known.map((k, lvl) => (
              <tr key={lvl}>
                <td>{lvl === 0 ? "0 (cantrips)" : lvl}</td>
                <td>
                  {d.spellRows.filter((r) => r.level === lvl && r.spell).length} / {k}
                </td>
                <td>{d.perDay[lvl]}</td>
                <td>{10 + lvl + d.mods.CHA}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="spell-filter">
        <input type="search" placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search spells" />
      </div>
      {d.known.map((k, lvl) => {
        const list = SPELLS_35.filter((s) => s.level === lvl && (!query || `${s.name} ${s.school} ${s.desc}`.toLowerCase().includes(query.toLowerCase())));
        const chosen = c.spellsKnown.filter((n) => SPELLS_35.find((s) => s.name === n)?.level === lvl).length;
        return (
          <Card key={lvl} title={lvl === 0 ? "0-level spells" : `Level ${lvl} spells`} aside={<Counter count={chosen} max={k} label="Known" />}>
            <ul className="spell-list">
              {list.map((s) => {
                const on = c.spellsKnown.includes(s.name);
                return (
                  <li key={s.name} className={on ? "on" : ""}>
                    <label className="spell-pick">
                      <input type="checkbox" checked={on} disabled={!on && chosen >= k} onChange={() => toggle(s.name)} />
                      <span className="spell-line">
                        <span className="spell-name">{s.name}</span>
                        <span className="spell-meta">
                          {s.school} · {s.components} · {s.time ?? "1 standard action"} · {rangeAt(s.range, d.cl)} · {s.duration} · Save: {s.save} · SR: {s.sr}
                          {s.effect ? ` · ${s.effect(d.cl)}` : ""}
                        </span>
                        <span className="spell-desc">{s.desc}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      {d.maxSpellLevel < 2 && <p className="muted center">Level 2 spells unlock at Sorcerer 4.</p>}
    </div>
  );
}

export function EquipmentTab35({ c, d, set }: P) {
  const [preset, setPreset] = useState(GEAR_35[0].name);
  const setItems = (inventory: Character35["inventory"]) => set({ inventory });
  const update = (id: string, patch: Partial<Character35["inventory"][number]>) => setItems(c.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div className="stack">
      <Card title="Attacks">
        <table className="attack-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Attack</th>
              <th>Damage</th>
              <th>Critical</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {d.attacks.map((a) => (
              <tr key={a.name}>
                <td>
                  <strong>{a.name}</strong>
                </td>
                <td>{a.bonus}</td>
                <td>{a.damage}</td>
                <td>{a.crit}</td>
                <td className="muted">{a.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Inventory" aside={<span className="muted">{d.carried.toFixed(1)} lb · light ≤{d.load.light}, medium ≤{d.load.medium}, heavy ≤{d.load.heavy}</span>}>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Weight (each)</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => (
              <tr key={i.id}>
                <td>
                  <input value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} aria-label="Item name" />
                </td>
                <td>
                  <input type="number" min={0} value={i.qty} onChange={(e) => update(i.id, { qty: Math.max(0, Number(e.target.value) || 0) })} aria-label="Quantity" />
                </td>
                <td>
                  <input type="number" min={0} step={0.5} value={i.weight} onChange={(e) => update(i.id, { weight: Math.max(0, Number(e.target.value) || 0) })} aria-label="Weight" />
                </td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => setItems(c.inventory.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.name}`}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row-actions">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Common item">
            {GEAR_35.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.weight} lb)
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost" onClick={() => setItems([...c.inventory, { id: newItemId(), name: preset, qty: 1, weight: GEAR_35.find((g) => g.name === preset)!.weight }])}>
            Add
          </button>
          <button type="button" className="btn ghost" onClick={() => setItems([...c.inventory, { id: newItemId(), name: "New item", qty: 1, weight: 0 }])}>
            Add custom
          </button>
        </div>
      </Card>
      <Card title="Coins">
        <div className="coins">
          {(["cp", "sp", "gp", "pp"] as const).map((k) => (
            <label key={k} className="coin">
              <span>{k.toUpperCase()}</span>
              <input type="number" min={0} value={c.coins[k]} onChange={(e) => set({ coins: { ...c.coins, [k]: Math.max(0, Number(e.target.value) || 0) } })} />
            </label>
          ))}
        </div>
        <p className="muted">A sorcerer starts with 3d4 × 10 GP. 50 coins weigh 1 lb.</p>
      </Card>
    </div>
  );
}

export function DetailsTab35({ c, set }: P) {
  const setD = (k: keyof Character35["details"], v: string) => set({ details: { ...c.details, [k]: v } });
  const short: [keyof Character35["details"], string][] = [
    ["alignment", "Alignment"],
    ["deity", "Deity"],
    ["gender", "Gender"],
    ["age", "Age"],
    ["height", "Height"],
    ["weight", "Weight"],
    ["eyes", "Eyes"],
    ["hair", "Hair"],
    ["skin", "Skin"],
  ];
  const long: [keyof Character35["details"], string, number][] = [
    ["personality", "Personality", 4],
    ["backstory", "Backstory", 6],
    ["allies", "Allies & organizations", 3],
    ["notes", "Notes", 3],
  ];
  return (
    <div className="stack">
      <Card title="Identity">
        <div className="grid-3">
          <Field label="Character name">
            <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Player name">
            <input value={c.playerName} onChange={(e) => set({ playerName: e.target.value })} />
          </Field>
          {short.map(([k, label]) => (
            <Field key={k} label={label}>
              <input value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
      <Card title="Story">
        <div className="grid-2">
          {long.map(([k, label, rows]) => (
            <Field key={k} label={label}>
              <textarea rows={rows} value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Summary35({ d }: { c: Character35; d: Derived35 }) {
  return (
    <div className="summary">
      <div className="stat-row">
        <div className="stat big" title={`Touch ${d.touchAc}, flat-footed ${d.flatAc}`}>
          <strong>{d.ac}</strong>
          <span>Armor Class</span>
        </div>
        <div className="stat big">
          <strong>{d.hpMax}</strong>
          <span>Hit Points</span>
        </div>
        <div className="stat">
          <strong>{signed(d.initiative)}</strong>
          <span>Initiative</span>
        </div>
        <div className="stat">
          <strong>{d.speed} ft</strong>
          <span>Speed</span>
        </div>
        <div className="stat">
          <strong>{signed(d.bab)}</strong>
          <span>Base Attack</span>
        </div>
      </div>
      <div className="abilities-grid">
        {ABILITIES.map((a) => (
          <div className="ability" key={a} title={ABILITY_NAMES[a]}>
            <span className="ability-name">{a}</span>
            <span className="ability-mod">{signed(d.mods[a])}</span>
            <span className="ability-score">{d.scores[a]}</span>
          </div>
        ))}
      </div>
      <div className="spell-strip">
        <div>
          <span className="muted">Touch / Flat AC</span>
          <strong>
            {d.touchAc} / {d.flatAc}
          </strong>
        </div>
        <div>
          <span className="muted">Grapple</span>
          <strong>{signed(d.grapple)}</strong>
        </div>
        <div>
          <span className="muted">Spells/day</span>
          <strong>{d.perDay.join(" / ")}</strong>
        </div>
        <div>
          <span className="muted">Base DC</span>
          <strong>{10 + d.mods.CHA}+lvl</strong>
        </div>
      </div>
      <h4>Saving Throws</h4>
      <ul className="mini-list">
        {d.saves.map((s) => (
          <li key={s.id} className={s.id === "will" ? "prof" : ""} title={`Base ${s.base}, ${s.ability} ${signed(s.mod)}, misc ${signed(s.misc)}`}>
            <span className="dot" />
            <span>{s.name}</span>
            <strong>{signed(s.total)}</strong>
          </li>
        ))}
      </ul>
      {d.saveNotes.length > 0 && <p className="muted small-note">{d.saveNotes.join("; ")}</p>}
      <h4>Skills (ranks or bonuses)</h4>
      <ul className="mini-list">
        {d.skills
          .filter((s) => s.ranks > 0 || s.misc > 0 || s.classSkill)
          .map((s) => (
            <li key={s.id} className={s.ranks > 0 ? "prof" : ""}>
              <span className="dot" />
              <span>
                {s.name} <small className="muted">{s.ability}</small>
              </span>
              <strong>{s.usable ? signed(s.total) : "—"}</strong>
            </li>
          ))}
      </ul>
      <h4>Senses</h4>
      <dl className="kv">
        <dt>Vision</dt>
        <dd>{d.race.vision}</dd>
        <dt>Size</dt>
        <dd>{d.race.size}</dd>
        <dt>Hit Dice</dt>
        <dd>{d.hitDice}</dd>
      </dl>
    </div>
  );
}
