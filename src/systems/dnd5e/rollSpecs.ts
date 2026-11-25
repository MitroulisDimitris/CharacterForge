// Rolls from a 5e character's sheet (REQUIREMENTS 4.6, "Player rolls"): what a tap on an ability,
// save, skill, initiative or attack throws, with the bonus split into named parts.
import { ABILITY_NAMES, type Ability } from "./data/core";
import type { Attack, Derived } from "./derive";
import { parseDice, type BonusPart, type RollSpec, type Via } from "../../dice/roll";

const D20 = [{ n: 1, sides: 20 }];

/** Parts of a d20 bonus: the ability, proficiency (twice for expertise), then anything left over. */
function checkParts(d: Derived, ability: Ability, total: number, prof: "none" | "half" | "prof" | "expert", items: BonusPart[] = []): BonusPart[] {
  const parts: BonusPart[] = [{ label: d.scoreFrom[ability] ? `${ABILITY_NAMES[ability]} (${d.scoreFrom[ability]})` : ABILITY_NAMES[ability], value: d.mods[ability] }];
  const pb = prof === "half" ? Math.floor(d.pb / 2) : prof === "prof" ? d.pb : prof === "expert" ? d.pb * 2 : 0;
  if (pb) parts.push({ label: prof === "expert" ? "Proficiency × 2 (expertise)" : prof === "half" ? "Half proficiency (Jack of All Trades)" : "Proficiency", value: pb });
  parts.push(...items);
  const rest = total - parts.reduce((s, p) => s + p.value, 0);
  if (rest) parts.push({ label: "Other bonuses", value: rest });
  return parts;
}

export const abilityCheck = (d: Derived, a: Ability): RollSpec => {
  const jack = d.cls.id === "bard" && d.level >= 2;
  const items = d.itemParts.check;
  const bonus = d.mods[a] + (jack ? Math.floor(d.pb / 2) : 0) + items.reduce((s, p) => s + p.value, 0);
  return { label: `${ABILITY_NAMES[a]} check`, kind: "check", groups: D20, parts: checkParts(d, a, bonus, jack ? "half" : "none", items), tone: "player" };
};

export const savingThrow = (d: Derived, s: Derived["saves"][number]): RollSpec => ({
  label: `${ABILITY_NAMES[s.ability]} saving throw`,
  kind: "save",
  groups: D20,
  parts: checkParts(d, s.ability, s.bonus, s.proficient ? "prof" : "none", d.itemParts.save),
  tone: "player",
});

export const skillCheck = (d: Derived, s: Derived["skills"][number]): RollSpec => {
  const jack = !s.proficient && d.cls.id === "bard" && d.level >= 2;
  return {
    label: `${s.name} (${ABILITY_NAMES[s.ability]})`,
    kind: "check",
    groups: D20,
    parts: checkParts(d, s.ability, s.bonus, s.expert ? "expert" : s.proficient ? "prof" : jack ? "half" : "none", d.itemParts.check),
    tone: "player",
  };
};

export const initiativeRoll = (d: Derived): RollSpec => ({ label: "Initiative", kind: "check", groups: D20, parts: checkParts(d, "DEX", d.initiative, "none", d.itemParts.check), tone: "player" });

/** A Champion's Improved Critical: 19 or 20. */
export const critOn = (d: Derived) => (d.subclassActive && d.subclass?.id === "champion" && d.level >= 3 ? 19 : 20);

const numberOf = (s: string) => {
  const m = /^\s*([+−-])\s*(\d+)\s*$/.exec(s);
  return m ? (m[1] === "+" ? 1 : -1) * Number(m[2]) : null;
};

export interface AttackRolls {
  hit?: RollSpec;
  hitText?: string;
  damage?: RollSpec;
  damageText?: string;
  /** Versatile: the two-handed damage. */
  alt?: RollSpec;
  altText?: string;
  fire?: boolean;
  /** Extra damage from the weapon's magic, each its own chip ("+2d6 fire while lit"). */
  extras?: { spec: RollSpec; text: string; fire: boolean }[];
}

/** "1d8+3 Slashing" → dice "1d8+3", type "Slashing". */
const splitDamage = (s: string) => {
  const m = /^(\S+)\s*(.*)$/.exec(s.trim());
  return m ? { dice: m[1], type: m[2] } : null;
};

