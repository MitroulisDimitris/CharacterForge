"""Full spell text from the user's own books (reference/books, git-ignored) for the 2014 spells the
SRD leaves out. Writes scripts/out/spelltext-raw.json; the cleaned, reviewed text lives in
src/systems/dnd5e/data2014/spellText.json (user, 2026-11-23: full book text is wanted in this
private app).

  python scripts/spelltext.py names.txt     (one spell per line: "Name|BOOK", BOOK = PHB14/XGE/TCE)

The books are scans: the text layer has OCR slips ("dam age", "ld6", "1d] 2"). `clean()` joins split
words with a vocabulary built from the SRD files and fixes the common slips; what's left is fixed by
hand in the JSON after reading the page.
"""
import json
import re
import sys
from pathlib import Path

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
BOOKS = {
    "PHB14": ("reference/books/PHB2014.pdf", "Calm Emotions", 221),
    "XGE": ("reference/books/XGE.pdf", "Toll the Dead", 169),
    "TCE": ("reference/books/TCE.pdf", "Mind Sliver", 108),
}
LEVEL = re.compile(r"^\s*([\dlI]\s*(st|nd|rd|th|ST|ND|RD|TH)\s*[-—–]\s*l\s*e\s*v\s*e\s*[l1I\]|]|[A-Za-z][A-Za-z' ]*c\s*a\s*n\s*t\s*r)", re.I)
BULLET = re.compile(r"^\s*[-•.·*]\s+(?=[A-Z])")
JUNK = re.compile(r"^(CHAPTER\s+\d+.*|C\s*H\s*A\s*P\s*T\s*E\s*R.*|\d{1,3}|.*\|\s*SPELLS?\s*|SPELLS?\s*\|.*)$", re.I)


def norm(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower().replace("1", "l"))


def lines_of(path: str):
    doc = fitz.open(str(ROOT / path))
    out = []
    for pi in range(doc.page_count):
        page = doc[pi]
        w = page.rect.width
        rows = []
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                t = "".join(s["text"] for s in l["spans"]).rstrip()
                if not t.strip():
                    continue
                size = max(s["size"] for s in l["spans"])
                bold = any("Bold" in s["font"] or "Heavy" in s["font"] for s in l["spans"])
                x0 = l["bbox"][0]
                rows.append({"page": pi, "x": x0, "y": l["bbox"][1], "col": 0 if x0 < w * 0.45 else 1, "t": t, "size": size, "bold": bold})
        for col in (0, 1):
            xs = sorted(r["x"] for r in rows if r["col"] == col)
            m = xs[len(xs) // 2] if xs else 0  # the median line: most lines start at the margin
            for r in rows:
                if r["col"] == col:
                    r["indent"] = r["x"] - m
        out.extend(rows)
    return out


def find_offset(lines, name, printed):
    for i, r in enumerate(lines):
        if norm(r["t"]) == norm(name) and is_header(lines, i):
            return printed - (r["page"] + 1)
    raise SystemExit(f"offset: {name} not found")


def next_real(lines, i):
    j = i + 1
    while j < len(lines) and len(lines[j]["t"].strip()) <= 2:
        j += 1
    return j


CAST = re.compile(r"^\s*C\s*a\s*s\s*t\s*i\s*n\s*g\s*T\s*i\s*m\s*e", re.I)


def is_header(lines, i):
    r = lines[i]
    j = next_real(lines, i)
    if j >= len(lines) or len(r["t"]) >= 45 or r["t"].strip().endswith(".") or "(" in r["t"]:
        return False
    k = next_real(lines, j)
    return LEVEL.match(lines[j]["t"]) is not None or (k < len(lines) and CAST.match(lines[k]["t"]) is not None and len(lines[j]["t"]) < 40)


def extract(lines, name, heads):
    from difflib import SequenceMatcher

    best, i = 0.0, -1
    for h in heads:
        ratio = SequenceMatcher(None, norm(lines[h]["t"]), norm(name)).ratio()
        if ratio > best:
            best, i = ratio, h
    if best < 0.8:
        return None
    start = i
    k = next_real(lines, i)
    level_line = lines[k]["t"].strip()
    j = k + 1
    stats = []
    while j < len(lines) and not re.match(r"^\s*D\s*u\s*r\s*a\s*t\s*i\s*o\s*n", lines[j]["t"]):
        stats.append(lines[j]["t"].strip())
        j += 1
    dur = lines[j]["t"].strip() if j < len(lines) else ""
    j += 1
    body = []
    while j < len(lines) and not is_header(lines, j) and lines[j]["page"] - lines[start]["page"] <= 2:
        t = lines[j]["t"].strip()
        if re.match(r"^(APPENDIX|A\s*P\s*P\s*E\s*N\s*D\s*I\s*X)", t):
            break
        if not JUNK.match(t):
            body.append(lines[j])
        j += 1
    paras = []
    for r in body:
        t = r["t"].strip().replace("ﬁ", "fi").replace("ﬂ", "fl").replace("’", "'").replace("—", "-")
        bullet = BULLET.match(t)
        in_bullet = bool(paras) and paras[-1].startswith("• ")
        new = not paras or bullet or (r["indent"] > 4 and not in_bullet) or re.match(r"^A\s*t\s+H\s*i\s*g\s*h\s*e\s*r\s+L\s*e\s*v\s*e\s*l\s*s", t, re.I)
        if in_bullet and not bullet and r["indent"] > 4 and re.match(r"^[A-Z][a-z]+( [A-Z][a-z]+)*\.", t):
            new = True  # a new headed paragraph ("Great Tree. ...") after a list
        if bullet:
            t = "• " + t[bullet.end():]
        if new:
            paras.append(t)
        else:
            prev = paras[-1]
            paras[-1] = prev[:-1] + t if re.search(r"[a-z]-$", prev) and not re.search(r"\d-$", prev) else prev + " " + t
    return {"page0": lines[start]["page"], "head": lines[start]["t"].strip(), "level": level_line, "stats": stats, "duration": dur, "paras": paras}


def main():
    want = [l.strip().split("|") for l in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if l.strip()]
    by = {}
    for name, book in want:
        by.setdefault(book, []).append(name)
    out = {}
    for book, names in by.items():
        path, known, printed = BOOKS[book]
        lines = lines_of(path)
        off = find_offset(lines, known, printed)
        heads = [i for i in range(len(lines)) if is_header(lines, i)]
        for n in names:
            e = extract(lines, n, heads)
            if not e:
                print("NOT FOUND", book, n)
                continue
            e["page"] = e.pop("page0") + 1 + off
            e["book"] = book
            out[n] = e
    dst = ROOT / "scripts/out/spelltext-raw.json"
    dst.parent.mkdir(exist_ok=True)
    dst.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(len(out), "of", len(want), "->", dst)


if __name__ == "__main__":
    main()
