// Spells available to this build (2024 rules), levels 0-3.
// Descriptions are short summaries written for this app, not rulebook text.
import type { Ability } from "./core";

export type School =
  | "Abjuration"
  | "Conjuration"
  | "Divination"
  | "Enchantment"
  | "Evocation"
  | "Illusion"
  | "Necromancy"
  | "Transmutation";

export interface Spell {
  name: string;
  level: number;
  school: School;
  /** 1A = action, 1BA = bonus action, 1R = reaction, else a duration like "1m" */
  time: string;
  range: string;
  components: string;
  material?: string;
  /** Material with a gold cost: a focus can't replace it. */
  costly?: { gp: number; item: string; consumed?: boolean };
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  save?: Ability;
  attack?: "melee" | "ranged";
  /** Damage/healing at the spell's base level (cantrips: at character level 1). */
  damage?: string;
  /** Cantrip dice double at character level 5. */
  scales?: boolean;
  sorcerer: boolean;
  /** Book the spell comes from. */
  book: string;
  /** If set, the spell is only on the sorcerer list when this book is allowed (e.g. Tasha's expanded list). */
  listBook?: string;
  /** 2014: class lists the spell is on ("wizard", or "bard@TCE" when only with that book). The sorcerer list uses `sorcerer`/`listBook`. */
  lists?: string[];
  desc: string;
}

const S = (s: Omit<Spell, "sorcerer" | "book"> & Partial<Pick<Spell, "sorcerer" | "book">>): Spell => ({
  sorcerer: true,
  book: "PHB24",
  ...s,
});
const X = (s: Omit<Spell, "sorcerer" | "book">): Spell => ({ ...s, sorcerer: false, book: "PHB24" });

