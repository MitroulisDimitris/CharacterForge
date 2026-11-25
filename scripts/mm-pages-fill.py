"""Fill the SRD monsters mm-pages.py couldn't place from the extracted Monster Manual text
(reference/books/MM.pages.json, bookextract.py). Updates src/data/mmPages.json.

Order: the monster's capitalised heading ("FROST GIANT"), a "Swarm of Spiders." line, then the page
naming it most often. Dragons by age: the stat block isn't findable by name in the scan, so a young
or adult dragon takes the page of its colour's other stat blocks. Prints every choice for a hand check.

  python scripts/mm-pages-fill.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/data/mmPages.json"
PARA = chr(10) * 2


def n(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower().replace("1", "l")).replace("l", "i")


def main():
    pages = json.loads(OUT.read_text(encoding="utf-8"))
    mm = [p for p in json.loads((ROOT / "reference/books/MM.pages.json").read_text(encoding="utf-8")) if p["page"]]
    monsters = json.loads((ROOT / "public/srd-monsters.json").read_text(encoding="utf-8"))
    found, left = {}, []
    for m in [m for m in monsters if m["slug"] not in pages]:
        name = n(m["name"])
        how, page = "", None
        for p in mm:
            for para in p["text"].split(PARA):
                caps = re.match(r"[A-Z0-9'’ ,.\-]{3,}", para)
                if caps and n(caps.group(0)) == name:
                    how, page = "heading", p["page"]
                    break
            if page:
                break
        if not page:
            page = next((p["page"] for p in mm if any(n(x.split(".")[0]) == name for x in p["text"].split(PARA))), None)
            how = "line" if page else ""
        dragon = re.match(r"(young|adult) (\w+) dragon", m["name"].lower())
        if not page and dragon:
            colour = dragon.group(2)
            sib = [pages[k] for k in pages if re.match(rf"(ancient|adult|young)-{colour}-dragon$|{colour}-dragon-wyrmling$", k)]
            if sib:
                page, how = max(sib), f"next to its colour ({sorted(sib)})"
        if not page:
            counts = sorted(((len(re.findall(name, n(p["text"]))), p["page"]) for p in mm), reverse=True)
            if counts and counts[0][0] >= 2:
                page, how = counts[0][1], f"named {counts[0][0]} times"
        if page:
            found[m["slug"]] = page
            print(f"  {m['name']}: {page} ({how})")
        else:
            left.append(m["name"])
    # Placed by hand (2026-11-24): its heading didn't survive the scan; its text is on 350.
    for slug, pg in {"tribal-warrior": 350}.items():
        if slug not in pages and slug not in found:
            found[slug] = pg
            left = [x for x in left if x != "Tribal Warrior"]
    pages.update(found)
    OUT.write_text(json.dumps(dict(sorted(pages.items())), indent=1), encoding="utf-8")
    print(f"{len(found)} filled, {len(left)} left: {left}")


if __name__ == "__main__":
    main()
