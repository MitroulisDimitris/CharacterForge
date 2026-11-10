import type { Character } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card, Segmented } from "../../../components/ui";
import { POOLS, averageGold, classKit, expandKit, goldFormula, pickOf, rollGold, startingEquipment } from "../startingKit";

/** 2014 starting equipment: the class's (a)/(b) choices + background kit, or gold instead. */
export function StartingEquipment({ c, d, set, applyLabel = "Put it in my inventory" }: TabProps<Character, Derived> & { applyLabel?: string }) {
  const CL = d.cls;
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
