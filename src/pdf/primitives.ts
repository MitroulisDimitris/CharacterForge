// Shared drawing helpers for every system's PDF sheet (pdf-lib, US Letter).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

export const W = 612;
export const H = 792;
export const M = 36;

export const INK = rgb(0.13, 0.1, 0.08);
export const MUTED = rgb(0.42, 0.36, 0.3);
export const ACCENT = rgb(0.55, 0.12, 0.18);
export const LINE = rgb(0.62, 0.52, 0.38);
export const FILL = rgb(0.97, 0.94, 0.88);
export const HEAD_FILL = rgb(0.93, 0.88, 0.78);
export const WHITE = rgb(1, 1, 1);

// Characters the standard PDF fonts (WinAnsi) can show beyond Latin-1.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const REPLACE: Record<string, string> = { "−": "-", "◆": "*", "×": "x", "○": "o", "●": "*", "☀": "", "☾": "", "✓": "v", "≤": "<=", "≥": ">=", "◇": "<>", "⟳": "" };

export function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch in REPLACE) out += REPLACE[ch];
    else if (ch === "\t") out += " ";
    else if (ch.charCodeAt(0) <= 255 || WIN_ANSI_EXTRA.includes(ch)) out += ch;
    else out += "?";
  }
  return out;
}

export interface Fonts {
  reg: PDFFont;
  bold: PDFFont;
  ital: PDFFont;
  head: PDFFont;
}

export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of clean(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let cur = "";
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= width || !cur) cur = trial;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    lines.push(cur);
  }
  return lines;
}

export function fit(text: string, font: PDFFont, size: number, width: number): string {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > width) t = t.slice(0, -1);
  return t + "…";
}

export async function createDoc(title: string, author: string): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  doc.setTitle(clean(title));
  doc.setAuthor(clean(author));
  doc.setCreator("Character Forge");
  const fonts: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    ital: await doc.embedFont(StandardFonts.HelveticaOblique),
    head: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
  return { doc, fonts };
}

/** A page-drawing helper. y values are measured from the top of the page. */
export class Sheet {
  page!: PDFPage;
  constructor(
    public doc: PDFDocument,
    public f: Fonts,
    /** Shown at the top of every continuation page. */
    public header: { name: string; subtitle: string },
    public footerText = "Character Forge · personal use",
  ) {}

  blankPage() {
    this.page = this.doc.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
    this.footer();
  }

  newPage(title: string) {
    this.blankPage();
    this.text(this.header.name || "Unnamed", M, 40, 16, this.f.head, ACCENT);
    this.text(fit(this.header.subtitle, this.f.reg, 8.5, 380), M, 53, 8.5, this.f.reg, MUTED);
    this.text(title.toUpperCase(), W - M - this.f.head.widthOfTextAtSize(clean(title.toUpperCase()), 11), 40, 11, this.f.head, INK);
    this.page.drawLine({ start: { x: M, y: H - 60 }, end: { x: W - M, y: H - 60 }, thickness: 1.2, color: ACCENT });
  }

  footer() {
    const t = clean(this.footerText);
    this.text(t, W / 2 - this.f.reg.widthOfTextAtSize(t, 6.5) / 2, H - 18, 6.5, this.f.reg, MUTED);
  }

  text(s: string, x: number, y: number, size: number, font = this.f.reg, color: RGB = INK) {
    this.page.drawText(clean(s), { x, y: H - y, size, font, color });
  }

