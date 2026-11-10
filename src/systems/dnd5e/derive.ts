// Turns the player's choices into everything the sheet shows, plus warnings.
// Works for both the 2014 and 2024 rules (see rules.ts for what differs) and for every class
// (data/classes.ts: 2024 has only the Sorcerer).
import {
  ABILITIES,
  ABILITY_NAMES,
  SKILLS,
  mod,
  profBonus,
  signed,
  skillName,
  type Ability,
  type AbilityScores,
  type Feature,
  type SkillId,
} from "./data/core";
import type { FeatId } from "./data/feats";
import type { Species } from "./data/species";
import type { Background } from "./data/backgrounds";
import { cantripDamage, type Spell } from "./data/spells";
import { armorByName, weaponByName, type Armor, type ArmorCategory, type Weapon } from "./data/equipment";
import { spellLimit } from "./data/classes";
import { FAVORED_ENEMIES, FIGHTING_STYLES, stylesFor } from "./data2014/classes";
import { INFUSIONS, INVOCATIONS, PACT_BOONS } from "./data2014/warlock";
import { BACKGROUND_FEATURES } from "./data2014/backgrounds";
import type { Warning } from "../types";
import type { Character, FeatChoices } from "./character";
import { RULES, classOf, featIn, inBooks, onClassList, type Edition } from "./rules";

export type { Warning };

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUY_BUDGET = 27;
const ORD = ["0th", "1st", "2nd", "3rd", "4th", "5th"];

/** Every book each edition knows about (used when no list is given, e.g. tests). */
export const ALL_BOOKS: Record<Edition, string[]> = {
  "2024": ["PHB24", "PHB14", "XGE"],
  "2014": ["PHB14", "XGE", "TCE"],
};

const BOOK_NAMES: Record<string, string> = {
  PHB24: "the Player's Handbook (2024)",
  PHB14: "the Player's Handbook (2014)",
  XGE: "Xanathar's Guide to Everything",
  TCE: "Tasha's Cauldron of Everything",
};

const MI_ABILITY: Record<string, Ability> = { Bard: "CHA", Cleric: "WIS", Druid: "WIS", Sorcerer: "CHA", Warlock: "CHA", Wizard: "INT" };

/** Weapons races are trained in (2014). Keyed by species id or lineage id. */
const RACE_WEAPONS: Record<string, string[]> = {
  dwarf14: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer"],
  high: ["Longsword", "Shortsword", "Shortbow", "Longbow"],
  wood: ["Longsword", "Shortsword", "Shortbow", "Longbow"],
  drow: ["Rapier", "Shortsword", "Hand Crossbow"],
};

const NO_RACE: Species = { id: "", name: "No race yet", book: "PHB14", sizes: ["Medium", "Small"], speed: 30, darkvision: 0, resistances: [], traits: [], languages: ["Common"], extraLanguages: 0 };
const NO_BACKGROUND: Background = { id: "", name: "No background yet", book: "PHB14", skills: [], tools: "", equipment: "" };

export interface SpellRow {
  spell: Spell | undefined;
  name: string;
  level: number;
  source: string;
  /** "Prepared" counts against the limit (prepared or known); "Always" doesn't. */
  kind: "Cantrip" | "Prepared" | "Always" | "Innate";
  ability: Ability;
  saveDc: number;
  attackBonus: number;
  note?: string;
}

export interface Attack {
  name: string;
  bonus: string;
  damage: string;
  notes: string;
}

export interface FeatEntry {
  id: FeatId;
  from: string;
  choices: FeatChoices;
  plusOne: Ability;
}

