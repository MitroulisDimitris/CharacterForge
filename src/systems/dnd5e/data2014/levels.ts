// What each 2014 class gains at levels 2-5 (level 1 lives in classes.ts), plus the class-wide
// numbers that scale with level. Summaries in our own words.
import type { LevelFeature } from "../data/sorcerer";
import type { ClassDef } from "../data/classes";

const F = (cls: string, level: number, name: string, text: string, o: Partial<LevelFeature> = {}): LevelFeature => ({ level, name, source: `${cls} ${level}${o.book === "TCE" ? " (Tasha's optional)" : ""}`, text, ...o });
const T = (cls: string, level: number, name: string, text: string, o: Partial<LevelFeature> = {}) => F(cls, level, name, text, { book: "TCE", ...o });
const ASI = (cls: string) => F(cls, 4, "Ability Score Improvement", "+2 to one ability or +1 to two (max 20), or take a feat if your DM uses feats.");
const EXTRA = (cls: string) => F(cls, 5, "Extra Attack", "When you take the Attack action, you attack twice instead of once.");

export const PALADIN_STYLES = ["defense", "dueling", "greatWeapon", "protection", "blindFighting", "interception", "blessedWarrior"];
export const RANGER_STYLES = ["archery", "defense", "dueling", "twoWeapon", "blindFighting", "druidicWarrior", "thrownWeapon"];

