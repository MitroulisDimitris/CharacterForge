// Pathfinder 2e (Remaster) rules engine for a Sorcerer, levels 1-5.
import type { Warning } from "../types";
import type { CharacterPF2 } from "./character";
import {
  ANCESTRIES,
  ATTRS,
  ATTR_NAMES,
  BACKGROUNDS_PF2,
  BLOODLINES,
  GENERAL_FEATS_PF2,
  RANK_NAMES,
  SKILLS_PF2,
  SORCERER_PF2,
  VERSATILE_HERITAGES,
  dmgAt,
  profBonus,
  skillNamePF2,
  spellPF2,
  weaponPF2,
  type Attr,
  type Rank,
  type SpellPF2,
} from "./data";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export interface RepertoireRow {
  name: string;
  rank: number;
  spell?: SpellPF2;
  gift: boolean;
  signature: boolean;
  damage?: string;
}

export function derivePF2(c: CharacterPF2) {
  const L = c.level;
  const warnings: Warning[] = [];
  const ancestry = ANCESTRIES.find((a) => a.id === c.ancestry) ?? ANCESTRIES[0];
  const versatile = VERSATILE_HERITAGES.find((h) => h.id === c.heritage);
  const heritage = versatile ?? ancestry.heritages.find((h) => h.id === c.heritage);
  const bg = BACKGROUNDS_PF2.find((b) => b.id === c.background) ?? BACKGROUNDS_PF2[0];
  const bloodline = BLOODLINES.find((b) => b.id === c.bloodline) ?? BLOODLINES[0];
  const option = bloodline.options?.find((o) => o.id === c.bloodlineOption);
  if (!heritage) warnings.push({ level: "warn", tab: "ancestry", text: "Choose a heritage." });
  if (bloodline.options && !option) warnings.push({ level: "warn", tab: "class", text: `Choose your ${bloodline.optionLabel?.toLowerCase()}.` });

  // ---------- attribute boosts ----------
  const mods: Record<Attr, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  const partial = new Set<Attr>();
  const sources: Record<Attr, string[]> = { STR: [], DEX: [], CON: [], INT: [], WIS: [], CHA: [] };
  const step = (label: string, list: Attr[], expected: number, tab: string, allowPartial = false) => {
    const distinct = list.filter((a, i) => list.indexOf(a) === i);
    if (distinct.length !== list.length) warnings.push({ level: "error", tab, text: `${label}: each boost must go to a different attribute.` });
    if (distinct.length < expected) warnings.push({ level: "warn", tab, text: `${label}: choose ${expected - distinct.length} more boost(s).` });
    for (const a of distinct.slice(0, expected)) {
      if (allowPartial && mods[a] >= 4) {
        if (partial.has(a)) {
          partial.delete(a);
          mods[a] += 1;
        } else partial.add(a);
        sources[a].push(`${label} (partial)`);
      } else {
        mods[a] += 1;
        sources[a].push(label);
      }
    }
  };
  const fixed = c.altBoosts ? [] : ancestry.boosts;
  const freeCount = c.altBoosts ? 2 : ancestry.freeBoosts;
  if (!c.altBoosts && ancestry.flaw) {
    mods[ancestry.flaw] -= 1;
    sources[ancestry.flaw].push(`${ancestry.name} flaw`);
  }
  const ancestryFree = c.ancestryFree.filter((a) => !fixed.includes(a));
  step(ancestry.name, [...fixed, ...ancestryFree], fixed.length + freeCount, "ancestry");
  const bgBoost = bg.boosts.includes(c.bgBoost) ? c.bgBoost : bg.boosts[0];
  step(bg.name, [bgBoost, c.bgFree], 2, "background");
  step("Sorcerer key attribute", ["CHA"], 1, "class");
  step("Level 1", c.boosts1, 4, "abilities");
  for (const a of ATTRS) if (mods[a] > 4) warnings.push({ level: "error", tab: "abilities", text: `${ATTR_NAMES[a]} would start at ${signed(mods[a])}; the maximum at 1st level is +4.` });
  const intAt1 = mods.INT;
  if (L >= 5) step("Level 5", c.boosts5, 4, "abilities", true);

  // ---------- proficiencies ----------
  const prof = (rank: Rank) => profBonus(rank, L);
  const generalFeats = [c.generalFeat3 && L >= 3 ? c.generalFeat3 : "", heritage?.generalFeat ? c.heritageFeat : ""].filter(Boolean);
  const hasGeneral = (id: string) => generalFeats.includes(id);
  const acumen = hasGeneral("cannyAcumen") ? c.cannyAcumen : null;
  const raise = (base: Rank, id: string): Rank => (acumen === id && base < 2 ? 2 : base);

  const perceptionRank = raise(1, "perception");
  const saveRanks: Record<"fort" | "ref" | "will", Rank> = { fort: raise(L >= 5 ? 2 : 1, "fort"), ref: raise(1, "ref"), will: raise(2, "will") };
  const saves = (
    [
      ["fort", "Fortitude", "CON"],
      ["ref", "Reflex", "DEX"],
      ["will", "Will", "WIS"],
    ] as const
  ).map(([id, name, a]) => ({ id, name, attr: a as Attr, rank: saveRanks[id], total: mods[a as Attr] + prof(saveRanks[id]) }));
  const perception = mods.WIS + prof(perceptionRank);
  const ac = 10 + mods.DEX + prof(1);
  const spellAttack = mods.CHA + prof(1);
  const spellDc = 10 + spellAttack;
  const classDc = 10 + mods.CHA + prof(1);
  const ancestryHp = heritage?.hp ?? ancestry.hp;
  const hpMax = ancestryHp + (SORCERER_PF2.hp + mods.CON) * L + (hasGeneral("toughness") ? L : 0);
  const speed = ancestry.speed + (hasGeneral("fleet") ? 5 : 0);
  const vision = heritage?.vision === "darkvision" || ancestry.vision === "darkvision" || (heritage?.upgradesVision && ancestry.vision === "low-light") ? "Darkvision" : heritage?.vision === "low-light" || ancestry.vision === "low-light" ? "Low-light vision" : "Normal vision";

  // ---------- skills ----------
  const sourcesBySkill = new Map<string, string[]>();
  const train = (id: string, from: string) => id && sourcesBySkill.set(id, [...(sourcesBySkill.get(id) ?? []), from]);
  const bloodlineSkills = [...bloodline.skills, ...(option?.skill ? [option.skill] : [])];
  bloodlineSkills.forEach((s) => train(s, `${bloodline.name} bloodline`));
  bg.skills.forEach((s) => train(s, bg.name));
  if (bg.skillChoice) {
    if (bg.skillChoice.includes(c.bgSkill)) train(c.bgSkill, bg.name);
    else warnings.push({ level: "warn", tab: "background", text: `${bg.name}: choose ${bg.skillChoice.map(skillNamePF2).join(" or ")}.` });
  }
  if (heritage?.trainedSkill) train(heritage.trainedSkill, heritage.name);
  if (heritage?.skillChoice) {
    if (c.heritageSkill) train(c.heritageSkill, heritage.name);
    else warnings.push({ level: "warn", tab: "ancestry", text: `${heritage.name}: choose a skill.` });
  }
  const classSkillCount = Math.max(0, 2 + intAt1);
  c.classSkills.slice(0, classSkillCount).forEach((s) => train(s, "Sorcerer"));
  if (c.classSkills.length < classSkillCount) warnings.push({ level: "warn", tab: "skills", text: `Sorcerer skills: choose ${classSkillCount - c.classSkills.length} more (2 + INT modifier).` });
  if (c.classSkills.length > classSkillCount) warnings.push({ level: "error", tab: "skills", text: `Sorcerer skills: ${c.classSkills.length} chosen but only ${classSkillCount} allowed.` });
  for (const [s, from] of sourcesBySkill) if (from.length > 1) warnings.push({ level: "warn", tab: "skills", text: `${skillNamePF2(s)} is trained twice (${from.join(" + ")}); train another skill instead.` });

  const skillRank = (id: string): Rank => {
    if (!sourcesBySkill.has(id)) return 0;
    let r: Rank = 1;
    if (L >= 3 && c.skillIncrease3 === id) r = (r + 1) as Rank;
    if (L >= 5 && c.skillIncrease5 === id) r = (r + 1) as Rank;
    if (L >= 5 && heritage?.skillChoice && c.heritageSkill === id && r < 2) r = 2;
    return Math.min(r, L >= 7 ? 3 : 2) as Rank;
  };
  for (const [lvl, id] of [
    [3, c.skillIncrease3],
    [5, c.skillIncrease5],
  ] as const) {
    if (L < lvl) continue;
    if (!id) warnings.push({ level: "warn", tab: "skills", text: `Level ${lvl} skill increase: choose a trained skill to make expert.` });
    else if (!sourcesBySkill.has(id)) warnings.push({ level: "error", tab: "skills", text: `Level ${lvl} skill increase: ${skillNamePF2(id)} isn't trained.` });
  }
  if (L >= 5 && c.skillIncrease3 && c.skillIncrease3 === c.skillIncrease5) warnings.push({ level: "error", tab: "skills", text: "You can't become master in a skill before 7th level; pick a different skill at 5th." });

  const skills = SKILLS_PF2.map((s) => {
    const rank = skillRank(s.id);
    return { id: s.id, name: s.name, attr: s.attr, rank, total: mods[s.attr] + prof(rank), sources: sourcesBySkill.get(s.id) ?? [] };
  });
  const lore = { name: c.bgLore || bg.lore, total: mods.INT + prof(1) };

  // ---------- spells ----------
  const tradition = bloodline.tradition ?? option?.tradition;
  const gifts = { ...bloodline.gifts, ...(option?.gifts ?? {}) };
  const slots = SORCERER_PF2.slots[L];
  const maxRank = slots.length - 1;
  const cantripRank = Math.ceil(L / 2);
  const giftNames = new Set(Object.values(gifts));
  const chosenLimit = slots.map((n) => n - 1);
  const rows: RepertoireRow[] = [];
  const addRow = (name: string, gift: boolean) => {
    const spell = spellPF2(name);
    const rank = spell?.rank ?? Number(Object.entries(gifts).find(([, v]) => v === name)?.[0] ?? 1);
    rows.push({ name, rank, spell, gift, signature: c.signature.includes(name), damage: spell ? dmgAt(spell, rank === 0 ? cantripRank : rank) : undefined });
  };
  for (const [r, name] of Object.entries(gifts)) if (Number(r) <= maxRank && name) addRow(name, true);
  c.cantrips.forEach((n) => addRow(n, false));
  c.spells.forEach((n) => addRow(n, false));

  for (let r = 0; r <= maxRank; r++) {
    const have = (r === 0 ? c.cantrips : c.spells.filter((n) => spellPF2(n)?.rank === r)).length;
    const label = r === 0 ? "Cantrips" : `Rank ${r} spells`;
    if (have !== chosenLimit[r]) warnings.push({ level: have > chosenLimit[r] ? "error" : "warn", tab: "spells", text: `${label}: ${have} of ${chosenLimit[r]} chosen (plus your bloodline's gift).` });
  }
  for (const n of [...c.cantrips, ...c.spells]) {
    const s = spellPF2(n);
    if (!s) warnings.push({ level: "warn", tab: "spells", text: `${n} isn't in this app's spell list.` });
    else {
      if (tradition && !s.traditions.includes(tradition)) warnings.push({ level: "error", tab: "spells", text: `${n} isn't a ${tradition} spell (your bloodline's tradition).` });
      if (s.rank > maxRank) warnings.push({ level: "error", tab: "spells", text: `${n} is rank ${s.rank}; at Sorcerer ${L} you cast up to rank ${maxRank}.` });
      if (giftNames.has(n)) warnings.push({ level: "warn", tab: "spells", text: `${n} is already gifted by your bloodline; choose another.` });
    }
  }
  if (L >= 3) {
    const sigRanks = c.signature.map((n) => rows.find((r) => r.name === n)?.rank).filter((r) => r !== undefined && r > 0);
    if (new Set(sigRanks).size !== sigRanks.length) warnings.push({ level: "error", tab: "spells", text: "Signature spells: only one per rank." });
    if (sigRanks.length < maxRank) warnings.push({ level: "info", tab: "spells", text: `Signature spells: ${sigRanks.length} of ${maxRank} chosen (one per rank).` });
  }

  // ---------- feats ----------
  const featList = [
    { level: 1, kind: "Ancestry feat", value: c.ancestryFeat1, key: "ancestryFeat1" as const },
    { level: 1, kind: "Background skill feat", value: bg.feat, key: null },
    { level: 2, kind: "Sorcerer feat", value: c.classFeat2, key: "classFeat2" as const },
    { level: 2, kind: "Skill feat", value: c.skillFeat2, key: "skillFeat2" as const },
    { level: 3, kind: "General feat", value: GENERAL_FEATS_PF2.find((f) => f.id === c.generalFeat3)?.name === "Other (type it in)" ? c.generalFeatOther : (GENERAL_FEATS_PF2.find((f) => f.id === c.generalFeat3)?.name ?? ""), key: null },
    { level: 4, kind: "Sorcerer feat", value: c.classFeat4, key: "classFeat4" as const },
    { level: 4, kind: "Skill feat", value: c.skillFeat4, key: "skillFeat4" as const },
    { level: 5, kind: "Ancestry feat", value: c.ancestryFeat5, key: "ancestryFeat5" as const },
  ].filter((f) => f.level <= L);
  for (const f of featList) if (!f.value || f.value === "Choose…") warnings.push({ level: "info", tab: "feats", text: `Level ${f.level} ${f.kind.toLowerCase()}: not chosen yet.` });

  // ---------- strikes ----------
  const strikes: { name: string; attack: string; damage: string; traits: string }[] = [];
  const seen = new Set<string>();
  for (const it of c.inventory) {
    const w = weaponPF2(it.name);
    if (!w || seen.has(w.name)) continue;
    seen.add(w.name);
    const a = w.ranged ? mods.DEX : w.finesse ? Math.max(mods.STR, mods.DEX) : mods.STR;
    const dmgMod = w.ranged && !w.thrown ? 0 : mods.STR;
    strikes.push({ name: w.name, attack: `${signed(a + prof(1))} / ${signed(a + prof(1) - (w.traits.includes("agile") ? 4 : 5))}`, damage: `${w.damage}${dmgMod ? signed(dmgMod) : ""} ${w.type}`, traits: w.traits });
  }
  for (const r of rows) {
    if (r.rank !== 0 || !r.spell?.dmg || seen.has(r.name)) continue;
    seen.add(r.name);
    const d = r.spell.defense;
    strikes.push({ name: r.name, attack: d === "AC" ? signed(spellAttack) : `DC ${spellDc} ${d}`, damage: r.damage ?? "", traits: `cantrip, ${r.spell.range}` });
  }

  // ---------- bulk ----------
  const bulk = c.inventory.reduce((s, i) => s + i.qty * i.bulk, 0) + Math.floor((c.coins.cp + c.coins.sp + c.coins.gp + c.coins.pp) / 1000);
  const bulkText = (b: number) => {
    const whole = Math.floor(b + 1e-9);
    const light = Math.round((b - whole) * 10);
    return `${whole}${light ? `, ${light}L` : ""}`;
  };
  const encumbered = 5 + mods.STR;
  const maxBulk = 10 + mods.STR;
  if (bulk > maxBulk) warnings.push({ level: "warn", tab: "equipment", text: `Carrying ${bulkText(bulk)} Bulk, over your maximum of ${maxBulk}.` });
  else if (bulk > encumbered) warnings.push({ level: "info", tab: "equipment", text: `Carrying ${bulkText(bulk)} Bulk: encumbered (over ${encumbered}).` });

  // ---------- languages ----------
  const languageLimit = 2 + Math.max(0, mods.INT) + (ancestry.id === "human" ? 1 : 0);
  if (c.languages.length > languageLimit) warnings.push({ level: "info", tab: "ancestry", text: `${c.languages.length} languages chosen; usually you get Common, your ancestry's languages and one more per INT modifier.` });

  // ---------- features ----------
  const featureGroups = [
    {
      title: "Sorcerer Features",
      items: [
        ...SORCERER_PF2.features.filter((f) => f.level <= L).map((f) => ({ name: f.name, source: `Sorcerer ${f.level}`, text: f.text })),
        { name: `${bloodline.name} Bloodline${option ? ` (${option.name})` : ""}`, source: "Bloodline", text: `Tradition: ${tradition ?? "?"}. Trained in ${bloodlineSkills.map(skillNamePF2).join(" and ")}.` },
        { name: `Focus spell: ${bloodline.focus.name}`, source: `${bloodline.focus.actions} action(s)`, uses: "1 Focus Point", text: bloodline.focus.text },
        { name: "Blood Magic", source: "Bloodline", text: bloodline.bloodMagic },
      ],
    },
    {
      title: `${ancestry.name} & Heritage`,
      items: [
        { name: ancestry.name, source: ancestry.book === "PC" ? "Player Core" : "Player Core 2", text: `${ancestry.size}, Speed ${ancestry.speed} ft, ${ancestryHp} ancestry HP. ${vision}.${ancestry.trait ? ` ${ancestry.trait}` : ""}` },
        ...(heritage ? [{ name: heritage.name, source: versatile ? "Versatile heritage" : "Heritage", text: heritage.text }] : []),
      ],
    },
    {
      title: "Feats",
      items: featList.filter((f) => f.value && f.value !== "Choose…").map((f) => ({ name: f.value, source: `${f.kind} (${f.level})`, text: f.key === null && f.kind.startsWith("Background") ? (bg.featText ?? "From your background.") : f.kind === "General feat" ? (GENERAL_FEATS_PF2.find((g) => g.id === c.generalFeat3)?.text ?? "") : "See the feat's entry." })),
    },
  ];

  const identity = `${heritage && versatile ? `${ancestry.name} (${heritage.name.split(" (")[0]})` : (heritage?.name ?? ancestry.name)} · Sorcerer ${L} (${bloodline.name})`;

  return {
    level: L,
    ancestry,
    heritage,
    versatile: !!versatile,
    bg,
    bgBoost,
    bloodline,
    option,
    tradition,
    gifts,
    mods,
    partial,
    sources,
    saves,
    perception,
    perceptionRank,
    ac,
    spellAttack,
    spellDc,
    classDc,
    hpMax,
    ancestryHp,
    speed,
    vision,
    skills,
    lore,
    classSkillCount,
    bloodlineSkills,
    slots,
    maxRank,
    cantripRank,
    chosenLimit,
    repertoire: rows,
    featList,
    strikes,
    bulk,
    bulkText,
    encumbered,
    maxBulk,
    languageLimit,
    featureGroups,
    choices: { skillIncrease3: c.skillIncrease3, skillIncrease5: c.skillIncrease5, boosts5: c.boosts5.length, cantrips: c.cantrips.length, spellsByRank: [1, 2, 3].map((r) => c.spells.filter((n) => spellPF2(n)?.rank === r).length) },
    warnings,
    identity,
    rankName: (r: Rank) => RANK_NAMES[r],
  };
}

export type DerivedPF2 = ReturnType<typeof derivePF2>;
