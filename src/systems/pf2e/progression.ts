// Level-up / level-down for Pathfinder 2e.
import type { Gain, Progression, Unlock } from "../types";
import type { CharacterPF2 } from "./character";
import type { DerivedPF2 } from "./derive";
import { SORCERER_PF2, spellPF2 } from "./data";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const s = (n: number) => (n === 1 ? "" : "s");

const TIPS: Record<string, string> = {
  "Signature Spells": "A signature spell can be cast at any rank you have slots for, so pick spells that get better when heightened (like Force Barrage or Fireball).",
  "Magical Fortitude": "Expert in Fortitude: you shrug off poisons, diseases and body-wrecking spells more often.",
};

const featDone = (kind: string, level: number) => (d: DerivedPF2) => !!d.featList.find((f) => f.level === level && f.kind === kind)?.value;

export const progressionPF2: Progression<CharacterPF2, DerivedPF2> = {
  snapshot: (d) => [
    { label: "Hit Points", value: d.hpMax },
    { label: "Armor Class", value: d.ac },
    { label: "Perception", value: signed(d.perception) },
    ...d.saves.map((sv) => ({ label: sv.name, value: signed(sv.total) })),
    { label: "Spell DC", value: d.spellDc },
    { label: "Spell Slots", value: d.slots.slice(1).join(" / ") || "—" },
    { label: "Cantrip rank", value: d.cantripRank },
  ],

  gainsAt(_c, d, level) {
    const gains: Gain[] = [
      {
        name: "Everything you're trained in improves",
        text: "Your level is added to every trained proficiency, so AC, saves, Perception, skills and spell DC all rise by 1.",
        tip: "That's why Pathfinder numbers climb every level even without new choices.",
      },
    ];
    SORCERER_PF2.features.filter((f) => f.level === level).forEach((f) => gains.push({ name: f.name, text: f.text, tip: TIPS[f.name] }));
    const prev = SORCERER_PF2.slots[level - 1];
    const now = SORCERER_PF2.slots[level];
    if (now.length > prev.length) {
      const rank = now.length - 1;
      const gift = d.gifts[rank as 1 | 2 | 3];
      gains.push({ name: `Rank ${rank} spells`, text: `You get ${now[rank]} rank-${rank} slots.${gift ? ` Your bloodline adds ${gift} to your repertoire.` : ""}`, tip: "Lower-rank spells can often be cast from higher slots for a stronger effect (heightening)." });
    } else if (now.join() !== prev.join()) gains.push({ name: "More spell slots", text: `Your slots go from ${prev.slice(1).join(" / ")} to ${now.slice(1).join(" / ")}.` });
    if (Math.ceil(level / 2) > Math.ceil((level - 1) / 2)) gains.push({ name: `Cantrips heighten to rank ${Math.ceil(level / 2)}`, text: "Damage cantrips add more dice automatically.", tip: "Cantrips are always cast at half your level, rounded up." });
    return gains;
  },

  unlocksAt(_c, _d, level) {
    const out: Unlock<DerivedPF2>[] = [];
    if (level === 2 || level === 4) {
      out.push({ id: `${level}:classFeat`, level, title: "Choose a Sorcerer feat", detail: "Class feats add new tricks to your spellcasting or bloodline. Type the feat's name (see Archives of Nethys).", tab: "feats", isDone: featDone("Sorcerer feat", level) });
      out.push({ id: `${level}:skillFeat`, level, title: "Choose a skill feat", detail: "Skill feats make a skill you're trained in more useful, like lying faster or recalling knowledge better.", tab: "feats", isDone: featDone("Skill feat", level) });
    }
    if (level === 3)
      out.push({ id: `${level}:generalFeat`, level, title: "Choose a general feat", detail: "General feats are for anyone: Toughness (more HP), Fleet (+5 ft Speed), Incredible Initiative and more.", tab: "feats", isDone: featDone("General feat", level) });
    if (level === 3 || level === 5)
      out.push({
        id: `${level}:skillIncrease`,
        level,
        title: "Skill increase",
        detail: "Make one trained skill expert. Expert adds +2 more and unlocks better skill feats.",
        tab: "skills",
        isDone: (dd) => !!(level === 3 ? dd.choices.skillIncrease3 : dd.choices.skillIncrease5),
      });
    if (level === 5) {
      out.push({ id: `${level}:boosts`, level, title: "Four attribute boosts", detail: "Raise four different attributes by 1. At +4 or higher a boost is partial: two partial boosts make +1.", tab: "abilities", isDone: (dd) => dd.choices.boosts5 >= 4 });
      out.push({ id: `${level}:ancestryFeat`, level, title: "Choose an ancestry feat", detail: "Another feat from your ancestry (or your versatile heritage).", tab: "feats", isDone: featDone("Ancestry feat", 5) });
    }
    const prev = SORCERER_PF2.slots[level - 1].map((n) => n - 1);
    const now = SORCERER_PF2.slots[level].map((n) => n - 1);
    for (let r = 1; r < now.length; r++) {
      const n = now[r] - (prev[r] ?? 0);
      if (n > 0)
        out.push({
          id: `${level}:rank${r}`,
          level,
          title: `Add ${n} rank-${r} spell${s(n)} to your repertoire`,
          detail: "Your repertoire is the set of spells you know. You can cast any of them with a slot of their rank.",
          tab: "spells",
          isDone: (dd) => dd.choices.spellsByRank[r - 1] >= dd.chosenLimit[r],
        });
    }
    if (level === 3) out.push({ id: `${level}:signature`, level, title: "Pick signature spells", detail: TIPS["Signature Spells"], tab: "spells", optional: true });
    return out;
  },

  demote(c, level) {
    const removed: string[] = [];
    const limits = SORCERER_PF2.slots[level].map((n) => n - 1);
    const maxRank = limits.length - 1;
    const kept: string[] = [];
    const perRank = [0, 0, 0, 0];
    for (const n of c.spells) {
      const r = spellPF2(n)?.rank ?? 1;
      if (r > maxRank) removed.push(`${n} (rank ${r})`);
      else if (perRank[r] >= limits[r]) removed.push(`${n} (rank ${r}, over the repertoire limit)`);
      else {
        perRank[r]++;
        kept.push(n);
      }
    }
    const cantrips = c.cantrips.slice(0, limits[0]);
    c.cantrips.slice(limits[0]).forEach((n) => removed.push(`${n} (cantrip over the limit)`));
    const signature = level >= 3 ? c.signature.filter((n) => kept.includes(n) || !c.spells.includes(n)) : [];
    return { c: { ...c, level, spells: kept, cantrips, signature }, removed };
  },
};
