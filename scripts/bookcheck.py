"""Compare the app's 2014 spells (scripts/dump2014.ts output) with the user's book texts.

Usage: python scripts/bookcheck.py <app2014.json> [report.md]
Reads reference/books/{PHB2014,XGE,TCE}.raw.txt (pdftotext of the user's scanned PDFs).
The scans have OCR typos, so text is squashed (lowercase, no spaces) and common misreads fixed.
"""
import json, re, sys

APP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
app = json.load(open(APP, encoding="utf-8"))
BOOKS = {"PHB14": "PHB2014", "XGE": "XGE", "TCE": "TCE"}
SCHOOLS = "abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation"


def ocr(t):
    """Fix the usual scan misreads."""
    t = t.replace("’", "'").replace("--", "-").replace("~", "")
    t = re.sub(r"\bl(d\d)", r"1\1", t)            # ld6 -> 1d6
    t = re.sub(r"\b(\d)d(\d) (\d)\b", r"\1d\2\3", t)  # 1d1 0 -> 1d10
    t = re.sub(r"\blst\b", "1st", t)
    t = re.sub(r"[-1l]?[l1]eve[l1\]]", "level", t)
    t = re.sub(r"lst[J-]?level", "1st-level", t)
    t = t.replace("cantrr'p", "cantrip")
    t = re.sub(r"\b1 1th", "11th", t)
    return t


squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())

spells = {}
for book, f in BOOKS.items():
    lines = [ocr(l) for l in open(f"reference/books/{f}.raw.txt", encoding="latin-1").read().split("\n")]
    # A spell heading is "<name> <level> <school>" on one line, or the name on the line before.
    # Scan misreads seen: "lstJevel", "leve1", "cantrr'p".
    LV = re.compile(rf"^(.*?)([0-9l])(?:st|nd|rd|th)[lj1]?evel({SCHOOLS})(ritual)?$")
    CT = re.compile(rf"^(.*?)({SCHOOLS})can\w{{0,3}}p(ritual)?$")
    heads = []
    for i, l in enumerate(lines):
        h = squash(l)
        if not h or len(h) > 70:
            continue
        m = LV.match(h)
        if m:
            name, level, school, ritual = m.group(1), m.group(2), m.group(3), bool(m.group(4))
            level = 1 if level == "l" else int(level)
        else:
            m = CT.match(h)
            if not m:
                continue
            name, level, school, ritual = m.group(1), 0, m.group(2), bool(m.group(3))
        if not name:
            j = i - 1
            while j > 0 and not lines[j].strip():
                j -= 1
            name = squash(lines[j])
        # Must be followed by a casting time within a few lines (avoids prose matches).
        if not any(re.search(r"cast\w*t\w*e", squash(x)) for x in lines[i + 1:i + 8]):
            continue
        heads.append((i, name, level, school, ritual))
    for k, (i, name, level, school, ritual) in enumerate(heads):
        end = heads[k + 1][0] - 1 if k + 1 < len(heads) else min(i + 40, len(lines))
        body = re.sub(r"\s+", " ", " ".join(lines[i + 1:end]))
        body = re.sub(r"Cast\w*\s*T\s*\w*e\s*:", "Casting Time:", body)
        g = lambda pat: (re.search(pat, body, re.I) or [None, None])[1]
        spells.setdefault(name, []).append({
            "book": book, "level": level, "school": school.capitalize(), "ritual": ritual, "text": body,
            "time": g(r"Casting\s*T\s*ime: (.*?) Range:"), "range": g(r"Range: (.*?) Components:"),
            "components": g(r"Components: (.*?) Duration:"),
            "duration": g(r"Duration: (Concentration, up to \d+ \w+|Instantaneous|Until dispelled(?: or triggered)?|Special|\d+ \w+|Up to \d+ \w+)"),
        })

TIME = {"1action": "1A", "1bonusaction": "1BA", "1minute": "1m", "10minutes": "10m", "1hour": "1 hour"}


def comps(t):
    head = t.split("(")[0].upper().replace("8", "S")
    return ",".join(x for x in ("V", "S", "M") if re.search(rf"(?<![A-Z]){x}(?![A-Z])", head))


issues, matched, notfound = [], 0, []
for a in app["spells"]:
    cands = spells.get(squash(a["name"]))
    if not cands:
        notfound.append(f"{a['name']} [{a['book']}]")
        continue
    s = next((c for c in cands if c["book"] == a["book"]), cands[0])
    matched += 1
    out = []
    if s["book"] != a["book"]: out.append(f"book {a['book']} vs found in {s['book']}")
    if a["level"] != s["level"]: out.append(f"level {a['level']} vs book {s['level']}")
    if a["school"] != s["school"]: out.append(f"school {a['school']} vs book {s['school']}")
    if s["time"]:
        st = squash(s["time"])
        bt = "1R" if st.startswith("1reaction") else TIME.get(st, s["time"])
        if a["time"] != bt: out.append(f"casting time '{a['time']}' vs book '{s['time']}'")
    if s["range"]:
        r1 = squash(a["range"].split(" (")[0]).replace("ft", "feet").replace("feetet", "feet")
        r2 = squash(s["range"].split(" (")[0]).replace("ft", "feet").replace("feetet", "feet")
        r1, r2 = r1.replace("mi", "mile").replace("mileles", "miles"), r2
        if r1.rstrip("s") != r2.rstrip("s"): out.append(f"range '{a['range']}' vs book '{s['range']}'")
    if s["components"] and a["components"].replace(" ", "") != comps(s["components"]): out.append(f"components {a['components']} vs book '{s['components'][:60]}'")
    if s["duration"]:
        c = s["duration"].lower().startswith("concentration")
        d = squash(re.sub(r"^(Concentration, )?up to ", "", s["duration"], flags=re.I))
        ad = squash(re.sub(r"^up to ", "", a["duration"], flags=re.I))
        if ad != d: out.append(f"duration '{a['duration']}' vs book '{s['duration']}'")
        if c != a["concentration"]: out.append(f"concentration {a['concentration']} vs book {c}")
    if a["ritual"] != s["ritual"]: out.append(f"ritual {a['ritual']} vs book {s['ritual']}")
    txt = s["text"]
    sv = re.search(r"(strength|dexterity|constitution|intelligence|wisdom|charisma)sav", squash(txt))
    srd_save = sv.group(1)[:3].upper() if sv else None
    if a.get("save") and srd_save and a["save"] != srd_save: out.append(f"save {a['save']} vs book {srd_save} (first save named)")
    if a.get("save") and not srd_save: out.append(f"save {a['save']} but no saving throw found in the book text")
    low = squash(txt)
    atk = "melee" if "meleespellattack" in low else "ranged" if "rangedspellattack" in low else None
    if a.get("attack") != atk and (a.get("attack") or atk): out.append(f"attack {a.get('attack')} vs book {atk}")
    if a.get("damage"):
        m = re.match(r"(\d+d\d+)", a["damage"])
        if m and m.group(1) not in txt.replace(" ", ""): out.append(f"damage '{a['damage']}': {m.group(1)} not in book text")
    if out: issues.append((a["name"], a["book"], out))

rep = [f"# Book check: spells\n\nBook spells parsed: {sum(len(v) for v in spells.values())}. App spells matched: {matched} of {len(app['spells'])}.\n"]
if notfound: rep.append("Not parsed (check by hand): " + ", ".join(notfound) + "\n")
for n, b, out in issues:
    for o in out: rep.append(f"- **{n}** ({b}): {o}")
text = "\n".join(rep)
if OUT: open(OUT, "w", encoding="utf-8").write(text)
print(text)
