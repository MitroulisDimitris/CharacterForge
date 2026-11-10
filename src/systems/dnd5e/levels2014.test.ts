// Golden tests for 2014 classes at levels 2-5 (phase 3). Values worked out by hand from the rules.
import { describe, expect, it } from "vitest";
import { freshCharacter2014, newId, type Character } from "./character";
import { deriveCharacter } from "./derive";
import { progression5e } from "./progression";
import { RULES, classOf } from "./rules";

const ALL = ["PHB14", "XGE", "TCE"];
const item = (name: string, qty = 1) => ({ id: newId(), name, qty, weight: 0 });
const build = (patch: Partial<Character>): Character => {
  const c = { ...freshCharacter2014(), name: "T", species: "human14", background: "sage14", ...patch };
  const cls = classOf(RULES["2014"], c.cls);
  const arr = [15, 14, 13, 12, 10, 8];
  return { ...c, base: patch.base ?? (Object.fromEntries(cls.recommended.map((a, i) => [a, arr[i]])) as Character["base"]) };
};
const d = (c: Character) => deriveCharacter(c, ALL);
const texts = (c: Character) => d(c).warnings.map((w) => w.text);
const feat = (c: Character, name: string) => d(c).featureGroups.flatMap((g) => g.items).find((f) => f.name === name);
const unlocks = (c: Character, level: number) => progression5e.unlocksAt({ ...c, level }, d({ ...c, level }), level).map((u) => u.id);

