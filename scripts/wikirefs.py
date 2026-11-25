"""Book and page for every Wiki entry (user, 2026-11-24: "everything we write on the wiki should have a
reference") -> src/data/wikiRefs.json {"class:barbarian": ["PHB14", 46], ...}.

Read from the extracted books (reference/books/<KEY>.pages.json, made by bookextract.py):
- PHB classes, races and rule pages: the PHB's own index (pages 311-316).
- Subclasses, subraces, backgrounds, feats, conditions and items: their heading, searched only inside
  the chapter they belong to (so a "Fighter" in a race's text isn't taken for the class).
Prints every entry it couldn't place; those get a hand entry in MANUAL after reading the page.

  npx vite-node scripts/wikirefs-dump.ts && python scripts/wikirefs.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKDIR = ROOT / "reference/books"
PARA = chr(10) * 2  # paragraphs in the extracted pages
KEY = {"PHB14": "PHB", "PHB": "PHB", "XGE": "XGE", "TCE": "TCE", "DMG": "DMG"}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower().replace("’", "'"))


def load(key):
    return [p for p in json.loads((BOOKDIR / f"{key}.pages.json").read_text(encoding="utf-8")) if p["page"]]


BOOKS = {k: load(k) for k in ("PHB", "XGE", "TCE", "DMG")}

# Where each kind of entry lives, per book (printed pages).
RANGES = {
    "sub": {"PHB": (45, 121), "XGE": (8, 72), "TCE": (9, 78)},
    "race": {"PHB": (17, 43), "XGE": (8, 72), "TCE": (7, 8)},
    "bg": {"PHB": (125, 141)},
    "feat": {"PHB": (165, 170), "XGE": (73, 75), "TCE": (79, 81)},
    "cond": {"PHB": (290, 292)},
    "item": {"PHB": (143, 161), "DMG": (150, 227), "XGE": (136, 140), "TCE": (119, 135)},
    "poison": {"DMG": (257, 258)},
    "class": {"TCE": (9, 21)},
}

# PHB index: "barbarian, 45, 46-50" -> the first range (or the first page).
INDEX = "\n".join(p["text"] for p in BOOKS["PHB"] if 311 <= p["page"] <= 316)
INDEX_FLAT = re.sub(r"\s+", " ", INDEX)


def from_index(term: str, within=None):
    m = re.search(r"(?<![a-z])" + re.escape(term.lower()) + r"(?: \([^)]*\))?, ((?:\d{1,3}(?:-\d{1,3})?(?:, )?)+)", INDEX_FLAT.lower())
    if not m:
        return None
    parts = [x.strip() for x in m.group(1).split(",") if x.strip()]
    if within:  # the page inside a chapter ("advantage, 7, 173": the rules chapter's 173)
        inside = [x for x in parts if within[0] <= int(x.split("-")[0]) <= within[1]]
        return int(inside[0].split("-")[0]) if inside else None
    ranged = [x for x in parts if "-" in x]
    return int((ranged[0] if ranged else parts[0]).split("-")[0])


def phrase_in(phrase: str, lo: int, hi: int, key: str = "PHB"):
    """The first page in lo..hi whose text holds this phrase."""
    n = norm_ocr(phrase)
    return next((p["page"] for p in BOOKS[key] if lo <= p["page"] <= hi and n in norm_ocr(p["text"])), None)


ITEM_KINDS_PHB: dict = {}


def phrase_page(phrase: str, key: str = "PHB"):
    """The first page whose text holds this phrase (spaces ignored)."""
    n = norm(phrase)
    return next((p["page"] for p in BOOKS[key] if n in norm(p["text"])), None)


def norm_ocr(s: str) -> str:
    """norm() that also forgives the scan's l/I/1 mix-ups ("lMMOVABLE", "lGGWILV")."""
    return norm(s).replace("l", "i").replace("1", "i")


