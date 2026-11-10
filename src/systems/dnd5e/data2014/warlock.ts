// Warlock Pact Boons and Eldritch Invocations available up to 5th level (2014: PHB, Xanathar's,
// Tasha's), and Artificer infusions up to 5th level. Summaries in our own words.

export interface Invocation {
  id: string;
  name: string;
  book: string;
  text: string;
  /** Warlock level needed. */
  level?: number;
  /** Needs the Eldritch Blast cantrip. */
  eldritchBlast?: boolean;
  /** Needs this Pact Boon. */
  pact?: string;
  /** Needs the Hex spell or a warlock feature that curses (Hexblade's Curse). */
  hex?: boolean;
}

export const PACT_BOONS = [
  { id: "chain", name: "Pact of the Chain", book: "PHB14", text: "Learn Find Familiar; your familiar can also be an imp, pseudodragon, quasit or sprite, and can attack with its Reaction when you forgo one of your attacks." },
  { id: "blade", name: "Pact of the Blade", book: "PHB14", text: "Action: summon a melee pact weapon of your choice (you're proficient with it), or bond a magic weapon. It counts as magical." },
  { id: "tome", name: "Pact of the Tome", book: "PHB14", text: "A Book of Shadows with three cantrips from any class's list; they count as warlock cantrips." },
  { id: "talisman", name: "Pact of the Talisman", book: "TCE", text: "An amulet: its wearer adds a d4 to failed ability checks (PB times per Long Rest)." },
];

const I = (id: string, name: string, book: string, text: string, o: Partial<Invocation> = {}): Invocation => ({ id, name, book, text, ...o });

