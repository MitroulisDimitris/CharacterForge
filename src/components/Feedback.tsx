// Feedback button shown on every page, also logged out. Write a note, point at the part of the
// screen you mean, paste or drop screenshots. Saved online (table `feedback`, screenshots in the
// private `feedback` bucket). `npm run feedback:pull` downloads everything into ./feedback
// (feedback.json + images/) on the owner's PC; `npm run feedback:fix` marks an item fixed.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../cloud";
import { getErrors, getState, getSteps } from "../trail";
import { shrinkImage } from "../images";

/** Mac or iPhone/iPad: different shortcuts in the hints. */
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const PASTE_KEY = IS_MAC ? "⌘V" : "Ctrl+V";
const PASTE_HINT = "Ctrl + V for Windows, ⌘ + V for Mac";

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

interface Row {
  id: string;
  user_id: string | null;
  sender_name: string;
  note: string;
  context: string;
  target: FeedbackItem["target"] | null;
  images: string[];
  status: "open" | "fixed";
  fix_note: string;
  created_at: string;
}

const BUCKET = "feedback";

/** Items this account may see (its own; the admin sees all), with signed links to the screenshots. */
async function loadItems(): Promise<(FeedbackItem & { mine: boolean; sender: string })[]> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("feedback").select("id, user_id, sender_name, note, context, target, images, status, fix_note, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  const rows = data as Row[];
  const paths = rows.flatMap((r) => r.images);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    signed?.forEach((x) => x.path && x.signedUrl && urls.set(x.path, x.signedUrl));
  }
  return rows.map((r) => ({
    id: r.id,
    created: Date.parse(r.created_at),
    note: r.note,
    context: r.context,
    target: r.target ?? undefined,
    images: r.images.map((p) => urls.get(p) ?? "").filter(Boolean),
    status: r.status,
    fixNote: r.fix_note || undefined,
    mine: r.user_id === uid,
    sender: r.sender_name,
  }));
}

/** Recorded automatically with each report (REQUIREMENTS §6.1). */
function autoDetails() {
  const steps = getSteps().map((s, i) => `${i + 1}. ${new Date(s.t).toLocaleTimeString()} ${s.what}`);
  return {
    steps,
    errors: getErrors().map((e) => `${new Date(e.t).toLocaleTimeString()} ${e.what}`),
    state: getState(),
    window: { w: window.innerWidth, h: window.innerHeight },
    touch: window.matchMedia("(pointer: coarse)").matches,
    browser: navigator.userAgent,
  };
}

const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();

/** Where the app was built from (shown with each report). */
const appVersion = () => `${import.meta.env.MODE}${import.meta.env.DEV ? " (dev)" : ""}`;

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