  center(s: string, x: number, w: number, y: number, size: number, font = this.f.reg, color: RGB = INK) {
    const t = fit(s, font, size, w - 4);
    this.text(t, x + (w - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color);
  }

  line(x1: number, y1: number, x2: number, y2: number, thickness = 0.6, color: RGB = LINE) {
    this.page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness, color });
  }

  dot(x: number, y: number, on: boolean, size = 3) {
    this.page.drawCircle({ x, y: H - y, size, color: on ? ACCENT : WHITE, borderColor: LINE, borderWidth: 0.7 });
  }

  box(x: number, top: number, w: number, h: number, label?: string, fill = FILL) {
    this.page.drawRectangle({ x, y: H - top - h, width: w, height: h, color: fill, borderColor: LINE, borderWidth: 0.8 });
    if (label) {
      const t = clean(label.toUpperCase());
      const tw = this.f.bold.widthOfTextAtSize(t, 6.5);
      this.page.drawRectangle({ x: x + w / 2 - tw / 2 - 4, y: H - top - h - 4, width: tw + 8, height: 9, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
      this.text(t, x + w / 2 - tw / 2, top + h + 3, 6.5, this.f.bold, ACCENT);
    }
  }

  /** A labeled box with a big centered value. */
  statBox(x: number, y: number, w: number, label: string, value: string, h = 52, size = 20) {
    this.box(x, y, w, h, label);
    this.center(value, x, w, y + h / 2 + size * 0.3, size, this.f.head);
  }

  /** Paragraph text inside a box; adds "…" if it doesn't fit. */
  para(s: string, x: number, top: number, w: number, h: number, size = 8, font = this.f.reg) {
    const lines = wrap(s, font, size, w);
    const lh = size * 1.25;
    const max = Math.floor(h / lh);
    lines.slice(0, max).forEach((ln, i) => this.text(ln, x, top + size + i * lh, size, font));
    if (lines.length > max && max > 0) this.text("…", x + w - 6, top + size + (max - 1) * lh, size, font, MUTED);
  }

  labeledValue(label: string, value: string, x: number, top: number, w: number) {
    let size = 10;
    while (size > 7 && this.f.bold.widthOfTextAtSize(clean(value), size) > w) size -= 0.5;
    this.text(fit(value, this.f.bold, size, w), x, top + 11, size, this.f.bold);
    this.line(x, top + 14, x + w, top + 14);
    this.text(label.toUpperCase(), x, top + 21, 5.8, this.f.bold, MUTED);
  }

  /** Big name + a grid of labeled fields; the first page's header. */
  identityHeader(name: string, fields: [string, string][]) {
    this.text(fit(name || "Unnamed", this.f.head, 22, 230), M, 52, 22, this.f.head, ACCENT);
    this.line(M, 58, M + 230, 58, 1, ACCENT);
    this.text("CHARACTER NAME", M, 67, 5.8, this.f.bold, MUTED);
    const gx = M + 245;
    const cw = (W - M - gx - 16) / 3;
    fields.forEach(([l, v], i) => this.labeledValue(l, v, gx + (i % 3) * (cw + 8), 28 + Math.floor(i / 3) * 26, cw));
  }

  /** Flowing two-column text sections, adding pages as needed. */
  flowSections(title: string, groups: { title: string; items: { name: string; source?: string; text: string; uses?: string }[] }[]) {
    const f = this.f;
    this.newPage(title);
    const colW = (W - 2 * M - 18) / 2;
    let col = 0;
    let y = 76;
    const bottom = H - 34;
    const x = () => M + col * (colW + 18);
    const need = (h: number) => {
      if (y + h <= bottom) return;
      if (col === 0) {
        col = 1;
        y = 76;
      } else {
        this.newPage(`${title} (cont.)`);
        col = 0;
        y = 76;
      }
    };
    for (const g of groups) {
      if (!g.items.length) continue;
      need(30);
      this.text(g.title.toUpperCase(), x(), y + 10, 9, f.head, ACCENT);
      this.line(x(), y + 14, x() + colW, y + 14);
      y += 22;
      for (const it of g.items) {
        const head = `${it.name}${it.uses ? `  [${it.uses}]` : ""}`;
        const lines = wrap(it.text, f.reg, 7.6, colW);
        need(12 + Math.min(lines.length, 3) * 9.5 + 6);
        this.text(fit(head, f.bold, 8.4, colW - 60), x(), y + 8, 8.4, f.bold);
        if (it.source) {
          const src = fit(it.source, f.ital, 6.5, 70);
          this.text(src, x() + colW - f.ital.widthOfTextAtSize(src, 6.5), y + 8, 6.5, f.ital, MUTED);
        }
        y += 12;
        for (const ln of lines) {
          need(9.5);
          this.text(ln, x(), y + 7, 7.6);
          y += 9.5;
        }
        y += 6;
      }
      y += 4;
    }
  }

  /** Labeled text boxes stacked down a column. */
  stackedBoxes(x: number, top: number, w: number, blocks: [string, string, number][]) {
    let y = top;
    for (const [l, v, h] of blocks) {
      this.box(x, y, w, h, l);
      this.para(v, x + 7, y + 6, w - 14, h - 14, 8);
      y += h + 14;
    }
  }

  creditsLine(text: string, y = H - 28) {
    this.text(fit(text, this.f.ital, 5.8, W - 2 * M), M, y, 5.8, this.f.ital, MUTED);
  }
}
