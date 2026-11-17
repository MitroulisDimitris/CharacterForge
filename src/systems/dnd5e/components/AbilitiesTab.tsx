import { ABILITIES, ABILITY_NAMES, signed, type Ability } from "../data/core";
import type { FeatId } from "../data/feats";
import { featIn, inBooks } from "../rules";
import type { TabProps } from "../../types";
import type { AbilityMethod, Character } from "../character";
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, type Derived } from "../derive";
import { FeatChoicesEditor } from "./FeatChoicesEditor";
import { assignRoll, baseFromRolls, roll4d6, rollTotal, ROLL_COUNT } from "../rolls";
import { Card, Field, Segmented, Select } from "../../../components/ui";

/** One die face, drawn (the dropped one is faded and struck through). */
function Die({ n, dropped }: { n: number; dropped?: boolean }) {
  return (
    <span className={`die ${dropped ? "dropped" : ""}`} aria-label={dropped ? `${n}, dropped` : String(n)}>
      {n}
    </span>
  );
}

/** Rolled scores, one roll at a time; each total is then put on an ability in the table below. */
function RollPanel({ c, set }: { c: Character; set: (p: Partial<Character>) => void }) {
  const rolls = c.rolls ?? [];
  const usedBy = (i: number) => ABILITIES.find((a) => c.rollFor?.[a] === i);
  const rollNext = () => set({ rolls: [...rolls, roll4d6()] });
  const rollRest = () => set({ rolls: [...rolls, ...Array.from({ length: ROLL_COUNT - rolls.length }, () => roll4d6())] });
  const startOver = () => confirm("Throw away these rolls and roll again?") && set({ rolls: [], rollFor: {}, base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
  return (
    <div className="roll-panel">
      <p className="muted">
        Roll 4d6 six times; the lowest die of each roll is dropped. Then put each total on the ability you want in the table below.
      </p>
      <ol className="roll-slots">
        {Array.from({ length: ROLL_COUNT }, (_, i) => {
          const dice = rolls[i];
          const who = dice ? usedBy(i) : undefined;
          return (
            <li key={i} className={`roll-slot ${dice ? "done" : ""} ${who ? "used" : ""}`}>
              {dice ? (
                <>
                  <span className="roll-dice">
                    {dice.map((n, k) => (
                      <Die key={k} n={n} dropped={k === 3} />
                    ))}
                  </span>
                  <strong className="roll-total">{rollTotal(dice)}</strong>
                  <small className="muted">{who ? `on ${ABILITY_NAMES[who]}` : "not used yet"}</small>
                </>
              ) : i === rolls.length ? (
                <button type="button" className="btn primary small" onClick={rollNext}>
                  Roll {i + 1}
                </button>
              ) : (
                <span className="muted roll-wait">Roll {i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="row-actions">
        {rolls.length > 0 && rolls.length < ROLL_COUNT && (
          <button type="button" className="link" onClick={rollRest}>
            Roll the rest at once
          </button>
        )}
        {rolls.length > 0 && (
          <button type="button" className="link" onClick={startOver}>
            Start over
          </button>
        )}
        <span className="muted">Rolled at the table? Pick “Manual” and type them.</span>
      </div>
    </div>
  );
}

/** What each ability does, in plain words (shown next to it). */
const ABILITY_WHAT: Record<Ability, string> = {
  STR: "Melee weapon hits, carrying, climbing and shoving.",
  DEX: "Armor Class, initiative, bows and finesse weapons, stealth.",
  CON: "Hit points, and keeping concentration on spells.",
  INT: "Wizard and artificer magic; knowledge skills like Arcana.",
  WIS: "Cleric, druid and ranger magic; Perception and Insight.",
  CHA: "Sorcerer, bard, warlock and paladin magic; Persuasion.",
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
    else if (m === "rolled") set({ abilityMethod: m, rolls: [], rollFor: {}, base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
    else set({ abilityMethod: m });
  };
  // Older rolled characters have typed scores and no saved dice: keep the number boxes for them.
  const rolledDice = c.abilityMethod === "rolled" && (c.rolls?.length ?? 0) > 0;
  const freshRolled = c.abilityMethod === "rolled" && !(c.rolls?.length ?? 0) && ABILITIES.every((a) => c.base[a] === 10);
  const typedRolled = c.abilityMethod === "rolled" && !rolledDice && !freshRolled;
  const putRoll = (a: Ability, v: string) => {
    const rollFor = assignRoll(c.rollFor ?? {}, a, v === "" ? undefined : Number(v));
    set({ rollFor, base: baseFromRolls(c.rolls, rollFor) });
  };

  /** Standard array: picking a value swaps it with whichever ability had it. */
  const pickStandard = (a: Ability, v: number) => {
    const holder = ABILITIES.find((x) => x !== a && c.base[x] === v);
    set({ base: { ...c.base, [a]: v, ...(holder ? { [holder]: c.base[a] } : {}) } });
  };

  return (
    <div className="stack">
      <Card todo="ability-scores"
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
        {(rolledDice || freshRolled) && <RollPanel c={c} set={set} />}
        {typedRolled && (
          <div className="row-actions">
            <span className="muted">These are the scores you typed in.</span>
            <button
              type="button"
              className="link"
              onClick={() => confirm("Replace these scores with new rolls, one at a time?") && set({ rolls: [], rollFor: {}, base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } })}
            >
              Roll new ones with dice
            </button>
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
                  {d.cls.recommended[0] === a && <span className="fit-tag">Main for {d.cls.name}</span>}
                  <small className="ability-what">{ABILITY_WHAT[a]}</small>
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
                  ) : rolledDice || freshRolled ? (
                    <select
                      value={c.rollFor?.[a] ?? ""}
                      onChange={(e) => putRoll(a, e.target.value)}
                      aria-label={`${ABILITY_NAMES[a]}: which roll`}
                      disabled={!c.rolls?.length}
                      className={`roll-pick ${c.rollFor?.[a] == null ? "roll-unset" : ""}`}
                    >
                      <option value="">{c.rolls?.length ? "Choose…" : "Roll first"}</option>
                      {(c.rolls ?? []).map((dice, i) => {
                        const who = ABILITIES.find((x) => c.rollFor?.[x] === i);
                        return (
                          <option key={i} value={i}>
                            {rollTotal(dice)} (roll {i + 1}){who && who !== a ? ` · now on ${who}` : ""}
                          </option>
                        );
                      })}
                    </select>
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

      {c.level >= 4 && (
      <Card todo="feat" title="Level 4 feat">
        <fieldset className="plain">
          <Field label="Feat" hint={l4.text}>
            <Select<FeatId> value={c.level4Feat} options={R.level4Feats.filter((f) => inBooks(books, f.book)).map((f) => ({ value: f.id, label: `${f.name}${f.category === "origin" ? " (origin)" : ""}${f.plusOne?.includes(d.cls.recommended[0]) && f.plusOne.length < 6 ? ` ★ good for ${d.cls.name}` : ""}` }))} onChange={(level4Feat) => set({ level4Feat })} />
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
      )}
    </div>
  );
}
