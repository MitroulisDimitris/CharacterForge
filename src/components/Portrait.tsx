// Portrait dialog: pick a picture, move and zoom it inside the circle, save a small square copy
// (src/portrait.ts). Works with mouse (drag, wheel), touch (drag, pinch) and keyboard (arrows, + / -).
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { MAX_ZOOM, cropSide, panBy, renderPortrait, startView, zoomAt, type CropView } from "../portrait";

export function PortraitDialog({ current, name, onSave, onClose }: { current?: string; name: string; onSave: (portrait: string | null) => void; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<CropView | null>(null);
  const [error, setError] = useState("");
  const [frame, setFrame] = useState(280);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  // The frame shrinks on narrow phones.
  useEffect(() => {
    const fit = () => setFrame(Math.max(200, Math.min(300, window.innerWidth - 96)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !img) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => v && zoomAt(v, v.zoom * Math.exp(-e.deltaY * 0.0015), img.naturalWidth, img.naturalHeight, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [img]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setError("");
    const url = URL.createObjectURL(f);
    const i = new Image();
    i.onload = () => {
      if (!i.naturalWidth || !i.naturalHeight) return i.onerror?.(new Event("error"));
      setSrc(url);
      setImg(i);
      setView(startView(i.naturalWidth, i.naturalHeight));
    };
    i.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Couldn't open this picture. Try a JPEG or PNG.");
    };
    i.src = url;
  };

  const w = img?.naturalWidth ?? 1;
  const h = img?.naturalHeight ?? 1;
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && view) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last || !img) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const r = e.currentTarget.getBoundingClientRect();
      const zoom = pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.dist));
      setView((v) => v && zoomAt(v, zoom, w, h, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height));
    } else if (pointers.current.size === 1) {
      setView((v) => v && panBy(v, now.x - last.x, now.y - last.y, frame, w, h));
    }
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const keys = (e: ReactKeyboardEvent) => {
    if (!view) return;
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) setView(panBy(view, moves[e.key][0], moves[e.key][1], frame, w, h));
    else if (e.key === "+" || e.key === "=") setView(zoomAt(view, view.zoom * 1.15, w, h));
    else if (e.key === "-") setView(zoomAt(view, view.zoom / 1.15, w, h));
    else return;
    e.preventDefault();
  };

  const save = () => {
    if (!img || !view) return;
    try {
      onSave(renderPortrait(img, view));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Where the picture sits in the frame.
  const side = view ? cropSide(w, h, view.zoom) : 1;
  const k = frame / side;
  const imgStyle = view
    ? { width: w * k, height: h * k, transform: `translate(${-(view.cx - side / 2) * k}px, ${-(view.cy - side / 2) * k}px)` }
    : undefined;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Portrait" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal portrait-modal">
        <header className="modal-hero compact">
          <h2>Portrait</h2>
          <p>{img ? "Drag to move it, pinch or use the slider to zoom." : `A picture of ${name || "your hero"}, shown in the circle wherever the character appears.`}</p>
        </header>
        <div className="modal-body portrait-body">
          {img && view ? (
            <>
              <div
                ref={stageRef}
                className="portrait-stage"
                style={{ width: frame, height: frame }}
                tabIndex={0}
                role="img"
                aria-label="Picture inside the circle. Arrow keys move it, plus and minus zoom."
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onKeyDown={keys}
              >
                <img src={src ?? ""} alt="" draggable={false} style={imgStyle} />
                <span className="portrait-ring" aria-hidden="true" />
              </div>
              <label className="portrait-zoom">
                <span>Zoom</span>
                <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={view.zoom} onChange={(e) => setView(zoomAt(view, Number(e.target.value), w, h))} />
              </label>
            </>
          ) : (
            <div className="portrait-now">
              {current ? <img src={current} alt={`Portrait of ${name || "your hero"}`} /> : <span className="portrait-empty" aria-hidden="true"><CameraIcon /></span>}
              <button type="button" className="btn primary" onClick={() => fileRef.current?.click()}>
                {current ? "Choose a new picture" : "Choose a picture"}
              </button>
            </div>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
        </div>
        <footer className="modal-foot">
          {img ? (
            <button type="button" className="btn ghost portrait-other" onClick={() => fileRef.current?.click()}>
              Choose another
            </button>
          ) : (
            current && (
              <button type="button" className="btn danger-ghost portrait-other" onClick={() => onSave(null)}>
                Remove the portrait
              </button>
            )
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {img && (
            <button type="button" className="btn primary" onClick={save}>
              Save portrait
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export function CameraIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
