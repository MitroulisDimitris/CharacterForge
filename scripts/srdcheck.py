"""Compare the app's 2014 data (scripts/dump2014.ts output) with the SRD 5.1 text.

Usage: python scripts/srdcheck.py <srd_raw.txt> <app2014.json> [report.md]
srd_raw.txt = `pdftotext SRD_CC_v5.1.pdf srd_raw.txt` (no -layout).
"""
import json, re, sys

SRD, APP = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else None
raw = open(SRD, encoding="utf-8", errors="replace", newline="").read()
# pdftotext puts a bare CR between words; only CRLF / LF end a line.
raw = re.sub("\r(?!\n)", " ", raw).replace("\r\n", "\n")
app = json.load(open(APP, encoding="utf-8"))


def norm(t):
    t = t.replace("’", "'").replace("--", "-").replace("—", "-")
    return re.sub(r"\s+", " ", t).strip()


# SRD drops proper names from spell titles.
ALIAS = {"Melf's Acid Arrow": "Acid Arrow", "Tasha's Hideous Laughter": "Hideous Laughter", "Tenser's Floating Disk": "Floating Disk",
         "Nystul's Magic Aura": "Arcanist's Magic Aura", "Leomund's Tiny Hut": "Tiny Hut"}
srdname = lambda n: ALIAS.get(n, n)

lines = raw.split("\n")
start = next(i for i, l in enumerate(lines) if l.strip() == "Spell Descriptions")
end = len(lines)
for i in range(start + 1, len(lines)):
    if lines[i].strip() in ("Monsters", "Appendix PH-A: Conditions", "Appendix MM-A: Miscellaneous Creatures", "Magic Items"):
        end = i
        break
HDR = re.compile(r"^(?:(\d)(?:st|nd|rd|th)-+level\s+(\w+)|(\w+)\s+cantrip)\s*(\(ritual\))?", re.I)
spells = {}
cur = None
i = start + 1
while i < end:
    l = norm(lines[i])
    nxt = norm(lines[i + 1]) if i + 1 < end else ""
    m = HDR.match(nxt)
    if l and m and len(l) < 40 and not l.startswith("System") and not l.startswith("Casting"):
        cur = {"name": l, "level": int(m.group(1)) if m.group(1) else 0, "school": (m.group(2) or m.group(3)).capitalize(), "ritual": bool(m.group(4)), "body": []}
        spells[l] = cur
        i += 2
        continue
    if cur and not re.match(r"^(System Reference|\d+$)", l):
        cur["body"].append(l)
    i += 1
for s in spells.values():
    b = norm(" ".join(s["body"]))
    s["text"] = b
    def g(pat):
        m = re.search(pat, b)
        return m.group(1).strip() if m else None
    s["time"] = g(r"Casting Time: (.*?) Range:")
    s["range"] = g(r"Range: (.*?) Components:")
    s["components"] = g(r"Components: (.*?) Duration:")
    s["duration"] = g(r"Duration: (Concentration, up to \d+ \w+|Instantaneous|Until dispelled(?: or triggered)?|Special|\d+ \w+|Up to \d+ \w+)")

# ---- class spell lists (names are separated by 3+ spaces, words by 2)
lists = {}
li = next(i for i, l in enumerate(lines) if l.strip() == "Bard Spells")
cls = None
lvl = None
for l in lines[li:start]:
    t = l.strip()
    m = re.match(r"^(\w+) Spells$", t)
    if m:
        cls = m.group(1).lower(); lists[cls] = {}; lvl = None; continue
    if t.startswith("Cantrips"):
        lvl = 0; continue
    m = re.match(r"^(\d)(st|nd|rd|th) Level$", t)
    if m:
        lvl = int(m.group(1)); continue
    if not t or t.startswith("System") or re.match(r"^\d+$", t) or cls is None or lvl is None:
        continue
    for n in re.split(r"\s{4,}", t):
        n = norm(n)
        if n:
            lists[cls][n] = lvl

# ---- compare spells
TIME = {"1 action": "1A", "1 bonus action": "1BA", "1 minute": "1m", "10 minutes": "10m", "1 hour": "1 hour"}


def srd_time(t):
    return "1R" if t.startswith("1 reaction") else TIME.get(t, t)


