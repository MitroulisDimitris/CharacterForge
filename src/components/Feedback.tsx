// Feedback button shown on every page. Write a note, point at the part of the screen you mean,
// paste or drop screenshots. Notes are saved by the dev server into ./feedback (feedback.json +
// images/) so Claude can read them; without the dev server they fall back to this browser's storage.
import { useCallback, useEffect, useRef, useState } from "react";

export interface FeedbackItem {
  id: string;
  created: number;
  note: string;
  /** What was on screen: page, character, tab, open dialog. */
  context: string;
  /** The element the user pointed at, if any. */
  target?: { label: string; text: string; path: string; rect: { x: number; y: number; w: number; h: number }; viewport: { w: number; h: number } };
  /** Saved image paths (server) or data URLs (local fallback). */
  images: string[];
  status: "open" | "fixed";
  /** Written by Claude when it fixes the item. */
  fixNote?: string;
}

const LOCAL_KEY = "characterforge.feedback.v1";
const API = "/__feedback";

const loadLocal = (): FeedbackItem[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const saveLocal = (items: FeedbackItem[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
};

/** Short description of where the user is: "Editor · Parry Hotter · Spells tab · Level up dialog". */
function screenContext() {
  const parts: string[] = [];
  const t = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim();
  const h1 = t("h1");
  if (h1) parts.push(h1);
  const tab = t('[role="tab"][aria-selected="true"]');
  if (tab) parts.push(`${tab} tab`);
  const step = t(".step.active, .step[aria-current]");
  if (step) parts.push(`step: ${step}`);
  const modal = t(".modal-hero h2");
  if (modal) parts.push(`dialog: ${modal}`);
  return parts.join(" · ") || document.title;
}

/** A readable CSS-like path for an element (enough for Claude to find it in the code). */
function pathOf(el: Element) {
  const out: string[] = [];
  for (let e: Element | null = el; e && e !== document.body && out.length < 5; e = e.parentElement) {
    const cls = [...e.classList].filter((c) => !c.startsWith("fb-")).slice(0, 2).map((c) => `.${c}`).join("");
    out.unshift(`${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${cls}`);
  }
  return out.join(" > ");
}

/** Nearest heading or card title above the element, to name the area in plain words. */
function labelOf(el: Element) {
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    const head = e.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > .card-head, :scope > header");
    if (head?.textContent?.trim()) return head.textContent.replace(/\s+/g, " ").trim().slice(0, 60);
  }
  return el.tagName.toLowerCase();
}

const readImage = (f: File) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = fail;
    r.readAsDataURL(f);
  });

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"new" | "list">("new");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [server, setServer] = useState(true);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [target, setTarget] = useState<FeedbackItem["target"]>();
  const [context, setContext] = useState("");
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [status, setStatus] = useState("");
  const [showFixed, setShowFixed] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(API);
      if (!r.ok) throw new Error();
      const remote: FeedbackItem[] = await r.json();
      setServer(true);
      setItems(remote);
    } catch {
      setServer(false);
      setItems(loadLocal());
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = () => {
    setContext(screenContext());
    setOpen(true);
    setView("new");
    setStatus("");
    setTimeout(() => textRef.current?.focus(), 50);
  };

  // ---------- point at something ----------
  useEffect(() => {
    if (!picking) return;
    const isOurs = (e: EventTarget | null) => e instanceof Element && !!e.closest("[data-fb-ui]");
    const move = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHover(el && !isOurs(el) ? el.getBoundingClientRect() : null);
    };
    const click = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOurs(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      setTarget({
        label: labelOf(el),
        text: (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim().slice(0, 140) ?? "",
        path: pathOf(el),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        viewport: { w: window.innerWidth, h: window.innerHeight },
      });
      setContext(screenContext());
      setPicking(false);
      setHover(null);
      setOpen(true);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPicking(false);
        setHover(null);
        setOpen(true);
      }
    };
    window.addEventListener("mousemove", move, true);
    window.addEventListener("click", click, true);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("mousemove", move, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key, true);
    };
  }, [picking]);

  // ---------- images: paste anywhere in the panel, or drop, or choose a file ----------
  const addFiles = async (files: Iterable<File>) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    const urls = await Promise.all(imgs.map(readImage));
    if (urls.length) setImages((x) => [...x, ...urls].slice(0, 6));
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = [...e.clipboardData.items].filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter(Boolean) as File[];
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  // ---------- save / update ----------
  const save = async () => {
    if (!note.trim() && !images.length) return;
    const id = `fb${Date.now().toString(36)}`;
    const base: FeedbackItem = { id, created: Date.now(), note: note.trim(), context, target, images: [], status: "open" };
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, imageData: images }) });
      if (!r.ok) throw new Error();
      setStatus("Saved. Tell Claude “fix the feedback” when you're ready.");
    } catch {
      const ok = saveLocal([{ ...base, images }, ...loadLocal()]);
      setStatus(ok ? "Saved in this browser (the dev server isn't running)." : "Couldn't save: the screenshots are too large for browser storage. Remove one and try again.");
      if (!ok) return;
    }
    setNote("");
    setImages([]);
    setTarget(undefined);
    refresh();
  };
  const update = async (id: string, patch: Partial<FeedbackItem>) => {
    if (server) await fetch(`${API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => {});
    else saveLocal(loadLocal().map((x) => (x.id === id ? { ...x, ...patch } : x)));
    refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    if (server) await fetch(`${API}/${id}`, { method: "DELETE" }).catch(() => {});
    else saveLocal(loadLocal().filter((x) => x.id !== id));
    refresh();
  };

  const openCount = items.filter((x) => x.status === "open").length;
  const shown = items.filter((x) => showFixed || x.status === "open");
  const src = (p: string) => (p.startsWith("data:") ? p : `/${p}`);

  return (
    <>
      {!open && !picking && (
        <button className="fb-fab" data-fb-ui onClick={start} title="Give feedback on anything you see">
          <span aria-hidden>✎</span> Feedback{openCount > 0 && <span className="fb-count">{openCount}</span>}
        </button>
      )}

      {picking && (
        <div data-fb-ui>
          <div className="fb-pick-banner">Click the part of the screen you mean · Esc to cancel</div>
          {hover && <div className="fb-pick-box" style={{ left: hover.x - 3, top: hover.y - 3, width: hover.width + 6, height: hover.height + 6 }} />}
        </div>
      )}

      {open && (
        <aside className="fb-panel" data-fb-ui onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}>
          <header className="fb-head">
            <strong>Feedback</strong>
            <div className="fb-tabs" role="tablist">
              <button className={view === "new" ? "on" : ""} onClick={() => setView("new")}>
                New
              </button>
              <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
                Saved{openCount ? ` (${openCount})` : ""}
              </button>
            </div>
            <button className="fb-x" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </header>

          {view === "new" ? (
            <div className="fb-body">
              <div className="fb-context">
                <span className="fb-k">Screen</span> {context || "—"}
              </div>

              <div className="fb-section">
                <div className="fb-row">
                  <span className="fb-k">Where</span>
                  <button
                    className="btn small"
                    onClick={() => {
                      setOpen(false);
                      setPicking(true);
                    }}
                  >
                    ⌖ {target ? "Point again" : "Point at something"}
                  </button>
                </div>
                {target ? (
                  <div className="fb-target">
                    <div>
                      <b>{target.label}</b>
                      {target.text && <span className="fb-muted"> — “{target.text.slice(0, 80)}{target.text.length > 80 ? "…" : ""}”</span>}
                    </div>
                    <button className="fb-link" onClick={() => setTarget(undefined)}>
                      clear
                    </button>
                  </div>
                ) : (
                  <p className="fb-muted fb-hint">Optional: click the button, then click the thing on screen you're talking about.</p>
                )}
              </div>

              <label className="fb-section">
                <span className="fb-k">What should change?</span>
                <textarea
                  ref={textRef}
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. This button is hard to find; the spell list should be sorted by level…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
                  }}
                />
              </label>

              <div className="fb-section">
                <span className="fb-k">Screenshots</span>
                <div className="fb-drop">
                  {images.map((u, i) => (
                    <div key={i} className="fb-thumb">
                      <img src={u} alt="" />
                      <button onClick={() => setImages((x) => x.filter((_, j) => j !== i))} aria-label="Remove">
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="fb-add">
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
                    <span>
                      Paste (Ctrl+V), drop,
                      <br />
                      or <u>choose a file</u>
                    </span>
                  </label>
                </div>
                <p className="fb-muted fb-hint">Tip: Win+Shift+S takes a screenshot, then Ctrl+V here.</p>
              </div>

              <div className="fb-foot">
                <span className="fb-muted">{status}</span>
                <button className="btn primary" disabled={!note.trim() && !images.length} onClick={save}>
                  Save feedback
                </button>
              </div>
            </div>
          ) : (
            <div className="fb-body">
              <div className="fb-row">
                <span className="fb-muted">{server ? "Saved in the project's feedback folder." : "Saved in this browser only."}</span>
                <label className="fb-muted fb-toggle">
                  <input type="checkbox" checked={showFixed} onChange={(e) => setShowFixed(e.target.checked)} /> show fixed
                </label>
              </div>
              {shown.length === 0 && <p className="fb-muted fb-empty">{items.length ? "Nothing open. Nice!" : "No feedback yet."}</p>}
              {shown.map((x) => (
                <article key={x.id} className={`fb-item ${x.status}`}>
                  <div className="fb-item-top">
                    <span className={`fb-chip ${x.status}`}>{x.status === "open" ? "Open" : "Fixed"}</span>
                    <span className="fb-muted">{new Date(x.created).toLocaleString()}</span>
                  </div>
                  {x.note && <p className="fb-note">{x.note}</p>}
                  <p className="fb-muted fb-small">
                    {x.context}
                    {x.target && <> · pointed at “{x.target.label}”</>}
                  </p>
                  {x.fixNote && <p className="fb-fixnote">Fixed: {x.fixNote}</p>}
                  {x.images.length > 0 && (
                    <div className="fb-drop">
                      {x.images.map((p) => (
                        <a key={p} className="fb-thumb" href={src(p)} target="_blank" rel="noreferrer">
                          <img src={src(p)} alt="" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="fb-item-actions">
                    <button className="btn small" onClick={() => update(x.id, { status: x.status === "open" ? "fixed" : "open" })}>
                      {x.status === "open" ? "Mark fixed" : "Reopen"}
                    </button>
                    <button className="btn small ghost" onClick={() => remove(x.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