# Tables of contents ("Barrier Tattoo ......... 122") in the first pages of a book.
def contents(key: str) -> dict:
    out = {}
    for p in BOOKS[key][:8]:
        for m in re.finditer(r"([A-Z][A-Za-z'’ ,:\-]{2,60}?)\s*\.{3,}\s*(\d{1,3})\b", p["text"]):
            out.setdefault(norm_ocr(m.group(1)), int(m.group(2)))
    return out


CONTENTS = {k: contents(k) for k in ("XGE", "TCE", "DMG")}
ITEM_TYPE = re.compile(r"(Wondrous item|Weapon|Armor|Ring|Rod|Staff|Wand|Potion|Scroll|artifact)", re.I)


def contents_page(name: str, book: str):
    c = CONTENTS.get(KEY[book], {})
    n = norm_ocr(name)
    return c.get(n) or next((v for k, v in c.items() if k.endswith(n) and len(k) - len(n) <= 12), None)


def item_heading_page(name: str, book: str, kind: str = "item"):
    """A magic item's heading, also with an owner's name before it ("HEWARD'S HANDY HAVERSACK
    Wondrous item, rare") and the scan's l/I slips."""
    key = KEY[book]
    lo, hi = RANGES[kind].get(key, (1, 999))
    n = norm_ocr(name)
    for p in BOOKS[key]:
        if not lo <= p["page"] <= hi:
            continue
        for para in p["text"].split(PARA):
            head = para[:90]
            m = ITEM_TYPE.search(head)
            lead = norm_ocr(head[: m.start()] if m else head[: len(name) + 14])
            if lead.endswith(n) or lead.startswith(n) and (m or para[: len(name)].isupper()):
                if len(lead) - len(n) <= 14:
                    return p["page"]
    return None


def fuzzy_heading_page(name: str, book: str, kind: str, cutoff: float = 0.84):
    """A capitalised heading the scan misspelled ("BEAD OF REERESHMENT"): nearly the same letters."""
    from difflib import SequenceMatcher

    key = KEY[book]
    lo, hi = RANGES[kind].get(key, (1, 999))
    n = norm_ocr(name)
    best = (0.0, None)
    for p in BOOKS[key]:
        if not lo <= p["page"] <= hi:
            continue
        for para in p["text"].split(PARA):
            caps = re.match(r"[A-Z0-9'’ .,:\-]{4,}", para)
            if not caps:
                continue
            r = SequenceMatcher(None, norm_ocr(caps.group(0))[: len(n) + 3], n).ratio()
            if r > best[0]:
                best = (r, p["page"])
    return best[1] if best[0] >= cutoff else None


SRD_ITEMS = {i["id"]: i for i in json.loads((ROOT / "public/srd-items.json").read_text(encoding="utf-8"))}


def desc_page(item_id: str, key: str, lo: int, hi: int):
    """An SRD item: the page where its description (the book's own words) starts."""
    d = SRD_ITEMS.get(item_id, {}).get("desc", "")
    n = norm_ocr(re.sub(r"[*_#>|]", " ", d))[:40]
    if len(n) < 25:
        return None
    return next((p["page"] for p in BOOKS[key] if lo <= p["page"] <= hi and n in norm_ocr(p["text"])), None)


def loose_page(name: str, book: str, kind: str):
    """A heading the scan garbled: the first paragraph in the chapter starting with the name."""
    key = KEY[book]
    lo, hi = RANGES[kind].get(key, (1, 999))
    n = norm(name)
    for p in BOOKS[key]:
        if lo <= p["page"] <= hi and any(norm(para).startswith(n) for para in p["text"].split(PARA)):
            return p["page"]
    return None


def heading_page(name: str, book: str, kind: str, within=None):
    key = KEY[book]
    lo, hi = within or RANGES[kind].get(key, (1, 999))
    n = norm(name)
    if not n:
        return None
    for p in BOOKS[key]:
        if not lo <= p["page"] <= hi:
            continue
        for para in p["text"].split("\n\n"):
            pn = norm(para)
            # The heading, alone or with its text after it ("ALERT Always on the lookout...")
            if pn == n or (pn.startswith(n) and (para[: len(name) + 2].isupper() or re.match(re.escape(name) + r"\s*[.:]", para, re.I) or len(para) <= len(name) + 3)):
                return p["page"]
    return None


