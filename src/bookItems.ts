// Magic items from the Dungeon Master's Guide (those not in the SRD), Xanathar's Guide to Everything (common magic items, p. 136–140) and Tasha's
// Cauldron of Everything (chapter 3, p. 119–135), in our own words (never the book's text).
// Written 2026-11-19 from the user's copies in reference/books/. Items with +1/+2/+3 versions get
// one entry per version, so rarity filters and "Add to a character" name them right.
import type { Item, ItemKind, Rarity } from "./items";

type Src = "XGE" | "TCE" | "DMG";
const BOOK_LINE: Record<Src, string> = { XGE: "Xanathar's", TCE: "Tasha's", DMG: "Dungeon Master's Guide" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function item(source: Src, name: string, kind: ItemKind, sub: string, rarity: Rarity, desc: string, o: { attune?: string; charges?: number; weight?: number } = {}): Item {
  const stats: [string, string][] = [];
  if (o.charges) stats.push(["Charges", String(o.charges)]);
  if (o.weight) stats.push(["Weight", `${o.weight} lb`]);
  return {
    id: `${source.toLowerCase()}-${slug(name)}`,
    name,
    kind,
    sub,
    rarity,
    attune: o.attune,
    weight: o.weight,
    stats,
    desc,
    source,
    line: [sub, cap(rarity), o.attune ? "attunement" : "", BOOK_LINE[source]].filter(Boolean).join(" · "),
    words: `${name} ${desc} ${sub}`.toLowerCase(),
  };
}
const A = "Requires attunement";
const by = (who: string) => `Requires attunement by ${who}`;
/** "+1 uncommon, +2 rare, +3 very rare" versions. */
const scaled = (source: Src, name: string, kind: ItemKind, sub: string, attune: string, desc: (n: number) => string) =>
  ([1, 2, 3] as const).map((n) => item(source, `${name}, +${n}`, kind, sub, n === 1 ? "uncommon" : n === 2 ? "rare" : "very rare", desc(n), { attune }));

const W = "Wondrous item";
const X = (name: string, desc: string, o: { kind?: ItemKind; sub?: string; attune?: string; charges?: number } = {}) => item("XGE", name, o.kind ?? "wondrous", o.sub ?? W, "common", desc, o);

const XGE: Item[] = [
  X("Armor of Gleaming", "This armour never gets dirty.", { kind: "armour", sub: "Armor (any medium or heavy)" }),
  X("Bead of Nourishment", "A soft, tasteless bead that melts on your tongue and feeds you as well as a full day of rations."),
  X("Bead of Refreshment", "Drop this bead into up to a pint of liquid and it becomes fresh, cold drinking water. It does nothing to magical liquids or poison."),
  X("Boots of False Tracks", "Only humanoids can wear them. While you do, you can make your footprints look like those of another kind of humanoid of your size."),
  X("Candle of the Deep", "Its flame keeps burning under water, giving light and warmth like any candle."),
  X("Cast-Off Armor", "You can take this armour off as a single action.", { kind: "armour", sub: "Armor (light, medium or heavy)" }),
  X("Charlatan's Die", "Whenever you roll this six-sided die, you choose the number it lands on.", { attune: A }),
  X("Cloak of Billowing", "As a bonus action, make the cloak billow dramatically around you."),
  X("Cloak of Many Fashions", "As a bonus action, change the cloak's style, colour and apparent quality. It's still a cloak, weighs the same, and copying a magic cloak's look doesn't copy its magic."),
  X("Clockwork Amulet", "Ticks faintly when held to an ear. Once per day (until the next dawn), when you make an attack roll you can skip rolling and treat the d20 as a 10."),
  X("Clothes of Mending", "A set of traveller's clothes that repairs everyday wear and tear by itself. Pieces that get destroyed don't come back."),
  X("Dark Shard Amulet", "A spellcasting focus for your warlock spells. Once per long rest you can try to cast a warlock cantrip you don't know: make a DC 10 Intelligence (Arcana) check; on a failure the cantrip and the action are wasted.", { attune: by("a warlock") }),
  X("Dread Helm", "A frightening steel helm that makes your eyes glow red while you wear it."),
  X("Ear Horn of Hearing", "Held to your ear, it lets you hear normally even while deafened."),
  X("Enduring Spellbook", "Fire and water can't harm this spellbook or what's written in it, and it never wears out with age."),
  X("Ersatz Eye", "A magic eye that replaces one you lost. You see through it like a normal eye, and only you can take it out.", { attune: A }),
  X("Hat of Vermin", "Spend 1 charge (an action, with a command word) to pull a bat, frog or rat out of the hat. It runs off, isn't under your control, and vanishes after an hour or when it drops to 0 hit points. All charges come back at dawn.", { charges: 3 }),
  X("Hat of Wizardry", "A spellcasting focus for your wizard spells. Once per long rest you can try to cast a wizard cantrip you don't know: make a DC 10 Intelligence (Arcana) check; on a failure the cantrip and the action are wasted.", { attune: by("a wizard") }),
  X("Heward's Handy Spice Pouch", "Spend 1 charge (an action) and name any ordinary seasoning to pull out a pinch of it, enough for one meal. It gets back 1d6 + 4 charges each dawn.", { charges: 10 }),
  X("Horn of Silent Alarm", "Blow it (an action, 1 charge) and one creature you choose within 600 feet hears it, unless deafened. Nobody else hears a thing. It gets back 1d4 charges each dawn.", { charges: 4 }),
  X("Instrument of Illusions", "While you play it, harmless illusions (glowing notes, a ghostly dancer, butterflies, falling snow) fill a 5-foot sphere around it, or 15 feet if you're a bard. They have no substance or sound and end when you stop.", { attune: A }),
  X("Instrument of Scribing", "While playing it, spend 1 charge (an action) to write a magic message of up to six words on a nonmagical surface within 30 feet; bards can write seven more words and make it glow. It fades after 24 hours or to dispel magic. Charges come back at dawn.", { attune: A, charges: 3 }),
  X("Lock of Trickery", "Looks like an ordinary lock with one key, but its tumblers shift to stop burglars: checks to pick it have disadvantage."),
  X("Moon-Touched Sword", "In darkness, the drawn blade sheds moonlight: bright light for 15 feet and dim light for 15 more.", { kind: "weapon", sub: "Weapon (any sword)" }),
  X("Mystery Key", "Has a 5% chance to open any lock it's tried in. Once it opens something, it vanishes."),
  X("Orb of Direction", "As an action, learn which way is north (on the Material Plane only)."),
  X("Orb of Time", "As an action, learn whether it's morning, afternoon, evening or night outside (on the Material Plane only)."),
  X("Perfume of Bewitching", "One use: for 1 hour after you put it on (an action), you have advantage on Charisma checks against humanoids of challenge rating 1 or lower. They don't notice the magic."),
  X("Pipe of Smoke Monsters", "As an action, puff out smoke shaped like any creature small enough to fit in a 1-foot cube. It holds its shape for a few seconds."),
  X("Pole of Angling", "Say the command word and this 10-foot pole becomes a fishing pole with hook, line and reel, and back again."),
  X("Pole of Collapsing", "As an action, shrink this 10-foot pole into a 1-foot rod for carrying, or extend it again (only as far as there's room). Its weight stays the same."),
  X("Pot of Awakening", "Plant an ordinary shrub in this 10-pound clay pot and after 30 days it becomes a friendly awakened shrub, breaking the pot. Without your commands it does nothing."),
  X("Rope of Mending", "Cut this 50-foot hempen rope into pieces, then as an action speak its command word to join touching pieces back together. Lost pieces are gone for good.", { sub: "Wondrous item" }),
  X("Ruby of the War Mage", "Press it onto a simple or martial weapon for 10 minutes and the weapon becomes a spellcasting focus for your spells. It stays on until you take it off (an action), the weapon is destroyed, or your attunement ends.", { attune: by("a spellcaster") }),
  X("Shield of Expression", "The front is shaped like a face. As a bonus action, change its expression.", { kind: "armour", sub: "Armor (shield)" }),
  X("Smoldering Armor", "Harmless, odourless wisps of smoke rise from this armour while it's worn.", { kind: "armour", sub: "Armor (any)" }),
  X("Staff of Adornment", "Up to three objects of 1 pound or less float an inch above the staff's tip while you hold it, and you can make them slowly spin.", { kind: "staff", sub: "Staff" }),
  X("Staff of Birdcalls", "Spend 1 charge (an action) to make a bird call heard up to 60 feet away: a finch, raven, duck, chicken, goose, loon, turkey, seagull, owl or eagle. It gets back 1d6 + 4 charges each dawn; after the last charge, roll a d20: on a 1 it bursts into feathers.", { kind: "staff", sub: "Staff", charges: 10 }),
  X("Staff of Flowers", "Spend 1 charge (an action) to make a harmless flower grow from soil within 5 feet or from the staff. It gets back 1d6 + 4 charges each dawn; after the last charge, roll a d20: on a 1 it turns into petals.", { kind: "staff", sub: "Staff", charges: 10 }),
  X("Talking Doll", "During a short rest within 5 feet of it, teach the doll up to six phrases of six words or fewer, each with something that makes it speak (like being picked up). It forgets them if your attunement ends.", { attune: A }),
  X("Tankard of Sobriety", "Ordinary alcoholic drinks from this tankard don't make you drunk. It has no effect on magical drinks or poison."),
  X("Unbreakable Arrow", "This arrow can't be broken, except inside an antimagic field.", { kind: "weapon", sub: "Weapon (arrow)" }),
  X("Veteran's Cane", "Grip it and speak its command word (a bonus action) and it turns into an ordinary longsword, losing its magic."),
  X("Walloping Ammunition", "A creature hit by it must make a DC 10 Strength saving throw or be knocked prone.", { kind: "weapon", sub: "Weapon (any ammunition)" }),
  X("Wand of Conducting", "Spend 1 charge (an action) and wave it to fill 60 feet with orchestral music while you keep waving. Charges come back at dawn; after the last one, roll a d20: on a 1 it crumbles with a sad tuba note.", { kind: "wand", sub: "Wand", charges: 3 }),
  X("Wand of Pyrotechnics", "Spend 1 charge (an action) for a harmless, crackling burst of coloured light at a point up to 60 feet away. It gets back 1d6 + 1 charges each dawn; after the last charge, roll a d20: on a 1 it goes off in fireworks and is destroyed.", { kind: "wand", sub: "Wand", charges: 7 }),
  X("Wand of Scowls", "Spend 1 charge (an action) on a humanoid within 30 feet: it must succeed on a DC 10 Charisma saving throw or scowl for 1 minute. Charges come back at dawn; after the last one, roll a d20: on a 1 it becomes a wand of smiles.", { kind: "wand", sub: "Wand", charges: 3 }),
  X("Wand of Smiles", "Spend 1 charge (an action) on a humanoid within 30 feet: it must succeed on a DC 10 Charisma saving throw or smile for 1 minute. Charges come back at dawn; after the last one, roll a d20: on a 1 it becomes a wand of scowls.", { kind: "wand", sub: "Wand", charges: 3 }),
];

const T = (name: string, rarity: Rarity, desc: string, o: { kind?: ItemKind; sub?: string; attune?: string; charges?: number } = {}) => item("TCE", name, o.kind ?? "wondrous", o.sub ?? W, rarity, desc, o);
const TATTOO = "Wondrous item (tattoo)";
const tattooNote = " To attune, hold the needle to your skin; it becomes the tattoo, and the needle comes back if your attunement ends.";
const SPELLBOOK = (school: string, spells: string, power: string) =>
  `Works as a spellbook (it holds ${spells}) and as a spellcasting focus for your wizard spells. It has 3 charges and gets back 1d3 each dawn. Spend 1 minute and 1 charge to swap one prepared wizard spell for a ${school} spell from the book. ${power}`;

const TCE: Item[] = [
  T("Absorbing Tattoo", "very rare", `You resist one damage type, set by the tattoo's colour. Once per day, as a reaction when you take that type of damage, you take none of it and instead regain hit points equal to half of it.${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Alchemical Compendium", "rare", SPELLBOOK("transmutation", "enlarge/reduce, feather fall, flesh to stone, gaseous form, magic weapon and polymorph", "As an action, spend charges to turn a nonmagical object into another object worth no more gold: 1 charge for up to 1 foot on a side, +2 feet per extra charge."), { attune: by("a wizard"), charges: 3 }),
  ...scaled("TCE", "All-Purpose Tool", "wondrous", W, by("an artificer"), (n) => `A screwdriver that turns (an action) into any artisan's tool, which you're proficient with. +${n} to the spell attack rolls and save DCs of your artificer spells. Once per day, pick a cantrip from any list: for 8 hours you can cast it as an artificer cantrip.`),
  ...scaled("TCE", "Amulet of the Devout", "wondrous", W, by("a cleric or paladin"), (n) => `A holy symbol: +${n} to your spell attack rolls and spell save DC. Once per day you can use Channel Divinity without spending a use.`),
  ...scaled("TCE", "Arcane Grimoire", "wondrous", W, by("a wizard"), (n) => `A spellcasting focus and spellbook: +${n} to the spell attack rolls and save DCs of your wizard spells. Arcane Recovery gets back 1 more level of spell slots.`),
  T("Astral Shard", "rare", "Attach it to a tiny object (an action); it's a spellcasting focus for your sorcerer spells. Right after you use Metamagic on a spell, you can teleport up to 30 feet to a space you can see.", { attune: by("a sorcerer") }),
  T("Astromancy Archive", "rare", SPELLBOOK("divination", "augury, divination, find the path, foresight, locate creature and locate object", "As a reaction when a creature within 30 feet makes an attack, check or save, spend 1 charge: it rolls 1d4 and you add or subtract it."), { attune: by("a wizard"), charges: 3 }),
  T("Atlas of Endless Horizons", "rare", SPELLBOOK("conjuration", "arcane gate, dimension door, gate, misty step, plane shift, teleportation circle and word of recall", "As a reaction when an attack hits you, spend 1 charge to teleport up to 10 feet; if that puts you out of the attack's reach, it misses."), { attune: by("a wizard"), charges: 3 }),
  T("Baba Yaga's Mortar and Pestle", "artifact", "The hag Baba Yaga's flying mortar and its pestle, one artifact. The pestle can grow into a +3 quarterstaff with 12 charges: spend up to 3 on a hit for an extra 1d8 force damage each. The mortar can conjure cheap materials, grind things for 4d10 force damage a turn, and carry you anywhere within 1,000 miles in an hour.", { attune: A, charges: 12 }),
  T("Barrier Tattoo (uncommon)", "uncommon", `With no armour on, your AC is 12 + your Dexterity modifier (a shield still adds).${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Barrier Tattoo (rare)", "rare", `With no armour on, your AC is 15 + your Dexterity modifier (at most +2; a shield still adds).${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Barrier Tattoo (very rare)", "very rare", `With no armour on, your AC is 18 (a shield still adds).${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Bell Branch", "rare", "A spellcasting focus for your spells. 3 charges, 1d3 back each dawn: 1 charge (a bonus action) to sense aberrations, celestials, constructs, elementals, fey, fiends or undead within 60 feet; 1 charge (an action) to cast protection from evil and good.", { attune: by("a druid or warlock"), charges: 3 }),
  T("Blood Fury Tattoo", "legendary", `10 charges, all back at dawn. When you hit with a weapon attack, spend 1 to deal an extra 4d6 necrotic damage and heal that much. When a creature you can see damages you, spend 1 and your reaction to attack it with advantage.${tattooNote}`, { sub: TATTOO, attune: A, charges: 10 }),
  ...scaled("TCE", "Bloodwell Vial", "wondrous", W, by("a sorcerer"), (n) => `Holds a few drops of your blood. A spellcasting focus: +${n} to the spell attack rolls and save DCs of your sorcerer spells. Once per day, when you roll Hit Dice to heal, you also get back 5 sorcery points.`),
  T("Cauldron of Rebirth", "very rare", "A spellcasting focus for your druid spells. After each long rest it makes a potion of greater healing that lasts 24 hours. It can grow big enough for a Medium creature, and a humanoid corpse covered in 200 lb of salt for 8 hours returns to life at dawn, as raise dead (once every 7 days).", { attune: by("a druid or warlock") }),
  T("Coiling Grasp Tattoo", "uncommon", `As an action, inky tendrils reach a creature within 15 feet: it must succeed on a DC 14 Strength saving throw or take 3d6 force damage and be grappled by you (escape DC 14).${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Crook of Rao", "artifact", "An ancient holy crook against fiends, now cursed. 6 charges (1d6 back each dawn) to cast aura of life, aura of purity, banishment, beacon of hope or mass cure wounds (save DC 18). It can banish nearly every fiend within a mile, but each use risks opening a portal.", { attune: A, charges: 6 }),
  T("Crystalline Chronicle", "very rare", "A crystal sphere that works as a spellbook (detect thoughts, intellect fortress, Rary's telepathic bond, sending, telekinesis, Tasha's mind whip, Tenser's floating disk) and a focus for your wizard spells; you know mage hand, mind sliver and message while holding it. 3 charges (1d3 back): swap a prepared spell, or cast a wizard spell without components (up to 100 gp).", { attune: by("a wizard"), charges: 3 }),
  T("Demonomicon of Iggwilv", "artifact", "The great book of demonology. 8 charges (1d8 back each dawn) to cast Tasha's hideous laughter and fiend-binding spells (save DC 20). Double proficiency on checks about demons, maximum damage on spells against fiends, and it can trap fiends in its pages, which may try to possess you.", { attune: A, charges: 8 }),
  T("Devotee's Censer", "rare", "A magic flail that counts as your holy symbol. Hits deal an extra 1d8 radiant damage. Once per day, as a bonus action, it gives off incense for 1 minute: at the start of each of your turns, you and everyone within 10 feet regain 1d4 hit points.", { kind: "weapon", sub: "Weapon (flail)", attune: by("a cleric or paladin") }),
  T("Duplicitous Manuscript", "rare", SPELLBOOK("illusion", "hallucinatory terrain, major image, mirror image, mislead, Nystul's magic aura, phantasmal force and silent image", "To everyone else it looks like a romance novel. As a reaction, spend 1 charge to give a creature disadvantage on a save or check against one of your illusions."), { attune: by("a wizard"), charges: 3 }),
  T("Eldritch Claw Tattoo", "uncommon", `Your unarmed strikes count as magical and get +1 to attack and damage. Once per day, as a bonus action for 1 minute, your melee attacks reach 15 feet and deal an extra 1d6 force damage.${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Elemental Essence Shard", "rare", "A spellcasting focus. When you use Metamagic on a spell you also get its element's effect: air (fly 60 feet without opportunity attacks), earth (resist one damage type), fire (a target burns for 2d10 fire damage) or water (a wave: 2d6 cold damage and a push).", { attune: by("a sorcerer") }),
  T("Far Realm Shard", "rare", "A spellcasting focus. When you use Metamagic on a spell, a tentacle strikes a creature within 30 feet: Charisma save against your spell DC or 3d6 psychic damage and frightened of you until your next turn.", { attune: by("a sorcerer") }),
  T("Feywild Shard", "uncommon", "A spellcasting focus. When you use Metamagic on a spell, you can roll on the Wild Magic Surge table (once per day unless you're a Wild Magic sorcerer).", { attune: by("a sorcerer") }),
  T("Fulminating Treatise", "rare", SPELLBOOK("evocation", "contingency, fireball, gust of wind, Leomund's tiny hut, magic missile, thunderwave and wall of force", "As a reaction when your evocation spell damages a creature, spend 1 charge for an extra 2d6 force damage and knock it prone (Large or smaller)."), { attune: by("a wizard"), charges: 3 }),
  T("Ghost Step Tattoo", "very rare", `3 charges, all back at dawn. As a bonus action, spend 1 to become ghostly until the end of your next turn: resist nonmagical bludgeoning, piercing and slashing, can't be grappled or restrained, move through creatures and objects (ending inside one costs 1d10 force damage).${tattooNote}`, { sub: TATTOO, attune: A, charges: 3 }),
  T("Guardian Emblem", "uncommon", "Attach it to armour or a shield. 3 charges, all back at dawn: when you or a creature you can see within 30 feet takes a critical hit, use your reaction and 1 charge to make it a normal hit.", { sub: "Wondrous item (holy symbol)", attune: by("a cleric or paladin"), charges: 3 }),
  T("Heart Weaver's Primer", "rare", SPELLBOOK("enchantment", "antipathy/sympathy, charm person, dominate person, enthrall, hypnotic pattern, modify memory and suggestion", "When you cast an enchantment spell, spend 1 charge to give one target disadvantage on its first save against it."), { attune: by("a wizard"), charges: 3 }),
  T("Illuminator's Tattoo", "common", `Write with your fingertip as if with a pen that never runs dry. Once per day, touch up to a page of writing and name a creature: for 24 hours only you and it can see the writing.${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Libram of Souls and Flesh", "rare", SPELLBOOK("necromancy", "animate dead, circle of death, false life, finger of death, speak with dead, summon undead and vampiric touch", "As an action, spend 1 charge to look undead for 10 minutes: undead ignore you unless you harm them."), { attune: by("a wizard"), charges: 3 }),
  T("Lifewell Tattoo", "very rare", `You resist necrotic damage. Once per day, when you would drop to 0 hit points, you drop to 1 instead.${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Luba's Tarokka of Souls", "artifact", "A cursed fortune-telling deck. Cast divination spells from it (save DC 18), never lose concentration on divination spells, and twice per day give a creature advantage or disadvantage on attacks, checks and saves for an hour. Each draw may free an evil soul trapped in the cards.", { attune: A }),
  T("Lyre of Building", "rare", "Cast mending at will. As a reaction, make an object or structure within 300 feet immune to one damage type until your next turn. Once per day each: fabricate, move earth, passwall, summon construct.", { attune: by("a bard") }),
  T("Masquerade Tattoo", "common", `As a bonus action, change the tattoo's look, size and place on your skin. Once per day, cast disguise self from it (DC 13 to see through).${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Mighty Servant of Leuk-o", "artifact", "A 10-foot war machine two attuned pilots ride inside: AC 22, 310 hit points, fists that hit for 4d12 + 10 force damage. The warlord Leuk-o's ghost lives in it and sometimes acts on its own; it can self-destruct for 25d6 force, lightning and thunder damage.", { attune: A }),
  ...scaled("TCE", "Moon Sickle", "weapon", "Weapon (sickle)", by("a druid or ranger"), (n) => `+${n} to attack and damage rolls with it, and to the spell attack rolls and save DCs of your druid and ranger spells. A spellcasting focus for those spells. When you cast a healing spell while holding it, add 1d4 to the hit points restored.`),
  T("Nature's Mantle", "uncommon", "A cloak that blends with the land around you and is a spellcasting focus for your druid and ranger spells. In a lightly obscured area you can Hide as a bonus action, even while someone is watching you.", { attune: by("a druid or ranger") }),
  T("Outer Essence Shard", "rare", "A spellcasting focus. When you use Metamagic on a spell you also get its plane's effect: lawful (end a condition), chaotic (a target has disadvantage on attacks and checks), good (3d6 temporary hit points) or evil (an extra 3d6 necrotic damage).", { attune: by("a sorcerer") }),
  T("Planecaller's Codex", "rare", SPELLBOOK("conjuration", "banishment, find familiar, gate, magic circle, planar binding and summon elemental", "When you summon or create one creature with a conjuration spell, spend 1 charge to give it advantage on attacks for 1 minute."), { attune: by("a wizard"), charges: 3 }),
  T("Prosthetic Limb", "common", "Replaces a lost hand, arm, foot or leg and works just like it. You can take it off or put it on as an action; nobody can remove it against your will."),
  T("Protective Verses", "rare", SPELLBOOK("abjuration", "arcane lock, dispel magic, globe of invulnerability, glyph of warding, Mordenkainen's private sanctum, protection from evil and good and symbol", "When you cast an abjuration spell, spend 1 charge to give a creature within 30 feet 2d10 temporary hit points."), { attune: by("a wizard"), charges: 3 }),
  T("Reveler's Concertina", "rare", "While you hold it, +2 to the save DC of your bard spells. Once per day, cast Otto's irresistible dance from it.", { attune: by("a bard") }),
  ...scaled("TCE", "Rhythm-Maker's Drum", "wondrous", W, by("a bard"), (n) => `+${n} to the spell attack rolls and save DCs of your bard spells. Once per day, play it (an action) to get back one use of Bardic Inspiration.`),
  T("Shadowfell Brand Tattoo", "rare", `You see in the dark (60 feet) and have advantage on Stealth checks. Once per day (until sunset), as a reaction when you take damage, halve it.${tattooNote}`, { sub: TATTOO, attune: A }),
  T("Shadowfell Shard", "rare", "A spellcasting focus. When you use Metamagic on a spell, curse one target: until the end of your next turn it has disadvantage on checks and saves with one ability you choose.", { attune: by("a sorcerer") }),
  T("Spellwrought Tattoo", "common", "Holds one spell (up to 5th level). Press the needle to your skin to make the tattoo, then cast the spell once without material components; the tattoo fades when the spell ends. Cantrip or 1st level: common, DC 13, +5 to hit. 2nd–3rd: uncommon. 4th–5th: rare (up to DC 17, +9).", { sub: TATTOO }),
  T("Teeth of Dahlver-Nar", "artifact", "A pouch of teeth that bring legends to life. Draw one (an action): sow it to call creatures from a story, or implant it in your mouth for a lasting power. Each tooth works once.", { attune: A }),
];


// Dungeon Master's Guide items that aren't in the SRD 5.1 (written 2026-11-19 from the user's copy,
// chapter 7). Artifacts list only what the book's text showed; the DM's book has the rest.
const D = (name: string, kind: ItemKind, sub: string, rarity: Rarity, desc: string, o: { attune?: string; charges?: number; weight?: number } = {}) => item("DMG", name, kind, sub, rarity, desc, o);
const dmgScaled = (name: string, kind: ItemKind, sub: string, rarities: [Rarity, Rarity, Rarity], desc: (n: number) => string, attune?: string) =>
  ([1, 2, 3] as const).map((n) => D(`${name}, +${n}`, kind, sub, rarities[n - 1], desc(n), { attune }));
const BARD_ALL = "fly, invisibility, levitate and protection from evil and good";
const bardInstrument = (name: string, rarity: Rarity, spells: string) =>
  D(`Instrument of the Bards (${name})`, "wondrous", W, rarity, `As an action, play it to cast one of its spells (${BARD_ALL}, plus ${spells}); each spell once per day, using your spell save DC. Charm spells you cast with it or through it give targets disadvantage on the save. Playing it without being attuned: DC 15 Wisdom save or 2d4 psychic damage.`, { attune: by("a bard") });

const DMG_EXTRA: Item[] = [
  D("Alchemy Jug", "wondrous", W, "uncommon", "A 12-pound ceramic jug. As an action, name a liquid and it fills with it; pour up to 2 gallons a minute. Each day it makes up to: acid 8 oz, basic poison ½ oz, beer 4 gallons, honey 1 gallon, mayonnaise 2 gallons, oil 1 quart, vinegar 2 gallons, fresh water 8 gallons, salt water 12 gallons, wine 1 gallon. Once it starts one liquid, it can't switch until dawn.", { weight: 12 }),
  ...dmgScaled("Ammunition", "weapon", "Weapon (any ammunition)", ["uncommon", "rare", "very rare"], (n) => `+${n} to attack and damage rolls with this ammunition. Once it hits, it stops being magical.`),
  ...dmgScaled("Armor", "armour", "Armor (light, medium or heavy)", ["rare", "very rare", "legendary"], (n) => `+${n} to AC while you wear this armour. Name it with its kind, like “Chain Mail +${n}”, so the app counts it.`),
  D("Cloak of Invisibility", "wondrous", W, "legendary", "Pull the hood up (an action) to turn invisible, with everything you carry; pull it down to stop. It works for 2 hours in all, used a minute at a time, and gets back 1 hour for every 12 hours it isn't used.", { attune: A }),
  D("Driftglobe", "wondrous", W, "uncommon", "A 1-pound glass sphere. Within 60 feet of it, speak a command word to make it shine with the light spell, or daylight once per day. Another word (an action) makes it float up to 5 feet off the ground and follow you within 60 feet until someone grabs it.", { weight: 1 }),
  D("Efreeti Chain", "armour", "Armor (chain mail)", "legendary", "+3 to AC. You're immune to fire damage, you understand and speak Primordial, and you can walk on molten rock as if it were solid ground.", { attune: A }),
  D("Elixir of Health", "potion", "Potion", "rare", "Cures any disease and removes the blinded, deafened, paralyzed and poisoned conditions. Clear red, with tiny bubbles of light."),
  D("Gloves of Thievery", "wondrous", W, "uncommon", "Invisible while worn. +5 to Dexterity (Sleight of Hand) checks and to Dexterity checks to pick locks."),
  bardInstrument("Anstruth Harp", "very rare", "control weather, cure wounds at 5th level and wall of thorns"),
  bardInstrument("Canaith Mandolin", "rare", "cure wounds at 3rd level, dispel magic and protection from energy (lightning only)"),
  bardInstrument("Cli Lyre", "rare", "stone shape, wall of fire and wind wall"),
  bardInstrument("Doss Lute", "uncommon", "animal friendship, protection from energy (fire only) and protection from poison"),
  bardInstrument("Fochlucan Bandore", "uncommon", "entangle, faerie fire, shillelagh and speak with animals"),
  bardInstrument("Mac-Fuirmidh Cittern", "uncommon", "barkskin, cure wounds and fog cloud"),
  bardInstrument("Ollamh Harp", "legendary", "confusion, control weather and fire storm"),
  D("Mariner's Armor", "armour", "Armor (light, medium or heavy)", "uncommon", "You get a swimming speed equal to your walking speed. If you start your turn underwater at 0 hit points, it carries you 60 feet up toward the surface."),
  D("Potion of Fire Breath", "potion", "Potion", "uncommon", "For 1 hour, as a bonus action, breathe fire at a target within 30 feet: DC 13 Dexterity save, 4d6 fire damage, or half as much on a success. It ends after three breaths."),
  D("Potion of Invulnerability", "potion", "Potion", "rare", "For 1 minute you resist all damage."),
  D("Potion of Longevity", "potion", "Potion", "very rare", "You become 1d6 + 6 years younger (not below 13). Each later dose has a 10% cumulative chance to age you 1d6 + 6 years instead."),
  D("Potion of Vitality", "potion", "Potion", "very rare", "Removes all exhaustion and cures disease and poison. For 24 hours, every Hit Die you spend heals the most it can."),
  ...dmgScaled("Rod of the Pact Keeper", "rod", "Rod", ["uncommon", "rare", "very rare"], (n) => `+${n} to the spell attack rolls and save DCs of your warlock spells. Once per long rest, as an action, get back one warlock spell slot.`, by("a warlock")),
  D("Saddle of the Cavalier", "wondrous", W, "uncommon", "While you're conscious in this saddle, you can't be knocked off your mount against your will, and attacks against the mount have disadvantage."),
  D("Scroll of Protection", "scroll", "Scroll", "rare", "Works against one creature type (aberrations, beasts, celestials, elementals, fey, fiends, plants or undead). Read it (an action) for a 5-foot-radius, 10-foot-high barrier around you for 5 minutes that those creatures can't enter or affect; one can push through with a DC 15 Charisma check (an action)."),
  D("Sending Stones", "wondrous", W, "uncommon", "A matching pair. Touch one and cast sending (an action) to whoever holds the other; once per day. If one breaks, the other stops being magical."),
  D("Sentinel Shield", "armour", "Armor (shield)", "uncommon", "While you hold it, you have advantage on initiative rolls and Wisdom (Perception) checks. It shows the symbol of an eye."),
  ...dmgScaled("Shield", "armour", "Armor (shield)", ["uncommon", "rare", "very rare"], (n) => `+${n} to AC on top of the shield's usual +2.`),
  D("Staff of the Adder", "staff", "Staff", "uncommon", "As a bonus action, the staff's head becomes a living snake for 1 minute. Attack with it (reach 5 feet, your proficiency applies): 1d6 piercing damage, and a DC 15 Constitution save or 3d6 poison damage. The head has AC 15 and 20 hit points; if it drops to 0 the staff is destroyed.", { attune: by("a cleric, druid or warlock") }),
  D("Sword of Answering", "weapon", "Weapon (longsword)", "legendary", "One of nine swords (Answerer, Back Talker, Concluder, Last Quip, Rebutter, Replier, Retorter, Scather, Squelcher), each with its own alignment. +3 to attack and damage. As a reaction when a creature in reach damages you, attack it with advantage; that damage ignores immunity and resistance.", { attune: "Requires attunement by a creature of the sword's alignment" }),
  D("Sword of Vengeance", "weapon", "Weapon (any sword)", "uncommon", "+1 to attack and damage. Cursed with a vengeful spirit: you won't part with it, you have disadvantage on attacks with other weapons, and when you take damage in combat you must succeed on a DC 15 Wisdom save or keep attacking whoever hurt you. Banishment on the sword frees the spirit, leaving a plain +1 weapon.", { attune: A }),
  D("Tentacle Rod", "rod", "Rod", "rare", "As an action, its three tentacles attack a creature within 15 feet: +9 to hit, 1d6 bludgeoning damage each. If all three hit, the target makes a DC 15 Constitution save or for 1 minute its speed is halved, it has disadvantage on Dexterity saves, can't take reactions, and takes only an action or a bonus action each turn.", { attune: A }),
  D("Tome of the Stilled Tongue", "wondrous", W, "legendary", "A book with a dried tongue pinned to its cover; Vecna watches whoever uses it. A spellbook and arcane focus. Once per day, as a bonus action, cast a spell written in it without a slot or verbal and somatic components. Tearing off the tongue erases every spell in it.", { attune: by("a wizard") }),
  D("Weapon of Warning", "weapon", "Weapon (any)", "uncommon", "While it's on you, you have advantage on initiative, and you and your companions within 30 feet can't be surprised. It wakes you all if combat starts while you sleep naturally.", { attune: A }),
  D("Blackrazor", "weapon", "Weapon (greatsword)", "legendary", "A sentient sword that eats souls (chaotic neutral). +3 to attack and damage. When it kills a creature (not a construct or undead) it devours its soul: you gain temporary hit points equal to its hit point maximum and advantage on attacks, saves and checks while they last. Hitting undead hurts you (1d10 necrotic). You sense living creatures within 60 feet and can't be charmed or frightened; once a day it can cast haste on you.", { attune: by("a creature of non-lawful alignment") }),
  D("Moonblade", "weapon", "Weapon (longsword)", "legendary", "An elven heirloom that chooses its bearer. Each rune on it (usually 1d6 + 1) adds something: the first gives +1 to attack and damage, others more bonus (up to +3), finesse, thrown, a 19–20 critical, extra damage and more, picked by the DM. If it rejects you, you have disadvantage on everything for 24 hours.", { attune: by("an elf or half-elf of neutral good alignment") }),
  D("Wave", "weapon", "Weapon (trident)", "legendary", "A sentient trident (neutral) that wants converts for the sea gods. +3 to attack and damage; a critical hit also deals necrotic damage equal to half the target's hit point maximum. It also works as a trident of fish command, a weapon of warning, a cap of water breathing and a cube of force.", { attune: "Requires attunement by a creature that worships a god of the sea" }),
  D("Whelm", "weapon", "Weapon (warhammer)", "legendary", "A dwarven warhammer. +3 to attack and damage. Thrown (20/60 feet), it deals an extra 1d8 bludgeoning (2d8 against giants) and flies back to you. It also has a shock wave power. But from the day after you first attack with it, you fear the open sky: disadvantage on attacks, saves and checks while you can see the daytime sky.", { attune: by("a dwarf") }),
  D("Axe of the Dwarvish Lords", "weapon", "Weapon (battleaxe)", "artifact", "The First King's axe, which once united the dwarf clans and was lost in a civil war. A +3 battleaxe with more powers described in the Dungeon Master's Guide.", { attune: A }),
  D("Book of Exalted Deeds", "wondrous", W, "artifact", "The great book of goodness. Only a good creature attuned to it can open its clasp, then must spend 80 hours studying it to gain its benefits (in the Dungeon Master's Guide). Once read, it vanishes elsewhere.", { attune: by("a creature of good alignment") }),
  D("Book of Vile Darkness", "wondrous", W, "artifact", "Vecna's catalogue of evil. Plants wither and animals keep away near it, and it slowly destroys whatever it rests on. Its powers and dangers are in the Dungeon Master's Guide.", { attune: A }),
  D("Eye and Hand of Vecna", "wondrous", W, "artifact", "Two artifacts of the lich-god. To attune you replace your own eye or left hand; removing it kills you. The eye makes you neutral evil and gives truesight, X-ray vision and 8 charges of spells (save DC 18). The hand's powers are in the Dungeon Master's Guide.", { attune: A }),
  D("Sword of Kas", "weapon", "Weapon (longsword)", "artifact", "Vecna's traitor's sentient sword. +3 to attack and damage, a critical hit on 19 or 20, and an extra 2d10 slashing damage against undead. If it isn't bathed in blood within a minute of being drawn, you must make a DC 15 Charisma save or be dominated by it (3d6 psychic damage on a success).", { attune: A }),
  D("Wand of Orcus", "wand", "Wand", "artifact", "The demon lord's bone wand. Trying to attune: DC 17 Constitution save, or die and rise as a zombie (10d6 necrotic damage on a success). Attuned, it's a +3 mace that deals an extra 2d12 necrotic damage on a hit, with more powers in the Dungeon Master's Guide.", { attune: A }),
];

export const BOOK_ITEMS: Item[] = [...XGE, ...TCE, ...DMG_EXTRA];
