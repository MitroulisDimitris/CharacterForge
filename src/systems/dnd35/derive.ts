// D&D 3.5 rules engine for a Sorcerer, levels 1-5.
import { ABILITIES, ABILITY_NAMES, mod, signed, type Ability, type AbilityScores } from "../dnd5e/data/core";
import type { Warning } from "../types";
import type { Character35, FeatPick } from "./character";
import {
  CLASS_FEATURES_35,
  ELITE_ARRAY,
  FAMILIARS_35,
  FAMILIAR_ABILITIES,
  POINT_BUY_35,
  RACES_35,
  SIZE_MODS,
  SKILLS_35,
  SORCERER_35,
  SYNERGIES,
  bonusSpells,
  featById35,
  loads,
  rangeAt,
  spell35,
  weapon35,
  type Spell35,
} from "./data";

export interface SkillRow35 {
  id: string;
  name: string;
  ability: Ability;
  classSkill: boolean;
  trainedOnly: boolean;
  points: number;
  ranks: number;
  maxRanks: number;
  misc: number;
  total: number;
  usable: boolean;
}

export interface SpellRow35 {
  name: string;
  level: number;
  spell?: Spell35;
  dc: number | null;
  range: string;
  effect?: string;
  attack?: string;
}

export function derive35(c: Character35) {
  const T = SORCERER_35;
  const L = c.level;
  const race = RACES_35.find((r) => r.id === c.race) ?? RACES_35[0];
  const size = SIZE_MODS[race.size];
  const familiar = FAMILIARS_35.find((f) => f.id === c.familiar) ?? FAMILIARS_35[0];
  const warnings: Warning[] = [];

  // ---------- abilities ----------
  const scores = {} as AbilityScores;
  const mods = {} as AbilityScores;
  const adjustments: Record<Ability, string[]> = { STR: [], DEX: [], CON: [], INT: [], WIS: [], CHA: [] };
  for (const a of ABILITIES) {
    let v = c.base[a] + (race.adjust[a] ?? 0);
    if (race.adjust[a]) adjustments[a].push(`${signed(race.adjust[a]!)} ${race.name}`);
    if (L >= 4 && c.level4Ability === a) {
      v += 1;
      adjustments[a].push("+1 level 4");
    }
    scores[a] = v;
    mods[a] = mod(v);
  }
  const intModAt = (lvl: number) => mod(c.base.INT + (race.adjust.INT ?? 0) + (lvl >= 4 && c.level4Ability === "INT" ? 1 : 0));

  const baseVals = ABILITIES.map((a) => c.base[a]);
  if (c.abilityMethod === "pointbuy") {
    const bad = baseVals.some((v) => !(v in POINT_BUY_35));
    const spent = baseVals.reduce((s, v) => s + (POINT_BUY_35[v] ?? 99), 0);
    if (bad) warnings.push({ level: "error", tab: "abilities", text: "Point buy: base scores must be between 8 and 18." });
    else if (spent > c.pointBuyTotal) warnings.push({ level: "error", tab: "abilities", text: `Point buy: ${spent} of ${c.pointBuyTotal} points spent.` });
    else if (spent < c.pointBuyTotal) warnings.push({ level: "info", tab: "abilities", text: `Point buy: ${c.pointBuyTotal - spent} point(s) left.` });
  } else if (c.abilityMethod === "elite") {
    if ([...baseVals].sort((a, b) => b - a).join() !== ELITE_ARRAY.join()) warnings.push({ level: "error", tab: "abilities", text: "Elite array: use each of 15, 14, 13, 12, 10, 8 once." });
  } else if (baseVals.some((v) => v < 3 || v > 18)) {
    warnings.push({ level: "error", tab: "abilities", text: "Base scores must be between 3 and 18." });
  }

  // ---------- feats ----------
  const slots: { key: "feat1" | "featHuman" | "feat3"; label: string; pick: FeatPick }[] = [{ key: "feat1", label: "1st-level feat", pick: c.feat1 }];
  if (race.bonusFeat) slots.push({ key: "featHuman", label: "Human bonus feat", pick: c.featHuman });
  if (L >= 3) slots.push({ key: "feat3", label: "3rd-level feat", pick: c.feat3 });
  const feats = slots.filter((s) => s.pick.id).map((s) => ({ ...s, feat: featById35(s.pick.id)! })).filter((s) => s.feat);
  const has = (id: string) => feats.some((f) => f.feat.id === id);
  for (const s of slots) if (!s.pick.id) warnings.push({ level: "warn", tab: "feats", text: `Choose your ${s.label}.` });
  const ids = feats.map((f) => f.feat.id + ":" + f.pick.choice);
  if (new Set(ids).size !== ids.length) warnings.push({ level: "error", tab: "feats", text: "You picked the same feat twice (with the same choice)." });
  for (const f of feats) {
    if (f.feat.choice && !f.pick.choice) warnings.push({ level: "warn", tab: "feats", text: `${f.feat.name}: choose a ${f.feat.choice}.` });
    if (f.feat.minLevel && L < f.feat.minLevel) warnings.push({ level: "error", tab: "feats", text: `${f.feat.name} needs caster level ${f.feat.minLevel}.` });
    if (f.feat.id === "dodge" && scores.DEX < 13) warnings.push({ level: "error", tab: "feats", text: "Dodge needs DEX 13." });
    if (f.feat.id === "weaponFinesse" && T.bab[L] < 1) warnings.push({ level: "error", tab: "feats", text: "Weapon Finesse needs base attack bonus +1." });
    if (f.feat.id === "preciseShot" && !has("pointBlankShot")) warnings.push({ level: "error", tab: "feats", text: "Precise Shot needs Point Blank Shot." });
    if (f.feat.id === "greaterSpellFocus" && !feats.some((g) => g.feat.id === "spellFocus" && g.pick.choice === f.pick.choice))
      warnings.push({ level: "error", tab: "feats", text: `Greater Spell Focus (${f.pick.choice || "?"}) needs Spell Focus in the same school.` });
  }

  // ---------- combat ----------
  const bab = T.bab[L];
  const saveMisc = { fort: 0, ref: 0, will: 0 };
  const saveNotes: string[] = [];
  if (race.saveBonus) {
    saveMisc.fort += race.saveBonus;
    saveMisc.ref += race.saveBonus;
    saveMisc.will += race.saveBonus;
  }
  if (has("greatFortitude")) saveMisc.fort += 2;
  if (has("lightningReflexes")) saveMisc.ref += 2;
  if (has("ironWill")) saveMisc.will += 2;
  if (familiar.id === "rat") saveMisc.fort += 2;
  if (familiar.id === "weasel") saveMisc.ref += 2;
  if (race.id === "elf35" || race.id === "halfElf35") saveNotes.push("+2 vs enchantment; immune to magic sleep");
  if (race.id === "dwarf35") saveNotes.push("+2 vs poison, spells and spell-like effects");
  if (race.id === "gnome35") saveNotes.push("+2 vs illusions");
  if (race.id === "halfling35") saveNotes.push("+2 morale vs fear");
  const saves = [
    { id: "fort", name: "Fortitude", ability: "CON" as Ability, base: T.fort[L], misc: saveMisc.fort },
    { id: "ref", name: "Reflex", ability: "DEX" as Ability, base: T.ref[L], misc: saveMisc.ref },
    { id: "will", name: "Will", ability: "WIS" as Ability, base: T.will[L], misc: saveMisc.will },
  ].map((s) => ({ ...s, mod: mods[s.ability], total: s.base + mods[s.ability] + s.misc }));

  const ac = 10 + mods.DEX + size.ac;
  const touchAc = ac;
  const flatAc = 10 + size.ac;
  const initiative = mods.DEX + (has("improvedInitiative") ? 4 : 0);
  const grapple = bab + mods.STR + size.grapple;
  const meleeAtk = bab + mods.STR + size.attack;
  const rangedAtk = bab + mods.DEX + size.attack;

  // ---------- HP ----------
  let hp = T.hitDie + mods.CON;
  const hpLevels: number[] = [];
  for (let l = 2; l <= L; l++) {
    const roll = c.hpMethod === "average" ? 3 : Math.min(4, Math.max(1, c.hpRolls[l - 2] ?? 1));
    hpLevels.push(roll);
    hp += Math.max(1, roll + mods.CON);
  }
  const hpExtras: string[] = [];
  const toughness = feats.filter((f) => f.feat.id === "toughness").length * 3;
  if (toughness) {
    hp += toughness;
    hpExtras.push(`Toughness +${toughness}`);
  }
  if (familiar.id === "toad") {
    hp += 3;
    hpExtras.push("Toad familiar +3");
  }

  // ---------- skills ----------
  let pointsAvailable = 0;
  for (let l = 1; l <= L; l++) {
    const per = Math.max(1, T.skillPoints + intModAt(l));
    pointsAvailable += l === 1 ? per * 4 : per;
    if (race.bonusSkillPoints) pointsAvailable += l === 1 ? 4 : 1;
  }
  const pointsSpent = Object.values(c.skillPoints).reduce((s, v) => s + (v || 0), 0);
  if (pointsSpent > pointsAvailable) warnings.push({ level: "error", tab: "skills", text: `Skill points: ${pointsSpent} of ${pointsAvailable} spent.` });
  else if (pointsSpent < pointsAvailable) warnings.push({ level: "info", tab: "skills", text: `Skill points: ${pointsAvailable - pointsSpent} left to spend.` });

  const featSkill: Record<string, number> = {};
  for (const f of feats) {
    for (const [k, v] of Object.entries(f.feat.skillBonus ?? {})) featSkill[k] = (featSkill[k] ?? 0) + v!;
    if (f.feat.id === "skillFocus" && f.pick.choice) featSkill[f.pick.choice] = (featSkill[f.pick.choice] ?? 0) + 3;
  }
  if ("skill" in familiar && familiar.skill) featSkill[familiar.skill[0]] = (featSkill[familiar.skill[0]] ?? 0) + familiar.skill[1];
  const rawRanks = (id: string) => {
    const pts = c.skillPoints[id] ?? 0;
    return T.classSkills.includes(id) ? pts : pts / 2;
  };
  const synergy: Record<string, number> = {};
  for (const [from, tos] of SYNERGIES) if (rawRanks(from) >= 5) for (const t of tos) synergy[t] = (synergy[t] ?? 0) + 2;

  const skills: SkillRow35[] = SKILLS_35.map((s) => {
    const classSkill = T.classSkills.includes(s.id);
    const points = c.skillPoints[s.id] ?? 0;
    const ranks = classSkill ? points : points / 2;
    const maxRanks = classSkill ? L + 3 : (L + 3) / 2;
    const misc = (race.skillBonus[s.id] ?? 0) + (featSkill[s.id] ?? 0) + (synergy[s.id] ?? 0) + (s.id === "hide" ? size.hide : 0);
    if (ranks > maxRanks) warnings.push({ level: "error", tab: "skills", text: `${s.name}: ${ranks} ranks, max is ${maxRanks} at level ${L}.` });
    return { id: s.id, name: s.name, ability: s.ability, classSkill, trainedOnly: !!s.trainedOnly, points, ranks, maxRanks, misc, total: Math.floor(ranks) + mods[s.ability] + misc, usable: !s.trainedOnly || ranks > 0 };
  });

  // ---------- languages ----------
  const languageLimit = race.languages.length + Math.max(0, mods.INT);
  if (c.languages.length > languageLimit) warnings.push({ level: "warn", tab: "race", text: `${c.languages.length} languages chosen; you can know ${languageLimit} (racial + INT bonus).` });
  if (c.languages.length < languageLimit) warnings.push({ level: "info", tab: "race", text: `You can learn ${languageLimit - c.languages.length} more language(s).` });

  // ---------- spells ----------
  const cl = L;
  const perDay = T.perDay[L].map((n, lvl) => n + bonusSpells(mods.CHA, lvl));
  const known = T.known[L];
  const maxSpellLevel = known.length - 1;
  const focus = (school: string) => feats.filter((f) => (f.feat.id === "spellFocus" || f.feat.id === "greaterSpellFocus") && f.pick.choice === school).length;
  const illusionBonus = race.id === "gnome35" ? 1 : 0;
  const spellRows: SpellRow35[] = c.spellsKnown.map((name) => {
    const sp = spell35(name);
    if (!sp) return { name, level: 0, dc: null, range: "" };
    const savable = sp.save !== "None" && !sp.save.includes("harmless");
    const dc = savable ? 10 + sp.level + mods.CHA + focus(sp.school) + (sp.school === "Illusion" ? illusionBonus : 0) : null;
    const attack = sp.touch === "ranged" ? signed(rangedAtk) : sp.touch === "melee" ? signed(meleeAtk) : undefined;
    return { name, level: sp.level, spell: sp, dc, range: rangeAt(sp.range, cl), effect: sp.effect?.(cl), attack };
  });
  for (let lvl = 0; lvl < known.length; lvl++) {
    const have = spellRows.filter((r) => r.level === lvl && r.spell).length;
    const word = lvl === 0 ? "0-level spells" : `${["", "1st", "2nd"][lvl]}-level spells`;
    if (have !== known[lvl]) warnings.push({ level: have > known[lvl] ? "error" : "warn", tab: "spells", text: `${word} known: ${have} of ${known[lvl]}.` });
  }
  for (const r of spellRows) {
    if (!r.spell) warnings.push({ level: "warn", tab: "spells", text: `${r.name} isn't in this app's 3.5 spell list.` });
    else if (r.level > maxSpellLevel) warnings.push({ level: "error", tab: "spells", text: `${r.name} is a level-${r.level} spell; at Sorcerer ${L} you can know up to level ${maxSpellLevel}.` });
    if (r.spell?.costly && !c.inventory.some((i) => i.name.toLowerCase().includes(r.spell!.costly!.replace(/^a /, "").split(" ")[0])))
      warnings.push({ level: "info", tab: "equipment", text: `${r.name} needs ${r.spell.costly}.` });
  }
  const scoreTooLow = maxSpellLevel > 0 && scores.CHA < 10 + maxSpellLevel;
  if (scoreTooLow) warnings.push({ level: "error", tab: "abilities", text: `You need Charisma ${10 + maxSpellLevel} to cast level-${maxSpellLevel} spells.` });

  // ---------- attacks ----------
  const attacks: { name: string; bonus: string; damage: string; crit: string; notes: string }[] = [];
  const seen = new Set<string>();
  for (const it of c.inventory) {
    const w = weapon35(it.name);
    if (!w || seen.has(w.name)) continue;
    seen.add(w.name);
    const finesse = has("weaponFinesse") && w.light;
    const atk = w.ranged ? rangedAtk : finesse ? bab + mods.DEX + size.attack : meleeAtk;
    const dmgMod = w.ranged && !w.thrown ? 0 : mods.STR;
    const dmg = race.size === "Small" ? w.dmgS : w.dmgM;
    attacks.push({ name: w.name, bonus: signed(atk), damage: `${dmg}${dmgMod ? signed(dmgMod) : ""}`, crit: w.crit, notes: [w.type, w.range ? `${w.range} ft.` : ""].filter(Boolean).join(", ") });
  }
  for (const r of spellRows) {
    if (!r.attack || seen.has(r.name)) continue;
    seen.add(r.name);
    attacks.push({ name: r.name, bonus: r.attack, damage: r.effect ?? "", crit: "×2", notes: `${r.spell!.touch} touch, ${r.range}` });
  }

  // ---------- load ----------
  const carried = c.inventory.reduce((s, i) => s + i.qty * i.weight, 0) + (c.coins.cp + c.coins.sp + c.coins.gp + c.coins.pp) / 50;
  const load = loads(scores.STR, race.size === "Small");
  if (carried > load.heavy) warnings.push({ level: "warn", tab: "equipment", text: `Carrying ${carried.toFixed(1)} lb, over your maximum load of ${load.heavy} lb.` });
  else if (carried > load.light) warnings.push({ level: "info", tab: "equipment", text: `Carrying ${carried.toFixed(1)} lb: ${carried > load.medium ? "heavy" : "medium"} load (speed and DEX limits apply).` });

  // ---------- features ----------
  const featureGroups = [
    { title: "Sorcerer Features", items: CLASS_FEATURES_35.filter((f) => f.level <= L).map((f) => ({ name: f.name, source: `Sorcerer ${f.level}`, text: f.text })) },
    { title: `${race.name} Traits`, items: [{ name: "Size and Speed", source: race.name, text: `${race.size}, ${race.speed} ft. ${race.vision}.` }, ...race.traits.map((t) => ({ ...t, source: race.name }))] },
    {
      title: "Feats",
      items: feats.map((f) => ({ name: f.feat.name + (f.pick.choice ? ` (${SKILLS_35.find((s) => s.id === f.pick.choice)?.name ?? f.pick.choice})` : ""), source: f.label, text: f.feat.text })),
    },
    ...(familiar.id
      ? [{ title: `Familiar: ${familiar.name}`, items: [{ name: "Master bonus", source: "Familiar", text: familiar.benefit }, ...FAMILIAR_ABILITIES.filter((a) => a.level <= L).map((a) => ({ name: `Level ${a.level}`, source: "Familiar", text: a.text }))] }]
      : []),
  ];

  const identity = `${race.name} · Sorcerer ${L}`;

  return {
    level: L,
    race,
    size,
    familiar,
    scores,
    mods,
    adjustments,
    feats,
    featSlots: slots,
    bab,
    saves,
    saveNotes,
    ac,
    touchAc,
    flatAc,
    initiative,
    grapple,
    meleeAtk,
    rangedAtk,
    speed: race.speed,
    hpMax: hp,
    hpLevels,
    hpExtras,
    hitDice: `${L}d4`,
    skills,
    pointsAvailable,
    pointsSpent,
    languageLimit,
    cl,
    perDay,
    known,
    maxSpellLevel,
    spellRows,
    attacks,
    carried,
    load,
    featureGroups,
    warnings,
    identity,
    abilityLine: ABILITIES.map((a) => `${ABILITY_NAMES[a]} ${scores[a]}`).join(", "),
  };
}

export type Derived35 = ReturnType<typeof derive35>;
