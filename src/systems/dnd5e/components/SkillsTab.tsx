import { RARE_LANGUAGES, STANDARD_LANGUAGES, signed } from "../data/core";
import type { Character } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card, ChipPicker, Counter, Field } from "../../../components/ui";

export function SkillsTab({ c, d, set }: TabProps<Character, Derived>) {
  return (
    <div className="stack">
      <Card title="Skills" aside={<span className="muted">Change picks on the Class, {d.rules.speciesWord} and Background tabs</span>}>
        <table className="skill-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Ability</th>
              <th>Bonus</th>
              <th>Proficient from</th>
            </tr>
          </thead>
          <tbody>
            {d.skills.map((s) => (
              <tr key={s.id} className={s.proficient ? "prof" : ""}>
                <td>
                  <span className="dot" /> {s.name}
                </td>
                <td className="muted">{s.ability}</td>
                <td>
                  <strong>{signed(s.bonus)}</strong>
                </td>
                <td className="muted">{s.sources.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Languages" aside={<Counter count={c.languages.length} max={d.languageLimit} label="Known" />}>
        <p className="muted">
          {d.species.languages
            ? `${d.species.name}: ${d.species.languages.join(", ")}. You can know ${d.languageLimit} in total, counting picks from your ${d.rules.speciesWord.toLowerCase()}, background and subclass.`
            : "Common plus two languages of your choice. Rare languages need your DM's OK."}
        </p>
        <h4>Standard</h4>
        <ChipPicker options={STANDARD_LANGUAGES.map((l) => ({ value: l, label: l }))} selected={c.languages} max={d.languageLimit} onChange={(languages) => set({ languages })} />
        <h4>Rare</h4>
        <ChipPicker options={RARE_LANGUAGES.map((l) => ({ value: l, label: l }))} selected={c.languages} max={d.languageLimit} onChange={(languages) => set({ languages })} />
      </Card>

      <Card title="Tools & other proficiencies">
        <dl className="kv wide">
          <dt>Weapons</dt>
          <dd>Simple Weapons</dd>
          <dt>Armor</dt>
          <dd>None</dd>
          <dt>Tools (background)</dt>
          <dd>{d.bg.tools}</dd>
        </dl>
        <Field label="Other tools" hint="e.g. the specific gaming set or instrument you chose, or tools from the Skilled feat">
          <input value={c.extraTools} onChange={(e) => set({ extraTools: e.target.value })} placeholder="Playing Card Set" />
        </Field>
      </Card>
    </div>
  );
}