RULE_TERMS = {
    "advantage": "advantage",
    "checks": "ability check",
    "actions": "action",
    "opportunity": "opportunity attack",
    "cover": "cover",
    "grapple": "grappling",
    "concentration": "concentration",
    "dying": "death saving throws",
    "resting": "resting",
}
# Entries placed by their own heading phrase (variants inside another entry's page).
PHRASES = {
    "race:humanVariant14": "Variant Human Traits",
    "bg:criminalSpy2014": "Variant Criminal: Spy",
    "bg:gladiator14": "Variant Entertainer: Gladiator",
    "bg:guildMerchant14": "Variant Guild Artisan: Guild Merchant",
    "bg:knight14": "Variant Noble: Knight",
    "bg:pirate14": "Variant Sailor: Pirate",
    "bg:custom14": "Customizing a Background",
}
# Entries looked up in one chapter by a phrase (key: (phrase, first page, last page)).
PHRASES_IN = {"feat:asi": ("Feats", 165, 165)}
# Entries placed by hand after reading the page (key: (book, page)), 2026-11-24: headings the scan
# garbled past matching ("WAND or SMILES", "R on OF THE PACT KEEPER", "BARRIER TATTQO").
MANUAL: dict[str, tuple[str, int]] = {
    "feat:inspiringLeader": ("PHB14", 167),
    "lineage:elf14:drow": ("PHB14", 24),  # "Dark Elf (Drow)"
    "feat:flamesOfPhlegethos": ("XGE", 74),
    "item:srd_arrow-bow": ("PHB", 150),
    "item:srd_spike-iron": ("PHB", 150),
    "item:srd_crawler-mucus": ("DMG", 258),
    "item:srd_essense-of-either": ("DMG", 258),
    "item:dimensional-shackles": ("DMG", 165),
    "item:rod-of-rulership": ("DMG", 197),
    "item:dmg-rod-of-the-pact-keeper-1": ("DMG", 197),
    "item:dmg-rod-of-the-pact-keeper-2": ("DMG", 197),
    "item:dmg-rod-of-the-pact-keeper-3": ("DMG", 197),
    "item:xge-armor-of-gleaming": ("XGE", 136),
    "item:xge-bead-of-nourishment": ("XGE", 136),
    "item:xge-shield-of-expression": ("XGE", 139),
    "item:xge-staff-of-birdcalls": ("XGE", 139),
    "item:xge-wand-of-conducting": ("XGE", 140),
    "item:xge-wand-of-scowls": ("XGE", 140),
    "item:xge-wand-of-smiles": ("XGE", 140),
    "item:tce-barrier-tattoo-uncommon": ("TCE", 122),
    "item:tce-barrier-tattoo-rare": ("TCE", 122),
    "item:tce-barrier-tattoo-very-rare": ("TCE", 122),
}


