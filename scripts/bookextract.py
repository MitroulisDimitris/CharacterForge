"""Full text of the user's own books (reference/books, git-ignored), page by page, with the printed
page numbers, so the PDFs aren't needed to look things up (user, 2026-11-24: "extract the whole books").

  python scripts/bookextract.py            (all five)      python scripts/bookextract.py PHB XGE

Writes, next to each PDF (git-ignored like the books):
  reference/books/<KEY>.pages.json   [{"pdf": 12, "page": 11, "text": "..."}]  (page null: cover/unnumbered)
  reference/books/<KEY>.md           "## Page 11" sections, for reading and grep

The text is the scan's OCR, cleaned the same way as the spell text (split words joined with a
vocabulary from the SRD files, dice and number slips fixed: see spelltextclean.py). It is not
hand-checked: tables and numbers can still carry OCR slips, so check those on the page image before
putting them in the app.

Page numbers: XGE, TCE and MM print PDF page - 1 on every page, the DMG the PDF page itself (read
off the footers). The PHB scan lacks 22 printed pages (full-page art) and its footers are faint: the
offsets below were read off the footer images page by page (2026-11-24) and checked against 20 spell
pages the user read in his copy; PDF 118, 166 and 187 carry no number and were placed by their text
running on from the page before.
"""
import json
import re
import sys
from pathlib import Path

import pymupdf as fitz

from spelltextclean import clean

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "reference/books"

# PHB: (first PDF page, printed page - PDF page). Missing printed pages: 9-10, 16, 25, 44, 120, 125,
# 142, 156, 162, 171-172, 180, 184, 188, 199-200, 206, 232, 247, 268, 286.
PHB_OFFSETS = [(2, 1), (8, 3), (13, 4), (21, 5), (39, 6), (114, 7), (118, 8), (134, 9), (147, 10), (152, 11), (160, 13), (167, 14), (170, 15), (173, 16), (183, 18), (188, 19), (213, 20), (227, 21), (247, 22), (264, 23)]

BOOKS = {
    "PHB": ("PHB2014.pdf", "Player's Handbook (2014)"),
    "XGE": ("XGE.pdf", "Xanathar's Guide to Everything"),
    "TCE": ("TCE.pdf", "Tasha's Cauldron of Everything"),
    "MM": ("Monster Manual.pdf", "Monster Manual"),
    "DMG": ("Dungeon Master's Guide.pdf", "Dungeon Master's Guide"),
}
FIXED = {"XGE": -1, "TCE": -1, "MM": -1, "DMG": 0}


def printed(key: str, pdf: int):
    if key == "PHB":
        off = None
        for first, o in PHB_OFFSETS:
            if pdf >= first:
                off = o
        return pdf + off if off is not None else None
    n = pdf + FIXED[key]
    return n if n >= 1 else None


# Running heads and page numbers at the page edges ("PART 1 | RACES 24", "CHAPTER 3 | SPELLS").
EDGE = re.compile(r"^(?:\d{1,3}\s*)?(?:P\s*A\s*R\s*T|C\s*H\s*A\s*P\s*T\s*E\s*R|A\s*P\s*P\s*E\s*N\s*D\s*I\s*X|PREFACE|INTRODUCTION|INDEX)\b.{0,60}\|.{0,60}$|^\d{1,3}$", re.I)


def page_text(page) -> str:
    h = page.rect.height
    paras = []
    for b in page.get_text("dict")["blocks"]:
        lines = []
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            if not t:
                continue
            y = l["bbox"][1]
            if (y > h * 0.9 or y < h * 0.05) and EDGE.match(t):
                continue
            lines.append(t)
        if not lines:
            continue
        text = ""
        for t in lines:
            if not text:
                text = t
            elif re.search(r"[a-z]-$", text) and not re.search(r"\d-$", text):
                text = text[:-1] + t  # a word broken over two lines
            else:
                text += " " + t
        text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("’", "'")
        text = clean(text)
        # A sentence broken over two blocks (a column or line break): join it again.
        if paras and text[:1].islower() and not re.search(r"[.:!?)\"'”]$", paras[-1]):
            paras[-1] += " " + text
        elif text:
            paras.append(text)
    return "\n\n".join(paras)


def extract(key: str):
    fname, title = BOOKS[key]
    doc = fitz.open(str(DIR / fname))
    pages = []
    for i in range(doc.page_count):
        pdf = i + 1
        pages.append({"pdf": pdf, "page": printed(key, pdf), "text": page_text(doc[i])})
    (DIR / f"{key}.pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")
    md = [f"# {title}\n", "Text from the scanned book, page by page (printed page numbers). OCR: check tables and numbers on the page image.\n"]
    for p in pages:
        md.append(f"\n## Page {p['page']}  (PDF {p['pdf']})\n" if p["page"] else f"\n## PDF page {p['pdf']} (no printed number)\n")
        md.append(p["text"] + "\n")
    (DIR / f"{key}.md").write_text("".join(md), encoding="utf-8")
    words = sum(len(p["text"].split()) for p in pages)
    print(f"{key}: {len(pages)} pages, {words} words -> {key}.pages.json, {key}.md")


if __name__ == "__main__":
    for k in sys.argv[1:] or list(BOOKS):
        extract(k)
