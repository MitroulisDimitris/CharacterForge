import type { Character, Details } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card, Field } from "../../../components/ui";

const SHORT: [keyof Details, string][] = [
  ["alignment", "Alignment"],
  ["gender", "Gender"],
  ["age", "Age"],
  ["height", "Height"],
  ["weight", "Weight"],
  ["eyes", "Eyes"],
  ["hair", "Hair"],
  ["skin", "Skin"],
  ["faith", "Faith"],
];

const LONG: [keyof Details, string, number][] = [
  ["personality", "Personality traits", 3],
  ["ideals", "Ideals", 2],
  ["bonds", "Bonds", 2],
  ["flaws", "Flaws", 3],
  ["appearance", "Appearance", 3],
  ["backstory", "Backstory", 6],
  ["allies", "Allies & organizations", 3],
  ["notes", "Additional notes", 3],
];

export function DetailsTab({ c, set }: TabProps<Character, Derived>) {
  const setD = (k: keyof Details, v: string) => set({ details: { ...c.details, [k]: v } });
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
          {SHORT.map(([k, label]) => (
            <Field key={k} label={label}>
              <input value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
      <Card title="Personality & story">
        <div className="grid-2">
          {LONG.map(([k, label, rows]) => (
            <Field key={k} label={label}>
              <textarea rows={rows} value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}
