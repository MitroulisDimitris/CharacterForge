// Boxes never jump (UI rule 18, user 2026-11-19): when a box's content changes its height by more
// than a line, the box glides from the old height to the new one instead of snapping.
import { useLayoutEffect, type RefObject } from "react";

const BUSY = "data-smooth-busy";

/**
 * Animate `ref`'s height changes. `growOnly` keeps the tallest height seen (as min-height), so a
 * panel that changes on every hover doesn't push the content below it up and down.
 */
export function useSmoothHeight(ref: RefObject<HTMLElement | null>, { growOnly = false, ms = 260, minStep = 24 }: { growOnly?: boolean; ms?: number; minStep?: number } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let rect = el.getBoundingClientRect();
    let shown = rect.height;
    let width = rect.width;
    let timer = 0;
    const hold = (h: number) => {
      if (!growOnly) return;
      el.style.boxSizing = "border-box";
      el.style.minHeight = `${h}px`;
    };
    const settle = () => {
      el.removeAttribute(BUSY);
      el.style.transition = "";
      el.style.height = "";
      el.style.overflow = "";
      if (growOnly) hold(shown);
      else el.style.boxSizing = "";
    };
    const ro = new ResizeObserver(() => {
      if (el.hasAttribute(BUSY)) return;
      rect = el.getBoundingClientRect();
      const target = growOnly ? Math.max(rect.height, shown) : rect.height;
      const resized = Math.abs(rect.width - width) > 1; // the window changed size: just follow it
      width = rect.width;
      const from = shown;
      shown = target;
      // Inside (or around) a box that's already gliding, let that one do the moving.
      const nested = !!el.parentElement?.closest(`[${BUSY}]`) || !!el.querySelector(`[${BUSY}]`);
      if (resized || nested || reduced?.matches || Math.abs(target - from) < minStep) {
        hold(target);
        return;
      }
      el.setAttribute(BUSY, "");
      el.style.boxSizing = "border-box";
      el.style.overflow = "hidden";
      el.style.transition = "none";
      el.style.height = `${from}px`;
      void el.offsetHeight;
      el.style.transition = `height ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
      el.style.height = `${target}px`;
      if (growOnly) el.style.minHeight = `${from}px`; // the new minimum is set once the glide ends
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, ms + 20);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      settle();
    };
  }, [ref, growOnly, ms, minStep]);
}
