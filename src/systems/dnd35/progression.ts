// Level-up / level-down for D&D 3.5.
import { signed } from "../dnd5e/data/core";
import type { Gain, Progression, Unlock } from "../types";
import type { Character35 } from "./character";
import type { Derived35 } from "./derive";
import { FAMILIAR_ABILITIES, SORCERER_35, spell35 } from "./data";

const s = (n: number) => (n === 1 ? "" : "s");
const lvlName = (l: number) => (l === 0 ? "0-level" : `level-${l}`);

export const progression35: Progression<Character35, Derived35> = {
  snapshot: (d) => [
    { label: "Hit Points", value: d.hpMax },
    { label: "Base Attack", value: signed(d.bab) },
    ...d.saves.map((sv) => ({ label: sv.name, value: signed(sv.total) })),
    { label: "Spells per day", value: d.perDay.join(" / ") },
    { label: "Spells known", value: d.known.join(" / ") },
    { label: "Skill points (total)", value: d.pointsAvailable },
  ],

  gainsAt(_c, d, level) {
    const T = SORCERER_35;
    const gains: Gain[] = [];
    if (T.bab[level] > T.bab[level - 1]) gains.push({ name: "Base attack bonus improves", text: `Your base attack bonus is now +${T.bab[level]}.`, tip: "This also improves your touch attacks for ray and touch spells, and your grapple." });
    const saves = (["fort", "ref", "will"] as const).filter((k) => T[k][level] > T[k][level - 1]).map((k) => ({ fort: "Fortitude", ref: "Reflex", will: "Will" })[k]);
    if (saves.length) gains.push({ name: "Better saving throws", text: `${saves.join(", ")} improve${saves.length === 1 ? "s" : ""} by 1.` });
    if (T.known[level].length > T.known[level - 1].length)
      gains.push({ name: `${lvlName(T.known[level].length - 1)} spells`, text: `You can now learn and cast ${lvlName(T.known[level].length - 1)} spells.`, tip: "Sorcerers get a new spell level one level later than wizards, but cast more spells per day." });
    if (T.perDay[level].join() !== T.perDay[level - 1].join()) gains.push({ name: "More spells per day", text: `Base spells per day: ${T.perDay[level].join(" / ")} (plus bonus spells for high Charisma).` });
    if (d.familiar.id) FAMILIAR_ABILITIES.filter((a) => a.level === level && level > 1).forEach((a) => gains.push({ name: `Familiar: level ${level}`, text: a.text }));
    return gains;
  },

  unlocksAt(c, _d, level) {
    const T = SORCERER_35;
    const out: Unlock<Derived35>[] = [];
    out.push({
      id: `${level}:skills`,
      level,
      title: "Spend new skill points",
      detail: "You get 2 + INT modifier skill points per level. Class skills (Bluff, Concentration, Spellcraft…) cost 1 point per rank; others cost 2.",
      tab: "skills",
      isDone: (dd) => dd.pointsSpent >= dd.pointsAvailable,
    });
    T.known[level].forEach((n, lvl) => {
      const more = n - (T.known[level - 1][lvl] ?? 0);
      if (more > 0)
        out.push({
          id: `${level}:known${lvl}`,
          level,
          title: `Learn ${more} new ${lvlName(lvl)} spell${s(more)}`,
          detail: "Sorcerers know few spells but can cast any of them with their daily spell slots. Pick spells you'll use often.",
          tab: "spells",
          isDone: (dd) => dd.spellRows.filter((r) => r.level === lvl && r.spell).length >= dd.known[lvl],
        });
    });
    if (level === 3) out.push({ id: `${level}:feat`, level, title: "Choose a feat", detail: "Every character gets a feat at 3rd level. Improved Initiative, Spell Focus and Toughness are popular for sorcerers.", tab: "feats", isDone: (dd) => !!dd.featSlots.find((f) => f.key === "feat3")?.pick.id });
    if (level === 4) out.push({ id: `${level}:ability`, level, title: "Raise an ability score by 1", detail: "Every 4 levels you add 1 to an ability. Charisma gives sorcerers more spells per day and higher save DCs.", tab: "abilities" });
    if (c.hpMethod === "rolled") out.push({ id: `${level}:hp`, level, title: "Roll your hit die", detail: "Roll a d4 for this level's hit points (your Constitution modifier is added for you).", tab: "class" });
    return out;
  },

  demote(c, level) {
    const T = SORCERER_35;
    const removed: string[] = [];
    const counts: number[] = [];
    const spellsKnown = c.spellsKnown.filter((n) => {
      const lvl = spell35(n)?.level ?? 0;
      const limit = T.known[level][lvl] ?? 0;
      counts[lvl] = (counts[lvl] ?? 0) + 1;
      if (counts[lvl] > limit) {
        removed.push(`${n} (${lvlName(lvl)} spell)`);
        return false;
      }
      return true;
    });
    return { c: { ...c, level, spellsKnown }, removed };
  },
};