export function attackRolls(d: Derived, a: Attack): AttackRolls {
  const out: AttackRolls = {};
  const hit = numberOf(a.bonus);
  if (hit != null) {
    out.hit = { label: `${a.name} · attack`, kind: "attack", groups: D20, parts: a.parts ?? [{ label: "Attack bonus", value: hit }], critOn: critOn(d), tone: "player" };
    out.hitText = a.bonus;
  }
  const dmg = splitDamage(a.damage);
  const p = dmg && parseDice(dmg.dice);
  if (dmg && p) {
    const type = dmg.type.toLowerCase();
    out.fire = type === "fire";
    // A save cantrip (Sacred Flame) deals its damage on a failed save; no "half" for cantrips.
    const spec = (dice: typeof p, label: string): RollSpec => ({
      label,
      kind: "damage",
      groups: dice.groups.map((g) => ({ ...g, tone: out.fire ? "fire" : undefined })),
      ...(a.dmgParts ? { parts: a.dmgParts } : { bonus: dice.bonus }),
      unit: type,
      via: a.via,
      tone: "player",
    });
    out.damage = spec(p, `${a.name} · damage`);
    out.damageText = `${dmg.dice.replace(/([+-])/g, " $1 ")} ${type}`.replace(/\s+/g, " ").trim();
    const v = /Versatile \((\d+d\d+)\)/.exec(a.notes);
    const two = v && parseDice(`${v[1]}${p.bonus ? (p.bonus > 0 ? `+${p.bonus}` : p.bonus) : ""}`);
    if (v && two) {
      out.alt = spec(two, `${a.name} · damage (two hands)`);
      out.altText = `${v[1]}${p.bonus ? (p.bonus > 0 ? ` + ${p.bonus}` : ` − ${-p.bonus}`) : ""} two hands`;
    }
  }
  out.extras = (a.extra ?? []).flatMap((x) => {
    const p2 = parseDice(x.dice);
    if (!p2) return [];
    const fire = x.type === "fire";
    return [
      {
        spec: { label: `${a.name} · extra ${x.type}`, kind: "damage" as const, groups: p2.groups.map((g) => ({ ...g, tone: fire ? ("fire" as const) : undefined })), bonus: p2.bonus, unit: x.type, via: a.via, tone: "player" as const },
        text: `+ ${x.dice} ${x.type}${x.when ? ` ${x.when}` : ""}`,
        fire,
      },
    ];
  });
  return out;
}

export interface ClassRoll {
  name: string;
  /** When and how ("Bonus action · once per short or long rest"). */
  note: string;
  text: string;
  spec: RollSpec;
}

const heal = (label: string, dice: number, sides: number, parts: BonusPart[]): RollSpec => ({ label, kind: "heal", groups: [{ n: dice, sides }], parts, unit: "hit points back", tone: "player" });
const dmg = (label: string, dice: number, sides: number, unit: string, parts: BonusPart[] = []): RollSpec => ({ label, kind: "damage", groups: [{ n: dice, sides }], parts, unit, tone: "player" });
const withParts = (dice: string, parts: BonusPart[]) => `${dice}${parts.map((p) => (p.value >= 0 ? ` + ${p.value}` : ` − ${-p.value}`)).join("")}`;

/** Dice from class features (levels 1–5, 2014): Hit Dice, Second Wind, Sneak Attack, Divine Smite… */
export function classRolls(d: Derived): ClassRoll[] {
  const out: ClassRoll[] = [];
  const L = d.level;
  const sub = d.subclassActive ? d.subclass?.id : undefined;
  const con: BonusPart[] = [{ label: "Constitution", value: d.mods.CON }];
  const hd = d.cls.hitDie;
  out.push({ name: "Hit Die", note: `Short rest: spend one of your ${d.hitDice} to heal`, text: withParts(`1d${hd}`, con), spec: heal("Hit Die", 1, hd, con) });
  const id = d.cls.id;
  if (id === "fighter") {
    const p = [{ label: "Fighter level", value: L }];
    out.push({ name: "Second Wind", note: "Bonus action · once per short or long rest", text: withParts("1d10", p), spec: heal("Second Wind", 1, 10, p) });
    if (sub === "battleMaster") out.push({ name: "Superiority Die", note: "Spent on a maneuver (4 per short rest)", text: "1d8", spec: { label: "Superiority Die", kind: "free", groups: [{ n: 1, sides: 8 }], tone: "player" } });
  }
  if (id === "rogue") {
    const n = Math.ceil(L / 2);
    out.push({ name: "Sneak Attack", note: "Once per turn: with advantage, or an ally next to the target", text: `${n}d6`, spec: dmg("Sneak Attack", n, 6, "extra damage") });
  }
  if (id === "bard") {
    const die = L >= 15 ? 12 : L >= 10 ? 10 : L >= 5 ? 8 : 6;
    out.push({ name: "Bardic Inspiration", note: `Bonus action: a creature adds it to one roll (${Math.max(1, d.mods.CHA)} per ${L >= 5 ? "short" : "long"} rest)`, text: `1d${die}`, spec: { label: "Bardic Inspiration", kind: "free", groups: [{ n: 1, sides: die }], tone: "player" } });
  }
  if (id === "paladin" && L >= 2)
    d.slots.forEach((n, i) => {
      if (!n) return;
      const dice = Math.min(5, 2 + i);
      out.push({ name: `Divine Smite (level ${i + 1} slot)`, note: "On a melee weapon hit; +1d8 against undead and fiends", text: `${dice}d8 radiant`, spec: { ...dmg(`Divine Smite (level ${i + 1})`, dice, 8, "radiant"), via: "melee" } });
    });
  if (id === "monk" && L >= 3) {
    const p = [{ label: "Dexterity", value: d.mods.DEX }, { label: "Monk level", value: L }];
    out.push({ name: "Deflect Missiles", note: "Reaction: lower a ranged weapon hit's damage by this", text: withParts("1d10", p), spec: { label: "Deflect Missiles", kind: "free", groups: [{ n: 1, sides: 10 }], parts: p, tone: "player" } });
  }
  if (id === "ranger") {
    if (sub === "hunter") out.push({ name: "Colossus Slayer", note: "Once per turn, against a creature below its hit point maximum", text: "1d8", spec: dmg("Colossus Slayer", 1, 8, "extra damage") });
  }
  if (id === "cleric") {
    if (sub === "tempest") out.push({ name: "Wrath of the Storm", note: "Reaction when hit within 5 ft (DEX save for half)", text: "2d8 lightning or thunder", spec: { ...dmg("Wrath of the Storm", 2, 8, "lightning or thunder"), half: true, via: "area" } });
    if (sub === "light" && L >= 2) {
      const p = [{ label: "Cleric level", value: L }];
      out.push({ name: "Radiance of the Dawn", note: "Channel Divinity: foes within 30 ft (CON save for half)", text: withParts("2d10", p) + " radiant", spec: { ...dmg("Radiance of the Dawn", 2, 10, "radiant", p), half: true, via: "area" } });
    }
    if (sub === "peace" && L >= 2) {
      const p = [{ label: "Wisdom", value: d.mods.WIS }];
      out.push({ name: "Balm of Peace", note: "Channel Divinity: each creature you pass", text: withParts("2d6", p), spec: heal("Balm of Peace", 2, 6, p) });
    }
  }
  if (id === "sorcerer" && sub === "wild") out.push({ name: "Wild Magic Surge", note: "After a 1st-level or higher sorcerer spell, if the DM asks", text: "d20 (a 1 surges)", spec: { label: "Wild Magic Surge check", kind: "free", groups: [{ n: 1, sides: 20 }], tone: "player" } });
  return out;
}

