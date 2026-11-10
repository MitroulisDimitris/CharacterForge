// Dumps the 2014 rules data as JSON, for checking against the SRD 5.1 (scripts/srdcheck.py).
// Run: npx vite-node scripts/dump2014.ts > out.json
import { RULES } from "../src/systems/dnd5e/rules";
import { WEAPONS, ARMOR } from "../src/systems/dnd5e/data/equipment";

const R = RULES["2014"];
const out = {
  spells: R.spells.map((s) => ({
    name: s.name, level: s.level, school: s.school, time: s.time, range: s.range, components: s.components,
    material: s.material, duration: s.duration, concentration: !!s.concentration, ritual: !!s.ritual,
    save: s.save, attack: s.attack, damage: s.damage, book: s.book, sorcerer: s.sorcerer, listBook: s.listBook, lists: s.lists ?? [],
  })),
  classes: R.classes.map((c) => ({
    id: c.id, name: c.name, book: c.book, hitDie: c.hitDie, saves: c.saves, armor: c.armor, weapons: c.weapons, tools: c.tools,
    skills: c.skills, subclassLevel: c.subclassLevel,
    features: c.features.map((f) => ({ level: f.level, name: f.name })),
    subclasses: c.subclasses.map((s) => ({
      id: s.id, name: s.name, book: s.book,
      features: s.features.map((f) => ({ level: f.level, name: f.name })),
      spells: s.spells.map((g) => [g.spell, g.minLevel]), expanded: s.expanded ?? [],
      options: (s.options ?? []).map((o) => ({ name: o.name, spell: o.spell, expanded: o.expanded, spells: (o.spells ?? []).map((g) => [g.spell, g.minLevel]) })),
      armor: s.armor, martial: s.martial, tools: s.tools, skills: s.skills, skillChoice: s.skillChoice, bonusCantrips: s.bonusCantrips,
      cantripChoice: s.cantripChoice, extraLanguages: s.extraLanguages, darkvision: s.darkvision, initiativeBonus: s.initiativeBonus,
      cantripOptions: s.cantripOptions, picks: s.picks && { label: s.picks.label, count: s.picks.count, options: s.picks.options.map((o) => o.name) },
      spell: s.spell && { cantrips: s.spell.cantrips, table: s.spell.table, slots: s.spell.slots, startLevel: s.spell.startLevel },
    })),
    spell: c.spell && { ability: c.spell.ability, label: c.spell.label, cantrips: c.spell.cantrips, table: c.spell.table, formula: c.spell.formula, slots: c.spell.slots, spellbook: c.spell.spellbook, startLevel: c.spell.startLevel },
    sorcery: c.sorcery && { points: c.sorcery.points, metamagicKnown: c.sorcery.metamagicKnown },
    equipment: c.equipment, gold: c.gold, invocations: c.invocations,
  })),
  races: R.species.map((s) => ({
    id: s.id, name: s.name, book: s.book, speed: s.speed, darkvision: s.darkvision, sizes: s.sizes, resistances: s.resistances, asi: s.asi,
    languages: s.languages, extraLanguages: s.extraLanguages, skills: s.skills, traits: s.traits.map((t) => t.name),
    lineages: (s.lineages ?? []).map((l) => ({ id: l.id, name: l.name, asi: l.asi, speed: l.speed, darkvision: l.darkvision, hpPerLevel: l.hpPerLevel, skills: l.skills })),
  })),
  weapons: WEAPONS,
  armor: ARMOR,
  backgrounds: R.backgrounds.map((b) => ({ id: b.id, name: b.name, book: b.book, skills: (b as any).skills, tools: (b as any).tools, languages: (b as any).languages, gp: (b as any).gp })),
  feats: R.feats.map((f) => ({ id: f.id, name: f.name, book: (f as any).book, plusOne: f.plusOne, req: f.req, armor: f.armor, languages: f.languages })),
};
process.stdout.write(JSON.stringify(out, null, 1));
