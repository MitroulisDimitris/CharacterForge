import json, sys
app = {s["name"]: s for s in json.load(open(sys.argv[1], encoding="utf-8"))["spells"]}
# Xanathar's Guide ch. 3 spell lists, levels 0-3 (read from the page images, pp. 147-149).
XGE = {
 "bard": "Thunderclap|Earth Tremor|Pyrotechnics|Skywrite|Warding Wind|Catnap|Enemies Abound",
 "cleric": "Toll the Dead|Word of Radiance|Ceremony|Life Transference",
 "druid": "Control Flames|Create Bonfire|Frostbite|Gust|Infestation|Magic Stone|Mold Earth|Primal Savagery|Shape Water|Thunderclap|Absorb Elements|Beast Bond|Earth Tremor|Ice Knife|Snare|Dust Devil|Earthbind|Healing Spirit|Skywrite|Warding Wind|Erupting Earth|Flame Arrows|Tidal Wave|Wall of Water",
 "paladin": "Ceremony",
 "ranger": "Absorb Elements|Beast Bond|Snare|Zephyr Strike|Healing Spirit|Flame Arrows",
 "sorcerer": "Control Flames|Create Bonfire|Frostbite|Gust|Infestation|Mold Earth|Shape Water|Thunderclap|Absorb Elements|Catapult|Chaos Bolt|Earth Tremor|Ice Knife|Aganazzar's Scorcher|Dragon's Breath|Dust Devil|Earthbind|Maximilian's Earthen Grasp|Mind Spike|Pyrotechnics|Shadow Blade|Snilloc's Snowball Swarm|Warding Wind|Catnap|Enemies Abound|Erupting Earth|Flame Arrows|Melf's Minute Meteors|Thunder Step|Tidal Wave|Wall of Water",
 "warlock": "Create Bonfire|Frostbite|Infestation|Magic Stone|Thunderclap|Toll the Dead|Cause Fear|Earthbind|Mind Spike|Shadow Blade|Enemies Abound|Thunder Step|Summon Lesser Demons",
 "wizard": "Control Flames|Create Bonfire|Frostbite|Gust|Infestation|Mold Earth|Shape Water|Thunderclap|Toll the Dead|Absorb Elements|Catapult|Cause Fear|Earth Tremor|Ice Knife|Snare|Aganazzar's Scorcher|Dragon's Breath|Dust Devil|Earthbind|Maximilian's Earthen Grasp|Mind Spike|Pyrotechnics|Shadow Blade|Skywrite|Snilloc's Snowball Swarm|Warding Wind|Catnap|Enemies Abound|Erupting Earth|Flame Arrows|Life Transference|Melf's Minute Meteors|Summon Lesser Demons|Thunder Step|Tidal Wave|Tiny Servant|Wall of Sand|Wall of Water",
}
def on(s, c):
    if c == "sorcerer": return s["sorcerer"] and not s.get("listBook")
    return c in s["lists"]
out = []
for c, names in XGE.items():
    names = set(names.split("|"))
    for n in names:
        if n not in app: out.append(f"{c}: book lists '{n}', app has no such spell")
        elif not on(app[n], c): out.append(f"{c}: '{n}' is on the Xanathar's list but not the app's")
    for n, s in app.items():
        if s["book"] == "XGE" and on(s, c) and n not in names:
            out.append(f"{c}: app puts '{n}' on the list; Xanathar's doesn't")
for n, s in app.items():
    if s["book"] == "XGE" and not any(n in v.split("|") for v in XGE.values()):
        out.append(f"'{n}' (XGE) isn't on any Xanathar's class list")
print("\n".join(sorted(out)) or "No differences.")
