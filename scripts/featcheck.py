"""Check feats' ability increases and prerequisites against the books.

Usage: python scripts/featcheck.py <app2014.json>
"""
import json, re, sys

app = json.load(open(sys.argv[1], encoding="utf-8"))
squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())
books = {b: squash(open(f"reference/books/{f}.raw.txt", encoding="latin-1").read()) for b, f in {"PHB14": "PHB2014", "XGE": "XGE", "TCE": "TCE"}.items()}
AB = {"strength": "STR", "dexterity": "DEX", "constitution": "CON", "intelligence": "INT", "wisdom": "WIS", "charisma": "CHA"}

out, ok = [], 0
others = [squash(x["name"]) for x in app["feats"] if len(squash(x["name"])) > 5]
for f in app["feats"]:
    if f["id"] == "asi": continue
    t = books[f["book"]]
    k = squash(f["name"])
    # The feat's own block: the occurrence followed (soon) by "prerequisite" or "increase your".
    seg = None
    for m in re.finditer(re.escape(k), t):
        s = t[m.end(): m.end() + 900]
        if re.match(r"(prerequisite|you|your|increase|when|thanks|while|as|through|you've|youve|the|a|wielding|whenever|using|years)", s):
            # Stop where another feat's name begins (the next feat's block).
            cut = min([s.find(o) for o in others if o != k and s.find(o) > 40] + [len(s)])
            seg = s[:cut]; break
    if not seg:
        out.append(f"{f['name']}: block not found (check by hand)"); continue
    inc = re.search(r"increaseyour((?:strength|dexterity|constitution|intelligence|wisdom|charisma|or|abilityscore|onescore)+)", seg[:600])
    book_plus = sorted({AB[a] for a in re.findall("|".join(AB), inc.group(1))}) if inc else []
    if inc and "abilityscoreofyourchoice" in seg[:600].replace("score", "score"): book_plus = sorted(AB.values())
    app_plus = sorted(f.get("plusOne") or [])
    if book_plus != app_plus and not (not inc and not app_plus):
        out.append(f"{f['name']}: +1 options app {app_plus} vs book {book_plus or 'none'}")
    else:
        ok += 1
    pre = re.match(r"prerequisite(.{0,80})", seg)
    if bool(pre) != bool(f.get("req")):
        out.append(f"{f['name']}: prerequisite app {f.get('req')} vs book {pre.group(1)[:60] if pre else 'none'}")
print(f"Feats checked: {ok}")
print("\n".join(out) or "No differences.")
