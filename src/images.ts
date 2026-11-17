// Image helpers shared by Feedback screenshots and monster pictures.

export const readImage = (f: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = fail;
    r.readAsDataURL(f);
  });

/**
 * Phone photos and screenshots can be 5–12 MB (heavy for a phone and for uploads). Shrink to at
 * most `maxSide` px on the longest side as a JPEG (~150–400 KB at 1600 px). Falls back to the
 * original if the browser can't decode it.
 */
export async function shrinkImage(f: File, maxSide = 1600, quality = 0.82): Promise<string> {
  try {
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise<HTMLImageElement>((ok, fail) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = fail;
        i.src = url;
      });
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return readImage(f);
  }
}

export async function dataUrlToBlob(u: string): Promise<Blob> {
  return (await fetch(u)).blob();
}
