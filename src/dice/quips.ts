// Little lines under a roll's result (approved by the user 2026-11-19). Natural 1s and 20s and
// monster recharges always get one; the rare ones show on 12% of the other rolls, when they fit.
import type { DieSpec, RollResult, RollSpec } from "./roll";
import { faceValue, usesD20 } from "./roll";

const ATTACK_20 = [
  "The dice gods have chosen you.",
  "That one's going in the songs.",
  "Somewhere, a bard just felt a disturbance.",
  "Clean, brutal, beautiful.",
  "Roll the damage. Then roll it again.",
  "The enemy is reconsidering their life choices.",
  "Textbook. Frame it.",
  "Right where it hurts.",
  "Even the DM winced.",
  "Fate picked a side, and it's yours.",
];
const CHECK_20 = ["Flawless.", "Like you'd done it a hundred times.", "Not even close. In a good way.", "The universe nods approvingly.", "Smooth as a halfling's apology.", "Tell the DM to describe it. Slowly."];
const ATTACK_1 = [
  "The weapon had other plans.",
  "Somewhere, your trainer sighs.",
  "A swing and a miss. A big miss.",
  "The enemy is embarrassed for you.",
  "That was a warning shot. Clearly.",
  "Your weapon would like a word.",
  "Nobody saw that. Probably.",
  "The air has been thoroughly defeated.",
  "Bold strategy.",
];
const CHECK_1 = ["It's fine. Everything is fine.", "Well… that happened.", "The dice remember what you did.", "Let's never speak of this again.", "Character development!", "A learning experience, they'll call it.", "Your ancestors are looking away."];
const MONSTER_20 = ["The monster grins. That's never good.", "Somebody's having a bad day, and it isn't the monster."];
const MONSTER_1 = ["The monster trips over its own ambition.", "Even monsters have off days."];
const RECHARGED = "It's warming up again…";
const NOT_RECHARGED = "Still catching its breath.";

/** How often a rare quip shows when one fits. */
export const RARE_CHANCE = 0.12;

const pick = (list: string[], rnd: () => number) => list[Math.floor(rnd() * list.length)];

/** The rare quips that fit this roll, most specific first. */
export function rareQuips(spec: RollSpec, dice: DieSpec[], faces: number[], res: RollResult): string[] {
  const out: string[] = [];
  const vals = faces.map((f, i) => faceValue(dice[i], f));
  if (usesD20(spec.kind)) {
    const d20 = vals.filter((_, i) => dice[i].sides === 20 && dice[i].role === "");
    if (d20.length === 2) {
      if (d20[0] === d20[1]) out.push("Same number twice. The dice are copying each other.");
      if (spec.adv === "dis" && d20.includes(20)) out.push("A 20, thrown away. Painful.");
      if (spec.adv === "adv" && d20.includes(1) && Math.max(...d20) > 1) out.push("Advantage just saved your dignity.");
    }
    const kept = spec.adv === "dis" ? Math.min(...d20) : Math.max(...d20);
    if (kept === 10) out.push("Not bad, not great.");
    else if (kept === 2) out.push("So close to a disaster.");
    else if (kept === 19 && !res.gold) out.push("So close to legend.");
    else if (kept >= 11 && kept <= 14) out.push("Perfectly average. The most adventurer thing there is.");
    else if (kept >= 3 && kept <= 5) out.push("Could've been worse. Not much worse.");
    else if (kept >= 15 && kept <= 18) out.push("Now we're talking.");
  }
  if ((spec.kind === "damage" || spec.kind === "heal") && dice.length >= 2) {
    if (faces.every((f, i) => f === dice[i].sides)) out.push("Maximum damage. Every die gave its all.");
    if (faces.every((f) => f === 1)) out.push("All ones. The dice are on strike.");
  }
  if (spec.kind === "free") {
    if (dice.length >= 2 && dice.every((d) => d.role === "") && faces.every((f) => f === faces[0])) out.push("A matching set!");
    if (spec.groups.length === 1 && spec.groups[0].sides === 100 && spec.groups[0].n === 1) {
      if (res.total === 100) out.push("One hundred. Make a wish. Not that kind.");
      else if (res.total <= 5) out.push("Very, very unlucky.");
    }
  }
  if (res.total === 13) out.push("Thirteen. Spooky.");
  if (res.total === 7) out.push("Lucky seven.");
  return out;
}

/** The quip for this roll, or "" for none. */
export function quipFor(spec: RollSpec, dice: DieSpec[], faces: number[], res: RollResult, rnd: () => number = Math.random): string {
  const monster = spec.tone === "monster";
  if (spec.kind === "recharge") return monster ? (res.gold ? RECHARGED : NOT_RECHARGED) : "";
  if (usesD20(spec.kind)) {
    const crit = spec.kind === "attack" && res.gold;
    const nat20 = res.gold || crit;
    const nat1 = /^Natural 1/.test(res.note);
    if (nat20) return pick(monster ? MONSTER_20 : spec.kind === "attack" ? ATTACK_20 : CHECK_20, rnd);
    if (nat1) return pick(monster ? MONSTER_1 : spec.kind === "attack" ? ATTACK_1 : CHECK_1, rnd);
  }
  if (rnd() >= RARE_CHANCE) return "";
  return rareQuips(spec, dice, faces, res)[0] ?? "";
}