/** Per-class additions: features at 2-5, level-1 feature text that scales, and class numbers. */
export const LEVELS: Record<string, { features: LevelFeature[]; dyn?: Record<string, (level: number) => string>; extra?: Partial<ClassDef> }> = {
  barbarian: {
    dyn: { Rage: (l) => `${l >= 3 ? 3 : 2} rages per Long Rest, +2 damage. ` },
    features: [
      F("Barbarian", 2, "Reckless Attack", "On your first attack of a turn you can attack recklessly: Advantage on STR melee attacks this turn, but attacks against you have Advantage until your next turn."),
      F("Barbarian", 2, "Danger Sense", "Advantage on DEX saves against effects you can see (traps, spells), unless Blinded, Deafened or Incapacitated."),
      F("Barbarian", 3, "Primal Path", "Choose your path of rage."),
      T("Barbarian", 3, "Primal Knowledge", "Gain proficiency in one more skill from the barbarian list (add it on the Skills tab)."),
      ASI("Barbarian"),
      EXTRA("Barbarian"),
      F("Barbarian", 5, "Fast Movement", "+10 ft speed while you aren't wearing heavy armor."),
    ],
    extra: { speedBonus: (l, armor) => (l >= 5 && armor !== "heavy" ? 10 : 0) },
  },
  bard: {
    dyn: { "Bardic Inspiration": (l) => `d${l >= 5 ? 8 : 6}${l >= 5 ? ", regained on a Short or Long Rest (Font of Inspiration)" : ""}. ` },
    features: [
      F("Bard", 2, "Jack of All Trades", "Add half your Proficiency Bonus (round down) to any ability check that doesn't already include it."),
      F("Bard", 2, "Song of Rest", "During a Short Rest, allies who spend Hit Dice to heal and hear you perform regain an extra 1d6 HP."),
      T("Bard", 2, "Magical Inspiration", "A creature with your Bardic Inspiration die can add it to one roll of a spell's damage or healing."),
      F("Bard", 3, "Bard College", "Choose your college."),
      F("Bard", 3, "Expertise", "Choose two of your skill proficiencies: your Proficiency Bonus is doubled for them."),
      ASI("Bard"),
      T("Bard", 4, "Bardic Versatility", "At each Ability Score Improvement, you can replace a skill of your Expertise or a bard cantrip."),
      F("Bard", 5, "Font of Inspiration", "You regain all Bardic Inspiration when you finish a Short or Long Rest, and the die becomes a d8."),
    ],
    extra: { expertise: { level: 3, count: 2, thieves: false } },
  },
  cleric: {
    features: [
      F("Cleric", 2, "Channel Divinity", "Once per Short or Long Rest, channel divine energy: Turn Undead (undead within 30 ft that fail a WIS save flee for 1 minute) or your domain's option.", { uses: "1 / Short Rest" }),
      T("Cleric", 2, "Harness Divine Power", "Bonus Action: spend a Channel Divinity to regain a spell slot of up to half your PB (round up).", { uses: "1 / Long Rest" }),
      ASI("Cleric"),
      T("Cleric", 4, "Cantrip Versatility", "At each Ability Score Improvement, you can swap a cleric cantrip."),
      F("Cleric", 5, "Destroy Undead", "When an undead of CR 1/2 or lower fails its save against your Turn Undead, it's destroyed."),
    ],
  },
  druid: {
    features: [
      F("Druid", 2, "Wild Shape", "Action: turn into a beast you've seen (max CR 1/4, no flying or swimming speed; at 4th level CR 1/2, no flying) for up to half your druid level in hours. You use its HP and physical stats and drop back to your form at 0 HP.", { uses: "2 / Short Rest", dyn: (l) => (l >= 4 ? "Max CR 1/2 (no flying). " : "Max CR 1/4 (no flying or swimming). ") }),
      F("Druid", 2, "Druid Circle", "Choose your circle."),
      T("Druid", 2, "Wild Companion", "Spend a Wild Shape use to cast Find Familiar without components; the familiar is a fey and lasts half your druid level in hours."),
      ASI("Druid"),
      T("Druid", 4, "Cantrip Versatility", "At each Ability Score Improvement, you can swap a druid cantrip."),
    ],
  },
  fighter: {
    features: [
      F("Fighter", 2, "Action Surge", "On your turn, take one additional action.", { uses: "1 / Short Rest" }),
      F("Fighter", 3, "Martial Archetype", "Choose your archetype."),
      ASI("Fighter"),
      T("Fighter", 4, "Martial Versatility", "At each Ability Score Improvement, you can swap your fighting style (or a Battle Master maneuver)."),
      EXTRA("Fighter"),
    ],
  },
  monk: {
    dyn: { "Martial Arts": (l) => `Martial arts die: ${l >= 5 ? "d6" : "d4"}. ` },
    features: [
      F("Monk", 2, "Ki", "Ki points equal to your monk level (save DC 8 + PB + WIS), regained on a Short Rest. Flurry of Blows (1 ki: two unarmed strikes as a Bonus Action), Patient Defense (1 ki: Dodge as a Bonus Action), Step of the Wind (1 ki: Disengage or Dash as a Bonus Action, jump twice as far).", { dyn: (l) => `${l} ki points. ` }),
      F("Monk", 2, "Unarmored Movement", "+10 ft speed while you wear no armor and carry no shield."),
      T("Monk", 2, "Dedicated Weapon", "After a Short or Long Rest, make one simple or martial weapon you're proficient with (not heavy or special) a monk weapon."),
      F("Monk", 3, "Monastic Tradition", "Choose your tradition."),
      F("Monk", 3, "Deflect Missiles", "Reaction when hit by a ranged weapon attack: reduce the damage by 1d10 + DEX + monk level; if it drops to 0 you can catch it and throw it back for 1 ki."),
      T("Monk", 3, "Ki-Fueled Attack", "If you spend ki during your Action, make one unarmed strike or monk weapon attack as a Bonus Action."),
      ASI("Monk"),
      F("Monk", 4, "Slow Fall", "Reaction: reduce falling damage by five times your monk level."),
      T("Monk", 4, "Quickened Healing", "Action: spend 2 ki to regain HP equal to a roll of your martial arts die + PB."),
      EXTRA("Monk"),
      F("Monk", 5, "Stunning Strike", "When you hit with a melee weapon attack, spend 1 ki: the target makes a CON save or is Stunned until the end of your next turn."),
      T("Monk", 5, "Focused Aim", "When you miss an attack, spend 1-3 ki to add +2 per ki to the roll."),
    ],
    extra: {
      speedBonus: (l, armor, shield) => (l >= 2 && armor === "none" && !shield ? 10 : 0),
      martialArts: (l) => (l >= 5 ? "1d6" : "1d4"),
    },
  },
  paladin: {
    dyn: { "Lay on Hands": (l) => `Pool: ${5 * l} HP. ` },
    features: [
      F("Paladin", 2, "Fighting Style", "Choose a fighting style (see below)."),
      F("Paladin", 2, "Spellcasting", "Charisma is your spellcasting ability; a holy symbol can be your focus. After a Long Rest you prepare CHA modifier + half your paladin level (min 1) spells from the paladin list."),
      F("Paladin", 2, "Divine Smite", "When you hit with a melee weapon attack, spend a spell slot to deal extra radiant damage: 2d8 for a 1st-level slot, +1d8 per slot level above (max 5d8), +1d8 against undead or fiends."),
      F("Paladin", 3, "Divine Health", "You're immune to disease."),
      F("Paladin", 3, "Sacred Oath", "Swear your oath. It gives oath spells (always prepared) and Channel Divinity options (1 per Short Rest)."),
      T("Paladin", 3, "Harness Divine Power", "Bonus Action: spend a Channel Divinity to regain a spell slot of up to half your PB (round up).", { uses: "1 / Long Rest" }),
      ASI("Paladin"),
      T("Paladin", 4, "Martial Versatility", "At each Ability Score Improvement, you can swap your fighting style."),
      EXTRA("Paladin"),
    ],
    extra: { fightingStyle: { level: 2, styles: PALADIN_STYLES } },
  },
  ranger: {
    features: [
      F("Ranger", 2, "Fighting Style", "Choose a fighting style (see below)."),
      F("Ranger", 2, "Spellcasting", "Wisdom is your spellcasting ability. You know a fixed set of ranger spells and can swap one when you gain a level."),
      T("Ranger", 2, "Spellcasting Focus", "You can use a druidic focus for ranger spells."),
      F("Ranger", 3, "Ranger Archetype", "Choose your archetype."),
      F("Ranger", 3, "Primal Awareness", "Spend a spell slot to sense, for 1 minute per slot level, whether your favored enemies are within 1 mile (6 in favored terrain)."),
      T("Ranger", 3, "Primal Awareness (Tasha's)", "You learn Speak with Animals (and Beast Sense at 5th level) as extra ranger spells, each castable once per Long Rest without a slot.", { replaces: "Primal Awareness" }),
      ASI("Ranger"),
      T("Ranger", 4, "Martial Versatility", "At each Ability Score Improvement, you can swap your fighting style."),
      EXTRA("Ranger"),
    ],
    extra: { fightingStyle: { level: 2, styles: RANGER_STYLES } },
  },
  rogue: {
    dyn: { "Sneak Attack": (l) => `${Math.ceil(l / 2)}d6 extra damage. ` },
    features: [
      F("Rogue", 2, "Cunning Action", "Bonus Action each turn: Dash, Disengage or Hide."),
      F("Rogue", 3, "Roguish Archetype", "Choose your archetype."),
      T("Rogue", 3, "Steady Aim", "Bonus Action, if you haven't moved this turn: Advantage on your next attack this turn, but your speed becomes 0 until the end of the turn."),
      ASI("Rogue"),
      F("Rogue", 5, "Uncanny Dodge", "Reaction when an attacker you can see hits you: halve the damage."),
    ],
  },
  warlock: {
    features: [
      F("Warlock", 2, "Eldritch Invocations", "Fragments of forbidden knowledge: pick invocations (two at 2nd level, three at 5th). You can swap one when you gain a level."),
      F("Warlock", 3, "Pact Boon", "Your patron grants a gift: Pact of the Chain (a special familiar), the Blade (a summoned pact weapon), the Tome (a book of shadows with three cantrips) or, with Tasha's, the Talisman."),
      ASI("Warlock"),
      T("Warlock", 4, "Eldritch Versatility", "At each Ability Score Improvement, you can swap a warlock cantrip, your Pact Boon option, or (from Tasha's) the Mystic Arcanum."),
    ],
    extra: { invocations: [0, 0, 2, 2, 2, 3], pactBoonLevel: 3 },
  },
  wizard: {
    features: [
      F("Wizard", 2, "Arcane Tradition", "Choose your school or tradition."),
      T("Wizard", 3, "Cantrip Formulas", "After a Long Rest, you can swap one wizard cantrip for another."),
      ASI("Wizard"),
    ],
  },
  artificer: {
    features: [
      F("Artificer", 2, "Infuse Item", "After a Long Rest, infuse nonmagical objects with infusions you know (four at 2nd level), turning them into magic items. Up to two infused items at a time."),
      F("Artificer", 3, "Artificer Specialist", "Choose your specialty."),
      F("Artificer", 3, "The Right Tool for the Job", "With thieves' or artisan's tools in hand, spend 1 hour (can be during a rest) to magically create one set of artisan's tools."),
      ASI("Artificer"),
    ],
    extra: { infusions: [0, 0, 4, 4, 4, 4] },
  },
  sorcerer: { features: [] },
};