// ---------- Spells (user, 2026-11-22: "roll dice on my spells from my character page") ----------

/** A spell attack: d20 + the casting ability + proficiency (+ items like a Wand of the War Mage). */
export const spellAttackRoll = (d: Derived, name: string, total: number, ability: Ability): RollSpec => ({
  label: name ? `${name} · spell attack` : "Spell attack",
  kind: "attack",
  groups: D20,
  parts: checkParts(d, ability, total, "prof"),
  tone: "player",
});

/** How a spell deals its damage: its attack (melee / ranged), else a saving throw or area. */
export const spellVia = (s: { attack?: "melee" | "ranged"; save?: string }): Via => s.attack ?? "area";

const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

/** A piece of a spell's damage text: plain, or dice that roll. */
export interface SpellDiceBit {
  text: string;
  spec?: RollSpec;
  fire?: boolean;
}

/**
 * Spell damage or healing text → pieces with rolls: "3d8 (chosen type)", "1d4 + mod healing"
 * ("mod" becomes the casting modifier), "2d4+4 Temp HP", "1d10 Piercing + 2d6 Cold" (two rolls).
 */
export function spellDiceBits(text: string, o: { label: string; mod: number; half?: boolean; via?: Via }): SpellDiceBit[] {
  const t = text.replace(/\+\s*mod\b/gi, o.mod < 0 ? `− ${Math.abs(o.mod)}` : `+ ${o.mod}`);
  const out: SpellDiceBit[] = [];
  let at = 0;
  for (const m of t.matchAll(/\d+d\d+(?:\s*[+−-]\s*\d+(?![\dd]))?/g)) {
    const p = parseDice(m[0]);
    if (!p) continue;
    const i = m.index ?? 0;
    if (i > at) out.push({ text: t.slice(at, i) });
    const after = t.slice(i + m[0].length);
    const word = (/^\)?\s*([A-Za-z]+(?: HP)?)/.exec(after)?.[1] ?? "").toLowerCase();
    const heal = word === "healing";
    const temp = word === "temp hp";
    const type = DAMAGE_TYPES.includes(word) ? word : "";
    const fire = type === "fire";
    out.push({
      text: m[0],
      fire,
      spec: {
        label: `${o.label} · ${heal ? "healing" : temp ? "temporary hit points" : "damage"}`,
        kind: heal || temp ? "heal" : "damage",
        groups: p.groups.map((g) => ({ ...g, tone: fire ? ("fire" as const) : undefined })),
        bonus: p.bonus,
        unit: heal ? "hit points back" : temp ? "temporary hit points" : type || "damage",
        half: !!o.half && !heal && !temp,
        via: heal || temp ? undefined : o.via,
        tone: "player",
      },
    });
    at = i + m[0].length;
  }
  if (at < t.length) out.push({ text: t.slice(at) });
  return out;
}
