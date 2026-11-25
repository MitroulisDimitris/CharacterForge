"""Player's Handbook (2014) page of every SRD spell -> public/spell-pages-2014.json ({SRD name: page}),
for the Wiki's "Player's Handbook, page N" line (not shown yet).

  node scripts/... writes scripts/out/srd-names.txt (SRD names, with the PHB names of the 17 spells
  the SRD renames: "Private Sanctum" = "Mordenkainen's Private Sanctum"), then
  python scripts/spelltext.py scripts/out/srd-names.txt   (copy its output to scripts/out/srd-raw.json)
  python scripts/spellpages.py

Pages use the PHB_OFFSETS read off the user's copy (spelltextclean.py). The five spells whose headings
are split in the scan were found by their opening words (FOUND_BY_TEXT, PDF page numbers).
"""
import json
from pathlib import Path

from spelltextclean import phb_page

ROOT = Path(__file__).resolve().parent.parent
FOUND_BY_TEXT = {"Faithful Hound": 240, "Magnificent Mansion": 240, "Private Sanctum": 241, "Protection from Evil and Good": 248, "Resilient Sphere": 243}


def main():
    raw = json.loads((ROOT / "scripts/out/srd-raw.json").read_text(encoding="utf-8"))
    alias = json.loads((ROOT / "scripts/out/srd-alias.json").read_text(encoding="utf-8"))  # SRD name -> PHB name
    phb_to_srd = {v: k for k, v in alias.items()}
    srd = [s["name"] for s in json.loads((ROOT / "public/srd-spells.json").read_text(encoding="utf-8"))]
    out = {}
    for phb_name, e in raw.items():
        name = phb_to_srd.get(phb_name, phb_name)
        if name in FOUND_BY_TEXT:
            continue
        out[name] = phb_page(e["page"])
    for name, pdf in FOUND_BY_TEXT.items():
        out[name] = phb_page(pdf + 19)
    missing = [n for n in srd if n not in out]
    if missing:
        raise SystemExit(f"no page for {missing}")
    out = {n: out[n] for n in sorted(out)}
    (ROOT / "public/spell-pages-2014.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    print(len(out), "spells ->", ROOT / "public/spell-pages-2014.json")


if __name__ == "__main__":
    main()
