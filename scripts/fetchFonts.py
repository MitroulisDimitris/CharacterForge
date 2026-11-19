# Downloads the app's fonts (Cinzel, Crimson Pro, Inter; SIL Open Font License) from Google Fonts
# into public/fonts/ and writes src/fonts.css, so the app doesn't load anything from Google.
# Run again only to change the fonts:  python scripts/fetchFonts.py
import re
import urllib.request
from pathlib import Path

URL = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KEEP = {"latin", "latin-ext"}

root = Path(__file__).resolve().parent.parent
out = root / "public" / "fonts"
out.mkdir(parents=True, exist_ok=True)
css = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA})).read().decode()

blocks = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
result = ["/* Self-hosted fonts (SIL Open Font License), made by scripts/fetchFonts.py. */"]
for subset, block in blocks:
    if subset not in KEEP:
        continue
    fam = re.search(r"font-family: '([^']+)'", block).group(1).replace(" ", "")
    style = re.search(r"font-style: (\w+)", block).group(1)
    weight = re.search(r"font-weight: (\d+)", block).group(1)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    name = f"{fam}-{weight}{'i' if style == 'italic' else ''}-{subset}.woff2"
    (out / name).write_bytes(urllib.request.urlopen(src).read())
    result.append(block.replace(src, f"/fonts/{name}"))
(root / "src" / "fonts.css").write_text("\n".join(result) + "\n", encoding="utf-8")
print(len(result) - 1, "font files")
