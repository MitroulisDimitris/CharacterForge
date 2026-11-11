import type { Character } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card, Segmented } from "../../../components/ui";
import { ChangePreview, WithPreview, useHover } from "./Preview";
import { deriveWith } from "../preview";
import { POOLS, averageGold, classKit, expandKit, goldFormula, pickOf, rollGold, startingEquipment } from "../startingKit";

/** 2014 starting equipment: the class's (a)/(b) choices + background kit, or gold instead. */
export function StartingEquipment({ c, d, set, books, applyLabel = "Put it in my inventory" }: TabProps<Character, Derived> & { applyLabel?: string }) {
  const CL = d.cls;
  const { hover, bind } = useHover<string>();
  // Preview: your numbers with the kit as picked now vs. with the hovered option.
  const kitOf = (cc: Character) => startingEquipment({ ...cc, equipMode: "kit" }, CL, d.bg).inventory;
  const withKit = deriveWith(c, { inventory: kitOf(c) }, books);
  const hovered = (() => {
    if (!hover) return null;
    const [chId, opt] = hover.split(":");
    if (pickOf(c, CL.equipment.choices.find((x) => x.id === chId)!).option === Number(opt)) return null;
    const cc = { ...c, equipPicks: { ...c.equipPicks, [chId]: { option: Number(opt), picks: [] } } };
    return deriveWith(cc, { inventory: kitOf(cc) }, books);
  })();
  const kitPanel = (
    <ChangePreview
      before={withKit}
      after={hovered}
      title="Your starting kit"
      previewing={!!hovered}
      chips={hovered ? [] : [`AC ${withKit.ac}`, ...withKit.attacks.filter((a) => kitOf(c).some((i) => i.name === a.name)).map((a) => `${a.name} ${a.bonus} · ${a.damage}`)]}
      empty="Hover an option to see how it changes your AC and attacks. With your picks so far:"
    />
  );
  const { items, missing } = classKit(c, CL);
  const martial = d.weaponText.toLowerCase().includes("martial");
  const heavy = d.armorText.includes("heavy");
  const setPick = (id: string, option: number, picks: string[]) => set({ equipPicks: { ...c.equipPicks, [id]: { option, picks } } });

  const apply = () => {
    const { inventory, gp } = startingEquipment(c, CL, d.bg);
    if (c.inventory.length && !confirm("Replace your current inventory and gold with this starting equipment?")) return;
    set({ inventory, coins: { cp: 0, sp: 0, ep: 0, gp, pp: 0 } });
  };

  return (
    <Card title="Starting equipment" aside={<span className="muted">Level 1 only</span>}>
      <p className="muted">
        Take the {CL.name.toLowerCase()}'s equipment plus your background's, <em>or</em> take starting gold ({goldFormula(CL)}) and buy everything yourself. Gold replaces both kits.
      </p>
      <Segmented
        value={c.equipMode}
        options={[
          { value: "kit", label: "Class + background equipment" },
          { value: "gold", label: `Starting gold (${goldFormula(CL)})` },
        ]}
        onChange={(equipMode) => set({ equipMode })}
      />

      {c.equipMode === "kit" ? (
        <WithPreview panel={kitPanel}>
        <div className="stack small-gap">
          {CL.equipment.choices.map((ch) => {
            const p = pickOf(c, ch);
            return (
              <div key={ch.id} className="equip-choice">
                <div className="option-row">
                  {ch.options.map((o, i) => {
                    const blocked = (o.needs === "martial" && !martial) || (o.needs === "heavy" && !heavy);
                    return (
                      <button
                        type="button"
                        key={o.label}
                        className={`chip ${p.option === i ? "on" : ""}`}
                        aria-pressed={p.option === i}
                        disabled={blocked}
                        title={blocked ? "You aren't proficient with it" : undefined}
                        onClick={() => setPick(ch.id, i, [])}
                        {...bind(`${ch.id}:${i}`)}
                      >
                        <span>
                          {ch.options.length > 1 ? `(${"abc"[i]}) ` : ""}
                          {o.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const o = ch.options[p.option] ?? ch.options[0];
                  if (!o.pick) return null;
                  return (
                    <div className="option-row">
                      {Array.from({ length: o.pick.count }, (_, k) => (
                        <select
                          key={k}
                          value={p.picks[k] ?? ""}
                          aria-label={`${o.label} ${k + 1}`}
                          onChange={(e) => {
                            const picks = [...p.picks];
                            picks[k] = e.target.value;
                            setPick(ch.id, p.option, picks);
                          }}
                        >
                          <option value="">Choose…</option>
                          {POOLS[o.pick!.pool].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <p>
            <strong>You get:</strong> {expandKit(items).map((i) => `${i.qty > 1 ? `${i.qty} × ` : ""}${i.name}`).join(", ")}
            {CL.equipment.fixed.length ? "" : ""}
          </p>
          <p>
            <strong>From your background ({d.bg.name}):</strong> {d.bg.kit?.map((i) => `${i.qty > 1 ? `${i.qty} × ` : ""}${i.name}`).join(", ") || d.bg.equipment}
            {d.bg.gp ? `, ${d.bg.gp} GP` : ""}
          </p>
          {missing.length > 0 && <p className="muted">Still to pick: {missing.join(", ")}.</p>}
        </div>
        </WithPreview>
      ) : (
        <div className="row-actions">
          <label className="field inline">
            <span className="field-label">Gold</span>
            <input type="number" min={0} value={c.startGold || ""} placeholder={String(averageGold(CL))} onChange={(e) => set({ startGold: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
          <button type="button" className="btn ghost" onClick={() => set({ startGold: rollGold(CL) })}>
            Roll {goldFormula(CL)}
          </button>
          <span className="muted">Empty = the average ({averageGold(CL)} GP). Buy your gear in the inventory below.</span>
        </div>
      )}
      <div className="row-actions">
        <button type="button" className="btn primary" onClick={apply}>
          {applyLabel}
        </button>
      </div>
    </Card>
  );
}