describe("2014 classes, levels 2-5", () => {
  it("every class goes to level 5", () => {
    for (const k of RULES["2014"].classes) expect(k.maxLevel).toBe(5);
  });

  it("HP uses each class's hit die average", () => {
    // Fighter 5, CON 15 (+2): 10+2 + 4 × (6+2) = 44
    expect(d(build({ cls: "fighter", level: 5 })).hpMax).toBe(44);
    // Wizard 5, CON 15 (+2): 6+2 + 4 × (4+2) = 32
    expect(d(build({ cls: "wizard", level: 5 })).hpMax).toBe(32);
  });

  it("Fighter: Battle Master maneuvers, Extra Attack", () => {
    const c = build({ cls: "fighter", level: 5, subclass: "battleMaster", fightingStyle: "defense", subclassPicks: ["parry", "riposte"] });
    expect(texts(c)).toContain("Maneuvers: 2 of 3 chosen.");
    expect(texts({ ...c, subclassPicks: ["parry", "riposte", "trip"] }).some((t) => t.startsWith("Maneuvers"))).toBe(false);
    expect(feat(c, "Extra Attack")).toBeTruthy();
    expect(feat(c, "Action Surge")).toBeTruthy();
    expect(feat({ ...c, subclassPicks: ["trip"] }, "Trip Attack")).toBeTruthy();
  });

  it("Barbarian: rages scale, Fast Movement, no heavy armor", () => {
    const c = build({ cls: "barbarian", level: 5, subclass: "totemWarrior", subclassOption: "bear" });
    expect(feat(c, "Rage")!.text.startsWith("3 rages")).toBe(true);
    expect(d(c).speed).toBe(40);
    expect(feat(c, "Totem animal: Bear")).toBeTruthy();
    expect(d({ ...c, level: 2 }).speed).toBe(30);
  });

  it("Monk: Unarmored Movement, martial arts die d6 at 5", () => {
    const c = build({ cls: "monk", level: 5, subclass: "openHand", inventory: [item("Dagger")] });
    const dd = d(c);
    expect(dd.speed).toBe(40);
    // DEX 15 + human 1 = 16 (+3)
    expect(dd.attacks.find((a) => a.name === "Unarmed Strike")!.damage).toBe("1d6+3 Bludgeoning");
    expect(dd.attacks.find((a) => a.name === "Dagger")!.damage).toBe("1d6+3 Piercing");
    expect(d({ ...c, level: 1 }).attacks.find((a) => a.name === "Unarmed Strike")!.damage).toBe("1d4+3 Bludgeoning");
  });

  it("Rogue: Sneak Attack dice, Scout expertise", () => {
    const c = build({ cls: "rogue", level: 5, subclass: "scout", classSkills: ["stealth", "acrobatics", "perception", "insight"], expertise: ["stealth", "perception"] });
    expect(feat(c, "Sneak Attack")!.text.startsWith("3d6")).toBe(true);
    const nature = d(c).skills.find((s) => s.id === "nature")!;
    expect(nature.expert).toBe(true);
    expect(nature.bonus).toBe(d(c).mods.INT + 6); // PB 3 doubled
  });

  it("Bard: Jack of All Trades and Expertise at 3", () => {
    const c = build({ cls: "bard", level: 3, subclass: "lore", classSkills: ["performance", "persuasion", "deception"] });
    const dd = d(c);
    expect(dd.skills.find((s) => s.id === "athletics")!.bonus).toBe(dd.mods.STR + 1); // half of PB 2
    expect(dd.initiative).toBe(dd.mods.DEX + 1);
    expect(texts(c)).toContain("Expertise: choose 2 more.");
    expect(texts(c)).toContain("Lore: choose 3 skill(s).".replace("Lore", "College of Lore"));
    expect(texts({ ...c, level: 2 }).some((t) => t.startsWith("Expertise"))).toBe(false);
  });

  it("Paladin: Fighting Style and spells from 2nd level, oath spells at 3", () => {
    const c = build({ cls: "paladin", level: 2 });
    const dd = d(c);
    expect(dd.caster).toBe(true);
    expect(dd.slots).toEqual([2]);
    expect(dd.preparedLimit).toBe(Math.max(1, dd.mods.CHA + 1));
    expect(texts(c)).toContain("Choose a Fighting Style.");
    expect(texts({ ...c, fightingStyle: "archery" })).toContain("Choose a Fighting Style."); // archery isn't a paladin style
    const p3 = d({ ...c, level: 3, subclass: "devotion", fightingStyle: "defense" });
    expect(p3.spellRows.filter((r) => r.kind === "Always").map((r) => r.name)).toEqual(["Protection from Evil and Good", "Sanctuary"]);
    expect(d({ ...c, level: 1 }).caster).toBe(false);
  });

  it("Ranger: spells known and slots", () => {
    const c = build({ cls: "ranger", level: 5, subclass: "gloomStalker", fightingStyle: "archery" });
    const dd = d(c);
    expect(dd.slots).toEqual([4, 2]);
    expect(dd.preparedLimit).toBe(4);
    expect(dd.initiative).toBe(dd.mods.DEX + dd.mods.WIS); // Dread Ambusher
    expect(dd.darkvision).toBe(60);
  });

  it("Warlock: invocations, prerequisites, Armor of Shadows, Pact of the Tome", () => {
    const c = build({ cls: "warlock", level: 5, subclass: "fiend", invocations: ["agonizingBlast", "armorOfShadows", "thirstingBlade"], pactBoon: "tome", tomeCantrips: ["Guidance"] });
    const w = texts(c);
    expect(w).toContain("Agonizing Blast needs the Eldritch Blast cantrip.");
    expect(w).toContain("Thirsting Blade needs the Pact of the Blade.");
    expect(w).toContain("Pact of the Tome: choose 2 more cantrip(s) from any class's list.");
    const dd = d(c);
    expect(dd.ac).toBe(13 + dd.mods.DEX);
    expect(dd.slots).toEqual([0, 0, 2]);
    expect(dd.spellRows.some((r) => r.name === "Guidance" && r.source === "Book of Shadows")).toBe(true);
    expect(texts({ ...c, level: 2, invocations: ["armorOfShadows", "devilsSight"] }).some((t) => t.startsWith("Eldritch Invocations"))).toBe(false);
  });

  it("Wizard: spellbook grows, War Magic adds INT to initiative", () => {
    const c = build({ cls: "wizard", level: 5, subclass: "warMagic" });
    const dd = d(c);
    expect(dd.spellbookLimit).toBe(14);
    expect(dd.slots).toEqual([4, 3, 2]);
    expect(dd.cantripLimit).toBe(4);
    expect(dd.initiative).toBe(dd.mods.DEX + dd.mods.INT);
  });

  it("Eldritch Knight casts from 3rd level, mostly abjuration/evocation", () => {
    const c = build({ cls: "fighter", level: 3, subclass: "eldritchKnight", fightingStyle: "defense", subclassPicks: [], cantrips: ["Fire Bolt", "Mage Hand"], prepared: ["Shield", "Sleep", "Charm Person"] });
    const dd = d(c);
    expect(dd.caster).toBe(true);
    expect(dd.slots).toEqual([2]);
    expect(dd.spellDc).toBe(8 + 2 + dd.mods.INT);
    expect(texts(c).some((t) => t.startsWith("Eldritch Knight: only one of your spells"))).toBe(true);
    expect(texts({ ...c, prepared: ["Shield", "Magic Missile", "Sleep"] }).some((t) => t.startsWith("Eldritch Knight: only one"))).toBe(false);
    expect(d({ ...c, level: 2, cantrips: [], prepared: [] }).caster).toBe(false);
  });

  it("Druid: Circle of the Land spells by terrain; Cleric Channel Divinity", () => {
    const c = build({ cls: "druid", level: 5, subclass: "land", subclassOption: "forest", subclassCantrip: "Guidance" });
    expect(d(c).spellRows.filter((r) => r.kind === "Always" && r.source.startsWith("Circle spell")).map((r) => r.name)).toEqual(["Barkskin", "Spider Climb", "Call Lightning", "Plant Growth"]);
    expect(feat(build({ cls: "cleric", level: 2, subclass: "life" }), "Channel Divinity: Preserve Life")).toBeTruthy();
  });

  it("Artificer: Battle Smith martial weapons, infusions", () => {
    const c = build({ cls: "artificer", level: 5, subclass: "battleSmith", infusions: ["defense", "weapon"] });
    const dd = d(c);
    expect(dd.weaponText).toContain("martial");
    expect(dd.slots).toEqual([4, 2]);
    expect(texts(c)).toContain("Infusions: 2 of 4 known.");
  });

  it("Subclass weapon proficiencies: Swords scimitar, Bladesinging pick, Kensei weapons", () => {
    const atk = (c: Character, n: string) => d(c).attacks.find((a) => a.name === n)!;
    // Bard 3, DEX 15+1 human = +3, PB 2: proficient scimitar = +5 to hit
    const bard = build({ cls: "bard", level: 3, subclass: "swords", inventory: [item("Scimitar")] });
    expect(Number(atk(bard, "Scimitar").bonus)).toBe(Number(atk({ ...bard, subclass: "lore" }, "Scimitar").bonus) + 2);
    const wiz = build({ cls: "wizard", level: 2, subclass: "bladesinging", inventory: [item("Rapier")] });
    const before = Number(atk(wiz, "Rapier").bonus);
    expect(Number(atk({ ...wiz, subclassPicks: ["Rapier"] }, "Rapier").bonus)).toBe(before + 2);
    expect(texts(wiz)).toContain("Bladesinging weapon: 0 of 1 chosen.");
    // Monk 5 Kensei: longsword becomes a monk weapon (DEX, martial arts die d6 < d8 so keeps d8)
    const monk = build({ cls: "monk", level: 5, subclass: "kensei", subclassPicks: ["Longsword", "Longbow"], inventory: [item("Longsword"), item("Longbow")] });
    expect(atk(monk, "Longsword").damage).toBe("1d8+3 Slashing");
    expect(texts(monk).some((t) => t.startsWith("Kensei weapons"))).toBe(false);
    expect(texts({ ...monk, subclassPicks: ["Longsword", "Rapier"] })).toContain("Kensei weapons: choose one melee and one ranged weapon.");
  });

  it("Warlock invocations from Xanathar's/Tasha's: Maddening Hex needs Hex or a curse", () => {
    const wl = build({ cls: "warlock", level: 5, subclass: "fiend", invocations: ["maddeningHex", "tombOfLevistus", "undyingServitude"], pactBoon: "chain" });
    expect(texts(wl)).toContain("Maddening Hex needs the Hex spell or a warlock feature that curses (Hexblade).");
    expect(texts({ ...wl, prepared: ["Hex"] }).some((t) => t.startsWith("Maddening Hex"))).toBe(false);
    expect(texts({ ...wl, subclass: "hexblade" }).some((t) => t.startsWith("Maddening Hex"))).toBe(false);
  });

  it("Level-up unlocks and level-down clean-up", () => {
    expect(unlocks(build({ cls: "wizard" }), 2)).toEqual(["2:subclass", "2:spells", "2:spellbook"]); // INT + level: one more prepared
    expect(unlocks(build({ cls: "paladin" }), 2)).toContain("2:style");
    expect(unlocks(build({ cls: "warlock" }), 2)).toEqual(["2:spells", "2:invocations", "2:swap"]);
    expect(unlocks(build({ cls: "warlock" }), 3)).toContain("3:pact");
    expect(unlocks(build({ cls: "bard" }), 3)).toContain("3:expertise");
    const wl = build({ cls: "warlock", level: 5, invocations: ["armorOfShadows", "devilsSight", "beastSpeech"], pactBoon: "chain" });
    const { c, removed } = progression5e.demote(wl, 2, ALL);
    expect(c.invocations).toEqual(["armorOfShadows", "devilsSight"]);
    expect(c.pactBoon).toBe("");
    expect(removed).toContain("Pact Boon");
    const gains = progression5e.gainsAt({ ...build({ cls: "rogue" }), level: 3 }, d({ ...build({ cls: "rogue" }), level: 3 }), 3).map((g) => g.name);
    expect(gains).toContain("Sneak Attack improves");
  });
});