def rng(t):
    t = t.lower().replace(" feet", " ft.").replace(" foot", " ft.").replace("-foot", "-ft.").replace(" miles", " mi.").replace(" mile", " mi.")
    return t.split(" (")[0].strip()


def comps(t):
    head = t.split("(")[0]
    return ",".join(x for x in ("V", "S", "M") if re.search(rf"\b{x}\b", head))


issues = {"spell": [], "list": [], "weapon": [], "armor": []}
seen = set()
for a in app["spells"]:
    s = spells.get(srdname(a["name"]))
    if not s:
        continue
    seen.add(a["name"])
    out = []
    if a["level"] != s["level"]: out.append(f"level {a['level']} vs SRD {s['level']}")
    if a["school"] != s["school"]: out.append(f"school {a['school']} vs SRD {s['school']}")
    if s["time"] and a["time"] != srd_time(s["time"]): out.append(f"casting time '{a['time']}' vs SRD '{s['time']}'")
    if s["range"] and rng(a["range"]) != rng(s["range"]): out.append(f"range '{a['range']}' vs SRD '{s['range']}'")
    if s["components"] and a["components"].replace(" ", "") != comps(s["components"]): out.append(f"components {a['components']} vs SRD '{s['components'][:70]}'")
    if s["duration"]:
        c = s["duration"].startswith("Concentration")
        d = re.sub(r"^Concentration, up to ", "", s["duration"]).lower()
        ad = re.sub(r"^up to ", "", a["duration"].lower())
        d = re.sub(r"^up to ", "", d)
        if ad != d: out.append(f"duration '{a['duration']}' vs SRD '{s['duration']}'")
        if c != a["concentration"]: out.append(f"concentration {a['concentration']} vs SRD {c}")
    if a["ritual"] != s["ritual"]: out.append(f"ritual {a['ritual']} vs SRD {s['ritual']}")
    txt = s["text"]
    sv = re.search(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw", txt)
    srd_save = sv.group(1)[:3].upper() if sv else None
    if a.get("save") and srd_save and a["save"] != srd_save: out.append(f"save {a['save']} vs SRD {srd_save} (first save named)")
    if a.get("save") and not srd_save: out.append(f"save {a['save']} but the SRD text has no saving throw")
    low = txt.lower()
    atk = "melee" if "melee spell attack" in low else "ranged" if "ranged spell attack" in low else None
    if a.get("attack") != atk and (a.get("attack") or atk): out.append(f"attack {a.get('attack')} vs SRD {atk}")
    if a.get("damage"):
        m = re.match(r"(\d+d\d+)", a["damage"])
        if m and m.group(1) not in txt: out.append(f"damage '{a['damage']}': {m.group(1)} not in SRD text")
    if out: issues["spell"].append((a["name"], out))

srd_names = set(spells)
app_by = {srdname(a["name"]): a for a in app["spells"]}


def on_list(a, cls_id):
    if cls_id == "sorcerer":
        return a["sorcerer"] and not a.get("listBook")
    return cls_id in a["lists"]


for cls_id, lst in lists.items():
    for n, lv in lst.items():
        if lv > 3: continue
        a = app_by.get(n)
        if not a:
            issues["list"].append((cls_id, [f"SRD lists '{n}' (level {lv}) but the app has no such spell"]))
        elif not on_list(a, cls_id):
            issues["list"].append((cls_id, [f"'{a['name']}' is on the SRD {cls_id} list but not on the app's PHB list"]))
    for n, a in app_by.items():
        if a["level"] > 3 or n not in srd_names or a["book"] != "PHB14": continue
        if on_list(a, cls_id) and n not in lst:
            issues["list"].append((cls_id, [f"app puts '{a['name']}' on the {cls_id} list; the SRD doesn't"]))

# Weapons and armor: the SRD tables are column-shifted in the text export; compared by hand (all matched, 2026-11-10).
issues.pop('weapon'); issues.pop('armor')

rep = [f"# SRD 5.1 check\n\nSRD spells parsed: {len(spells)}; app spells found in the SRD: {len(seen)} of {len(app['spells'])}.\n"]
for k, v in issues.items():
    rep.append(f"\n## {k} ({sum(len(o) for _, o in v)})\n")
    for name, out in v:
        for o in out:
            rep.append(f"- **{name}**: {o}")
text = "\n".join(rep)
if OUT:
    open(OUT, "w", encoding="utf-8").write(text)
print(text)
