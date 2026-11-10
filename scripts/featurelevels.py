"""Check the level of each subclass feature against the books (levels 1-5).

Usage: python scripts/featurelevels.py <app2014.json>
After each feature heading the books state the level ("3rd-level Fey Wanderer feature",
"Starting at 3rd level", "When you choose this ... at 1st level"). Takes the first level mention
within ~200 characters after the heading.
"""
import json, re, sys

app = json.load(open(sys.argv[1], encoding="utf-8"))
squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())
books = {}
for b, f in {"PHB14": "PHB2014", "XGE": "XGE", "TCE": "TCE"}.items():
    t = open(f"reference/books/{f}.raw.txt", encoding="latin-1").read()
    t = t.replace("lst", "1st").replace("l st", "1st").replace("1 st", "1st").replace("3 rd", "3rd")
    books[b] = squash(t)

LV = re.compile(r"(?:at|from)?(1st|2nd|3rd|4th|5th|6th|7th|9th|10th|11th|13th|14th|15th|17th|18th|20th)level")
out, ok, nf = [], 0, []
for c in app["classes"]:
    for s in c["subclasses"]:
        t = books.get(s["book"])
        if not t: continue
        sub = squash(s["name"])
        anchor = t.find(sub)  # search after the subclass's first mention
        for f in s["features"]:
            k = squash(f["name"])
            if len(k) < 5: continue
            levels = []
            start = anchor if anchor >= 0 else 0
            for m in re.finditer(re.escape(k), t[start:]):
                seg = t[start + m.end(): start + m.end() + 200]
                lm = LV.search(seg)
                if lm and lm.start() < 120:
                    levels.append(int(re.match(r"\d+", lm.group(1)).group()))
                if len(levels) >= 3: break
            if not levels:
                nf.append(f"{s['name']}: {f['name']}"); continue
            if f["level"] in levels[:1]:
                ok += 1
            else:
                out.append(f"{c['name']} / {s['name']}: '{f['name']}' at level {f['level']} in the app; book text suggests {levels[0]}")
print(f"Feature levels confirmed: {ok}; not located: {len(nf)}")
print("\n".join(out) or "No differences.")
if "-v" in sys.argv: print("Not located:", "; ".join(nf))
