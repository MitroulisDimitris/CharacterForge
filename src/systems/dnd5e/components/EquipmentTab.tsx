import { useState } from "react";
import { GEAR, SORCERER_KIT } from "../data/equipment";
import { newId, type Character, type Coins, type InventoryItem } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { Card } from "../../../components/ui";
import { StartingEquipment } from "./StartingEquipment";

export function EquipmentTab(props: TabProps<Character, Derived>) {
  const { c, d, set } = props;
  const [preset, setPreset] = useState(GEAR[0].name);
  const setItems = (inventory: InventoryItem[]) => set({ inventory });
  const update = (id: string, patch: Partial<InventoryItem>) => setItems(c.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const add = (name: string, weight: number, qty = 1) => {
    const existing = c.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) update(existing.id, { qty: existing.qty + qty });
    else setItems([...c.inventory, { id: newId(), name, qty, weight }]);
  };

  return (
    <div className="stack">
      {c.edition === "2014" && c.level === 1 && <StartingEquipment {...props} />}
      <Card title="Armor Class" aside={<strong>{d.ac}</strong>}>
        <p className="muted">{d.acNote}. The app wears the best armor and shield you own and are proficient with.</p>
      </Card>
      <Card title="Attacks" aside={<span className="muted">From weapons in your inventory and damage cantrips</span>}>
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

      <Card
        title="Inventory"
        aside={
          <span className={d.carried > d.capacity ? "counter over" : "muted"}>
            {d.carried.toFixed(1)} / {d.capacity} lb
          </span>
        }
      >
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Weight (each)</th>
              <th>Total</th>
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
                  <input type="number" min={0} step={0.1} value={i.weight} onChange={(e) => update(i.id, { weight: Math.max(0, Number(e.target.value) || 0) })} aria-label="Weight" />
                </td>
                <td className="muted">{+(i.qty * i.weight).toFixed(2)} lb</td>
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
            {GEAR.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.weight} lb)
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost" onClick={() => add(preset, GEAR.find((g) => g.name === preset)!.weight)}>
            Add
          </button>
          <button type="button" className="btn ghost" onClick={() => setItems([...c.inventory, { id: newId(), name: "New item", qty: 1, weight: 0 }])}>
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

      <Card title="Coins">
        <div className="coins">
          {(["cp", "sp", "ep", "gp", "pp"] as (keyof Coins)[]).map((k) => (
            <label key={k} className="coin">
              <span>{k.toUpperCase()}</span>
              <input type="number" min={0} value={c.coins[k]} onChange={(e) => set({ coins: { ...c.coins, [k]: Math.max(0, Number(e.target.value) || 0) } })} />
            </label>
          ))}
        </div>
        <p className="muted">50 coins weigh 1 lb. Starting equipment from your background: {d.bg.equipment}.</p>
      </Card>
    </div>
  );
}
