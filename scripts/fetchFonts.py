# Downloads the app's fonts (Cinzel, Crimson Pro, Inter, EB Garamond; SIL Open Font License) from Google Fonts
# into public/fonts/ and writes src/fonts.css, so the app doesn't load anything from Google.
# Run again only to change the fonts:  python scripts/fetchFonts.py
import re
import urllib.request
from pathlib import Path

URL = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
# Greek too (user, 2026-11-21): Inter has it; Cinzel and Crimson Pro don't, so EB Garamond's Greek
# letters stand in for them (it comes after them in the font stacks; only its Greek files are kept).
KEEP = {"latin", "latin-ext", "greek", "greek-ext"}
GREEK_ONLY = {"EBGaramond"}

root = Path(__file__).resolve().parent.parent
out = root / "public" / "fonts"
out.mkdir(parents=True, exist_ok=True)
css = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA})).read().decode()

blocks = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
result = ["/* Self-hosted fonts (SIL Open Font License), made by scripts/fetchFonts.py. */"]
for subset, block in blocks:
    fam = re.search(r"font-family: '([^']+)'", block).group(1).replace(" ", "")
    if subset not in KEEP or (fam in GREEK_ONLY and not subset.startswith("greek")):
        continue
    style = re.search(r"font-style: (\w+)", block).group(1)
    weight = re.search(r"font-weight: (\d+)", block).group(1)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    name = f"{fam}-{weight}{'i' if style == 'italic' else ''}-{subset}.woff2"
    (out / name).write_bytes(urllib.request.urlopen(src).read())
    result.append(block.replace(src, f"/fonts/{name}"))
(root / "src" / "fonts.css").write_text("\n".join(result) + "\n", encoding="utf-8")
print(len(result) - 1, "font files")

# PDF fonts with Greek (pdf-lib's built-in Helvetica/Times can't show it): whole TTF files, only
# loaded when a character sheet has letters those can't show (src/pdf/primitives.ts).
PDF_URL = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Serif:wght@700"
pdf_css = urllib.request.urlopen(urllib.request.Request(PDF_URL, headers={"User-Agent": "Mozilla/5.0 (Windows NT 6.1)"})).read().decode()
(out / "pdf").mkdir(exist_ok=True)
for block in re.findall(r"@font-face \{.*?\}", pdf_css, re.S):
    fam = re.search(r"font-family: '([^']+)'", block).group(1).replace(" ", "")
    style = re.search(r"font-style: (\w+)", block).group(1)
    weight = re.search(r"font-weight: (\d+)", block).group(1)
    src = re.search(r"url\((https://[^)]+\.ttf)\)", block).group(1)
    name = f"{fam}-{weight}{'i' if style == 'italic' else ''}.ttf"
    (out / "pdf" / name).write_bytes(urllib.request.urlopen(src).read())
    print("pdf font", name)
