import json, sys
app = {s["name"]: s for s in json.load(open(sys.argv[1], encoding="utf-8"))["spells"]}
# Tasha's: "Additional <class> spells" (levels 0-3) and the full Artificer list (pp. 12, 27-75).
TCE = {
 "bard": "Color Spray|Command|Aid|Enlarge/Reduce|Mirror Image|Intellect Fortress|Mass Healing Word|Slow",
 "cleric": "Aura of Vitality|Spirit Shroud",
 "druid": "Protection from Evil and Good|Augury|Continual Flame|Enlarge/Reduce|Summon Beast|Aura of Vitality|Elemental Weapon|Revivify|Summon Fey",
 "paladin": "Gentle Repose|Prayer of Healing|Warding Bond|Spirit Shroud",
 "ranger": "Entangle|Searing Smite|Aid|Enhance Ability|Gust of Wind|Magic Weapon|Summon Beast|Elemental Weapon|Meld into Stone|Revivify|Summon Fey",
 "sorcerer": "Booming Blade|Green-Flame Blade|Lightning Lure|Mind Sliver|Sword Burst|Grease|Tasha's Caustic Brew|Flame Blade|Flaming Sphere|Magic Weapon|Tasha's Mind Whip|Intellect Fortress|Vampiric Touch",
 "warlock": "Booming Blade|Green-Flame Blade|Lightning Lure|Mind Sliver|Sword Burst|Intellect Fortress|Spirit Shroud|Summon Fey|Summon Shadowspawn|Summon Undead",
 "wizard": "Booming Blade|Green-Flame Blade|Lightning Lure|Mind Sliver|Sword Burst|Tasha's Caustic Brew|Augury|Enhance Ability|Tasha's Mind Whip|Intellect Fortress|Speak with Dead|Spirit Shroud|Summon Fey|Summon Shadowspawn|Summon Undead",
}
ARTIFICER = ("Acid Splash|Booming Blade|Create Bonfire|Dancing Lights|Fire Bolt|Frostbite|Green-Flame Blade|Guidance|Light|Lightning Lure|Mage Hand|Magic Stone|Mending|Message|Poison Spray|Prestidigitation|Ray of Frost|Resistance|Shocking Grasp|Spare the Dying|Sword Burst|Thorn Whip|Thunderclap|"
 "Absorb Elements|Alarm|Catapult|Cure Wounds|Detect Magic|Disguise Self|Expeditious Retreat|Faerie Fire|False Life|Feather Fall|Grease|Identify|Jump|Longstrider|Purify Food and Drink|Sanctuary|Snare|Tasha's Caustic Brew|"
 "Aid|Alter Self|Arcane Lock|Blur|Continual Flame|Darkvision|Enhance Ability|Enlarge/Reduce|Heat Metal|Invisibility|Lesser Restoration|Levitate|Magic Mouth|Magic Weapon|Protection from Poison|Pyrotechnics|Rope Trick|See Invisibility|Skywrite|Spider Climb|Web|"
 "Blink|Catnap|Create Food and Water|Dispel Magic|Elemental Weapon|Flame Arrows|Fly|Glyph of Warding|Haste|Intellect Fortress|Protection from Energy|Revivify|Tiny Servant|Water Breathing|Water Walk")

def base_on(s, c):  # on the list without Tasha's
    if c == "sorcerer": return s["sorcerer"] and not s.get("listBook") and s["book"] != "TCE"
    return c in s["lists"] and s["book"] != "TCE"
def tce_on(s, c):  # on the list once Tasha's is allowed
    if c == "sorcerer": return s["sorcerer"]
    return c in s["lists"] or f"{c}@TCE" in s["lists"]
out = []
for c, names in TCE.items():
    names = set(names.split("|"))
    for n in names:
        s = app.get(n)
        if not s: out.append(f"{c}: Tasha's adds '{n}', app has no such spell"); continue
        if not tce_on(s, c): out.append(f"{c}: Tasha's adds '{n}', app doesn't have it on the list")
        elif base_on(s, c): out.append(f"{c}: '{n}' should need Tasha's, app has it on the base list")
    for n, s in app.items():
        if f"{c}@TCE" in s["lists"] and n not in names: out.append(f"{c}: app marks '{n}' as a Tasha's addition; Tasha's doesn't list it")
        if c == "sorcerer" and s.get("listBook") == "TCE" and n not in names: out.append(f"sorcerer: app marks '{n}' as a Tasha's addition; Tasha's doesn't list it")
        if s["book"] == "TCE" and (c in s["lists"] or (c == "sorcerer" and s["sorcerer"])) and n not in names: out.append(f"{c}: app puts Tasha's spell '{n}' on the list; Tasha's doesn't")
art = set(ARTIFICER.split("|"))
for n in art:
    if n not in app: out.append(f"artificer: book lists '{n}', app has no such spell")
    elif "artificer" not in app[n]["lists"] and "artificer@TCE" not in app[n]["lists"]: out.append(f"artificer: '{n}' missing from the app's list")
for n, s in app.items():
    if any(l.split("@")[0] == "artificer" for l in s["lists"]) and n not in art: out.append(f"artificer: app has '{n}' but the book list doesn't")
print("\n".join(sorted(set(out))) or "No differences.")