/** A plain reason for a failed send, from the error (not always "the internet"). */
function sendProblem(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return "no internet connection right now";
  if (/exceeded the maximum allowed size|too large|payload/i.test(msg)) return "the picture is too big";
  if (/mime|type .* not supported|invalid.*type/i.test(msg)) return "that kind of file can't be attached";
  if (/jwt|expired|not authorized|unauthorized|row-level security|permission/i.test(msg)) return "your login has expired (log in again)";
  return msg ? `the server said “${msg.slice(0, 120)}”` : "something went wrong";
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"new" | "list">("new");
  const [items, setItems] = useState<(FeedbackItem & { mine: boolean; sender: string })[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [target, setTarget] = useState<FeedbackItem["target"]>();
  const [context, setContext] = useState("");
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [status, setStatus] = useState("");
  const [showFixed, setShowFixed] = useState(false);
  const [pasteNote, setPasteNote] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await loadItems());
    } catch {
      /* offline: keep what we have */
    }
  }, []);
  const myName = useRef("");
  useEffect(() => {
    let current: string | null | undefined;
    const apply = async (id: string | null) => {
      if (id === current) return;
      current = id;
      setUid(id);
      setAdmin(id ? Boolean((await supabase.rpc("is_admin")).data) : false);
      myName.current = id ? ((await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle()).data?.display_name ?? "") : "";
      refresh();
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => {
      setTimeout(() => apply(sess?.user.id ?? null), 0);
    });
    return () => data.subscription.unsubscribe();
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
    const urls: string[] = [];
    for (const f of imgs.slice(0, 6)) urls.push(await shrinkImage(f)); // one at a time: easier on phones
    if (urls.length) setImages((x) => [...x, ...urls].slice(0, 6));
  };
  // Safari (2026-11-17 tester report): it only fires "paste" when an editable element has focus, so the
  // paste box is editable (typing blocked), and a Paste button reads the clipboard directly.
  // Array.from, not spread: works on any browser's item list; `files` as a fallback.
  const pastedFiles = (dt: DataTransfer) => {
    const fromItems = Array.from(dt.items ?? [])
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter(Boolean) as File[];
    return fromItems.length ? fromItems : Array.from(dt.files ?? []).filter((f) => f.type.startsWith("image/"));
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = pastedFiles(e.clipboardData);
    if (files.length) {
      e.preventDefault();
      setPasteNote("");
      addFiles(files);
    }
  };
  /** The paste box: always swallow the paste (no text lands in it), and say so when there was no picture. */
  const onBoxPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = pastedFiles(e.clipboardData);
    if (files.length) {
      setPasteNote("");
      addFiles(files);
    } else setPasteNote("There's no picture on the clipboard. Copy a screenshot first.");
  };
  const pasteButton = async () => {
    try {
      const found: File[] = [];
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) found.push(new File([await item.getType(type)], `pasted.${type.split("/")[1]}`, { type }));
      }
      if (found.length) {
        setPasteNote("");
        addFiles(found);
      } else setPasteNote("There's no picture on the clipboard. Copy a screenshot first.");
    } catch {
      setPasteNote(`The browser didn't let the app read the clipboard. Click the dashed box and press ${PASTE_KEY} instead.`);
    }
  };

  // ---------- save / update ----------
  const save = async () => {
    if (!note.trim() && !images.length) return;
    const id = `fb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    setBusy(true);
    setStatus("Sending…");
    try {
      const folder = uid ?? "anon";
      const paths: string[] = [];
      // A screenshot that still can't be stored never blocks the note itself.
      let failedImages = 0;
      let imageProblem = "";
      for (const [i, u] of images.entries()) {
        try {
          const blob = await dataUrlToBlob(u);
          const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
          const path = `${folder}/${id}-${i + 1}.${ext}`;
          const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "image/png" });
          if (error) throw error;
          paths.push(path);
        } catch (e) {
          console.error("screenshot upload failed", e);
          failedImages++;
          imageProblem ||= sendProblem(e);
        }
      }
      const { error } = await supabase.from("feedback").insert({
        id,
        sender_name: (uid ? myName.current : senderName.trim()).slice(0, 60),
        note: note.trim().slice(0, 5000),
        context: context.slice(0, 500),
        target: target ?? null,
        images: paths,
        details: {
          ...autoDetails(),
          page: window.location.href.split("#")[0],
          window: { w: window.innerWidth, h: window.innerHeight },
          touch: window.matchMedia("(pointer: coarse)").matches,
          browser: navigator.userAgent,
          app: appVersion(),
          skin: document.documentElement.dataset.theme,
          screenshotsFailed: failedImages || undefined,
        },
      });
      if (error) throw error;
      const lost = failedImages ? ` (${failedImages === 1 ? "the screenshot" : `${failedImages} screenshots`} couldn't be attached: ${imageProblem})` : "";
      setStatus((uid ? "Sent. Thank you! You can see it under Saved." : "Sent. Thank you!") + lost);
      setNote("");
      setImages([]);
      setTarget(undefined);
      refresh();
    } catch (e) {
      console.error(e);
      // Say what really went wrong; only blame the internet when it is the internet.
      setStatus(`Couldn't send it: ${sendProblem(e)}. Your note is still here, so you can try again.`);
    } finally {
      setBusy(false);
    }
  };
  const update = async (id: string, patch: { status: "open" | "fixed" }) => {
    await supabase.from("feedback").update(patch).eq("id", id);
    refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    await supabase.from("feedback").delete().eq("id", id);
    refresh();
  };

  const openCount = items.filter((x) => x.status === "open").length;
  const shown = items.filter((x) => showFixed || x.status === "open");
  const src = (p: string) => p;

  return (
    <>
      {!open && !picking && (
        <button className="fb-fab" data-fb-ui onClick={start} title="Give feedback on anything you see" aria-label="Feedback">
          <span aria-hidden>✎</span> <span className="fb-label">Feedback</span>
          {openCount > 0 && <span className="fb-count">{openCount}</span>}
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

              {!uid && (
                <label className="fb-section">
                  <span className="fb-k">Your name (optional)</span>
                  <input value={senderName} maxLength={60} onChange={(e) => setSenderName(e.target.value)} autoComplete="nickname" />
                </label>
              )}
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
                  <div
                    className="fb-add fb-paste"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label={`Paste a screenshot here (${PASTE_KEY})`}
                    onPaste={onBoxPaste}
                    onBeforeInput={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if ((e.key.length === 1 && !e.metaKey && !e.ctrlKey) || ["Backspace", "Delete", "Enter"].includes(e.key)) e.preventDefault();
                    }}
                    onCut={(e) => e.preventDefault()}
                  >
                    <span contentEditable={false}>
                      Click here, then {PASTE_KEY}
                      <br />
                      or drop a picture
                    </span>
                  </div>
                </div>
                <div className="fb-pick">
                  {typeof navigator !== "undefined" && "clipboard" in navigator && "read" in navigator.clipboard && (
                    <button type="button" className="btn small" onClick={pasteButton}>
                      Paste
                    </button>
                  )}
                  <label className="btn small">
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => (setPasteNote(""), e.target.files && addFiles(e.target.files), (e.target.value = ""))} />
                    Choose a file
                  </label>
                </div>
                {pasteNote && (
                  <p className="fb-hint fb-paste-note" role="status">
                    {pasteNote}
                  </p>
                )}
                <p className="fb-muted fb-hint">{PASTE_HINT}</p>
              </div>

              <div className="fb-section fb-also">
                <span className="fb-muted">
                  Also sends: the steps you took, the screen you're on{getState().character ? ", and the open character" : ""}.{" "}
                  <button type="button" className="fb-link" onClick={() => setShowDetails((x) => !x)} aria-expanded={showDetails}>
                    {showDetails ? "Hide details" : "Show details"}
                  </button>
                </span>
                {showDetails && <pre className="fb-details">{JSON.stringify(autoDetails(), null, 2)}</pre>}
              </div>

              <div className="fb-foot">
                <span className="fb-muted">{status}</span>
                <button className="btn primary" disabled={busy || (!note.trim() && !images.length)} onClick={save}>
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </div>
          ) : (
            <div className="fb-body">
              <div className="fb-row">
                <span className="fb-muted">{!uid ? "Log in to see the feedback you sent." : admin ? "Everyone's feedback (you're the admin)." : "The feedback you sent."}</span>
                <label className="fb-muted fb-toggle">
                  <input type="checkbox" checked={showFixed} onChange={(e) => setShowFixed(e.target.checked)} /> show fixed
                </label>
              </div>
              {shown.length === 0 && <p className="fb-muted fb-empty">{items.length ? "Nothing open. Nice!" : "No feedback yet."}</p>}
              {shown.map((x) => (
                <article key={x.id} className={`fb-item ${x.status}`}>
                  <div className="fb-item-top">
                    <span className={`fb-chip ${x.status}`}>{x.status === "open" ? "Open" : "Fixed"}</span>
                    <span className="fb-muted">
                      {new Date(x.created).toLocaleString()}
                      {admin && !x.mine && ` · ${x.sender || "someone"}`}
                    </span>
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
                  {(admin || x.mine) && (
                    <div className="fb-item-actions">
                      {admin && (
                        <button className="btn small" onClick={() => update(x.id, { status: x.status === "open" ? "fixed" : "open" })}>
                          {x.status === "open" ? "Mark fixed" : "Reopen"}
                        </button>
                      )}
                      <button className="btn small ghost" onClick={() => remove(x.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
