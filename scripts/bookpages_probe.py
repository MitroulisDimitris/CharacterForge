"""Probe each scanned book: page count, and how many pages carry a printed page number in the text layer
(a bare 1-3 digit line near the bottom or top of the page)."""
import re
from pathlib import Path

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
BOOKS = {"PHB": "PHB2014.pdf", "XGE": "XGE.pdf", "TCE": "TCE.pdf", "MM": "Monster Manual.pdf", "DMG": "Dungeon Master's Guide.pdf"}


def printed_number(page):
    h = page.rect.height
    cands = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            y = l["bbox"][1]
            if (y > h * 0.9 or y < h * 0.06) and re.fullmatch(r"\d{1,3}", t):
                cands.append(int(t))
            m = re.search(r"(?:CHAPTER|APPENDIX|C H A P T E R).{0,40}?\b(\d{1,3})\s*$", t)
            if y > h * 0.9 and m:
                cands.append(int(m.group(1)))
            m = re.match(r"^(\d{1,3})\s+(?:CHAPTER|APPENDIX|C H A P)", t)
            if y > h * 0.9 and m:
                cands.append(int(m.group(1)))
    return cands


for key, f in BOOKS.items():
    d = fitz.open(str(ROOT / "reference/books" / f))
    nums = [printed_number(d[i]) for i in range(d.page_count)]
    have = [(i + 1, n[0]) for i, n in enumerate(nums) if len(n) == 1]
    offs = {}
    for pdf, pr in have:
        offs.setdefault(pr - pdf, []).append(pdf)
    chars = sum(len(d[i].get_text()) for i in range(d.page_count))
    print(f"{key}: {d.page_count} pdf pages, {chars // 1000}k chars, {len(have)} pages with a printed number")
    for o, ps in sorted(offs.items(), key=lambda x: min(x[1])):
        if len(ps) > 1:
            print(f"   offset {o:+d}: pdf {min(ps)}-{max(ps)} ({len(ps)} pages)")
