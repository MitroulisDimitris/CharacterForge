// Level-up / level-down for D&D 5e (2014 and 2024): what you gain, what you choose, what you lose.
// Driven by the class tables (data/classes.ts), so it works for any class the app supports.
import { signed } from "./data/core";
import { spellLimit } from "./data/classes";
import type { Gain, Progression, Unlock } from "../types";
import type { Character } from "./character";
import type { Derived } from "./derive";
import { RULES, classOf } from "./rules";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th"];
const s = (n: number) => (n === 1 ? "" : "s");

/** Plain-words tips for players learning the class. */
const TIPS: Record<string, string> = {
  "Font of Magic": "Sorcery Points refill on a long rest. Spend them on Metamagic, or turn them into an extra spell slot when you run dry.",
  Metamagic: "Metamagic bends your spells. Quickened lets you cast a spell as a bonus action; Twinned hits two targets with a one-target spell.",
  "Innate Sorcery": "Turn it on at the start of a big fight: +1 to your spell save DC and Advantage on spell attacks for a minute.",
  "Sorcerous Restoration": "After a short rest you get some Sorcery Points back, so spending them before resting is never wasted.",
  "Magical Guidance": "Failed an important ability check? 1 Sorcery Point buys a reroll.",
  "Sorcerous Versatility": "At each Ability Score Improvement you can swap a Metamagic option or a cantrip you regret.",
  "Draconic Resilience": "You're tougher than a typical sorcerer: extra HP every level and natural armor when you wear none.",
};

const classCount = (d: Derived, kind: "Cantrip" | "Prepared") => d.spellRows.filter((r) => r.kind === kind && r.source === d.cls.name).length;
const slotText = (slots: number[]) => slots.map((n, i) => (n ? `${n}×${ORD[i + 1]}` : "")).filter(Boolean).join(" / ");

