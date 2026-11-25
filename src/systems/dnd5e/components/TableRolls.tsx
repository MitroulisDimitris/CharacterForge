// Dice at the table (user, 2026-11-24; mockup "Session Versions and Table Dice", page "Dice at the
// table"): everything a 5e character can roll, in five groups, on the player's session page. The chips
// are the same rolls as on the Sheet and Spells tab (rollSpecs.ts); the session page shares them.
import { useState, type ReactNode } from "react";
import { ABILITIES, ABILITY_NAMES, signed, type Ability } from "../data/core";
import { cantripDamage, type Spell } from "../data/spells";
import type { Character } from "../character";
import type { Derived } from "../derive";
import { RollChip } from "../../../components/Dice";
import { bonusOf, type RollSpec } from "../../../dice/roll";
import { abilityCheck, attackRolls, classRolls, initiativeRoll, savingThrow, skillCheck, spellAttackRoll, spellDiceBits, spellVia } from "../rollSpecs";

type Group = "checks" | "skills" | "attacks" | "spells" | "class";
const GROUPS: [Group, string][] = [
  ["checks", "Checks and saves"],
  ["skills", "Skills"],
  ["attacks", "Attacks"],
  ["spells", "Spells"],
  ["class", "Class dice"],
];

interface Chip {
  spec: RollSpec;
  text: string;
  label: string;
  fire?: boolean;
}
interface Row {
  key: string;
  name: string;
  note?: string;
  chips: Chip[];
}

const D20 = [{ n: 1, sides: 20 }];

function checkRows(d: Derived): Row[] {
  const rows: Row[] = [{ key: "init", name: "Initiative", note: "Dexterity", chips: [{ spec: initiativeRoll(d), text: signed(d.initiative), label: `Roll initiative, ${signed(d.initiative)}` }] }];
  for (const a of ABILITIES as readonly Ability[]) {
    const check = abilityCheck(d, a);
    const save = d.saves.find((s) => s.ability === a);
    const chips: Chip[] = [{ spec: check, text: `Check ${signed(bonusOf(check))}`, label: `Roll a ${ABILITY_NAMES[a]} check, ${signed(bonusOf(check))}` }];
    if (save) chips.push({ spec: savingThrow(d, save), text: `Save ${signed(save.bonus)}`, label: `Roll a ${ABILITY_NAMES[a]} saving throw, ${signed(save.bonus)}` });
    rows.push({ key: a, name: ABILITY_NAMES[a], note: save?.proficient ? "Proficient in the save" : undefined, chips });
  }
  rows.push({
    key: "death",
    name: "Death saving throw",
    note: "At 0 hit points: 10 or higher is a success",
    chips: [{ spec: { label: "Death saving throw", kind: "save", groups: D20, tone: "player" }, text: "d20", label: "Roll a death saving throw" }],
  });
  return rows;
}

function skillRows(d: Derived): Row[] {
  return d.skills.map((s) => ({
    key: s.name,
    name: s.name,
    note: `${ABILITY_NAMES[s.ability]}${s.expert ? " · expertise" : s.proficient ? " · proficient" : ""}`,
    chips: [{ spec: skillCheck(d, s), text: signed(s.bonus), label: `Roll ${s.name}, ${signed(s.bonus)}` }],
  }));
}

function attackRows(d: Derived): Row[] {
  return d.attacks.map((a) => {
    const r = attackRolls(d, a);
    const chips: Chip[] = [];
    if (r.hit) chips.push({ spec: r.hit, text: `${r.hitText} to hit`, label: `Roll ${a.name} attack, ${a.bonus} to hit` });
    if (r.damage) chips.push({ spec: r.damage, text: r.damageText!, label: `Roll ${a.name} damage, ${r.damageText}`, fire: r.fire });
    if (r.alt) chips.push({ spec: r.alt, text: r.altText!, label: `Roll ${a.name} damage with two hands, ${r.altText}` });
    for (const x of r.extras ?? []) chips.push({ spec: x.spec, text: x.text, label: `Roll ${a.name} extra damage, ${x.text}`, fire: x.fire });
    return { key: a.name, name: a.name, note: a.notes || undefined, chips };
  });
}

