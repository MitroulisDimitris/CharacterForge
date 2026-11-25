"""Turn scripts/out/spelltext-raw.json (see spelltext.py) into public/spell-text-2014.json: the full
text of every 2014 spell in the app (user, 2026-11-23: full book text is wanted in this private app).

- SRD spells: the SRD 5.1 text (the same words as the book).
- The others: the book text, with OCR-split words joined (vocabulary from the SRD files), dice and
  number slips fixed, then the hand fixes in scripts/spelltext-fixes.json (checked on the pages).

  python scripts/spelltext.py scripts/out/names-all.txt && python scripts/spelltextclean.py

Prints the words still unknown per spell, for a hand check.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORD = re.compile(r"[A-Za-z]+(?:'[a-z]+)?")


def vocab():
    words = {}
    texts = []
    for f in ("public/srd-spells.json", "public/srd-monsters.json", "public/srd-items.json"):
        p = ROOT / f
        if p.exists():
            texts.append(p.read_text(encoding="utf-8"))
    for p in (ROOT / "src").rglob("*.ts"):
        texts.append(p.read_text(encoding="utf-8"))
    for t in texts:
        for w in WORD.findall(t.replace("’", "'")):
            w = w.lower()
            words[w] = words.get(w, 0) + 1
    vocab = {w for w, n in words.items() if n >= 2 or len(w) > 3}
    # Words the books themselves spell out whole, often enough not to be OCR fragments.
    book = {}
    for p in (ROOT / "reference/books").glob("*.raw.txt"):
        for w in WORD.findall(p.read_text(encoding="utf-8", errors="ignore").replace("’", "'")):
            if len(w) >= 4:
                w = w.lower()
                book[w] = book.get(w, 0) + 1
    def glued(w: str) -> bool:  # "ofthe", "offorce": two words the scan ran together
        return any((w[:i] in vocab or w[:i] in ("a", "i", "of", "to", "in", "on", "at", "by", "or", "an", "as", "is", "it")) and w[i:] in vocab and len(w[i:]) > 1 for i in range(1, len(w) - 1))

    return vocab, vocab | {w for w, n in book.items() if n >= 5 and w not in vocab and not glued(w)}


# V: words from the SRD files and the app (a split piece in V is a real word, so no join);
# VJ: V plus words the books spell out whole (only ever the result of a join or a shift).
V, VJ = vocab()
SHORT_OK = {"a", "i"}
TWO = {"an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we", "ac", "hp", "dc", "gp", "sp", "cp", "pp", "ft"}


def known(w: str) -> bool:
    w = w.lower().strip("'")
    return w in V and (len(w) > 2 or w in SHORT_OK or w in TWO)


def known_j(w: str) -> bool:
    w = w.lower().strip("'")
    return (w in VJ and len(w) > 2) or known(w)


def core(tok: str) -> str:
    return re.sub(r"^[^A-Za-z']+|[^A-Za-z']+$", "", tok)


def join_words(text: str) -> str:
    toks = text.split(" ")
    out = []
    i = 0
    while i < len(toks):
        done = False
        for k in range(min(10, len(toks) - i), 1, -1):
            parts = toks[i : i + k]
            if any(re.search(r"[0-9]", p) for p in parts):
                continue
            # punctuation may only sit before the first or after the last piece
            if any(re.search(r"[^A-Za-z']", p) for p in parts[1:-1]) or re.search(r"[^A-Za-z']$", parts[0]) or re.search(r"^[^A-Za-z']", parts[-1]):
                continue
            joined = "".join(parts)
            c = core(joined)
            if not c or not known_j(c):
                continue
            pieces = [core(p) for p in parts]
            if all(known(p) for p in pieces if p) and not any(len(p) == 1 and p.lower() not in SHORT_OK for p in pieces):
                continue
            out.append(joined)
            i += k
            done = True
            break
        if not done:
            out.append(toks[i])
            i += 1
    return " ".join(out)


FIXES = [
    (r"­\s?", ""),
    (r"\b(\d) (\d)(st|nd|rd|th)\b", r"\1\2\3"),
    (r"\baW isdom\b", "a Wisdom"),
    (r"\baw eapon\b", "a weapon"),
    (r"\b[lI]st\b", "1st"),
    (r"\bllth\b", "11th"),
    (r"\b([Ii])fyou\b", r"\1f you"),
    (r"\blfyou\b", "If you"),
    (r"\bofyou\b", "of you"),
    (r"\bofa\b", "of a"),
    (r"\b(\d+)dl[O0]\b", r"\1d10"),
    (r"\b[lI](d\d)", r"1\1"),
    (r"\b(\d+)\s?d\s?[lI]\s?(\d)\b", r"\1d1\2"),
    (r"\b(\d+)\s?d\s?\]\s?(\d)\b", r"\1d1\2"),
    (r"\b(\d+)\s?d\s?[lI]\b", r"\1d1"),
    (r"\b(\d+) d (\d+)\b", r"\1d\2"),
    (r"\b(\d+)d (\d+)\b", r"\1d\2"),
    (r"\b(\d+) d(\d+)\b", r"\1d\2"),
    (r"\b(\d) (\d)(\d) gp\b", r"\1\2\3 gp"),
    (r"\b(\d) ,(\d) ?(\d) ?(\d)\b", r"\1,\2\3\4"),
    (r"\b(\d) th\b", r"\1th"),
    (r"(\d) (st|nd|rd|th)\b", r"\1\2"),
    (r"\s+([,.;:!?])", r"\1"),
    (r"\s{2,}", " "),
    (r"’", "'"),
    (r"[“”]", '"'),
]
PARA = "\n\n"


def shift_boundaries(text: str) -> str:
    """'aw ood' -> 'a wood', 'them echanics' -> 'the mechanics': one letter landed on the wrong side."""
    toks = text.split(" ")
    for i in range(len(toks) - 1):
        a, b = toks[i], toks[i + 1]
        ca, cb = core(a), core(b)
        if not ca or not cb or known_j(ca) and known_j(cb) or not re.fullmatch(r"[A-Za-z']+[^A-Za-z']*", b) or not re.fullmatch(r"[^A-Za-z']*[A-Za-z']+", a):
            continue
        if len(ca) > 1 and len(cb) >= 3 and not known_j(cb) and known(ca[:-1]) and known_j(ca[-1] + cb):
            toks[i], toks[i + 1] = a[:-1], a[-1] + b
        elif len(cb) > 1 and len(ca) >= 3 and not known_j(ca) and known_j(ca + cb[0]) and known(cb[1:]):
            toks[i], toks[i + 1] = a + b[0], b[1:]
    return " ".join(toks)


GLUED = re.compile(r"\b(of|to|in|on|at|by|for|from|with|and|or|is)(the|a|an|your|its|you|this|that|each|their|his|her)\b")


def split_glued(text: str) -> str:
    """'ofthe' -> 'of the', 'toa' -> 'to a' (only when the glued form isn't a word itself)."""
    return GLUED.sub(lambda m: m.group(0) if known_j(m.group(0)) else f"{m.group(1)} {m.group(2)}", text)


def clean(t: str) -> str:
    t = re.sub(r"[  -​  　	]", " ", t)
    t = t.replace("’", "'").replace("—", "-").replace("ﬁ", "fi").replace("ﬂ", "fl")
    t = join_words(t)
    t = shift_boundaries(t)
    t = split_glued(t)
    for a, b in FIXES:
        t = re.sub(a, b, t)
    return t.strip()


def apply_fix(e, fx):
    for old, new in fx.get("replace", []):
        joined = PARA.join(e["text"])
        if old not in joined and old not in e["higher"]:
            if new in joined or new in e["higher"]:
                continue  # the cleaner already does it
            raise SystemExit(f"fix not found: {old!r}")
        e["text"] = joined.replace(old, new).split(PARA)
        e["higher"] = e["higher"].replace(old, new)
    if "text" in fx:
        e["text"] = fx["text"]
    if "higher" in fx:
        e["higher"] = fx["higher"]


def srd_entry(s):
    return [p.strip() for p in re.split(r"\n+", s["desc"]) if p.strip()], s.get("higher_level") or ""


# The PHB scan lacks some printed pages (art), so a spell's page = its PDF page + an offset that
# grows at each gap. Read off the user's own copy, 2026-11-23 (20 spells, PDF page vs printed page).
# (first PDF page, offset).
PHB_OFFSETS = [(1, 19), (213, 20), (227, 21), (247, 22), (264, 23)]  # missing printed pages: 232, 247, 268, 286


def phb_page(raw_page: int):
    pdf = raw_page - 19  # spelltext.py adds 19 (its one known offset)
    off = None
    for first, o in PHB_OFFSETS:
        if pdf >= first:
            off = o
    return pdf + off if off is not None else None


def main():
    raw = json.loads((ROOT / "scripts/out/spelltext-raw.json").read_text(encoding="utf-8"))
    fixes = json.loads((ROOT / "scripts/spelltext-fixes.json").read_text(encoding="utf-8"))
    srd = {s["name"].lower(): s for s in json.loads((ROOT / "public/srd-spells.json").read_text(encoding="utf-8"))}
    out = {}
    for name, e in raw.items():
        # XGE and TCE pages match the printed numbers; PHB pages go through PHB_OFFSETS.
        p = phb_page(e["page"]) if e["book"] == "PHB14" else e["page"]
        page = {"book": e["book"], "page": p} if p else {"book": e["book"]}
        s = srd.get(name.lower())
        if s:  # the SRD 5.1 text is the book's text for these
            text, higher = srd_entry(s)
            out[name] = {**page, "text": text, "higher": higher}
            continue
        paras = []
        for p in e["paras"]:
            cut = re.search(r"APPENDIX\s+[A-Z]\s*:", p)
            paras.append(clean(p[: cut.start()] if cut else p))
            if cut:
                break
        higher = ""
        body = []
        for p in paras:
            m = re.match(r"^At Higher Levels\.\s*", p, re.I)
            if m:
                higher = p[m.end():]
            else:
                body.append(p)
        entry = {**page, "text": body, "higher": higher}
        if name in fixes:
            apply_fix(entry, fixes[name])
        out[name] = entry
        unknown = sorted({w for p in entry["text"] + [entry["higher"]] if isinstance(p, str) for w in WORD.findall(p) if not known(w)})
        if unknown:
            print(f"{name} ({e['book']} p.{e['page']}): {' '.join(unknown)}")
    # Heading on two lines in the scan: SRD text; page from the user's copy (2026-11-23).
    extra = {"Protection from Evil and Good": ("PHB14", 270)}
    for name, (book, page) in extra.items():
        if name not in out and name.lower() in srd:
            text, higher = srd_entry(srd[name.lower()])
            out[name] = {"book": book, "page": page, "text": text, "higher": higher}
    missing = [k for k in fixes if not k.startswith("_") and k not in out]
    if missing:
        raise SystemExit(f"fixes for unknown spells: {missing}")
    dst = ROOT / "public/spell-text-2014.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(out), "spells ->", dst)


if __name__ == "__main__":
    main()