export function deriveCharacter(c: Character, books: string[] = ALL_BOOKS[c.edition]) {
  const R = RULES[c.edition];
  const CL = classOf(R, c.cls);
  const is2014 = c.edition === "2014";
  const level = c.level;
  const pb = profBonus(level);
  // 2014 characters built from scratch may not have picked these yet: use empty placeholders
  // (no bonuses, skills or traits) rather than borrowing the first option's.
  const species = R.species.find((s) => s.id === c.species) ?? (is2014 && !c.species ? NO_RACE : R.species[0]);
  const lineage = species.lineages?.find((l) => l.id === c.lineage);
  const bg = R.backgrounds.find((b) => b.id === c.background) ?? (is2014 && !c.background ? NO_BACKGROUND : R.backgrounds[0]);
  const subclass = CL.subclasses.find((s) => s.id === c.subclass) ?? (c.subclass === "" && is2014 ? undefined : CL.subclasses[0]);
  const subclassActive = !!subclass && level >= CL.subclassLevel;
  const subOption = subclass?.options?.find((o) => o.id === c.subclassOption);
  const L4 = `${CL.name} 4`;
  const warnings: Warning[] = [];
  const bookWarn = (what: string, book: string | undefined, tab: string) => {
    if (!inBooks(books, book)) warnings.push({ level: "error", tab, text: `${what} is from ${BOOK_NAMES[book!] ?? book}, which isn't allowed for this character.` });
  };

  if (is2014 && !R.classes.some((x) => x.id === c.cls)) warnings.push({ level: "error", tab: "class", text: "Choose a class." });
  if (is2014 && !c.species) warnings.push({ level: "warn", tab: "species", text: `Choose a ${R.speciesWord.toLowerCase()}.` });
  if (is2014 && !c.background) warnings.push({ level: "warn", tab: "background", text: "Choose a background." });
  bookWarn(`The ${CL.name} class`, CL.book, "class");
  bookWarn(species.name, species.book, "species");
  bookWarn(bg.name, bg.book, "background");
  if (subclassActive) bookWarn(subclass!.name, subclass!.book, "class");

  // ---------- feats ----------
  const feats: FeatEntry[] = [];
  if (!is2014 && !bg.legacy && bg.feat) feats.push({ id: bg.feat, from: `Background: ${bg.name}`, choices: c.bgFeatChoices, plusOne: "CHA" });
  if (species.originFeat) feats.push({ id: c.humanFeat, from: `${R.speciesWord}: ${species.name}`, choices: c.humanFeatChoices, plusOne: c.humanFeatPlusOne });
  if (level >= 4) feats.push({ id: c.level4Feat, from: L4, choices: c.level4Choices, plusOne: c.level4PlusOne });
  const hasFeat = (id: FeatId) => feats.some((f) => f.id === id);
  const featTab = (f: FeatEntry) => (f.from === L4 ? "abilities" : f.from.startsWith("Background") ? "background" : "species");
  for (const f of feats) bookWarn(`The ${featIn(R, f.id).name} feat`, featIn(R, f.id).book, featTab(f));

  // ---------- ability scores ----------
  const bonuses: Record<Ability, { amount: number; from: string }[]> = { STR: [], DEX: [], CON: [], INT: [], WIS: [], CHA: [] };
  const addBonus = (a: Ability, amount: number, from: string) => bonuses[a].push({ amount, from });

  const speciesAsiApplies = is2014 || bg.legacy;
  if (speciesAsiApplies && (species.asi || lineage?.asi)) {
    const grants: { amount: number; ability?: Ability }[] = [];
    for (const [a, n] of Object.entries(species.asi?.fixed ?? {})) grants.push({ amount: n!, ability: a as Ability });
    for (const [a, n] of Object.entries(lineage?.asi ?? {})) grants.push({ amount: n!, ability: a as Ability });
    const chooseCount = species.asi?.chooseCount ?? 0;
    const chooseAmount = species.asi?.chooseAmount ?? 1;
    const picks = c.legacyAsi.filter((a, i, arr) => arr.indexOf(a) === i && !(species.asi?.exclude ?? []).includes(a)).slice(0, chooseCount);
    picks.forEach((a) => grants.push({ amount: chooseAmount, ability: a }));
    for (let i = picks.length; i < chooseCount; i++) grants.push({ amount: chooseAmount });
    if (picks.length < chooseCount) warnings.push({ level: "warn", tab: "species", text: `Choose ${chooseCount - picks.length} more ability score(s) for ${species.name}.` });

    if (is2014 && c.customOrigin && books.includes("TCE")) {
      // Tasha's: move every bonus to abilities of your choice (each to a different ability).
      const amounts = grants.map((g) => g.amount).sort((a, b) => b - a);
      const targets = c.customAsi.filter((a, i, arr) => arr.indexOf(a) === i).slice(0, amounts.length);
      targets.forEach((a, i) => addBonus(a, amounts[i], `${species.name} (custom origin)`));
      if (targets.length < amounts.length) warnings.push({ level: "warn", tab: "species", text: `Custom origin: assign ${amounts.length - targets.length} more ability bonus(es).` });
    } else {
      grants.filter((g) => g.ability).forEach((g) => addBonus(g.ability!, g.amount, lineage?.asi && g.ability && lineage.asi[g.ability] === g.amount ? lineage.name : species.name));
    }
  } else if (!is2014 && bg.legacy) {
    warnings.push({ level: "warn", tab: "background", text: "A 2014 background with a 2024 species gives no ability score increases. Pick a 2024 background or the Half-Elf." });
  }
  if (!is2014 && !bg.legacy && bg.abilities) {
    if (c.bgAsiMode === "1-1-1") bg.abilities.forEach((a) => addBonus(a, 1, bg.name));
    else {
      const p2 = bg.abilities.includes(c.bgPlus2) ? c.bgPlus2 : bg.abilities[0];
      let p1 = bg.abilities.includes(c.bgPlus1) ? c.bgPlus1 : bg.abilities[1];
      if (p1 === p2) p1 = bg.abilities.find((a) => a !== p2)!;
      addBonus(p2, 2, bg.name);
      addBonus(p1, 1, bg.name);
    }
    if (species.asi) warnings.push({ level: "info", tab: "species", text: `With a 2024 background, ${species.name}'s own ability increases are ignored (2024 rule for older species).` });
  }

  for (const f of feats) {
    const feat = featIn(R, f.id);
    if (f.id === "asi" && f.from === L4) {
      if (c.level4AsiMode === "+2") addBonus(c.level4A, 2, "Ability Score Improvement");
      else {
        addBonus(c.level4A, 1, "Ability Score Improvement");
        addBonus(c.level4B === c.level4A ? ABILITIES.find((a) => a !== c.level4A)! : c.level4B, 1, "Ability Score Improvement");
      }
    } else if (feat.plusOne) {
      addBonus(feat.plusOne.includes(f.plusOne) ? f.plusOne : feat.plusOne[0], 1, feat.name);
    }
  }

  const scores = {} as AbilityScores;
  const mods = {} as AbilityScores;
  for (const a of ABILITIES) {
    const raw = c.base[a] + bonuses[a].reduce((s, b) => s + b.amount, 0);
    scores[a] = Math.min(20, raw);
    mods[a] = mod(scores[a]);
    if (raw > 20) warnings.push({ level: "warn", tab: "abilities", text: `${ABILITY_NAMES[a]} would be ${raw}; ability scores cap at 20, so ${raw - 20} point(s) are wasted.` });
  }

  const baseVals = ABILITIES.map((a) => c.base[a]);
  if (c.abilityMethod === "standard") {
    const sorted = [...baseVals].sort((x, y) => y - x);
    if (sorted.join() !== STANDARD_ARRAY.join()) warnings.push({ level: "error", tab: "abilities", text: "Standard array: use each of 15, 14, 13, 12, 10, 8 exactly once." });
  } else if (c.abilityMethod === "pointbuy") {
    const bad = baseVals.some((v) => !(v in POINT_BUY_COST));
    const spent = baseVals.reduce((s, v) => s + (POINT_BUY_COST[v] ?? 99), 0);
    if (bad) warnings.push({ level: "error", tab: "abilities", text: "Point buy: base scores must be between 8 and 15." });
    else if (spent > POINT_BUY_BUDGET) warnings.push({ level: "error", tab: "abilities", text: `Point buy: ${spent} of ${POINT_BUY_BUDGET} points spent.` });
    else if (spent < POINT_BUY_BUDGET) warnings.push({ level: "info", tab: "abilities", text: `Point buy: ${POINT_BUY_BUDGET - spent} point(s) left to spend.` });
  } else if (baseVals.some((v) => v < 3 || v > 18)) {
    warnings.push({ level: "error", tab: "abilities", text: "Base scores must be between 3 and 18." });
  }

  // ---------- armor and weapon proficiencies ----------
  const armorProfs = new Set<ArmorCategory>(CL.armor);
  if (subclassActive) subclass!.armor?.forEach((a) => armorProfs.add(a));
  if (lineage?.id === "mountain" && species.id === "dwarf14") ["light", "medium"].forEach((a) => armorProfs.add(a as ArmorCategory));
  for (const f of feats) {
    const a = featIn(R, f.id).armor;
    if (a) armorProfs.add(a);
    if (f.id === "moderatelyArmored") armorProfs.add("shield");
  }
  const martialProf = !!CL.weapons.martial || (subclassActive && !!subclass!.martial);
  // Weapons a subclass picks (Bladesinging, Kensei) count only once that subclass is active.
  const pickedWeapons = subclassActive && subclass!.picks?.grants ? c.subclassPicks.filter((p) => subclass!.picks!.options.some((o) => o.id === p)) : [];
  const weaponList = new Set([
    ...(CL.weapons.list ?? []),
    ...(RACE_WEAPONS[species.id] ?? []),
    ...(lineage ? (RACE_WEAPONS[lineage.id] ?? []) : []),
    ...(subclassActive ? (subclass!.weapons ?? []) : []),
    ...pickedWeapons,
  ]);
  const weaponProficient = (w: Weapon) => (w.simple ? !!CL.weapons.simple : martialProf) || weaponList.has(w.name);
  const armorProficient = (a: Armor) => armorProfs.has(a.category);

  // ---------- feat prerequisites ----------
  const isCaster = (!!CL.spell && level >= CL.spell.startLevel) || (subclassActive && !!subclass!.spell);
  for (const f of feats) {
    const req = featIn(R, f.id).req;
    if (!req) continue;
    const name = featIn(R, f.id).name;
    const fail = (why: string) => warnings.push({ level: "warn", tab: featTab(f), text: `${name} needs ${why}.` });
    if (req.ability && !req.ability[0].some((a) => c.base[a] + bonuses[a].filter((b) => b.from !== name).reduce((s, b) => s + b.amount, 0) >= req.ability![1]))
      fail(`${req.ability[0].map((a) => ABILITY_NAMES[a]).join(" or ")} ${req.ability[1]} or higher`);
    if (req.spellcasting && !isCaster) fail("the ability to cast at least one spell");
    if (req.armor && !armorProfs.has(req.armor) && featIn(R, f.id).armor !== req.armor) fail(`proficiency with ${req.armor} armor`);
    if (req.martial && !martialProf) fail("proficiency with a martial weapon");
    const raceOk = (req.species?.includes(species.id) ?? false) || (req.lineage?.includes(lineage?.id ?? "") ?? false) || (!!req.small && c.size === "Small");
    if ((req.species || req.lineage || req.small) && !raceOk) fail(`a specific ${R.speciesWord.toLowerCase()}`);
  }

  // ---------- proficiencies ----------
  const skillSources = new Map<SkillId, string[]>();
  const addSkill = (s: SkillId, from: string) => skillSources.set(s, [...(skillSources.get(s) ?? []), from]);
  if (bg.custom) c.bgCustomSkills.slice(0, 2).forEach((s) => addSkill(s, bg.name));
  else bg.skills.forEach((s) => addSkill(s, bg.name));
  species.skills?.forEach((s) => addSkill(s, species.name));
  lineage?.skills?.forEach((s) => addSkill(s, lineage.name));
  const speciesSkillCount = species.skillChoice?.count ?? lineage?.skillChoiceCount ?? 0;
  if (speciesSkillCount) c.speciesSkills.slice(0, speciesSkillCount).forEach((s) => addSkill(s, species.name));
  c.classSkills.slice(0, CL.skills.count).forEach((s) => addSkill(s, CL.name));
  if (subclassActive && subclass!.skillChoice) c.subclassSkills.slice(0, subclass!.skillChoice.count).forEach((s) => addSkill(s, subclass!.name));
  if (subclassActive) subclass!.skills?.forEach((s) => addSkill(s, subclass!.name));
  const hasInvocation = (id: string) => CL.invocations && level >= 2 && c.invocations.includes(id);
  if (hasInvocation("beguilingInfluence")) (["deception", "persuasion"] as SkillId[]).forEach((s) => addSkill(s, "Beguiling Influence"));
  for (const f of feats) {
    if (f.id === "skilled") f.choices.skills.slice(0, 3).forEach((s) => addSkill(s, "Skilled"));
    if (f.id === "skillExpert" || f.id === "prodigy") f.choices.skills.slice(0, 1).forEach((s) => addSkill(s, featIn(R, f.id).name));
    if (f.id === "squatNimbleness") f.choices.skills.slice(0, 1).forEach((s) => addSkill(s, "Squat Nimbleness"));
  }
  for (const [s, from] of skillSources) {
    if (from.length > 1)
      warnings.push({ level: "warn", tab: from.includes(CL.name) ? "class" : "skills", text: `${skillName(s)} is granted twice (${from.join(" + ")}). Pick a different skill for one of them.` });
  }

  // Expertise (double proficiency).
  const expertise = new Map<string, string>();
  if (CL.expertise && level >= CL.expertise.level) c.expertise.slice(0, CL.expertise.count).forEach((s) => expertise.set(s, "Expertise"));
  if (subclassActive && subclass!.expertiseSkills) subclass!.skills?.forEach((s) => expertise.set(s, subclass!.name));
  if (subclassActive && subclass!.skillChoice?.expertise) c.subclassSkills.slice(0, subclass!.skillChoice.count).forEach((s) => expertise.set(s, subclass!.name));
  const deftExplorer = CL.id === "ranger" && c.rangerTasha && books.includes("TCE");
  if (deftExplorer && c.deftExpertise) expertise.set(c.deftExpertise, "Deft Explorer");
  for (const f of feats) if ((f.id === "skillExpert" || f.id === "prodigy") && f.choices.expertise) expertise.set(f.choices.expertise, featIn(R, f.id).name);
  for (const [s, from] of expertise) {
    if (s !== "thieves" && !skillSources.has(s as SkillId)) warnings.push({ level: "warn", tab: "skills", text: `${from}: you need proficiency in ${skillName(s as SkillId)} to have expertise in it.` });
  }

  const saveProfs = new Set<Ability>(CL.saves);
  for (const f of feats) {
    if (f.id !== "resilient") continue;
    const a = f.plusOne;
    if (saveProfs.has(a)) warnings.push({ level: "warn", tab: featTab(f), text: `Resilient (${a}) gives a save you already have. Pick a different ability for full value.` });
    saveProfs.add(a);
  }
  const saves = ABILITIES.map((a) => ({ ability: a, proficient: saveProfs.has(a), bonus: mods[a] + (saveProfs.has(a) ? pb : 0) }));
  // Bard Jack of All Trades: half PB on checks without proficiency (initiative too).
  const jack = CL.id === "bard" && level >= 2 ? Math.floor(pb / 2) : 0;
  const skills = SKILLS.map((s) => {
    const prof = skillSources.has(s.id);
    const expert = prof && expertise.has(s.id);
    return { id: s.id, name: s.name, ability: s.ability as Ability, proficient: prof, expert, sources: skillSources.get(s.id) ?? [], bonus: mods[s.ability] + (prof ? pb : jack) + (expert ? pb : 0) };
  });
  const skillBonus = (id: SkillId) => skills.find((s) => s.id === id)!.bonus;

  // ---------- languages / tools ----------
  const subclassLanguages = subclassActive ? (subclass!.languages ?? []) : [];
  const classLanguages = CL.languages ?? [];
  let languageLimit = species.languages ? species.languages.length + (species.extraLanguages ?? 0) + (lineage?.extraLanguages ?? 0) : 3;
  if (is2014) languageLimit += bg.custom ? Math.min(2, Math.max(0, c.bgCustomLanguages)) : (bg.languages ?? 0);
  languageLimit += subclassLanguages.length + classLanguages.length;
  if (subclassActive) languageLimit += subclass!.extraLanguages ?? 0;
  if (CL.choices?.includes("favoredEnemy") && !deftExplorer) languageLimit += 1;
  if (deftExplorer) languageLimit += 2;
  for (const f of feats) languageLimit += featIn(R, f.id).languages ?? 0;
  if (c.languages.length < languageLimit) warnings.push({ level: "info", tab: "skills", text: `You can know ${languageLimit} languages; ${c.languages.length} chosen.` });
  if (c.languages.length > languageLimit) warnings.push({ level: "warn", tab: "skills", text: `${c.languages.length} languages chosen but only ${languageLimit} allowed.` });
  for (const l of [...subclassLanguages, ...classLanguages]) if (!c.languages.includes(l)) warnings.push({ level: "info", tab: "skills", text: `${l === "Druidic" || l === "Thieves' Cant" ? CL.name : subclass?.name} lets you speak ${l}; add it to your languages.` });
  const toolList = [bg.custom ? c.bgCustomTools : bg.tools, ...CL.tools, ...c.classTools.slice(0, CL.toolChoice?.count ?? 0), ...(subclassActive ? (subclass!.tools ?? []) : []), c.extraTools].filter(Boolean);
  const tools = [...new Set(toolList)].join(", ");
  if (CL.toolChoice && c.classTools.filter(Boolean).length < CL.toolChoice.count)
    warnings.push({ level: "warn", tab: "class", text: `${CL.name}: choose ${CL.toolChoice.label.toLowerCase()}.` });

  // ---------- HP ----------
  const hd = CL.hitDie;
  let hpMax = hd + mods.CON;
  const perLevel: number[] = [];
  for (let l = 2; l <= level; l++) {
    const roll = c.hpMethod === "average" ? hd / 2 + 1 : Math.min(hd, Math.max(1, c.hpRolls[l - 2] ?? 1));
    perLevel.push(roll);
    hpMax += Math.max(1, roll + mods.CON);
  }
  const hpExtras: string[] = [];
  const subHp = subclassActive && subclass!.hpBonus ? subclass!.hpBonus(level) : 0;
  if (subHp) {
    hpMax += subHp;
    hpExtras.push(`${subclass!.name} +${subHp}`);
  }
  const raceHpPerLevel = (species.hpPerLevel ?? 0) + (lineage?.hpPerLevel ?? 0);
  if (raceHpPerLevel) {
    hpMax += raceHpPerLevel * level;
    hpExtras.push(`${lineage?.hpPerLevel ? lineage.name : species.name} +${raceHpPerLevel * level}`);
  }
  if (hasFeat("tough")) {
    hpMax += 2 * level;
    hpExtras.push(`Tough +${2 * level}`);
  }

  // ---------- armor class ----------
  const owned = c.inventory.filter((i) => i.qty > 0).map((i) => armorByName(i.name)).filter((a): a is Armor => !!a);
  const bodyArmor = owned.filter((a) => a.category !== "shield");
  for (const a of bodyArmor) if (!armorProficient(a)) warnings.push({ level: "info", tab: "equipment", text: `You aren't proficient with ${a.name}, so it isn't counted in your AC (wearing it would block spellcasting and give Disadvantage on STR/DEX rolls).` });
  const shield = owned.find((a) => a.category === "shield");
  const shieldUsable = !!shield && armorProfs.has("shield");
  if (shield && !shieldUsable) warnings.push({ level: "info", tab: "equipment", text: "You aren't proficient with shields, so your shield isn't counted in your AC." });
  const medMax = hasFeat("mediumArmorMaster") ? 3 : 2;
  const styleActive = !!CL.fightingStyle && level >= CL.fightingStyle.level;
  const style = styleActive ? c.fightingStyle : "";
  const defense = style === "defense" || feats.some((f) => f.id === "fightingInitiate" && f.choices.style === "defense");
  type AcOption = { ac: number; note: string; armored: boolean; shieldOk: boolean };
  const acOptions: AcOption[] = [{ ac: 10 + mods.DEX, note: "Unarmored (10 + DEX)", armored: false, shieldOk: true }];
  if (CL.unarmored) acOptions.push({ ac: CL.unarmored.ac(scores), note: CL.unarmored.note, armored: false, shieldOk: CL.unarmored.shieldOk });
  if (subclassActive && subclass!.unarmoredAc) acOptions.push({ ac: subclass!.unarmoredAc(scores), note: subclass!.acNote!, armored: false, shieldOk: true });
  if (hasFeat("dragonHide")) acOptions.push({ ac: 13 + mods.DEX, note: "Dragon Hide (13 + DEX)", armored: false, shieldOk: true });
  if (hasInvocation("armorOfShadows")) acOptions.push({ ac: 13 + mods.DEX, note: "Mage Armor (Armor of Shadows, 13 + DEX)", armored: false, shieldOk: true });
  for (const a of bodyArmor.filter(armorProficient)) {
    const dex = a.maxDex === undefined ? mods.DEX : Math.min(mods.DEX, a.category === "medium" ? medMax : a.maxDex);
    acOptions.push({ ac: a.ac + dex + (defense ? 1 : 0), note: `${a.name} (${a.ac}${a.maxDex === 0 ? "" : " + DEX"}${defense ? " + 1 Defense" : ""})`, armored: true, shieldOk: true });
  }
  const best = acOptions.map((o) => ({ ...o, total: o.ac + (shieldUsable && o.shieldOk ? 2 : 0) })).sort((x, y) => y.total - x.total)[0];
  const ac = best.total;
  const acNote = best.note + (shieldUsable && best.shieldOk ? " + Shield" : "");
  const wornArmor = best.armored ? bodyArmor.find((a) => best.note.startsWith(a.name)) : undefined;
  if (wornArmor?.strength && scores.STR < wornArmor.strength) warnings.push({ level: "info", tab: "equipment", text: `${wornArmor.name} needs STR ${wornArmor.strength}: your speed drops by 10 ft while wearing it.` });
  if (CL.id === "druid" && owned.some((a) => /mail|plate|chain|splint|breastplate/i.test(a.name))) warnings.push({ level: "info", tab: "equipment", text: "Druids refuse to wear metal armor; pick hide, leather or padded armor and a wooden shield." });

  const initBonus = subclassActive && subclass!.initiativeBonus ? mods[subclass!.initiativeBonus] : 0;
  const initiative = mods.DEX + (hasFeat("alert") ? (is2014 ? 5 : pb) : 0) + initBonus + jack;
  const armorWorn: "none" | "light" | "medium" | "heavy" = wornArmor ? (wornArmor.category as "light" | "medium" | "heavy") : "none";
  const classSpeed = CL.speedBonus ? CL.speedBonus(level, armorWorn, shieldUsable && best.shieldOk) : 0;
  const speed = (lineage?.speed ?? species.speed) + (is2014 && hasFeat("mobile") ? 10 : 0) + (hasFeat("squatNimbleness") ? 5 : 0) + classSpeed - (wornArmor?.strength && scores.STR < wornArmor.strength ? 10 : 0);
  const darkvision = Math.max(lineage?.darkvision ?? species.darkvision, subclassActive ? (subclass!.darkvision ?? 0) : 0);
  const resistances = [...species.resistances, ...(lineage?.resistances ?? []), ...(hasFeat("infernalConstitution") ? ["Cold", "Poison"] : [])];
  const immunities = species.immunities ?? [];

  // ---------- spellcasting ----------
  // Class spellcasting, or a third-caster subclass's (Eldritch Knight, Arcane Trickster).
  const SP = CL.spell ?? (subclassActive ? subclass!.spell : undefined);
  const castAbility: Ability = SP?.ability ?? "CHA";
  const spellDc = 8 + pb + mods[castAbility];
  const spellAttack = pb + mods[castAbility];
  const slots = SP && level >= SP.startLevel ? SP.slots[level] : [];
  const maxSpellLevel = slots.length;
  const cantripLimit = SP ? (SP.cantrips[level] ?? 0) : 0;
  const preparedLimit = SP ? spellLimit(SP, level, mods[castAbility]) : 0;
  const spellbookLimit = SP?.spellbook ? SP.spellbook[level] : 0;
  const sorceryPoints = CL.sorcery?.points[level] ?? 0;
  const metamagicLimit = CL.sorcery?.metamagicKnown[level] ?? 0;
  const metamagicLevel = CL.sorcery?.metamagicLevel ?? 99;
  const metamagicList = CL.sorcery?.metamagic ?? [];
  // Spells a subclass adds to this character's class list (warlock patrons).
  const expandedSpells = subclassActive
    ? [...(subclass!.expanded ?? []), ...(subOption?.expanded ?? [])].map(([n]) => n)
    : [];
  const onList = (s: Spell) => (SP ? onClassList(s, SP.list, books, expandedSpells) : false);

  const casterRow = (name: string, source: string, kind: SpellRow["kind"], ability: Ability, note?: string): SpellRow => {
    const spell = R.getSpell(name);
    return { spell, name, level: spell?.level ?? (kind === "Cantrip" || note === "Cantrip" ? 0 : 1), source, kind, ability, saveDc: 8 + pb + mods[ability], attackBonus: pb + mods[ability], note };
  };

  const spellRows: SpellRow[] = [];
  c.cantrips.forEach((n) => spellRows.push(casterRow(n, CL.name, "Cantrip", castAbility)));
  c.prepared.forEach((n) => spellRows.push(casterRow(n, CL.name, "Prepared", castAbility)));
  if (subclassActive) {
    const always = is2014 && SP?.label === "Known" ? "known" : "always prepared";
    subclass!.spells
      .filter((g) => level >= g.minLevel)
      .forEach((g) => spellRows.push(casterRow(g.spell, `${g.source} (${always})`, R.getSpell(g.spell)?.level === 0 ? "Cantrip" : "Always", castAbility, g.note)));
    if (subOption?.spell) spellRows.push(casterRow(subOption.spell, `${subclass!.optionLabel}: ${subOption.name} (${always})`, "Always", castAbility));
    subOption?.spells?.filter((g) => level >= g.minLevel).forEach((g) => spellRows.push(casterRow(g.spell, `${g.source} (${always})`, "Always", castAbility, g.note)));
    if (subclass!.cantripOptions) {
      if (c.subclassCantrip && subclass!.cantripOptions.includes(c.subclassCantrip)) spellRows.push(casterRow(c.subclassCantrip, `${subclass!.name} (bonus cantrip)`, "Always", subclass!.spell?.ability ?? "INT"));
      else warnings.push({ level: "warn", tab: "class", text: `${subclass!.name}: choose ${subclass!.cantripOptions.join(" or ")}.` });
    }
    subclass!.bonusCantrips?.forEach((n) => spellRows.push(casterRow(n, `${subclass!.name} (bonus cantrip)`, "Always", castAbility)));
    if (subclass!.cantripChoice) {
      if (c.subclassCantrip) spellRows.push(casterRow(c.subclassCantrip, `${subclass!.name} (${subclass!.cantripChoice} cantrip)`, "Always", castAbility));
      else warnings.push({ level: "warn", tab: "class", text: `${subclass!.name}: choose a ${subclass!.cantripChoice} cantrip.` });
    }
  }
  // Warlock Pact of the Tome and Blessed/Druidic Warrior cantrips (counted apart from the class limit).
  if (CL.pactBoonLevel && level >= CL.pactBoonLevel && c.pactBoon === "tome") {
    c.tomeCantrips.slice(0, 3).filter(Boolean).forEach((n) => spellRows.push(casterRow(n, "Book of Shadows", "Always", "CHA")));
    if (c.tomeCantrips.filter(Boolean).length < 3) warnings.push({ level: "warn", tab: "class", text: `Pact of the Tome: choose ${3 - c.tomeCantrips.filter(Boolean).length} more cantrip(s) from any class's list.` });
  }
  if (style === "blessedWarrior" || style === "druidicWarrior") {
    c.styleCantrips.slice(0, 2).filter(Boolean).forEach((n) => spellRows.push(casterRow(n, style === "blessedWarrior" ? "Blessed Warrior" : "Druidic Warrior", "Always", style === "blessedWarrior" ? "CHA" : "WIS")));
    if (c.styleCantrips.filter(Boolean).length < 2) warnings.push({ level: "warn", tab: "class", text: `${style === "blessedWarrior" ? "Blessed Warrior: choose two cleric" : "Druidic Warrior: choose two druid"} cantrips.` });
  }
  const speciesAbility: Ability = species.spellAbilityChoice ? c.speciesSpellAbility : (lineage?.spellAbility ?? species.spellAbility ?? "CHA");
  [...(species.spells ?? []), ...(lineage?.spells ?? [])]
    .filter((g) => level >= g.minLevel)
    .forEach((g) => spellRows.push(casterRow(g.spell, g.source, "Innate", speciesAbility, g.note)));
  if (lineage?.cantripChoice) {
    if (c.speciesCantrip) spellRows.push(casterRow(c.speciesCantrip, `${lineage.name} (${lineage.cantripChoice} cantrip)`, "Innate", speciesAbility, "Cantrip"));
    else warnings.push({ level: "warn", tab: "species", text: `${lineage.name}: choose a ${lineage.cantripChoice.toLowerCase()} cantrip.` });
  }
  const halfFeatAbility = (f: FeatEntry, fallback: Ability) => {
    const p = featIn(R, f.id).plusOne;
    return p?.includes(f.plusOne) ? f.plusOne : (p?.[0] ?? fallback);
  };
  for (const f of feats) {
    if (f.id === "magicInitiate") {
      const list = f.from.startsWith("Background") && bg.featList ? bg.featList : f.choices.miList;
      const ab = is2014 ? MI_ABILITY[list] : f.choices.miAbility;
      f.choices.miCantrips.filter(Boolean).forEach((n) => spellRows.push(casterRow(n, `Magic Initiate (${list})`, "Innate", ab, "Cantrip")));
      if (f.choices.miSpell) spellRows.push(casterRow(f.choices.miSpell, `Magic Initiate (${list})`, "Innate", ab, "1 / Long Rest without a slot"));
    }
    if (f.id === "feyTouched" || f.id === "shadowTouched") {
      const ab = halfFeatAbility(f, "INT");
      const name = featIn(R, f.id).name;
      spellRows.push(casterRow(f.id === "feyTouched" ? "Misty Step" : "Invisibility", name, "Innate", ab, "1 / Long Rest without a slot"));
      if (f.choices.miSpell) spellRows.push(casterRow(f.choices.miSpell, name, "Innate", ab, "1 / Long Rest without a slot"));
    }
    if (f.id === "telekinetic") spellRows.push(casterRow("Mage Hand", "Telekinetic", "Innate", halfFeatAbility(f, "INT"), "Cantrip, invisible, no components"));
    if (f.id === "telepathic") spellRows.push(casterRow("Detect Thoughts", "Telepathic", "Innate", halfFeatAbility(f, "INT"), "1 / Long Rest without a slot"));
    if (f.id === "artificerInitiate") {
      if (f.choices.miCantrips[0]) spellRows.push(casterRow(f.choices.miCantrips[0], "Artificer Initiate", "Innate", "INT", "Cantrip"));
      if (f.choices.miSpell) spellRows.push(casterRow(f.choices.miSpell, "Artificer Initiate", "Innate", "INT", "1 / Long Rest without a slot"));
    }
    if (f.id === "woodElfMagic") {
      if (f.choices.miCantrips[0]) spellRows.push(casterRow(f.choices.miCantrips[0], "Wood Elf Magic", "Innate", "WIS", "Cantrip"));
      spellRows.push(casterRow("Longstrider", "Wood Elf Magic", "Innate", "WIS", "1 / Long Rest without a slot"));
    }
  }

  // spell checks
  const classWord = CL.name.toLowerCase();
  const kindWord = SP?.label === "Prepared" ? "Prepared spells" : "Spells known";
  if (SP && level >= SP.startLevel) {
    if (c.cantrips.length !== cantripLimit)
      warnings.push({ level: c.cantrips.length > cantripLimit ? "error" : "warn", tab: "spells", text: `Cantrips: ${c.cantrips.length} of ${cantripLimit} chosen.` });
    if (SP.spellbook) {
      if (c.spellbook.length !== spellbookLimit)
        warnings.push({ level: c.spellbook.length > spellbookLimit ? "error" : "warn", tab: "spells", text: `Spellbook: ${c.spellbook.length} of ${spellbookLimit} spells written in.` });
      for (const n of c.prepared) if (!c.spellbook.includes(n)) warnings.push({ level: "error", tab: "spells", text: `${n} is prepared but not in your spellbook.` });
    }
    if (c.prepared.length !== preparedLimit)
      warnings.push({ level: c.prepared.length > preparedLimit ? "error" : SP.label === "Prepared" ? "info" : "warn", tab: "spells", text: `${kindWord}: ${c.prepared.length} of ${preparedLimit} chosen.` });
    for (const n of [...c.cantrips, ...c.prepared, ...c.spellbook.filter((x) => !c.prepared.includes(x))]) {
      const s = R.getSpell(n);
      if (!s) {
        warnings.push({ level: "warn", tab: "spells", text: `${n} isn't a ${c.edition} ${classWord} spell in this app.` });
        continue;
      }
      if (s.level > maxSpellLevel && s.level > 0)
        warnings.push({ level: "error", tab: "spells", text: `${n} is a ${ORD[s.level]}-level spell; at ${CL.name} ${level} you can only use up to ${ORD[maxSpellLevel]}-level spells.` });
      if (!onList(s)) {
        const listBook = SP.list === "sorcerer" ? (s.sorcerer ? s.listBook : undefined) : (s.lists ?? []).find((l) => l.startsWith(`${SP.list}@`))?.split("@")[1];
        const missing = !inBooks(books, s.book) ? s.book : listBook && !inBooks(books, listBook) ? listBook : undefined;
        const why = missing ? `needs ${BOOK_NAMES[missing] ?? missing}, which isn't allowed` : `isn't on the ${classWord} spell list`;
        warnings.push({ level: "error", tab: "spells", text: `${n} ${why}.` });
      }
    }
  } else if (c.cantrips.length || c.prepared.length) {
    warnings.push({ level: "warn", tab: "spells", text: `${CL.name}s don't cast spells at level ${level}; remove the chosen spells.` });
  }
  if (subclassActive && subclass!.spellSchools && SP === subclass!.spell) {
    const off = c.prepared.filter((n) => {
      const s = R.getSpell(n);
      return s && !subclass!.spellSchools!.includes(s.school);
    });
    if (off.length > 1)
      warnings.push({ level: "warn", tab: "spells", text: `${subclass!.name}: only one of your spells may be from outside ${subclass!.spellSchools.join(" and ")} at this level (${off.join(", ")}).` });
  }
  const alwaysNames = new Set(spellRows.filter((r) => r.kind === "Always").map((r) => r.name));
  for (const n of [...c.prepared, ...c.cantrips]) if (alwaysNames.has(n)) warnings.push({ level: "warn", tab: "spells", text: `${n} is already granted by your subclass; choose another spell.` });
  if (CL.sorcery && level >= metamagicLevel) {
    if (c.metamagic.length !== metamagicLimit)
      warnings.push({ level: c.metamagic.length > metamagicLimit ? "error" : "warn", tab: "class", text: `Metamagic: ${c.metamagic.length} of ${metamagicLimit} chosen.` });
    for (const id of c.metamagic) {
      const m = metamagicList.find((x) => x.id === id);
      if (!m) warnings.push({ level: "warn", tab: "class", text: `Unknown Metamagic option "${id}".` });
      else bookWarn(m.name, m.book, "class");
    }
  }

  const itemNames = c.inventory.map((i) => i.name.toLowerCase());
  for (const r of spellRows) {
    const cost = r.spell?.costly;
    if (!cost) continue;
    const key = cost.item.split(" ")[0].toLowerCase();
    if (!itemNames.some((n) => n.includes(key)))
      warnings.push({ level: "warn", tab: "equipment", text: `${r.name} needs ${cost.item}${cost.consumed ? " (used up)" : ""}. A focus can't replace a component with a gold cost, and you don't have one.` });
  }

  // ---------- attacks ----------
  const attacks: Attack[] = [];
  const seen = new Set<string>();
  const kensei = subclass?.picks?.grants === "monkWeapon" ? pickedWeapons : [];
  const monkWeapon = (w: Weapon) =>
    CL.id === "monk" && (w.name === "Shortsword" || kensei.includes(w.name) || (w.simple && !w.ranged && !/Heavy|Two-Handed/.test(w.properties)));
  const archery = style === "archery" || feats.some((f) => f.id === "fightingInitiate" && f.choices.style === "archery");
  const maDie = CL.martialArts ? CL.martialArts(level) : undefined;
  for (const it of c.inventory) {
    const w = weaponByName(it.name);
    if (!w || seen.has(w.name)) continue;
    seen.add(w.name);
    const prof = weaponProficient(w);
    let ab: Ability = w.finesse || monkWeapon(w) ? (mods.DEX >= mods.STR ? "DEX" : "STR") : w.ranged ? "DEX" : "STR";
    if (subclassActive && subclass!.weaponCha && prof && !/Two-Handed/.test(w.properties) && mods.CHA > mods[ab]) ab = "CHA";
    const m = mods[ab];
    const toHit = m + (prof ? pb : 0) + (archery && w.ranged ? 2 : 0);
    let dice = w.damage;
    if (monkWeapon(w) && maDie && Number(maDie.slice(2)) > Number(dice.split("d")[1] ?? 0) && !dice.startsWith("2")) dice = maDie;
    attacks.push({
      name: w.name,
      bonus: signed(toHit),
      damage: `${dice}${m ? signed(m) : ""} ${w.type}`,
      notes: `${w.simple ? "Simple" : "Martial"}, ${w.properties}${prof ? "" : " · not proficient (no PB)"}${ab === "CHA" ? " · Hex Warrior (CHA)" : ""}`,
    });
  }
  if (maDie) {
    const ab: Ability = mods.DEX >= mods.STR ? "DEX" : "STR";
    attacks.push({ name: "Unarmed Strike", bonus: signed(mods[ab] + pb), damage: `${maDie}${mods[ab] ? signed(mods[ab]) : ""} Bludgeoning`, notes: "Martial Arts; one more as a Bonus Action after the Attack action" });
  }
  for (const r of spellRows) {
    if (r.level !== 0 || !r.spell?.damage || seen.has(r.name)) continue;
    seen.add(r.name);
    const dmg = cantripDamage(r.spell, level)!;
    const hit = r.spell.attack ? signed(r.attackBonus) : r.spell.save ? `${r.spell.save} ${r.saveDc}` : "—";
    attacks.push({ name: r.name, bonus: hit, damage: dmg, notes: `${r.spell.range}, ${r.spell.components}` });
  }

  // ---------- features ----------
  const tashaRanger = deftExplorer;
  const hidden = new Set(["Ability Score Improvement", CL.subclassLabel, "Sorcerer Subclass", "Sorcerous Origin"]);
  const classFeatures: Feature[] = [];
  CL.features
    .filter((f) => f.level <= level && inBooks(books, f.book) && !hidden.has(f.name))
    .filter((f) => (f.replaces ? tashaRanger : !(tashaRanger && CL.features.some((x) => x.replaces === f.name))))
    .forEach((f) => {
      let text = f.text;
      if (f.dyn) text = f.dyn(level) + text;
      if (f.name === "Font of Magic") text = `You have ${sorceryPoints} Sorcery Points. ` + text;
      if (f.name === "Sorcerous Restoration") text += ` (up to ${Math.floor(level / 2)} SP)`;
      if (f.name === "Fighting Style") {
        const st = FIGHTING_STYLES.find((x) => x.id === c.fightingStyle);
        text = st ? `${st.name}: ${st.text}` : "Not chosen yet.";
      }
      if (f.name === "Favored Enemy") text = `${c.favoredEnemy || "Not chosen yet"}. ` + text;
      if (f.name === "Natural Explorer") text = `${c.favoredTerrain || "Not chosen yet"}. ` + text;
      if (f.name === "Expertise") text = `${c.expertise.map((e) => (e === "thieves" ? "Thieves' Tools" : skillName(e as SkillId))).join(", ") || "Not chosen yet"}. ` + text;
      if (f.name === "Lay on Hands") text = `Pool: ${5 * level} HP. ` + text;
      if (f.name === "Spellcasting" && SP?.spellbook) text = `Spellbook: ${c.spellbook.length} spells. ` + text;
      classFeatures.push({ ...f, text });
    });
  if (subclassActive) {
    classFeatures.push({ name: subclass!.name, source: `${CL.name} ${CL.subclassLevel}`, text: subclass!.summary + (subOption ? ` ${subclass!.optionLabel}: ${subOption.name}.` : "") });
    subclass!.features.filter((f) => f.level <= level).forEach((f) => classFeatures.push(f));
    if (subOption?.text) classFeatures.push({ name: `${subclass!.optionLabel}: ${subOption.name}`, source: subclass!.name, text: subOption.text });
    const picks = subclass!.picks;
    if (picks) picks.options.filter((o) => c.subclassPicks.includes(o.id)).forEach((o) => classFeatures.push({ name: o.name, source: picks.label, text: o.text }));
  }
  if (CL.invocations && level >= 2)
    INVOCATIONS.filter((x) => c.invocations.includes(x.id)).forEach((x) => classFeatures.push({ name: `Invocation: ${x.name}`, source: "Eldritch Invocations", text: x.text }));
  if (CL.pactBoonLevel && level >= CL.pactBoonLevel) {
    const boon = PACT_BOONS.find((b) => b.id === c.pactBoon);
    if (boon) classFeatures.push({ name: boon.name, source: "Pact Boon", text: boon.text });
  }
  if (CL.infusions && level >= 2) INFUSIONS.filter((x) => c.infusions.includes(x.id)).forEach((x) => classFeatures.push({ name: `Infusion: ${x.name}`, source: "Infuse Item", text: x.text }));
  if (CL.sorcery && level >= metamagicLevel)
    metamagicList.filter((m) => c.metamagic.includes(m.id)).forEach((m) => classFeatures.push({ name: `Metamagic: ${m.name}`, source: m.cost, text: m.text }));
  const speciesFeatures: Feature[] = species.traits.filter((t) => !t.minLevel || t.minLevel <= level);
  if (lineage) speciesFeatures.push({ name: `${species.lineageLabel}: ${lineage.name}`, source: species.name, text: lineage.text });
  const otherFeatures: Feature[] = [];
  if (bg.custom) {
    const bf = BACKGROUND_FEATURES.find((x) => x.id === c.bgCustomFeature);
    otherFeatures.push(bf ? { name: bf.name, source: `Background (from ${bf.from})`, text: bf.text } : bg.feature!);
  } else if (bg.feature) otherFeatures.push(bg.feature);
  for (const f of feats) {
    const feat = featIn(R, f.id);
    let text = feat.text;
    if (f.id === "asi" && f.from === L4)
      text = c.level4AsiMode === "+2" ? `+2 ${ABILITY_NAMES[c.level4A]}.` : `+1 ${ABILITY_NAMES[c.level4A]}, +1 ${ABILITY_NAMES[c.level4B]}.`;
    else if (feat.plusOne) text = `+1 ${ABILITY_NAMES[feat.plusOne.includes(f.plusOne) ? f.plusOne : feat.plusOne[0]]}. ${text}`;
    if (f.id === "fightingInitiate") {
      const st = FIGHTING_STYLES.find((x) => x.id === f.choices.style);
      text = st ? `${st.name}: ${st.text}` : `${text} (choose a style)`;
    }
    otherFeatures.push({ name: feat.name, source: f.from, text });
  }
  const featureGroups: { title: string; items: Feature[] }[] = [
    { title: `${CL.name} Features`, items: classFeatures },
    { title: `${species.name.replace(" (2014 legacy)", "")} Traits`, items: speciesFeatures },
    { title: "Feats & Background", items: otherFeatures },
  ].filter((g) => g.items.length > 0);

  // ---------- encumbrance ----------
  const carried = c.inventory.reduce((s, i) => s + i.qty * i.weight, 0);
  const coinCount = c.coins.cp + c.coins.sp + c.coins.ep + c.coins.gp + c.coins.pp;
  const carriedTotal = carried + coinCount / 50;
  const capacity = scores.STR * 15;
  if (carriedTotal > capacity) warnings.push({ level: "warn", tab: "equipment", text: `Carrying ${carriedTotal.toFixed(1)} lb, over your ${capacity} lb capacity.` });

  // ---------- other choices ----------
  if (species.lineages && !lineage && c.species) warnings.push({ level: "warn", tab: "species", text: `Choose a ${species.lineageLabel}.` });
  if (speciesSkillCount && c.speciesSkills.length < speciesSkillCount)
    warnings.push({ level: "warn", tab: "species", text: `Choose ${speciesSkillCount - c.speciesSkills.length} more ${species.name} skill(s).` });
  if (c.classSkills.length < CL.skills.count) warnings.push({ level: "warn", tab: "class", text: `Choose ${CL.skills.count - c.classSkills.length} more ${CL.name} skill(s).` });
  if (is2014 && level >= CL.subclassLevel && CL.subclasses.length && !subclass) warnings.push({ level: "warn", tab: "class", text: `Choose your ${CL.subclassLabel}.` });
  if (subclassActive && subclass!.options && !subOption) warnings.push({ level: "warn", tab: "class", text: `Choose your ${subclass!.optionLabel}.` });
  if (subclassActive && subclass!.skillChoice && c.subclassSkills.length < subclass!.skillChoice.count)
    warnings.push({ level: "warn", tab: "class", text: `${subclass!.name}: choose ${subclass!.skillChoice.count - c.subclassSkills.length} skill(s).` });
  if (styleActive && !stylesFor(CL).some((s) => s.id === c.fightingStyle && inBooks(books, s.book))) warnings.push({ level: "warn", tab: "class", text: "Choose a Fighting Style." });
  if (CL.expertise && level >= CL.expertise.level && c.expertise.length < CL.expertise.count)
    warnings.push({ level: "warn", tab: "class", text: `Expertise: choose ${CL.expertise.count - c.expertise.length} more.` });
  if (subclassActive && subclass!.picks) {
    const want = subclass!.picks.count[level] ?? 0;
    const have = c.subclassPicks.filter((p) => subclass!.picks!.options.some((o) => o.id === p)).length;
    if (have !== want) warnings.push({ level: have > want ? "error" : "warn", tab: "class", text: `${subclass!.picks.label}: ${have} of ${want} chosen.` });
    if (subclass!.picks.rule === "meleeAndRanged" && have === 2) {
      const ranged = pickedWeapons.filter((n) => weaponByName(n)?.ranged).length;
      if (ranged !== 1) warnings.push({ level: "error", tab: "class", text: `${subclass!.picks.label}: choose one melee and one ranged weapon.` });
    }
  }
  if (CL.invocations && level >= 2) {
    const want = CL.invocations[level];
    if (c.invocations.length !== want) warnings.push({ level: c.invocations.length > want ? "error" : "warn", tab: "class", text: `Eldritch Invocations: ${c.invocations.length} of ${want} chosen.` });
    for (const id of c.invocations) {
      const x = INVOCATIONS.find((i) => i.id === id);
      if (!x) continue;
      bookWarn(`The ${x.name} invocation`, x.book, "class");
      if (x.level && level < x.level) warnings.push({ level: "error", tab: "class", text: `${x.name} needs warlock level ${x.level}.` });
      if (x.eldritchBlast && !c.cantrips.includes("Eldritch Blast")) warnings.push({ level: "error", tab: "class", text: `${x.name} needs the Eldritch Blast cantrip.` });
      if (x.hex && !(c.prepared.includes("Hex") || c.subclass === "hexblade"))
        warnings.push({ level: "error", tab: "class", text: `${x.name} needs the Hex spell or a warlock feature that curses (Hexblade).` });
      if (x.pact && (c.pactBoon !== x.pact || level < (CL.pactBoonLevel ?? 99))) warnings.push({ level: "error", tab: "class", text: `${x.name} needs the Pact of the ${x.pact[0].toUpperCase() + x.pact.slice(1)}.` });
    }
  }
  if (CL.pactBoonLevel && level >= CL.pactBoonLevel && !PACT_BOONS.some((b) => b.id === c.pactBoon)) warnings.push({ level: "warn", tab: "class", text: "Choose your Pact Boon." });
  if (CL.infusions && level >= 2 && c.infusions.length !== CL.infusions[level])
    warnings.push({ level: c.infusions.length > CL.infusions[level] ? "error" : "warn", tab: "class", text: `Infusions: ${c.infusions.length} of ${CL.infusions[level]} known.` });
  if (CL.choices?.includes("favoredEnemy") && !tashaRanger && !FAVORED_ENEMIES.includes(c.favoredEnemy)) warnings.push({ level: "warn", tab: "class", text: "Choose a favored enemy." });
  if (CL.choices?.includes("naturalExplorer") && !tashaRanger && !c.favoredTerrain) warnings.push({ level: "warn", tab: "class", text: "Choose a favored terrain." });
  if (tashaRanger && !c.deftExpertise) warnings.push({ level: "warn", tab: "class", text: "Deft Explorer: choose a skill for expertise." });
  if (bg.custom) {
    if (c.bgCustomSkills.length < 2) warnings.push({ level: "warn", tab: "background", text: `Custom background: choose ${2 - c.bgCustomSkills.length} more skill(s).` });
    if (!c.bgCustomFeature) warnings.push({ level: "info", tab: "background", text: "Custom background: pick the feature you borrow (agree it with your DM)." });
  }
  for (const f of feats) {
    const tab = featTab(f);
    if (f.id === "skilled" && f.choices.skills.length < 3) warnings.push({ level: "warn", tab, text: `Skilled (${f.from}): choose ${3 - f.choices.skills.length} more skill(s).` });
    if (f.id === "magicInitiate" && (!f.choices.miSpell || f.choices.miCantrips.some((x) => !x)))
      warnings.push({ level: "warn", tab, text: `Magic Initiate (${f.from}): fill in two cantrips and one 1st-level spell.` });
    if (f.id === "feyTouched" && !f.choices.miSpell) warnings.push({ level: "warn", tab, text: `Fey Touched (${f.from}): choose a 1st-level divination or enchantment spell.` });
    if (f.id === "shadowTouched" && !f.choices.miSpell) warnings.push({ level: "warn", tab, text: `Shadow Touched (${f.from}): choose a 1st-level illusion or necromancy spell.` });
    if ((f.id === "skillExpert" || f.id === "prodigy") && (!f.choices.skills[0] || !f.choices.expertise))
      warnings.push({ level: "warn", tab, text: `${featIn(R, f.id).name} (${f.from}): choose a skill and a skill for expertise.` });
    if (f.id === "fightingInitiate" && !f.choices.style) warnings.push({ level: "warn", tab, text: `Fighting Initiate (${f.from}): choose a fighting style.` });
  }
  if (!species.sizes.includes(c.size)) warnings.push({ level: "warn", tab: "species", text: `${species.name} can't be ${c.size}.` });

  const observant = is2014 && hasFeat("observant") ? 5 : 0;
  const passive = (id: SkillId) => 10 + skillBonus(id);
  const speciesShort = c.species || !is2014 ? species.name.replace(" (2014 legacy)", "") : "No race yet";
  const className = is2014 && !R.classes.some((x) => x.id === c.cls) ? "No class yet" : `${CL.name} ${level}`;
  const identity = `${lineage && species.lineageLabel === "Subrace" ? lineage.name : speciesShort} · ${className}${subclassActive ? ` (${subclass!.name})` : ""}`;

  const armorText = [...armorProfs].map((a) => (a === "shield" ? "shields" : `${a} armor`)).join(", ") || "None";
  const weaponText = [CL.weaponText, ...(martialProf && !CL.weapons.martial ? ["martial weapons"] : []), ...[...weaponList].filter((w) => !(CL.weapons.list ?? []).includes(w))].join(", ");

  return {
    edition: c.edition,
    rules: R,
    cls: CL,
    level,
    pb,
    species,
    lineage,
    bg,
    subclass,
    subclassActive,
    subOption,
    feats,
    bonuses,
    scores,
    mods,
    saves,
    skills,
    tools,
    armorText,
    weaponText,
    languageLimit,
    hpMax,
    hpPerLevel: perLevel,
    hpExtras,
    hitDice: `${level}d${hd}`,
    ac,
    acNote,
    initiative,
    speed,
    darkvision,
    resistances,
    immunities,
    caster: !!SP && level >= SP.startLevel,
    /** Active spellcasting (the class's, or an Eldritch Knight / Arcane Trickster subclass's). */
    spell: SP,
    castAbility,
    spellDc,
    spellAttack,
    slots,
    pact: !!SP?.pact,
    maxSpellLevel,
    cantripLimit,
    preparedLimit,
    spellbookLimit,
    spellsKind: SP?.label ?? "Known",
    expandedSpells,
    onList,
    sorceryPoints,
    metamagicLimit,
    metamagicLevel,
    spellRows,
    attacks,
    featureGroups,
    carried: carriedTotal,
    capacity,
    passivePerception: passive("perception") + observant,
    passiveInsight: passive("insight"),
    passiveInvestigation: passive("investigation") + observant,
    warnings,
    identity,
  };
}

export type Derived = ReturnType<typeof deriveCharacter>;
