"""Check subclass spell tables (domains, oaths, circles, patrons, ...) against the book texts.

Usage: python scripts/subclasscheck.py <app2014.json>
For each subclass, finds its spell table heading in the book text, takes the text after it, and
checks every app spell appears there in the row for its class level (1st/2nd/3rd/5th).
"""
import json, re, sys

app = json.load(open(sys.argv[1], encoding="utf-8"))
squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())
FIX = [("lst", "1st"), ("leve1", "level"), ("ofthe", "ofthe")]
books = {}
for b, f in {"PHB14": "PHB2014", "XGE": "XGE", "TCE": "TCE"}.items():
    t = squash(open(f"reference/books/{f}.raw.txt", encoding="latin-1").read())
    books[b] = t

# Heading text to search for, by subclass name (squashed); default: "<name>spells".
HEAD = {
    "theArchfey": "archfeyexpandedspells", "theFiend": "fiendexpandedspells", "theGreatOldOne": "greatoldoneexpandedspells",
    "theCelestial": "celestialexpandedspells", "theHexblade": "hexbladeexpandedspells", "theFathomless": "fathomlessexpandedspells",
    "theGenie": "genieexpandedspells", "aberrantMind": "psionicspells", "clockworkSoul": "clockworkspells",
}

def table(book, head):
    t = books[book]
    hits = [m.start() for m in re.finditer(head, t)]
    # Prefer the occurrence followed by a level column ("1st"/"3rd"/"5th" soon after).
    for h in hits:
        seg = t[h + len(head): h + len(head) + 700]
        if re.search(r"(1st|3rd|5th|2nd)", seg[:200]):
            return seg
    return None

out, ok = [], 0
for c in app["classes"]:
    for s in c["subclasses"]:
        rows = [(n, l) for n, l in s["spells"]] + [(n, l) for n, l in s["expanded"]]
        if not rows:
            continue
        key = re.sub(r"^(the|domain|oathof|circleof|pathof|collegeof|wayof|schoolof)", "", squash(s["name"]))
        heads = [HEAD.get(s["id"], squash(s["name"]) + "spells"), re.sub("^the", "", squash(s["name"])) + "expandedspells"]
        seg = None
        for head in heads:
            for b in ([s["book"]] + [x for x in books if x != s["book"]]):
                seg = table(b, head)
                if seg: break
            if seg: break
        if not seg:
            out.append(f"{c['name']} / {s['name']}: spell table not found in the book text (check by hand)")
            continue
        pos = {}
        for n, lv in rows:
            k = squash(n)
            if k not in seg:
                out.append(f"{c['name']} / {s['name']}: '{n}' not found in the book table")
            else:
                pos[n] = (lv, seg.index(k))
                ok += 1
        # Book tables list rows in level order: every spell of a lower level must come first.
        for n1, (l1, p1) in pos.items():
            for n2, (l2, p2) in pos.items():
                if l1 < l2 and p1 > p2:
                    out.append(f"{c['name']} / {s['name']}: '{n1}' (app level {l1}) comes after '{n2}' (app level {l2}) in the book")
print(f"Subclass spells confirmed: {ok}")
print("\n".join(out) or "No differences.")
