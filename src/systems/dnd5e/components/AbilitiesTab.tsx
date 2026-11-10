import { ABILITIES, ABILITY_NAMES, signed, type Ability } from "../data/core";
import type { FeatId } from "../data/feats";
import { featIn, inBooks } from "../rules";
import type { TabProps } from "../../types";
import type { AbilityMethod, Character } from "../character";
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, type Derived } from "../derive";
import { FeatChoicesEditor } from "./FeatChoicesEditor";
import { Card, Field, Segmented, Select } from "../../../components/ui";

const roll4d6 = () => {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
};

export function AbilitiesTab({ c, d, set, books }: TabProps<Character, Derived>) {
  const R = d.rules;
  const setBase = (a: Ability, v: number) => set({ base: { ...c.base, [a]: v } });
  const spent = ABILITIES.reduce((s, a) => s + (POINT_BUY_COST[c.base[a]] ?? 0), 0);
  const takenSkills = d.skills.filter((s) => s.proficient).map((s) => s.id);
  const l4 = featIn(R, c.level4Feat);

  const changeMethod = (m: AbilityMethod) => {
    if (m === "standard") set({ abilityMethod: m, base: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 15 } });
    else if (m === "pointbuy") set({ abilityMethod: m, base: { STR: 8, DEX: 14, CON: 14, INT: 8, WIS: 10, CHA: 15 } });
    else set({ abilityMethod: m });
  };

  /** Standard array: picking a value swaps it with whichever ability had it. */
  const pickStandard = (a: Ability, v: number) => {
    const holder = ABILITIES.find((x) => x !== a && c.base[x] === v);
    set({ base: { ...c.base, [a]: v, ...(holder ? { [holder]: c.base[a] } : {}) } });
  };

  return (
    <div className="stack">
      <Card
        title="Ability scores"
        aside={c.abilityMethod === "pointbuy" ? <span className={`counter ${spent > POINT_BUY_BUDGET ? "over" : spent === POINT_BUY_BUDGET ? "ok" : "under"}`}>Points {spent} / {POINT_BUY_BUDGET}</span> : undefined}
      >
        <Segmented<AbilityMethod>
          value={c.abilityMethod}
          options={[
            { value: "standard", label: "Standard array" },
            { value: "pointbuy", label: "Point buy" },
            { value: "rolled", label: "Rolled" },
            { value: "manual", label: "Manual" },
          ]}
          onChange={changeMethod}
        />
        {c.abilityMethod === "rolled" && (
          <div className="row-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (confirm("Roll new base scores (4d6, drop the lowest) for all six abilities?"))
                  set({ base: Object.fromEntries(ABILITIES.map((a) => [a, roll4d6()])) as Character["base"] });
              }}
            >
              🎲 Roll 4d6 drop lowest
            </button>
            <span className="muted">Or type the scores your table rolled.</span>
          </div>
        )}

        <table className="ability-table">
          <thead>
            <tr>
              <th>Ability</th>
              <th>Base</th>
              <th>Bonuses</th>
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
                  {c.abilityMethod === "standard" ? (
                    <select value={c.base[a]} onChange={(e) => pickStandard(a, Number(e.target.value))} aria-label={`${ABILITY_NAMES[a]} base`}>
                      {STANDARD_ARRAY.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : c.abilityMethod === "pointbuy" ? (
                    <div className="stepper">
                      <button type="button" onClick={() => setBase(a, Math.max(8, c.base[a] - 1))} disabled={c.base[a] <= 8} aria-label={`Lower ${a}`}>
                        −
                      </button>
                      <span>{c.base[a]}</span>
                      <button
                        type="button"
                        onClick={() => setBase(a, Math.min(15, c.base[a] + 1))}
                        disabled={c.base[a] >= 15 || spent - (POINT_BUY_COST[c.base[a]] ?? 0) + (POINT_BUY_COST[c.base[a] + 1] ?? 99) > POINT_BUY_BUDGET}
                        aria-label={`Raise ${a}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <input type="number" min={3} max={18} value={c.base[a]} onChange={(e) => setBase(a, Number(e.target.value) || 0)} aria-label={`${ABILITY_NAMES[a]} base`} />
                  )}
                </td>
                <td className="muted">{d.bonuses[a].map((b) => `${signed(b.amount)} ${b.from}`).join(", ") || "—"}</td>
                <td>
                  <strong>{d.scores[a]}</strong>
                </td>
                <td>{signed(d.mods[a])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Level 4 feat" aside={c.level < 4 ? <span className="muted">Unlocks at level 4</span> : undefined}>
        <fieldset disabled={c.level < 4} className="plain">
          <Field label="Feat" hint={l4.text}>
            <Select<FeatId> value={c.level4Feat} options={R.level4Feats.filter((f) => inBooks(books, f.book)).map((f) => ({ value: f.id, label: `${f.name}${f.category === "origin" ? " (origin)" : ""}` }))} onChange={(level4Feat) => set({ level4Feat })} />
          </Field>
          {c.level4Feat === "asi" && (
            <div className="grid-3">
              <Field label="Increase">
                <Segmented
                  value={c.level4AsiMode}
                  options={[
                    { value: "+2", label: "+2 to one" },
                    { value: "+1+1", label: "+1 to two" },
                  ]}
                  onChange={(level4AsiMode) => set({ level4AsiMode })}
                />
              </Field>
              <Field label={c.level4AsiMode === "+2" ? "+2 to" : "First +1"}>
                <Select<Ability> value={c.level4A} options={ABILITIES.map((a) => ({ value: a, label: ABILITY_NAMES[a] }))} onChange={(level4A) => set({ level4A })} />
              </Field>
              {c.level4AsiMode === "+1+1" && (
                <Field label="Second +1">
                  <Select<Ability>
                    value={c.level4B}
                    options={ABILITIES.map((a) => ({ value: a, label: ABILITY_NAMES[a], disabled: a === c.level4A }))}
                    onChange={(level4B) => set({ level4B })}
                  />
                </Field>
              )}
            </div>
          )}
          {l4.plusOne && (
            <Field label="+1 to">
              <Select<Ability> value={l4.plusOne.includes(c.level4PlusOne) ? c.level4PlusOne : l4.plusOne[0]} options={l4.plusOne.map((a) => ({ value: a, label: ABILITY_NAMES[a] }))} onChange={(level4PlusOne) => set({ level4PlusOne })} />
            </Field>
          )}
          <FeatChoicesEditor feat={c.level4Feat} value={c.level4Choices} onChange={(level4Choices) => set({ level4Choices })} takenSkills={takenSkills} edition={c.edition} />
        </fieldset>
      </Card>
    </div>
  );
}