export const INVOCATIONS: Invocation[] = [
  I("agonizingBlast", "Agonizing Blast", "PHB14", "Add your CHA modifier to Eldritch Blast damage.", { eldritchBlast: true }),
  I("armorOfShadows", "Armor of Shadows", "PHB14", "Cast Mage Armor on yourself at will, without a slot or components (AC 13 + DEX)."),
  I("beastSpeech", "Beast Speech", "PHB14", "Cast Speak with Animals at will, without a slot."),
  I("beguilingInfluence", "Beguiling Influence", "PHB14", "Proficiency in Deception and Persuasion."),
  I("bookOfAncientSecrets", "Book of Ancient Secrets", "PHB14", "Write two 1st-level rituals from any class in your Book of Shadows and cast them as rituals; copy more you find.", { pact: "tome" }),
  I("devilsSight", "Devil's Sight", "PHB14", "See normally in darkness, magical or not, to 120 ft."),
  I("eldritchSight", "Eldritch Sight", "PHB14", "Cast Detect Magic at will, without a slot."),
  I("eldritchSpear", "Eldritch Spear", "PHB14", "Eldritch Blast's range becomes 300 ft.", { eldritchBlast: true }),
  I("eyesOfTheRuneKeeper", "Eyes of the Rune Keeper", "PHB14", "You can read all writing."),
  I("fiendishVigor", "Fiendish Vigor", "PHB14", "Cast False Life on yourself at will as a 1st-level spell, without a slot."),
  I("gazeOfTwoMinds", "Gaze of Two Minds", "PHB14", "Touch a willing humanoid to perceive through its senses until your next turn (keep it up with your action)."),
  I("maskOfManyFaces", "Mask of Many Faces", "PHB14", "Cast Disguise Self at will, without a slot."),
  I("mistyVisions", "Misty Visions", "PHB14", "Cast Silent Image at will, without a slot."),
  I("repellingBlast", "Repelling Blast", "PHB14", "Each Eldritch Blast beam that hits pushes the target up to 10 ft away.", { eldritchBlast: true }),
  I("thiefOfFiveFates", "Thief of Five Fates", "PHB14", "Cast Bane once using a warlock spell slot (once per Long Rest)."),
  I("voiceOfTheChainMaster", "Voice of the Chain Master", "PHB14", "Talk through your familiar and perceive through its senses at any distance on the same plane.", { pact: "chain" }),
  I("mireTheMind", "Mire the Mind", "PHB14", "Cast Slow once using a warlock spell slot (once per Long Rest).", { level: 5 }),
  I("oneWithShadows", "One with Shadows", "PHB14", "In dim light or darkness, become invisible as an action until you move or act.", { level: 5 }),
  I("signOfIllOmen", "Sign of Ill Omen", "PHB14", "Cast Bestow Curse once using a warlock spell slot (once per Long Rest).", { level: 5 }),
  I("thirstingBlade", "Thirsting Blade", "PHB14", "Attack twice with your pact weapon when you take the Attack action.", { level: 5, pact: "blade" }),
  I("aspectOfTheMoon", "Aspect of the Moon", "XGE", "You don't need sleep and can't be put to sleep by magic; rest with light activity.", { pact: "tome" }),
  I("eldritchSmite", "Eldritch Smite", "XGE", "When you hit with your pact weapon, spend a warlock slot for +1d8 force (plus 1d8 per slot level) and knock it Prone if Huge or smaller.", { level: 5, pact: "blade" }),
  I("giftOfTheDepths", "Gift of the Depths", "XGE", "Breathe underwater, swim speed equal to walking speed, and cast Water Breathing once per Long Rest.", { level: 5 }),
  I("graspOfHadar", "Grasp of Hadar", "XGE", "Once per turn, pull a creature hit by Eldritch Blast up to 10 ft closer.", { eldritchBlast: true }),
  I("improvedPactWeapon", "Improved Pact Weapon", "XGE", "Your pact weapon can be a bow or crossbow, is your focus, and gets +1 to hit and damage if not already magic.", { pact: "blade" }),
  I("lanceOfLethargy", "Lance of Lethargy", "XGE", "Once per turn, an Eldritch Blast hit reduces the target's speed by 10 ft.", { eldritchBlast: true }),
  I("cloakOfFlies", "Cloak of Flies", "XGE", "Bonus Action: a 5-ft aura of buzzing flies until incapacitated or dismissed. Advantage on Intimidation, Disadvantage on other CHA checks, and creatures starting their turn in it take poison damage equal to your CHA modifier (min 0).", { level: 5 }),
  I("giftOfTheEverLivingOnes", "Gift of the Ever-Living Ones", "XGE", "While your familiar is within 100 ft, dice you roll to regain HP count as their maximum.", { pact: "chain" }),
  I("maddeningHex", "Maddening Hex", "XGE", "Bonus Action: the creature you cursed (Hex or a warlock curse) and creatures you choose within 5 ft of it take psychic damage equal to your CHA modifier (min 1).", { level: 5, hex: true }),
  I("tombOfLevistus", "Tomb of Levistus", "XGE", "Reaction when you take damage: encase yourself in ice for 10 temporary HP per warlock level, but you're incapacitated, speed 0 and vulnerable to fire until the end of your next turn (once per Short Rest).", { level: 5 }),
  I("farScribe", "Far Scribe", "TCE", "Creatures can write their names in your Book of Shadows (up to PB names); cast Sending on one of them without a slot or components, delivering the message on paper.", { level: 5, pact: "tome" }),
  I("undyingServitude", "Undying Servitude", "TCE", "Cast Animate Dead without a spell slot (once per Long Rest).", { level: 5 }),
  I("eldritchMind", "Eldritch Mind", "TCE", "Advantage on CON saves to keep concentration."),
  I("investmentOfTheChainMaster", "Investment of the Chain Master", "TCE", "Your familiar gets flying or swimming speed, magical attacks, uses your save DC, and can attack as a Bonus Action command.", { pact: "chain" }),
  I("rebukeOfTheTalisman", "Rebuke of the Talisman", "TCE", "Reaction when the talisman's wearer is hit: the attacker takes PB psychic damage and is pushed 10 ft.", { pact: "talisman" }),
];

export interface Infusion {
  id: string;
  name: string;
  text: string;
}

export const INFUSIONS: Infusion[] = [
  { id: "magicalStrength", name: "Armor of Magical Strength", text: "Armor with 6 charges (regains 1d6 at dawn): spend one to add your INT modifier to a STR check or save, or as a Reaction to avoid being knocked prone." },
  { id: "arcaneFocus", name: "Enhanced Arcane Focus", text: "A rod, staff or wand: +1 to spell attack rolls and ignores half cover." },
  { id: "defense", name: "Enhanced Defense", text: "Armor or a shield: +1 AC." },
  { id: "weapon", name: "Enhanced Weapon", text: "A simple or martial weapon: +1 to attack and damage rolls." },
  { id: "homunculus", name: "Homunculus Servant", text: "A gem becomes a tiny homunculus companion that can deliver your touch spells." },
  { id: "mindSharpener", name: "Mind Sharpener", text: "Armor or robes: Reaction to turn a failed concentration save into a success (4 charges)." },
  { id: "repeatingShot", name: "Repeating Shot", text: "An ammunition weapon: +1 to hit and damage, ignores loading, and makes its own ammunition." },
  { id: "replicate", name: "Replicate Magic Item", text: "Make a common magic item such as an alchemy jug, bag of holding, cap of water breathing, goggles of night, rope of climbing, sending stones, wand of magic detection or wand of secrets." },
  { id: "returningWeapon", name: "Returning Weapon", text: "A thrown weapon: +1 to hit and damage, and it flies back to your hand." },
];
