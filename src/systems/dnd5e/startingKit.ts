// Starting equipment (2014): the class kit with its (a)/(b) choices plus the background's kit,
// or starting gold by class instead of both (PHB chapter 5).
import { MARTIAL_MELEE, MARTIAL_WEAPONS, MUSICAL_INSTRUMENTS, PACKS, SIMPLE_MELEE, SIMPLE_WEAPONS, weightOf, type KitItem } from "./data/equipment";
import type { ClassDef, EquipChoice, WeaponPool } from "./data/classes";
import type { Background } from "./data/backgrounds";
import { newId, type Character, type InventoryItem } from "./character";

export const POOLS: Record<WeaponPool, string[]> = {
  simple: SIMPLE_WEAPONS,
  martial: MARTIAL_WEAPONS,
  simpleMelee: SIMPLE_MELEE,
  martialMelee: MARTIAL_MELEE,
  instrument: MUSICAL_INSTRUMENTS,
};

/** The option the player picked for a choice (default: the first). */
export const pickOf = (c: Character, ch: EquipChoice) => c.equipPicks[ch.id] ?? { option: 0, picks: [] };

/** Items of the class kit with the current picks; lists choices still missing. */
export function classKit(c: Character, cls: ClassDef) {
  const items: KitItem[] = [...cls.equipment.fixed];
  const missing: string[] = [];
  for (const ch of cls.equipment.choices) {
    const p = pickOf(c, ch);
    const opt = ch.options[p.option] ?? ch.options[0];
    items.push(...opt.items);
    if (opt.pick) {
      const chosen = p.picks.filter(Boolean).slice(0, opt.pick.count);
      chosen.forEach((n) => items.push({ name: n, qty: 1 }));
      if (chosen.length < opt.pick.count) missing.push(opt.label);
    }
  }
  return { items, missing };
}

/** Expand packs into their contents and merge duplicates. */
export function expandKit(items: KitItem[]): KitItem[] {
  const out = new Map<string, number>();
  const add = (name: string, qty: number) => out.set(name, (out.get(name) ?? 0) + qty);
  for (const it of items) {
    const pack = PACKS[it.name];
    if (pack) pack.forEach((p) => add(p.name, p.qty * it.qty));
    else add(it.name, it.qty);
  }
  return [...out].map(([name, qty]) => ({ name, qty }));
}

export const toInventory = (items: KitItem[]): InventoryItem[] => expandKit(items).map((i) => ({ id: newId(), name: i.name, qty: i.qty, weight: weightOf(i.name) }));

/** "5d4 × 10 GP" */
export const goldFormula = (cls: ClassDef) => `${cls.gold.dice}d4${cls.gold.mult > 1 ? ` × ${cls.gold.mult}` : ""} GP`;
export const averageGold = (cls: ClassDef) => cls.gold.dice * 2.5 * cls.gold.mult;
export function rollGold(cls: ClassDef) {
  let t = 0;
  for (let i = 0; i < cls.gold.dice; i++) t += 1 + Math.floor(Math.random() * 4);
  return t * cls.gold.mult;
}

/** What "Apply" puts on the sheet: inventory + gold. */
export function startingEquipment(c: Character, cls: ClassDef, bg: Background) {
  if (c.equipMode === "gold") return { inventory: [] as InventoryItem[], gp: c.startGold || averageGold(cls) };
  const { items } = classKit(c, cls);
  return { inventory: toInventory([...items, ...(bg.kit ?? [])]), gp: bg.gp ?? 0 };
}
