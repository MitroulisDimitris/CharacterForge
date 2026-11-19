import { useState } from "react";
import { GEAR, SORCERER_KIT } from "../data/equipment";
import { newId, type Character, type Coins, type InventoryItem } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card } from "../../../components/ui";
import { StartingEquipment } from "./StartingEquipment";
import { MAX_ATTUNED, readItem } from "../magicItems";

export function EquipmentTab(props: TabProps<Character, Derived>) {
  const { c, d, set } = props;
  const [preset, setPreset] = useState(GEAR[0].name);
  const setItems = (inventory: InventoryItem[]) => set({ inventory });
  const update = (id: string, patch: Partial<InventoryItem>) => setItems(c.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // Carrying capacity is a hard limit (PHB: Strength × 15 lb; more can only be pushed or dragged).
  // Anything that adds weight stops at the limit and says why; taking things away always works.
  const [weightNote, setWeightNote] = useState("");
  const room = d.capacity - d.carried;
  const limit = `${d.capacity} lb you can carry (Strength × 15)`;
  const tooHeavy = (what: string) => setWeightNote(`${what}: more would go over the ${limit}.`);
  const add = (name: string, weight: number, qty = 1) => {
    if (weight * qty > room + 1e-9) return setWeightNote(`Can't add ${name} (${weight} lb): you're carrying ${+d.carried.toFixed(1)} of the ${limit}. Drop something first.`);
    setWeightNote("");
    const existing = c.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) update(existing.id, { qty: existing.qty + qty });
    else setItems([...c.inventory, { id: newId(), name, qty, weight }]);
  };
  /** A typed quantity or weight: kept as typed when it fits, else capped at what fits (never below the old value). */
  const setLoad = (i: InventoryItem, field: "qty" | "weight", value: number) => {
    const next = { ...i, [field]: value };
    const others = d.carried - i.qty * i.weight;
    if (others + next.qty * next.weight <= d.capacity + 1e-9 || value <= i[field]) {
      setWeightNote("");
      return update(i.id, { [field]: value });
    }
    const other = field === "qty" ? i.weight : i.qty;
    const fit = other > 0 ? (d.capacity - others) / other : value;
    const capped = Math.max(i[field], field === "qty" ? Math.floor(fit + 1e-9) : Math.floor(fit * 100 + 1e-6) / 100);
    update(i.id, { [field]: capped });
    tooHeavy(`${i.name} capped at ${field === "qty" ? capped : `${capped} lb each`}`);
  };
  const setCoin = (k: keyof Coins, value: number) => {
    const old = c.coins[k];
    if (value > old && (value - old) / 50 > room + 1e-9) {
      set({ coins: { ...c.coins, [k]: Math.max(old, old + Math.floor(room * 50 + 1e-6)) } });
      return tooHeavy(`${k.toUpperCase()} capped (50 coins weigh 1 lb)`);
    }
    setWeightNote("");
    set({ coins: { ...c.coins, [k]: value } });
  };

  return (
    <div className="stack">
      {c.edition === "2014" && c.level === 1 && <StartingEquipment {...props} />}
      <Card todo="armor-class" title="Armor Class" aside={<strong>{d.ac}</strong>}>
        <p className="muted">{d.acNote}. The app wears the best armor and shield you have marked as worn and are proficient with.</p>
      </Card>
      <Card todo="attacks" title="Attacks" aside={<span className="muted">From weapons in your inventory and damage cantrips</span>}>
        <table className="attack-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hit / DC</th>
              <th>Damage</th>
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
                <td className="muted">{a.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card todo="inventory"
        title="Inventory"
        aside={
          <span className="inv-aside">
            {c.inventory.some((i) => readItem(i.name).effect?.attune) && (
              <span className={d.attunedCount > MAX_ATTUNED ? "counter over" : "muted"} title="A character can be attuned to 3 magic items at most">
                Attuned {d.attunedCount} of {MAX_ATTUNED}
              </span>
            )}
            <span className={d.carried > d.capacity ? "counter over" : "muted"}>
              {d.carried.toFixed(1)} / {d.capacity} lb
            </span>
          </span>
        }
      >
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item</th>
              <th title="Worn or held: only these count for AC, attacks and magic">Worn</th>
              <th title="Magic items that need attunement work only when attuned (3 at most)">Attuned</th>
              <th>Qty</th>
              <th>Weight (each)</th>
              <th>Total</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => {
              const r = readItem(i.name);
              const needsAttune = !!r.effect?.attune;
              const full = !i.attuned && d.attunedCount >= MAX_ATTUNED;
              return (
              <tr key={i.id}>
                <td>
                  <input value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} aria-label="Item name" />
                  {r.effect && (
                    <small className={`inv-magic ${needsAttune && !i.attuned ? "off" : ""}`}>
                      {r.effect.text}
                      {needsAttune && !i.attuned ? " · attune to use it" : ""}
                    </small>
                  )}
                </td>
                <td className="inv-check">
                  <input type="checkbox" checked={i.equipped !== false} onChange={(e) => update(i.id, { equipped: e.target.checked })} aria-label={`${i.name} worn or held`} />
                </td>
                <td className="inv-check">
                  {needsAttune && (
                    <input
                      type="checkbox"
                      checked={!!i.attuned}
                      disabled={full}
                      title={full ? `Already attuned to ${MAX_ATTUNED} items: un-attune one first` : undefined}
                      onChange={(e) => update(i.id, { attuned: e.target.checked })}
                      aria-label={`Attuned to ${i.name}`}
                    />
                  )}
                </td>
                <td>
                  <input type="number" min={0} value={i.qty} onChange={(e) => setLoad(i, "qty", Math.max(0, Math.floor(Number(e.target.value) || 0)))} aria-label="Quantity" />
                </td>
                <td>
                  <input type="number" min={0} step={0.1} value={i.weight} onChange={(e) => setLoad(i, "weight", Math.max(0, Number(e.target.value) || 0))} aria-label="Weight" />
                </td>
                <td className="muted">{+(i.qty * i.weight).toFixed(2)} lb</td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => setItems(c.inventory.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.name}`}>
                    ✕
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {weightNote && (
          <p className="weight-note" role="status">
            {weightNote}
          </p>
        )}
        <div className="row-actions">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Common item">
            {GEAR.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.weight} lb)
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost" onClick={() => add(preset, GEAR.find((g) => g.name === preset)!.weight)}>
            Add
          </button>
          <button type="button" className="btn ghost" onClick={() => (setWeightNote(""), setItems([...c.inventory, { id: newId(), name: "New item", qty: 1, weight: 0 }]))}>
            Add custom
          </button>
          {c.edition === "2024" && <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (confirm("Replace your inventory with the Sorcerer starting kit (option A) and set gold to 28 GP?"))
                set({ inventory: SORCERER_KIT.items.map((i) => ({ ...i, id: newId() })), coins: { ...c.coins, gp: SORCERER_KIT.gp } });
            }}
          >
            Load Sorcerer starting kit
          </button>}
        </div>
      </Card>

      <Card todo="coins" title="Coins">
        <div className="coins">
          {(["cp", "sp", "ep", "gp", "pp"] as (keyof Coins)[]).map((k) => (
            <label key={k} className="coin">
              <span>{k.toUpperCase()}</span>
              <input type="number" min={0} value={c.coins[k]} onChange={(e) => setCoin(k, Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
            </label>
          ))}
        </div>
        <p className="muted">50 coins weigh 1 lb. Starting equipment from your background: {d.bg.equipment}.</p>
      </Card>
    </div>
  );
}
