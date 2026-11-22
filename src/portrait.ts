// Character portraits: a square crop of the player's picture, shrunk to PORTRAIT_SIZE px and kept
// in the character's data as a JPEG data URL (~15–30 KB), so it travels with the character
// (session copies, JSON export) and shows wherever the crest does.

/** Output side in px: sharp at the largest crest (132 px) on a 2× screen. */
export const PORTRAIT_SIZE = 256;
export const MAX_ZOOM = 4;

/** What part of the picture is shown: centre (in picture pixels) and zoom (1 = the whole short side). */
export interface CropView {
  cx: number;
  cy: number;
  zoom: number;
}

/** Side of the shown square, in picture pixels. */
export const cropSide = (w: number, h: number, zoom: number) => Math.min(w, h) / Math.max(1, Math.min(MAX_ZOOM, zoom));

/** Keep the zoom in range and the shown square inside the picture. */
export function clampView(v: CropView, w: number, h: number): CropView {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, v.zoom));
  const half = cropSide(w, h, zoom) / 2;
  return {
    zoom,
    cx: Math.max(half, Math.min(w - half, v.cx)),
    cy: Math.max(half, Math.min(h - half, v.cy)),
  };
}

/** Start centred, slightly above the middle for tall pictures (faces are usually up there). */
export function startView(w: number, h: number): CropView {
  return clampView({ cx: w / 2, cy: h > w ? h * 0.4 : h / 2, zoom: 1 }, w, h);
}

/** Zoom to `zoom`, keeping the picture point under (fx, fy) (0–1 across the frame) where it is. */
export function zoomAt(v: CropView, zoom: number, w: number, h: number, fx = 0.5, fy = 0.5): CropView {
  const before = cropSide(w, h, v.zoom);
  const after = cropSide(w, h, zoom);
  const px = v.cx - before / 2 + fx * before;
  const py = v.cy - before / 2 + fy * before;
  return clampView({ zoom, cx: px - fx * after + after / 2, cy: py - fy * after + after / 2 }, w, h);
}

/** Move by (dx, dy) screen pixels on a frame `frame` px wide. */
export function panBy(v: CropView, dx: number, dy: number, frame: number, w: number, h: number): CropView {
  const k = cropSide(w, h, v.zoom) / frame;
  return clampView({ ...v, cx: v.cx - dx * k, cy: v.cy - dy * k }, w, h);
}

/** Draw the chosen square at PORTRAIT_SIZE px as a JPEG data URL. */
export function renderPortrait(img: HTMLImageElement, v: CropView, size = PORTRAIT_SIZE, quality = 0.85): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const side = cropSide(w, h, v.zoom);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't make the picture.");
  ctx.fillStyle = "#1c1815"; // under see-through PNGs
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  // Shrink big photos in halves first: one big jump to 256 px looks grainy in some browsers.
  let src: CanvasImageSource = img;
  let sx = v.cx - side / 2;
  let sy = v.cy - side / 2;
  let sSide = side;
  while (sSide > size * 2) {
    const half = Math.ceil(sSide / 2);
    const step = document.createElement("canvas");
    step.width = half;
    step.height = half;
    const sc = step.getContext("2d");
    if (!sc) break;
    sc.imageSmoothingQuality = "high";
    sc.drawImage(src, sx, sy, sSide, sSide, 0, 0, half, half);
    src = step;
    sx = 0;
    sy = 0;
    sSide = half;
  }
  ctx.drawImage(src, sx, sy, sSide, sSide, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}

/** A portrait value we can show: only our own JPEG/PNG/WebP data URLs. */
export const validPortrait = (p: unknown): p is string => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p) && p.length < 400_000;
