"""Find the Monster Manual (2014) page of every SRD monster, for "Monster Manual, page N" in the
Lookup. Only page numbers are kept; nothing else from the book goes into the app.

Needs the user's own PDF in reference/books/ (git-ignored) and PyMuPDF:
    pip install pymupdf
    python scripts/mm-pages.py            -> src/data/mmPages.json
"""
import json, os, re, sys, urllib.request
import fitz  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "reference", "books", "Monster Manual.pdf")
OUT = os.path.join(ROOT, "src", "data", "mmPages.json")
SRD = "https://api.open5e.com/v1/monsters/?document__slug=wotc-srd&limit=500&fields=slug,name,size,type,hit_points"
# The printed page number is the PDF page minus this (checked: Owlbear PDF 250 = p. 249,
# Brown Bear PDF 320 = p. 319).
OFFSET = 1
SIZES = r"(tiny|small|medium|large|huge|gargantuan)"
SIZE = re.compile(r"^" + SIZES + r"\b", re.I)
AGES = r"\b(ancient|adult|young|wyrmling)\b"


def words(s):
    """Lower-case letters and single spaces."""
    return re.sub(r"[^a-z]+", " ", s.lower()).strip()


def main():
    if not os.path.exists(PDF):
        sys.exit(f"Missing {PDF}")
    req = urllib.request.Request(SRD, headers={"User-Agent": "CharacterForge"})
    monsters = json.loads(urllib.request.urlopen(req).read())["results"]
    doc = fitz.open(PDF)
    texts = [doc[i].get_text() for i in range(doc.page_count)]
    flat = [words(t) for t in texts]
    page_of = lambda i: i + 1 - OFFSET

    # 1. A heading line straight above "Size type, alignment".
    heads = {}
    # 2. Every stat block: its size/type line and hit points (most headings are drawn in a
    #    decorative font the text layer doesn't have).
    blocks = []
    for i, t in enumerate(texts):
        lines = [l.strip() for l in t.splitlines() if l.strip()]
        for j, l in enumerate(lines):
            if not SIZE.match(l):
                continue
            if j and len(lines[j - 1]) < 60:
                heads.setdefault(words(lines[j - 1]), page_of(i))
            for k in lines[j + 1 : j + 6]:
                hp = re.match(r"hit points\s+(\d+)", k, re.I)
                if hp:
                    blocks.append((i, l.lower(), int(hp.group(1)), words(lines[j - 1]) if j else ""))
                    break

    def named(i, key):
        return len(re.findall(r"(?<![a-z])" + re.escape(key) + r"(?![a-z])", flat[i]))

    def by_stats(m, keys):
        size, typ = m["size"].lower(), m["type"].lower()
        # A block whose readable heading names another SRD monster belongs to that one.
        hits = sorted({i for i, line, hp, head in blocks if line.startswith(size) and typ in line and hp == m["hit_points"] and not (head in names and head not in keys)})
        base = re.sub(AGES, "", keys[0]).strip()
        if len(hits) == 1:
            # Same numbers, different monster (Adult Red and Adult Gold Dragon both have 256 HP):
            # only trust it when the page also names the monster.
            return page_of(hits[0]) if named(hits[0], base) or named(hits[0], keys[0].split()[-1]) else None
        # Several stat blocks fit (e.g. dragons of the same age): the page that names it most.
        scored = sorted(((named(i, base), i) for i in hits), reverse=True)
        if scored and scored[0][0] > 0 and (len(scored) == 1 or scored[0][0] > scored[1][0]):
            return page_of(scored[0][1])
        return None

    def run_on(key):
        rx = re.compile(r"(?<![a-z])" + re.escape(key) + r" " + SIZES)
        for i, t in enumerate(flat):
            if "armor class" in t and rx.search(t):
                return page_of(i)
        return None

    names = {words(m["name"]) for m in monsters}
    pages, missing = {}, []
    for m in monsters:
        name = m["name"]
        keys = [words(name), words(re.sub(r"\s*\(.*\)", "", name)), words(name.split("/")[0])]
        page = next((heads[k] for k in keys if k in heads), None) or by_stats(m, keys) or next((p for p in map(run_on, keys) if p), None)
        if page:
            pages[m["slug"]] = page
        else:
            missing.append(name)
    # Dragons of one colour sit together. Drop any age that landed more than 2 pages away from
    # its colour's other stat blocks (same hit points across colours fool the matching).
    colour = lambda name: re.sub(AGES, "", words(name)).strip()
    for m in monsters:
        if "dragon" not in m["name"].lower() or m["slug"] not in pages:
            continue
        mine = pages[m["slug"]]
        others = [pages[o["slug"]] for o in monsters if o is not m and o["slug"] in pages and colour(o["name"]) == colour(m["name"])]
        if others and min(abs(mine - p) for p in others) > 2:
            del pages[m["slug"]]
            missing.append(m["name"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(pages, f, indent=0, sort_keys=True)
    print(f"{len(pages)} of {len(monsters)} found")
    print("missing:", ", ".join(missing))


if __name__ == "__main__":
    main()