def main():
    E = json.loads((ROOT / "scripts/out/wiki-entries.json").read_text(encoding="utf-8"))
    out, miss = {}, []

    def put(k, book, page):
        if k in MANUAL:
            out[k] = list(MANUAL[k])
        elif page:
            out[k] = [book, page]
        elif k in MANUAL:
            out[k] = list(MANUAL[k])
        else:
            miss.append(k)

    for c in E["classes"]:
        page = from_index(c["name"]) if KEY[c["book"]] == "PHB" else heading_page(c["name"], c["book"], "class")
        put(f"class:{c['id']}", c["book"], page)
        lo = page or 45
        for s in c["subclasses"]:
            if KEY[s["book"]] == "PHB":
                sp = heading_page(s["name"], "PHB", "sub", within=(lo, lo + 9))
            else:
                sp = heading_page(s["name"], s["book"], "sub") or loose_page(s["name"], s["book"], "sub") or contents_page(s["name"], s["book"])
            put(f"sub:{c['id']}:{s['id']}", s["book"], sp)
    for r in E["races"]:
        k = f"race:{r['id']}"
        if k in PHRASES:
            page = phrase_page(PHRASES[k])
        elif KEY[r["book"]] == "PHB":
            page = from_index(r["name"]) or from_index(re.sub(r"\s*\(.*\)", "", r["name"]))
        else:
            page = heading_page(r["name"], r["book"], "race") or loose_page(r["name"], r["book"], "race") or contents_page(r["name"], r["book"]) or fuzzy_heading_page(r["name"], r["book"], "race")
        put(k, r["book"], page)
        for l in r["lineages"]:
            within = (page, page + 4) if page and KEY[l["book"]] == "PHB" else None
            # A subrace without a heading of its own (dragon colours, drow): the race's page.
            put(f"lineage:{r['id']}:{l['id']}", l["book"], heading_page(l["name"], l["book"], "race", within) or page)
    for b in E["backgrounds"]:
        k = f"bg:{b['id']}"
        put(k, b["book"], phrase_page(PHRASES[k]) if k in PHRASES else heading_page(b["name"], b["book"], "bg") or (from_index(b["name"]) if KEY[b["book"]] == "PHB" else None))
    for f in E["feats"]:
        k = f"feat:{f['id']}"
        put(k, f["book"], phrase_in(*PHRASES_IN[k]) if k in PHRASES_IN else heading_page(f["name"], f["book"], "feat") or loose_page(f["name"], f["book"], "feat") or item_heading_page(f["name"], f["book"], "feat") or contents_page(f["name"], f["book"]) or fuzzy_heading_page(f["name"], f["book"], "feat"))
    for c in E["conditions"] + [{"id": "exhaustion", "name": "Exhaustion"}]:
        put(f"cond:{c['id']}", "PHB14", heading_page(c["name"], "PHB", "cond"))
    for r in E["rules"]:
        k = f"rule:{r['id']}"
        page = heading_page("Actions in Combat", "PHB", "cond", within=(189, 198)) if r["id"] == "actions" else from_index(RULE_TERMS[r["id"]], (170, 210))
        put(k, "PHB14", page)
    for it in E["items"]:
        name = it["name"]
        page = heading_page(name, it["source"], "item") or loose_page(name, it["source"], "item")
        page = page or (item_heading_page(name, it["source"]) if KEY[it["source"]] != "PHB" else None) or contents_page(name, it["source"])
        if not page and it["id"] in SRD_ITEMS:
            page = desc_page(it["id"], KEY[it["source"]], *RANGES["item"][KEY[it["source"]]])
        if not page and KEY[it["source"]] in ("XGE", "TCE", "DMG"):
            page = fuzzy_heading_page(name, it["source"], "item")
        if not page and not ITEM_KINDS_PHB.get(it["id"]):  # poisons: the DMG's poison table, whatever the data says
            page = heading_page(name, "DMG", "poison") or loose_page(name, "DMG", "poison")
            if page:
                it = {**it, "source": "DMG"}
        if not page and name.endswith(" Armor"):  # "Hide Armor" is "Hide" in the armor table
            page = loose_page(name[: -len(" Armor")], it["source"], "item")
        if not page:  # "Armor, +1" -> "Armor"; "Potion of Healing (greater)" -> "Potion of Healing"
            base = re.split(r",|\(", name)[0].strip()
            page = heading_page(base, it["source"], "item") if base != name else None
        if not page and KEY[it["source"]] == "PHB":  # gear in the equipment tables: the first page naming it
            n = norm(name)
            page = next((p["page"] for p in BOOKS["PHB"] if 143 <= p["page"] <= 161 and n in norm(p["text"])), None)
        put(f"item:{it['id']}", it["source"], page)

    dst = ROOT / "src/data/wikiRefs.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print(len(out), "placed ->", dst, "|", len(miss), "not placed")
    for k in miss:
        print("  MISSING", k)


if __name__ == "__main__":
    main()