function spellRows(c: Character, d: Derived): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  const add = (name: string, s: Spell | undefined, atk: number, ability: Ability) => {
    if (!s || seen.has(name)) return;
    seen.add(name);
    const chips: Chip[] = [];
    if (s.attack) chips.push({ spec: spellAttackRoll(d, name, atk, ability), text: `${signed(atk)} to hit`, label: `Roll a spell attack for ${name}, ${signed(atk)}` });
    const dmg = s.level === 0 ? cantripDamage(s, c.level) : s.damage;
    const half = !!s.save && /half/i.test(s.desc);
    if (dmg)
      for (const b of spellDiceBits(dmg, { label: name, mod: d.mods[ability], half, via: spellVia(s) }))
        if (b.spec) chips.push({ spec: b.spec, text: b.text, label: `Roll ${b.text}${b.spec.unit ? ` ${b.spec.unit}` : ""} for ${name}`, fire: b.fire });
    if (!chips.length) return;
    const lvl = s.level === 0 ? "Cantrip" : `Level ${s.level}`;
    rows.push({ key: name, name, note: [lvl, s.save ? `${s.save} save${half ? ", half on a save" : ""}` : ""].filter(Boolean).join(" · "), chips });
  };
  const get = (n: string) => d.rules.getSpell(n);
  c.cantrips.forEach((n) => add(n, get(n), d.spellAttack, d.castAbility));
  c.prepared.forEach((n) => add(n, get(n), d.spellAttack, d.castAbility));
  d.spellRows.filter((r) => r.kind === "Always" || r.kind === "Innate").forEach((r) => add(r.name, r.spell, r.attackBonus, r.ability));
  if (d.caster)
    rows.unshift({
      key: "spell-attack",
      name: "Spell attack",
      note: `For a spell that rolls to hit · save DC ${d.spellDc}`,
      chips: [{ spec: spellAttackRoll(d, "", d.spellAttack, d.castAbility), text: signed(d.spellAttack), label: `Roll a spell attack, ${signed(d.spellAttack)}` }],
    });
  return rows;
}

function classDiceRows(d: Derived): Row[] {
  return classRolls(d).map((r) => ({ key: r.name, name: r.name, note: r.note, chips: [{ spec: r.spec, text: r.text, label: `Roll ${r.name}, ${r.text}` }] }));
}

export function TableRolls({ c, d }: { c: Character; d: Derived }) {
  const [group, setGroup] = useState<Group>("checks");
  const rows: Record<Group, () => Row[]> = {
    checks: () => checkRows(d),
    skills: () => skillRows(d),
    attacks: () => attackRows(d),
    spells: () => spellRows(c, d),
    class: () => classDiceRows(d),
  };
  const shown = rows[group]();
  const empty: Record<Group, ReactNode> = {
    checks: null,
    skills: null,
    attacks: "No attacks yet. Weapons in the inventory show up here.",
    spells: "No spells with dice to roll.",
    class: "No class dice at this level.",
  };
  return (
    <div className="table-rolls">
      <div className="table-roll-groups" role="tablist" aria-label="What to roll">
        {GROUPS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={group === id} className={group === id ? "on" : ""} onClick={() => setGroup(id)}>
            {label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="table-roll-rows">
          {shown.map((r) => (
            <li key={r.key}>
              <span className="table-roll-name">
                <strong>{r.name}</strong>
                {r.note && <small>{r.note}</small>}
              </span>
              <span className="table-roll-chips">
                {r.chips.map((ch, i) => (
                  <RollChip key={i} spec={ch.spec} fire={ch.fire} label={ch.label}>
                    {ch.text}
                  </RollChip>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty[group]}</p>
      )}
    </div>
  );
}