export const progression5e: Progression<Character, Derived> = {
  snapshot: (d) => [
    { label: "Hit Points", value: d.hpMax },
    { label: "Armor Class", value: d.ac },
    { label: "Proficiency Bonus", value: signed(d.pb) },
    ...(d.caster
      ? [
          { label: "Spell Save DC", value: d.spellDc },
          { label: "Spell Attack", value: signed(d.spellAttack) },
        ]
      : []),
    ...(d.cls.sorcery ? [{ label: "Sorcery Points", value: d.sorceryPoints }] : []),
    ...(d.cls.spell ? [{ label: "Spell Slots", value: slotText(d.slots) || "—" }] : []),
    ...(d.cls.spell?.cantrips.some(Boolean) ? [{ label: "Cantrips", value: d.cantripLimit }] : []),
    ...(d.cls.spell ? [{ label: `Spells ${d.spellsKind.toLowerCase()}`, value: d.preparedLimit }] : []),
    ...(d.cls.sorcery ? [{ label: "Metamagic", value: d.metamagicLimit }] : []),
  ],

  gainsAt(c, d, level) {
    const R = RULES[c.edition];
    const CL = classOf(R, c.cls);
    const SP = CL.spell;
    const gains: Gain[] = [];
    CL.features
      .filter((f) => f.level === level && !["Sorcerer Subclass", "Sorcerous Origin", "Ability Score Improvement", "Metamagic", CL.subclassLabel].includes(f.name))
      // Optional (book-tagged) features only if the derived sheet included them (book allowed).
      .filter((f) => !f.book || d.featureGroups.some((g) => g.items.some((i) => i.name === f.name)))
      .forEach((f) => gains.push({ name: f.name + (f.book ? " (Tasha's optional)" : ""), text: f.text, tip: TIPS[f.name] }));
    if (SP && level >= SP.startLevel) {
      const now = SP.slots[level];
      const before = level - 1 >= SP.startLevel ? SP.slots[level - 1] : [];
      if (now.length > before.length)
        gains.push({ name: `${ORD[now.length]}-level spell slots`, text: `You now have ${slotText(now)} spell slots.`, tip: `You can now pick ${ORD[now.length]}-level spells.` });
      else if (now.join() !== before.join()) gains.push({ name: "More spell slots", text: `Your slots go from ${slotText(before)} to ${slotText(now)}.` });
    }
    if (CL.sorcery && CL.sorcery.points[level] > CL.sorcery.points[level - 1] && level > 2) gains.push({ name: "More Sorcery Points", text: `You now have ${CL.sorcery.points[level]} Sorcery Points.` });
    // Features that scale (rages, Sneak Attack, Martial Arts die, Ki, Bardic Inspiration…).
    CL.features
      .filter((f) => f.level < level && f.dyn && f.dyn(level) && f.dyn(level) !== f.dyn(level - 1))
      .forEach((f) => gains.push({ name: `${f.name} improves`, text: f.dyn!(level).trim() }));
    if (level === 5) {
      gains.push({ name: "Proficiency bonus +3", text: "Your proficiency bonus rises from +2 to +3.", tip: "Attacks, spell DC, proficient skills and saves all go up by 1." });
      if (SP?.cantrips.some(Boolean)) gains.push({ name: "Stronger cantrips", text: "Damage cantrips now roll two dice (e.g. Fire Bolt 2d10).", tip: "Cantrips scale with your character level, not your spell slots." });
    }
    if (level >= CL.subclassLevel && d.subclass) {
      d.subclass.features.filter((f) => f.level === level && level !== CL.subclassLevel).forEach((f) => gains.push({ name: f.name, text: f.text, tip: TIPS[f.name] }));
      const spells = d.subclass.spells.filter((g) => g.minLevel === level && level !== CL.subclassLevel).map((g) => g.spell);
      if (spells.length) gains.push({ name: `${d.subclass.name}: new spells`, text: `You always have ${spells.join(" and ")} ${c.edition === "2014" && SP?.label === "Known" ? "known" : "prepared"}; they don't count against your limit.` });
    }
    d.species.traits.filter((t) => t.minLevel === level).forEach((t) => gains.push({ name: t.name, text: t.text }));
    const speciesSpells = [...(d.species.spells ?? []), ...(d.lineage?.spells ?? [])].filter((g) => g.minLevel === level && level > 1);
    if (speciesSpells.length) gains.push({ name: `${d.lineage?.name ?? d.species.name} magic`, text: `You can now cast ${speciesSpells.map((g) => g.spell).join(" and ")} (${speciesSpells[0].note ?? "innate"}).` });
    return gains;
  },

  unlocksAt(c, d, level) {
    const R = RULES[c.edition];
    const CL = classOf(R, c.cls);
    const SP = CL.spell ?? (d.subclassActive ? d.subclass?.spell : undefined);
    const out: Unlock<Derived>[] = [];
    if (level === CL.subclassLevel)
      out.push({
        id: `${level}:subclass`,
        level,
        title: c.edition === "2014" ? `Choose your ${CL.subclassLabel}` : "Choose your Sorcerer subclass",
        detail: "Your specialty within the class. It gives you features now and at later levels, and sometimes extra spells.",
        tab: "class",
        isDone: (dd) => dd.subclassActive && !dd.warnings.some((w) => w.text === `Choose your ${CL.subclassLabel}.`),
      });
    if (SP && level >= SP.startLevel) {
      const nc = SP.cantrips[level] - (SP.cantrips[level - 1] ?? 0);
      if (nc > 0)
        out.push({ id: `${level}:cantrips`, level, title: `Learn ${nc} new cantrip${s(nc)}`, detail: "Cantrips are spells you can cast at will, as often as you like, without using slots.", tab: "spells", isDone: (dd) => classCount(dd, "Cantrip") >= dd.cantripLimit });
      const abilityMod = d.mods[SP.ability];
      const ns = spellLimit(SP, level, abilityMod) - spellLimit(SP, level - 1, abilityMod);
      const newSlot = SP.slots[level].length > (SP.slots[level - 1] ?? []).length ? ` You can now choose ${ORD[SP.slots[level].length]}-level spells.` : "";
      if (ns > 0)
        out.push({
          id: `${level}:spells`,
          level,
          title: SP.label === "Prepared" ? `Prepare ${ns} more spell${s(ns)}` : `Learn ${ns} new spell${s(ns)}`,
          detail: (SP.label === "Prepared" ? "Add spells to the list you can cast with your slots." : `Add spells to the ones you know; ${CL.name.toLowerCase()}s can't swap them freely, so pick ones you'll use.`) + newSlot,
          tab: "spells",
          isDone: (dd) => classCount(dd, "Prepared") >= dd.preparedLimit,
        });
    }
    if (SP?.spellbook && level > 1)
      out.push({ id: `${level}:spellbook`, level, title: "Copy 2 spells into your spellbook", detail: "Each wizard level adds two wizard spells of a level you can cast to your spellbook for free.", tab: "spells", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith("Spellbook:")) });
    if (CL.fightingStyle?.level === level && level > 1)
      out.push({ id: `${level}:style`, level, title: "Choose a Fighting Style", detail: "A combat specialty: Defense (+1 AC in armor), Dueling (+2 damage one-handed), Great Weapon Fighting and more.", tab: "class", isDone: (dd) => dd.warnings.every((w) => w.text !== "Choose a Fighting Style.") });
    if (CL.expertise?.level === level && level > 1)
      out.push({ id: `${level}:expertise`, level, title: `Choose ${CL.expertise.count} skills for Expertise`, detail: "Your Proficiency Bonus doubles for them: pick the skills you use most.", tab: "class", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith("Expertise:")) });
    if (CL.invocations && CL.invocations[level] > (CL.invocations[level - 1] ?? 0)) {
      const n = CL.invocations[level] - (CL.invocations[level - 1] ?? 0);
      out.push({ id: `${level}:invocations`, level, title: `Choose ${n} Eldritch Invocation${s(n)}`, detail: "Invocations are permanent magical tricks. Agonizing Blast (CHA to Eldritch Blast damage) is the classic first pick.", tab: "class", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith("Eldritch Invocations:")) });
    }
    if (CL.pactBoonLevel === level)
      out.push({ id: `${level}:pact`, level, title: "Choose your Pact Boon", detail: "Chain (a clever familiar), Blade (a summoned weapon), Tome (three extra cantrips) or Talisman (a lucky amulet).", tab: "class", isDone: (dd) => dd.warnings.every((w) => w.text !== "Choose your Pact Boon.") });
    if (CL.infusions && CL.infusions[level] > (CL.infusions[level - 1] ?? 0))
      out.push({ id: `${level}:infusions`, level, title: `Learn ${CL.infusions[level] - (CL.infusions[level - 1] ?? 0)} infusions`, detail: "Infusions turn ordinary items into magic ones after a Long Rest. Enhanced Defense and Enhanced Weapon are simple, strong picks.", tab: "class", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith("Infusions:")) });
    const picks = d.subclassActive ? d.subclass?.picks : undefined;
    if (picks && picks.count[level] > (picks.count[level - 1] ?? 0))
      out.push({ id: `${level}:picks`, level, title: `Choose ${picks.label.toLowerCase()}`, detail: `Your ${d.subclass!.name} lets you pick ${picks.count[level]} ${picks.label.toLowerCase()}.`, tab: "class", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith(`${picks.label}:`)) });
    if (CL.sorcery) {
      const nm = CL.sorcery.metamagicKnown[level] - (CL.sorcery.metamagicKnown[level - 1] ?? 0);
      if (nm > 0)
        out.push({ id: `${level}:metamagic`, level, title: `Choose ${nm} Metamagic option${s(nm)}`, detail: TIPS.Metamagic, tab: "class", isDone: (dd) => dd.warnings.every((w) => !w.text.startsWith("Metamagic:")) });
    }
    if (level === 4)
      out.push({
        id: `${level}:asi`,
        level,
        title: "Ability Score Improvement or a feat",
        detail: `Raise one ability by 2 (or two by 1), or take a feat instead. Most ${CL.name.toLowerCase()}s raise ${CL.primary.split(",")[0]} first.`,
        tab: "abilities",
      });
    if (c.hpMethod === "rolled" && level > 1) out.push({ id: `${level}:hp`, level, title: "Roll your hit die", detail: `Roll a d${CL.hitDie} for this level's hit points (your Constitution modifier is added for you).`, tab: "class" });
    // Known-spell casters (and the 2024 Sorcerer) may swap a spell when they level up.
    if (level > 1 && SP && level >= SP.startLevel && (SP.label === "Known" || c.edition === "2024"))
      out.push({ id: `${level}:swap`, level, title: "Optional: swap a spell", detail: `When you gain a level you may replace one cantrip and one spell with others from the ${CL.name.toLowerCase()} list.`, tab: "spells", optional: true });
    return out;
  },

  demote(c, level) {
    const R = RULES[c.edition];
    const CL = classOf(R, c.cls);
    const SP = CL.spell;
    const removed: string[] = [];
    const maxSpellLevel = SP && level >= SP.startLevel ? SP.slots[level].length : 0;
    let prepared = c.prepared.filter((n) => {
      const sp = R.getSpell(n);
      if (sp && sp.level > maxSpellLevel) {
        removed.push(`${n} (${ORD[sp.level]}-level spell)`);
        return false;
      }
      return true;
    });
    const limit = SP?.table ? SP.table[level] : prepared.length;
    if (prepared.length > limit) {
      prepared.slice(limit).forEach((n) => removed.push(`${n} (over the ${(SP?.label ?? "known").toLowerCase()} limit)`));
      prepared = prepared.slice(0, limit);
    }
    const cantripMax = SP ? SP.cantrips[level] : 0;
    const cantrips = c.cantrips.slice(0, cantripMax);
    c.cantrips.slice(cantripMax).forEach((n) => removed.push(`${n} (cantrip over the limit)`));
    const mmMax = CL.sorcery ? CL.sorcery.metamagicKnown[level] : 0;
    const metamagic = c.metamagic.slice(0, mmMax);
    c.metamagic.slice(mmMax).forEach((m) => removed.push(`Metamagic: ${CL.sorcery?.metamagic.find((x) => x.id === m)?.name ?? m}`));
    const extra: Partial<Character> = {};
    if (CL.invocations) {
      const max = CL.invocations[level] ?? 0;
      c.invocations.slice(max).forEach((x) => removed.push(`Invocation: ${x}`));
      extra.invocations = c.invocations.slice(0, max);
    }
    if (CL.pactBoonLevel && level < CL.pactBoonLevel && c.pactBoon) {
      removed.push("Pact Boon");
      extra.pactBoon = "";
      extra.tomeCantrips = [];
    }
    if (CL.fightingStyle && level < CL.fightingStyle.level && c.fightingStyle) {
      removed.push("Fighting Style");
      extra.fightingStyle = "";
    }
    if (CL.expertise && level < CL.expertise.level && c.expertise.length) {
      removed.push("Expertise");
      extra.expertise = [];
    }
    if (CL.infusions) {
      const max = CL.infusions[level] ?? 0;
      if (c.infusions.length > max) removed.push(`${c.infusions.length - max} infusion(s)`);
      extra.infusions = c.infusions.slice(0, max);
    }
    if (level < CL.subclassLevel && c.subclassPicks.length) {
      removed.push("Subclass picks");
      extra.subclassPicks = [];
    }
    if (SP?.spellbook) {
      const book = c.spellbook.filter((n) => (R.getSpell(n)?.level ?? 1) <= maxSpellLevel).slice(0, SP.spellbook[level]);
      c.spellbook.filter((n) => !book.includes(n)).forEach((n) => removed.push(`${n} (spellbook)`));
      extra.spellbook = book;
      prepared = prepared.filter((n) => book.includes(n));
    }
    return { c: { ...c, ...extra, level, prepared, cantrips, metamagic }, removed };
  },
};
