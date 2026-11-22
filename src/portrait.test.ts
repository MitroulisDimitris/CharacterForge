import { describe, expect, it } from "vitest";
import { clampView, cropSide, panBy, startView, validPortrait, zoomAt } from "./portrait";

describe("portrait crop", () => {
  it("starts on the whole short side, a bit high on tall pictures", () => {
    expect(startView(800, 600)).toEqual({ cx: 400, cy: 300, zoom: 1 });
    const tall = startView(600, 1200);
    expect(tall.zoom).toBe(1);
    expect(tall.cx).toBe(300);
    expect(tall.cy).toBe(480);
  });

  it("keeps the square inside the picture and the zoom in range", () => {
    expect(clampView({ cx: -50, cy: 9999, zoom: 9 }, 800, 600)).toEqual({ cx: 75, cy: 525, zoom: 4 });
    expect(clampView({ cx: 400, cy: 300, zoom: 0.2 }, 800, 600).zoom).toBe(1);
  });

  it("pans opposite to the drag, scaled to picture pixels", () => {
    const v = { cx: 400, cy: 300, zoom: 1 };
    // 600 px side on a 300 px frame: 1 screen px = 2 picture px.
    expect(panBy(v, 10, 0, 300, 800, 600)).toEqual({ cx: 380, cy: 300, zoom: 1 });
    expect(panBy(v, -1000, 0, 300, 800, 600).cx).toBe(500); // stops at the right edge
  });

  it("zooms around the given point", () => {
    const v = { cx: 400, cy: 300, zoom: 1 };
    const centre = zoomAt(v, 2, 800, 600);
    expect(centre).toEqual({ cx: 400, cy: 300, zoom: 2 });
    expect(cropSide(800, 600, 2)).toBe(300);
    // Zoom at the left edge of the frame: the left edge stays put.
    const left = zoomAt(v, 2, 800, 600, 0, 0.5);
    expect(left.cx - cropSide(800, 600, 2) / 2).toBeCloseTo(100);
  });

  it("only shows image data URLs of a sane size", () => {
    expect(validPortrait("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(validPortrait("javascript:alert(1)")).toBe(false);
    expect(validPortrait("https://example.com/a.jpg")).toBe(false);
    expect(validPortrait(undefined)).toBe(false);
  });
});
