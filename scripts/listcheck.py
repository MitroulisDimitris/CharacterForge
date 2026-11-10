"""Compare the app's 2014 PHB class spell lists (levels 0-3) with the Player's Handbook chapter 11 lists.

Usage: python scripts/listcheck.py <app2014.json>
Reads reference/books/PHB2014.raw.txt. Spell names in the scan run together, so each level line is
squashed and matched against known spell names, longest first (so "Light" doesn't match "Daylight").
"""
import json, re, sys

app = json.load(open(sys.argv[1], encoding="utf-8"))
squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())
CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"]

lines = open("reference/books/PHB2014.raw.txt", encoding="latin-1").read().split("\n")
start = next(i for i, l in enumerate(lines) if squash(l) == "bardspells" and i > 7000)
text = squash(" ".join(lines[start:start + 140]))
# Cut into class blocks, then level blocks.
pos = [(text.index(c + "spells"), c) for c in CLASSES]
pos.sort()
book = {}
for k, (p, c) in enumerate(pos):
    block = text[p + len(c) + 6: pos[k + 1][0] if k + 1 < len(pos) else len(text)]
    marks = [(m.start(), m.group(0)) for m in re.finditer(r"cantrips0level|1stlevel|2ndlevel|3rdlevel|4thlevel", block)]
    levels = {}
    for j, (mp, mk) in enumerate(marks):
        lv = 0 if mk.startswith("cantrips") else int(mk[0])
        if lv > 3: break
        levels[lv] = block[mp + len(mk): marks[j + 1][0] if j + 1 < len(marks) else len(block)]
    book[c] = levels

phb = [s for s in app["spells"] if s["level"] <= 3]
names_by_len = sorted({s["name"] for s in phb}, key=lambda n: -len(squash(n)))
found = {c: {} for c in CLASSES}
for c, levels in book.items():
    for lv, t in levels.items():
        for n in names_by_len:
            k = squash(n)
            if k in t:
                found[c][n] = lv
                t = t.replace(k, "|")

def app_on(s, c):
    if c == "sorcerer":
        return s["sorcerer"] and not s.get("listBook") and s["book"] == "PHB14"
    return c in s["lists"] and s["book"] == "PHB14"

issues = []
for c in CLASSES:
    for s in phb:
        if s["book"] != "PHB14": continue
        inbook = s["name"] in found[c]
        if inbook and not app_on(s, c): issues.append(f"{c}: '{s['name']}' is on the PHB list but not the app's")
        if app_on(s, c) and not inbook: issues.append(f"{c}: app has '{s['name']}' but the PHB list doesn't")
        if inbook and found[c][s["name"]] != s["level"]: issues.append(f"{c}: '{s['name']}' listed at level {found[c][s['name']]} in the PHB, app says {s['level']}")
print("PHB list entries matched:", sum(len(v) for v in found.values()))
print("\n".join(issues) or "No differences.")