export const SPELLS: Spell[] = [
  // ---------------- Cantrips ----------------
  S({ name: "Acid Splash", level: 0, school: "Evocation", time: "1A", range: "60 ft. (5-ft. sphere)", components: "V,S", duration: "Instantaneous", save: "DEX", damage: "1d6 Acid", scales: true, desc: "Burst of acid hits every creature in a 5-ft sphere that fails a DEX save." }),
  S({ name: "Blade Ward", level: 0, school: "Abjuration", time: "1A", range: "Self", components: "V,S", duration: "1 minute", concentration: true, desc: "Attackers subtract 1d4 from attack rolls against you while it lasts." }),
  S({ name: "Chill Touch", level: 0, school: "Necromancy", time: "1A", range: "Touch", components: "V,S", duration: "Instantaneous", attack: "melee", damage: "1d10 Necrotic", scales: true, desc: "Melee spell attack; on a hit the target can't regain HP until the end of your next turn." }),
  S({ name: "Dancing Lights", level: 0, school: "Illusion", time: "1A", range: "120 ft.", components: "V,S,M", material: "a bit of phosphorus", duration: "1 minute", concentration: true, desc: "Up to four floating torch-like lights you can move as a Bonus Action." }),
  S({ name: "Elementalism", level: 0, school: "Transmutation", time: "1A", range: "30 ft.", components: "V,S", duration: "Instantaneous", desc: "Small elemental tricks: a gust of air, a puff of flame, a mist, sculpted earth or water." }),
  S({ name: "Fire Bolt", level: 0, school: "Evocation", time: "1A", range: "120 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "1d10 Fire", scales: true, desc: "Ranged spell attack; ignites flammable objects that aren't worn or carried." }),
  S({ name: "Friends", level: 0, school: "Enchantment", time: "1A", range: "10 ft.", components: "S,M", material: "some makeup", duration: "1 minute", concentration: true, save: "WIS", desc: "A non-hostile creature that fails a WIS save is charmed by you; it knows afterward." }),
  S({ name: "Light", level: 0, school: "Evocation", time: "1A", range: "Touch", components: "V,M", material: "a firefly or phosphorescent moss", duration: "1 hour", desc: "An object you touch sheds bright light in a 20-ft radius." }),
  S({ name: "Mage Hand", level: 0, school: "Conjuration", time: "1A", range: "30 ft.", components: "V,S", duration: "1 minute", desc: "A spectral hand that can carry up to 10 lb and handle simple objects." }),
  S({ name: "Mending", level: 0, school: "Transmutation", time: "1m", range: "Touch", components: "V,S,M", material: "two lodestones", duration: "Instantaneous", desc: "Repairs a single break or tear in an object." }),
  S({ name: "Message", level: 0, school: "Transmutation", time: "1A", range: "120 ft.", components: "S,M", material: "a copper wire", duration: "1 round", desc: "Whisper a message to a creature, which can whisper back." }),
  S({ name: "Minor Illusion", level: 0, school: "Illusion", time: "1A", range: "30 ft.", components: "S,M", material: "a bit of fleece", duration: "1 minute", desc: "Create a sound or a 5-ft image; an Investigation check sees through it." }),
  S({ name: "Poison Spray", level: 0, school: "Necromancy", time: "1A", range: "30 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "1d12 Poison", scales: true, desc: "Ranged spell attack that sprays toxic mist." }),
  S({ name: "Prestidigitation", level: 0, school: "Transmutation", time: "1A", range: "10 ft.", components: "V,S", duration: "Up to 1 hour", desc: "Minor magical tricks: clean, chill, flavor, light a candle, make a mark." }),
  S({ name: "Ray of Frost", level: 0, school: "Evocation", time: "1A", range: "60 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "1d8 Cold", scales: true, desc: "Ranged spell attack; on a hit the target's Speed drops by 10 ft until your next turn." }),
  S({ name: "Shocking Grasp", level: 0, school: "Evocation", time: "1A", range: "Touch", components: "V,S", duration: "Instantaneous", attack: "melee", damage: "1d8 Lightning", scales: true, desc: "Melee spell attack; on a hit the target can't make Opportunity Attacks until its next turn." }),
  S({ name: "Sorcerous Burst", level: 0, school: "Evocation", time: "1A", range: "120 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "1d8 (chosen type)", scales: true, desc: "Pick acid, cold, fire, lightning, necrotic, poison, psychic or thunder. Each 8 rolled adds another d8, up to your CHA modifier extra dice." }),
  S({ name: "Thunderclap", level: 0, school: "Evocation", time: "1A", range: "Self (5-ft. emanation)", components: "S", duration: "Instantaneous", save: "CON", damage: "1d6 Thunder", scales: true, desc: "Every other creature within 5 ft makes a CON save or takes thunder damage." }),
  S({ name: "True Strike", level: 0, school: "Divination", time: "1A", range: "Self", components: "S,M", material: "a weapon you're proficient with worth 1+ CP", duration: "Instantaneous", desc: "Make a weapon attack using your spellcasting ability; can deal Radiant damage. +1d6 Radiant at level 5." }),
  X({ name: "Druidcraft", level: 0, school: "Transmutation", time: "1A", range: "30 ft.", components: "V,S", duration: "Instantaneous", desc: "Small nature effects: predict weather, bloom a flower, light or snuff a small flame." }),
  X({ name: "Thaumaturgy", level: 0, school: "Transmutation", time: "1A", range: "30 ft.", components: "V", duration: "Up to 1 minute", desc: "Minor wonders: booming voice, flickering flames, tremors, eerie eyes." }),
  X({ name: "Mind Sliver", level: 0, school: "Enchantment", time: "1A", range: "60 ft.", components: "V", duration: "1 round", save: "INT", damage: "1d6 Psychic", scales: true, desc: "On a failed INT save the target also subtracts 1d4 from its next saving throw." }),

  // ---------------- 1st level ----------------
  S({ name: "Burning Hands", level: 1, school: "Evocation", time: "1A", range: "Self (15-ft. cone)", components: "V,S", duration: "Instantaneous", save: "DEX", damage: "3d6 Fire", desc: "Cone of flame; half damage on a successful DEX save. +1d6 per slot level above 1." }),
  S({ name: "Charm Person", level: 1, school: "Enchantment", time: "1A", range: "30 ft.", components: "V,S", duration: "1 hour", save: "WIS", desc: "A humanoid that fails a WIS save is charmed by you. +1 target per slot level above 1." }),
  S({ name: "Chromatic Orb", level: 1, school: "Evocation", time: "1A", range: "90 ft.", components: "V,S,M", material: "a diamond worth 50+ GP", costly: { gp: 50, item: "Diamond (50+ GP)" }, duration: "Instantaneous", attack: "ranged", damage: "3d8 (chosen type)", desc: "Orb of acid, cold, fire, lightning, poison or thunder. If two damage dice match, it leaps to another target." }),
  S({ name: "Color Spray", level: 1, school: "Illusion", time: "1A", range: "Self (15-ft. cone)", components: "V,S,M", material: "a pinch of colorful sand", duration: "Instantaneous", save: "CON", desc: "Creatures in the cone that fail a CON save are Blinded until the end of your next turn." }),
  S({ name: "Comprehend Languages", level: 1, school: "Divination", time: "1A", range: "Self", components: "V,S,M", material: "a pinch of soot and salt", duration: "1 hour", ritual: true, desc: "Understand any spoken or signed language, and written text you touch." }),
  S({ name: "Detect Magic", level: 1, school: "Divination", time: "1A", range: "Self", components: "V,S", duration: "10 minutes", concentration: true, ritual: true, desc: "Sense magic within 30 ft and see its aura and school." }),
  S({ name: "Disguise Self", level: 1, school: "Illusion", time: "1A", range: "Self", components: "V,S", duration: "1 hour", desc: "Change how you look, including clothing and gear. Investigation can see through it." }),
  S({ name: "Expeditious Retreat", level: 1, school: "Transmutation", time: "1BA", range: "Self", components: "V,S", duration: "10 minutes", concentration: true, desc: "Take the Dash action now and as a Bonus Action on each later turn." }),
  S({ name: "False Life", level: 1, school: "Necromancy", time: "1A", range: "Self", components: "V,S,M", material: "a drop of alcohol", duration: "Instantaneous", damage: "2d4+4 Temp HP", desc: "Gain Temporary Hit Points. +5 per slot level above 1." }),
  S({ name: "Feather Fall", level: 1, school: "Transmutation", time: "1R", range: "60 ft.", components: "V,M", material: "a small feather or piece of down", duration: "1 minute", desc: "Up to five falling creatures drop slowly and take no falling damage." }),
  S({ name: "Fog Cloud", level: 1, school: "Conjuration", time: "1A", range: "120 ft.", components: "V,S", duration: "1 hour", concentration: true, desc: "A 20-ft-radius sphere of heavy fog that heavily obscures the area." }),
  S({ name: "Grease", level: 1, school: "Conjuration", time: "1A", range: "60 ft.", components: "V,S,M", material: "a bit of pork rind or butter", duration: "1 minute", save: "DEX", desc: "10-ft square of slick grease; creatures there must save or fall Prone." }),
  S({ name: "Ice Knife", level: 1, school: "Conjuration", time: "1A", range: "60 ft.", components: "S,M", material: "a drop of water or piece of ice", duration: "Instantaneous", attack: "ranged", damage: "1d10 Piercing + 2d6 Cold", desc: "Ranged attack for piercing damage, then it explodes: creatures within 5 ft make a DEX save vs cold." }),
  S({ name: "Jump", level: 1, school: "Transmutation", time: "1BA", range: "Touch", components: "V,S,M", material: "a grasshopper's hind leg", duration: "1 minute", desc: "Once per turn the target can jump up to 30 ft by spending 10 ft of movement." }),
  S({ name: "Mage Armor", level: 1, school: "Abjuration", time: "1A", range: "Touch", components: "V,S,M", material: "a piece of cured leather", duration: "8 hours", desc: "A willing creature not wearing armor gets base AC 13 + its DEX modifier." }),
  S({ name: "Magic Missile", level: 1, school: "Evocation", time: "1A", range: "120 ft.", components: "V,S", duration: "Instantaneous", damage: "3 x (1d4+1) Force", desc: "Three darts that always hit. +1 dart per slot level above 1." }),
  S({ name: "Ray of Sickness", level: 1, school: "Necromancy", time: "1A", range: "60 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "2d8 Poison", desc: "On a hit the target is also Poisoned until the end of your next turn." }),
  S({ name: "Shield", level: 1, school: "Abjuration", time: "1R", range: "Self", components: "V,S", duration: "1 round", desc: "+5 AC until the start of your next turn, including against the triggering attack; Magic Missile can't hurt you." }),
  S({ name: "Silent Image", level: 1, school: "Illusion", time: "1A", range: "60 ft.", components: "V,S,M", material: "a bit of fleece", duration: "10 minutes", concentration: true, desc: "A visual illusion up to a 15-ft cube that you can move." }),
  S({ name: "Sleep", level: 1, school: "Enchantment", time: "1A", range: "60 ft.", components: "V,S,M", material: "a pinch of sand or rose petals", duration: "1 minute", concentration: true, save: "WIS", desc: "Creatures in a 5-ft sphere save or are Incapacitated; a second failed save puts them Unconscious." }),
  S({ name: "Thunderwave", level: 1, school: "Evocation", time: "1A", range: "Self (15-ft. cube)", components: "V,S", duration: "Instantaneous", save: "CON", damage: "2d8 Thunder", desc: "Failed CON save: full damage and pushed 10 ft. Success: half damage, no push." }),
  S({ name: "Witch Bolt", level: 1, school: "Evocation", time: "1A", range: "60 ft.", components: "V,S,M", material: "a twig from a lightning-struck tree", duration: "1 minute", concentration: true, attack: "ranged", damage: "2d12 Lightning", desc: "On a hit, deal 1d12 lightning again as a Bonus Action on later turns while in range." }),
  X({ name: "Command", level: 1, school: "Enchantment", time: "1A", range: "60 ft.", components: "V", duration: "Instantaneous", save: "WIS", desc: "One-word command (Approach, Drop, Flee, Grovel, Halt) the target obeys on its next turn if it fails." }),
  X({ name: "Faerie Fire", level: 1, school: "Evocation", time: "1A", range: "60 ft.", components: "V", duration: "1 minute", concentration: true, save: "DEX", desc: "Outlines creatures in a 20-ft cube; attacks against them have Advantage and they can't be Invisible." }),
  X({ name: "Longstrider", level: 1, school: "Transmutation", time: "1A", range: "Touch", components: "V,S,M", material: "a pinch of dirt", duration: "1 hour", desc: "The target's Speed increases by 10 ft." }),
  X({ name: "Speak with Animals", level: 1, school: "Divination", time: "1A", range: "Self", components: "V,S", duration: "10 minutes", ritual: true, desc: "Understand and talk with Beasts." }),
  X({ name: "Hellish Rebuke", level: 1, school: "Evocation", time: "1R", range: "60 ft.", components: "V,S", duration: "Instantaneous", save: "DEX", damage: "2d10 Fire", desc: "Reaction when damaged: the attacker is wreathed in flames." }),
  X({ name: "Arms of Hadar", level: 1, school: "Conjuration", time: "1A", range: "Self (10-ft. emanation)", components: "V,S", duration: "Instantaneous", save: "STR", damage: "2d6 Necrotic", desc: "Dark tendrils hit nearby creatures; on a fail they also can't take Reactions." }),
  X({ name: "Dissonant Whispers", level: 1, school: "Enchantment", time: "1A", range: "60 ft.", components: "V", duration: "Instantaneous", save: "WIS", damage: "3d6 Psychic", desc: "On a failed save the target must use its Reaction to move away from you." }),
  X({ name: "Alarm", level: 1, school: "Abjuration", time: "1m", range: "30 ft.", components: "V,S,M", material: "a bell and silver wire", duration: "8 hours", ritual: true, desc: "Mental or audible alert when a creature enters a warded area." }),
  X({ name: "Protection from Evil and Good", level: 1, school: "Abjuration", time: "1A", range: "Touch", components: "V,S,M", material: "a flask of holy water worth 25+ GP, consumed", costly: { gp: 25, item: "Holy water (25+ GP)", consumed: true }, duration: "10 minutes", concentration: true, desc: "Protects against aberrations, celestials, elementals, fey, fiends and undead." }),

  // ---------------- 2nd level ----------------
  S({ name: "Alter Self", level: 2, school: "Transmutation", time: "1A", range: "Self", components: "V,S", duration: "1 hour", concentration: true, desc: "Gain aquatic adaptation, change appearance, or grow natural weapons." }),
  S({ name: "Arcane Vigor", level: 2, school: "Abjuration", time: "1BA", range: "Self", components: "V,S", duration: "Instantaneous", desc: "Spend up to two Hit Point Dice and heal their total plus your spellcasting modifier." }),
  S({ name: "Blindness/Deafness", level: 2, school: "Transmutation", time: "1A", range: "120 ft.", components: "V", duration: "1 minute", save: "CON", desc: "Target is Blinded or Deafened; it repeats the save at the end of each turn." }),
  S({ name: "Blur", level: 2, school: "Illusion", time: "1A", range: "Self", components: "V", duration: "1 minute", concentration: true, desc: "Attacks against you have Disadvantage." }),
  S({ name: "Cloud of Daggers", level: 2, school: "Conjuration", time: "1A", range: "60 ft.", components: "V,S,M", material: "a sliver of glass", duration: "1 minute", concentration: true, damage: "4d4 Slashing", desc: "Spinning daggers fill a 5-ft cube and damage creatures that enter or start there." }),
  S({ name: "Crown of Madness", level: 2, school: "Enchantment", time: "1A", range: "120 ft.", components: "V,S", duration: "1 minute", concentration: true, save: "WIS", desc: "Charmed humanoid attacks a creature you choose." }),
  S({ name: "Darkness", level: 2, school: "Evocation", time: "1A", range: "60 ft.", components: "V,M", material: "bat fur and a piece of coal", duration: "10 minutes", concentration: true, desc: "Magical darkness fills a 15-ft-radius sphere; Darkvision can't see through it." }),
  S({ name: "Detect Thoughts", level: 2, school: "Divination", time: "1A", range: "Self", components: "V,S,M", material: "1 Copper Piece", duration: "1 minute", concentration: true, save: "WIS", desc: "Sense minds nearby and read surface thoughts; probe deeper with a WIS save." }),
  S({ name: "Dragon's Breath", level: 2, school: "Transmutation", time: "1BA", range: "Touch", components: "V,S,M", material: "a hot pepper", duration: "1 minute", concentration: true, save: "DEX", damage: "3d6 (chosen type)", desc: "A creature can exhale a 15-ft cone of acid, cold, fire, lightning or poison as a Magic action." }),
  S({ name: "Enhance Ability", level: 2, school: "Transmutation", time: "1A", range: "Touch", components: "V,S,M", material: "fur or a feather", duration: "1 hour", concentration: true, desc: "Advantage on checks with one ability of your choice." }),
  S({ name: "Enlarge/Reduce", level: 2, school: "Transmutation", time: "1A", range: "30 ft.", components: "V,S,M", material: "a pinch of powdered iron", duration: "1 minute", concentration: true, save: "CON", desc: "Grow or shrink a creature or object one size, changing its damage." }),
  S({ name: "Flame Blade", level: 2, school: "Evocation", time: "1BA", range: "Self", components: "V,S,M", material: "a sumac leaf", duration: "10 minutes", concentration: true, attack: "melee", damage: "3d6 Fire", desc: "A fiery blade you attack with as a Magic action." }),
  S({ name: "Flaming Sphere", level: 2, school: "Conjuration", time: "1A", range: "60 ft.", components: "V,S,M", material: "a ball of wax", duration: "1 minute", concentration: true, save: "DEX", damage: "2d6 Fire", desc: "A 5-ft ball of fire you can roll around as a Bonus Action." }),
  S({ name: "Hold Person", level: 2, school: "Enchantment", time: "1A", range: "60 ft.", components: "V,S,M", material: "a straight piece of iron", duration: "1 minute", concentration: true, save: "WIS", desc: "A humanoid that fails is Paralyzed; it repeats the save at the end of each turn." }),
  S({ name: "Invisibility", level: 2, school: "Illusion", time: "1A", range: "Touch", components: "V,S,M", material: "an eyelash in gum arabic", duration: "1 hour", concentration: true, desc: "Target is Invisible until it attacks, deals damage or casts a spell." }),
  S({ name: "Knock", level: 2, school: "Transmutation", time: "1A", range: "60 ft.", components: "V", duration: "Instantaneous", desc: "Unlocks a lock, bar or magical seal with a loud knock." }),
  S({ name: "Levitate", level: 2, school: "Transmutation", time: "1A", range: "60 ft.", components: "V,S,M", material: "a metal spring", duration: "10 minutes", concentration: true, save: "CON", desc: "Raise a creature or object up to 20 ft into the air." }),
  S({ name: "Magic Weapon", level: 2, school: "Transmutation", time: "1BA", range: "Touch", components: "V,S", duration: "1 hour", desc: "A nonmagical weapon becomes +1 to attack and damage." }),
  S({ name: "Mind Spike", level: 2, school: "Divination", time: "1A", range: "120 ft.", components: "S", duration: "1 hour", concentration: true, save: "WIS", damage: "3d8 Psychic", desc: "Psychic damage, and you always know where the target is while it lasts." }),
  S({ name: "Mirror Image", level: 2, school: "Illusion", time: "1A", range: "Self", components: "V,S", duration: "1 minute", desc: "Three illusory duplicates that can soak up attacks aimed at you." }),
  S({ name: "Misty Step", level: 2, school: "Conjuration", time: "1BA", range: "Self", components: "V", duration: "Instantaneous", desc: "Teleport up to 30 ft to a space you can see." }),
  S({ name: "Phantasmal Force", level: 2, school: "Illusion", time: "1A", range: "60 ft.", components: "V,S,M", material: "a bit of fleece", duration: "1 minute", concentration: true, save: "INT", damage: "2d8 Psychic", desc: "An illusion only the target perceives; it can deal psychic damage." }),
  S({ name: "Scorching Ray", level: 2, school: "Evocation", time: "1A", range: "120 ft.", components: "V,S", duration: "Instantaneous", attack: "ranged", damage: "3 x 2d6 Fire", desc: "Three rays, each its own attack roll. +1 ray per slot level above 2." }),
  S({ name: "See Invisibility", level: 2, school: "Divination", time: "1A", range: "Self", components: "V,S,M", material: "a pinch of talc and powdered silver", duration: "1 hour", desc: "See Invisible creatures and objects and into the Ethereal Plane." }),
  S({ name: "Shatter", level: 2, school: "Evocation", time: "1A", range: "60 ft.", components: "V,S,M", material: "a chip of mica", duration: "Instantaneous", save: "CON", damage: "3d8 Thunder", desc: "A ringing blast in a 10-ft sphere; objects are damaged too." }),
  S({ name: "Spider Climb", level: 2, school: "Transmutation", time: "1A", range: "Touch", components: "V,S,M", material: "a drop of bitumen and a spider", duration: "1 hour", concentration: true, desc: "Climb walls and ceilings hands-free with a Climb Speed equal to Speed." }),
  S({ name: "Suggestion", level: 2, school: "Enchantment", time: "1A", range: "30 ft.", components: "V,M", material: "a drop of honey", duration: "8 hours", concentration: true, save: "WIS", desc: "Suggest a reasonable-sounding course of action that the target follows." }),
  S({ name: "Web", level: 2, school: "Conjuration", time: "1A", range: "60 ft.", components: "V,S,M", material: "a bit of spiderweb", duration: "1 hour", concentration: true, save: "DEX", desc: "Sticky webs fill a 20-ft cube and can Restrain creatures." }),
  X({ name: "Pass without Trace", level: 2, school: "Abjuration", time: "1A", range: "Self", components: "V,S,M", material: "ashes from burned mistletoe", duration: "1 hour", concentration: true, desc: "You and allies within 30 ft get +10 to Stealth and can't be tracked by nonmagical means." }),
  X({ name: "Ray of Enfeeblement", level: 2, school: "Necromancy", time: "1A", range: "60 ft.", components: "V,S", duration: "1 minute", concentration: true, save: "CON", desc: "Target has Disadvantage on STR tests and its damage is reduced." }),
  X({ name: "Calm Emotions", level: 2, school: "Enchantment", time: "1A", range: "60 ft.", components: "V,S", duration: "1 minute", concentration: true, save: "CHA", desc: "Suppress charm and fear effects, or make hostile creatures indifferent." }),
  X({ name: "Aid", level: 2, school: "Abjuration", time: "1A", range: "30 ft.", components: "V,S,M", material: "a strip of white cloth", duration: "8 hours", desc: "Up to three creatures gain +5 current and maximum HP." }),
  X({ name: "Lesser Restoration", level: 2, school: "Abjuration", time: "1BA", range: "Touch", components: "V,S", duration: "Instantaneous", desc: "End the Blinded, Deafened, Paralyzed or Poisoned condition." }),

  // ---------------- 3rd level ----------------
  S({ name: "Blink", level: 3, school: "Transmutation", time: "1A", range: "Self", components: "V,S", duration: "1 minute", desc: "At the end of each turn, roll: on 11+ you vanish to the Ethereal Plane until your next turn." }),
  S({ name: "Clairvoyance", level: 3, school: "Divination", time: "10m", range: "1 mile", components: "V,S,M", material: "a focus worth 100+ GP (jeweled horn or glass eye)", costly: { gp: 100, item: "Jeweled horn or glass eye (100+ GP)" }, duration: "10 minutes", concentration: true, desc: "Create an invisible sensor you can see or hear through." }),
  S({ name: "Counterspell", level: 3, school: "Abjuration", time: "1R", range: "60 ft.", components: "S", duration: "Instantaneous", save: "CON", desc: "Interrupt a creature casting a spell; on a failed CON save the spell fails." }),
  S({ name: "Daylight", level: 3, school: "Evocation", time: "1A", range: "60 ft.", components: "V,S", duration: "1 hour", desc: "Bright light in a 60-ft-radius sphere that dispels magical darkness of 3rd level or lower." }),
  S({ name: "Dispel Magic", level: 3, school: "Abjuration", time: "1A", range: "120 ft.", components: "V,S", duration: "Instantaneous", desc: "End spells of 3rd level or lower on a target; higher ones need an ability check." }),
  S({ name: "Fear", level: 3, school: "Illusion", time: "1A", range: "Self (30-ft. cone)", components: "V,S,M", material: "a white feather", duration: "1 minute", concentration: true, save: "WIS", desc: "Creatures that fail drop what they hold, become Frightened and flee." }),
  S({ name: "Fireball", level: 3, school: "Evocation", time: "1A", range: "150 ft.", components: "V,S,M", material: "a ball of bat guano and sulfur", duration: "Instantaneous", save: "DEX", damage: "8d6 Fire", desc: "A 20-ft-radius explosion; half damage on a successful save." }),
  S({ name: "Fly", level: 3, school: "Transmutation", time: "1A", range: "Touch", components: "V,S,M", material: "a feather", duration: "10 minutes", concentration: true, desc: "Target gains a Fly Speed of 60 ft." }),
  S({ name: "Gaseous Form", level: 3, school: "Transmutation", time: "1A", range: "Touch", components: "V,S,M", material: "a bit of gauze", duration: "1 hour", concentration: true, desc: "Target turns into a misty cloud that can slip through small openings." }),
  S({ name: "Haste", level: 3, school: "Transmutation", time: "1A", range: "30 ft.", components: "V,S,M", material: "a shaving of licorice root", duration: "1 minute", concentration: true, desc: "Double Speed, +2 AC, Advantage on DEX saves and an extra limited action. Lethargy when it ends." }),
  S({ name: "Hypnotic Pattern", level: 3, school: "Illusion", time: "1A", range: "120 ft.", components: "S,M", material: "a pinch of confetti", duration: "1 minute", concentration: true, save: "WIS", desc: "Creatures in a 30-ft cube that fail are Charmed and Incapacitated." }),
  S({ name: "Lightning Bolt", level: 3, school: "Evocation", time: "1A", range: "Self (100-ft. line)", components: "V,S,M", material: "a bit of fur and a crystal rod", duration: "Instantaneous", save: "DEX", damage: "8d6 Lightning", desc: "A 100-ft line of lightning; half damage on a successful save." }),
  S({ name: "Major Image", level: 3, school: "Illusion", time: "1A", range: "120 ft.", components: "V,S,M", material: "a bit of fleece", duration: "10 minutes", concentration: true, desc: "A convincing illusion with sound, smell and temperature, up to a 20-ft cube." }),
  S({ name: "Protection from Energy", level: 3, school: "Abjuration", time: "1A", range: "Touch", components: "V,S", duration: "1 hour", concentration: true, desc: "Resistance to acid, cold, fire, lightning or thunder." }),
  S({ name: "Sleet Storm", level: 3, school: "Conjuration", time: "1A", range: "150 ft.", components: "V,S,M", material: "a miniature umbrella", duration: "1 minute", concentration: true, save: "DEX", desc: "Freezing sleet in a 40-ft cylinder: difficult terrain, obscured, breaks concentration." }),
  S({ name: "Slow", level: 3, school: "Transmutation", time: "1A", range: "120 ft.", components: "V,S,M", material: "a drop of molasses", duration: "1 minute", concentration: true, save: "WIS", desc: "Up to six creatures lose speed, AC and actions on a failed save." }),
  S({ name: "Stinking Cloud", level: 3, school: "Conjuration", time: "1A", range: "90 ft.", components: "V,S,M", material: "a rotten egg", duration: "1 minute", concentration: true, save: "CON", desc: "A 20-ft sphere of gas; creatures that fail are Poisoned and lose their action." }),
  S({ name: "Tongues", level: 3, school: "Divination", time: "1A", range: "Touch", components: "V,M", material: "a miniature ziggurat", duration: "1 hour", desc: "The target understands and is understood in any spoken language." }),
  S({ name: "Vampiric Touch", level: 3, school: "Necromancy", time: "1A", range: "Self", components: "V,S", duration: "1 minute", concentration: true, attack: "melee", damage: "3d6 Necrotic", desc: "Melee spell attack that heals you for half the damage; repeat as a Magic action." }),
  S({ name: "Water Breathing", level: 3, school: "Transmutation", time: "1A", range: "30 ft.", components: "V,S,M", material: "a short reed", duration: "24 hours", ritual: true, desc: "Up to ten creatures can breathe underwater." }),
  S({ name: "Melf's Minute Meteors", level: 3, school: "Evocation", time: "1A", range: "Self", components: "V,S,M", material: "niter, sulfur and pine tar formed into a bead", duration: "10 minutes", concentration: true, save: "DEX", damage: "2d6 Fire per meteor", book: "XGE", desc: "Six tiny meteors orbit you; fling one or two per turn as a Bonus Action." }),
  X({ name: "Hunger of Hadar", level: 3, school: "Conjuration", time: "1A", range: "150 ft.", components: "V,S,M", material: "a pickled tentacle", duration: "1 minute", concentration: true, damage: "2d6 Cold / 2d6 Acid", desc: "A 20-ft sphere of freezing darkness; acid damage to those who stay inside." }),
  X({ name: "Sending", level: 3, school: "Divination", time: "1A", range: "Unlimited", components: "V,S,M", material: "a copper wire", duration: "Instantaneous", desc: "Send a 25-word message to a creature you know, which can reply." }),
];

export const spellByName = new Map(SPELLS.map((s) => [s.name, s]));
export const getSpell = (name: string) => spellByName.get(name);

export const SORCERER_SPELLS = SPELLS.filter((s) => s.sorcerer);

export const levelLabel = (l: number) => (l === 0 ? "Cantrip" : ["1st", "2nd", "3rd"][l - 1] + " level");

/** Damage shown for a cantrip at a given character level. */
export function cantripDamage(spell: Spell, charLevel: number): string | undefined {
  if (!spell.damage) return undefined;
  if (!spell.scales || charLevel < 5) return spell.damage;
  return spell.damage.replace(/^1d(\d+)/, "2d$1");
}

export const castingTimeLabel = (t: string) =>
  ({ "1A": "Action", "1BA": "Bonus Action", "1R": "Reaction", "1m": "1 minute", "10m": "10 minutes" })[t] ?? t;
