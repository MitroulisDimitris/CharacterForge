// The host's session notes in tabs (REQUIREMENTS §4.8): named, coloured tabs that can be dragged
// into order, each with a rich-text note that saves itself. Only the host sees them.
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { addNoteTab, deleteNoteTab, loadNoteTabs, reorderNoteTabs, sessionError, updateNoteTab, type NoteTab } from "../sessions";
import { colorHex, countMatches, editedAgo, htmlToText, MAX_CHARS, MAX_TABS, moveItem, nextNoteTitle, NOTE_COLORS, pickNoteColor, TITLE_MAX } from "../notes";
import type { NoteEditorHandle } from "./NoteEditor";

// The editor is a big library: it loads when Notes first opens, not with the app.
const NoteEditor = lazy(() => import("./NoteEditor").then((m) => ({ default: m.NoteEditor })));
import { OnlyYou } from "./Party";
import { MoreMenu } from "./Hero";

type Save = "saving" | "saved" | "offline" | "error";
const SAVE_DELAY = 800;
const RETRY = 5000;
const unsavedKey = (id: string) => `cf-notes-unsaved:${id}`;
const lastTabKey = (sid: string) => `cf-notes-tab:${sid}`;
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: fine */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "notes"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotesTab({ sessionId }: { sessionId: string }) {
  const [tabs, setTabs] = useState<NoteTab[] | null>(null);
  const [active, setActive] = useState("");
  const [err, setErr] = useState("");
  const [save, setSave] = useState<Record<string, Save>>({});
  const [chars, setChars] = useState<Record<string, number>>({});
  const [renaming, setRenaming] = useState<{ id: string; draft: string; fresh: boolean } | null>(null);
  const [menu, setMenu] = useState<{ left: number; confirm: boolean } | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [query, setQuery] = useState("");
  const [find, setFind] = useState<string | undefined>();
  const [drag, setDrag] = useState<{ id: string; dx: number; to: number } | null>(null);
  const [, setMinute] = useState(0);

  const tabsRef = useRef<NoteTab[]>([]);
  tabsRef.current = tabs ?? [];
  const pending = useRef(new Map<string, string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const creating = useRef(new Map<string, Promise<unknown>>());
  const editor = useRef<NoteEditorHandle>(null);
  const strip = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);

  // ---- load -------------------------------------------------------------------------------
  useEffect(() => {
    let live = true;
    loadNoteTabs(sessionId).then(
      (list) => {
        if (!live) return;
        // Typing that never reached the server (closed while offline) comes back and saves.
        const restored = list.map((t) => {
          const local = store.get(unsavedKey(t.id));
          if (local != null && local !== t.body) {
            pending.current.set(t.id, local);
            return { ...t, body: local };
          }
          return t;
        });
        setTabs(restored);
        const last = store.get(lastTabKey(sessionId));
        setActive(restored.some((t) => t.id === last) ? last! : (restored[0]?.id ?? ""));
        for (const id of pending.current.keys()) schedule(id, 0);
      },
      (e) => live && setErr(sessionError(e)),
    );
    const tick = setInterval(() => setMinute((n) => n + 1), 60_000);
    return () => {
      live = false;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ---- saving -----------------------------------------------------------------------------
  const flush = useCallback(async (id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    const body = pending.current.get(id);
    if (body == null) return;
    setSave((s) => ({ ...s, [id]: "saving" }));
    try {
      await creating.current.get(id);
      const updated_at = await updateNoteTab(id, { body });
      if (pending.current.get(id) === body) {
        pending.current.delete(id);
        store.del(unsavedKey(id));
        setSave((s) => ({ ...s, [id]: "saved" }));
      }
      setTabs((list) => list && list.map((t) => (t.id === id ? { ...t, updated_at } : t)));
    } catch (e) {
      const offline = navigator.onLine === false || /fetch|network/i.test(String((e as Error)?.message));
      setSave((s) => ({ ...s, [id]: offline ? "offline" : "error" }));
      if (!offline) setErr(sessionError(e));
      schedule(id, RETRY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const schedule = (id: string, ms: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => void flush(id), ms),
    );
  };
  const flushAll = () => {
    for (const id of [...pending.current.keys()]) void flush(id);
  };
  useEffect(() => {
    const online = () => flushAll();
    const hide = () => document.visibilityState === "hidden" && flushAll();
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hide);
      flushAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeBody = (id: string, html: string, n: number) => {
    pending.current.set(id, html);
    store.set(unsavedKey(id), html);
    setTabs((list) => list && list.map((t) => (t.id === id ? { ...t, body: html } : t)));
    setChars((c) => ({ ...c, [id]: n }));
    setSave((s) => ({ ...s, [id]: "saving" }));
    schedule(id, SAVE_DELAY);
  };

  /** Save a field now (title, colour); waits for the tab's insert if it's brand new. */
  const patch = async (id: string, p: Partial<Pick<NoteTab, "title" | "color">>) => {
    setTabs((list) => list && list.map((t) => (t.id === id ? { ...t, ...p } : t)));
    try {
      await creating.current.get(id);
      await updateNoteTab(id, p);
    } catch (e) {
      setErr(sessionError(e));
    }
  };

  // ---- tabs -------------------------------------------------------------------------------
  const open = (id: string, withFind?: string) => {
    if (id === active) return;
    if (active) void flush(active);
    setMenu(null);
    setAllOpen(false);
    setFind(withFind);
    setActive(id);
    store.set(lastTabKey(sessionId), id);
  };

  /** Put the tabs in this order (by id) and save the positions that changed. */
  const saveOrder = (ids: string[]) => {
    const was = new Map(tabsRef.current.map((t) => [t.id, t.position]));
    const changed = ids.map((id, i) => ({ id, position: i })).filter((t) => was.has(t.id) && was.get(t.id) !== t.position);
    setTabs((list) => {
      if (!list) return list;
      const byId = new Map(list.map((t) => [t.id, t]));
      return ids.filter((id) => byId.has(id)).map((id, i) => ({ ...byId.get(id)!, position: i }));
    });
    if (!changed.length) return;
    Promise.all(changed.map((c) => creating.current.get(c.id)))
      .then(() => reorderNoteTabs(changed.map(({ id, position }) => ({ id, position }))))
      .catch((e) => setErr(sessionError(e)));
  };

  const startRename = (id: string, fresh = false) => {
    const t = tabsRef.current.find((x) => x.id === id);
    if (!t) return;
    setMenu(null);
    // Render the box now so it can take focus inside the tap (iPhone only opens the keyboard then).
    flushSync(() => setRenaming({ id, draft: t.title, fresh }));
    renameInput.current?.focus();
    renameInput.current?.select();
  };
  const commitRename = (moveOn: boolean) => {
    if (!renaming) return;
    const t = tabsRef.current.find((x) => x.id === renaming.id);
    const title = renaming.draft.trim().slice(0, TITLE_MAX);
    setRenaming(null);
    if (t && title && title !== t.title) void patch(t.id, { title });
    if (moveOn) setTimeout(() => editor.current?.focus(), 0);
  };

  const newTab = (copyOf?: NoteTab) => {
    const list = tabsRef.current;
    if (list.length >= MAX_TABS) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const tab: NoteTab = {
      id,
      session_id: sessionId,
      title: copyOf ? `${copyOf.title} copy`.slice(0, TITLE_MAX) : nextNoteTitle(list.map((t) => t.title)),
      color: copyOf ? copyOf.color : pickNoteColor(list.map((t) => t.color)),
      body: copyOf ? copyOf.body : "",
      position: list.length,
      created_at: now,
      updated_at: now,
    };
    const at = copyOf ? list.findIndex((t) => t.id === copyOf.id) + 1 : list.length;
    const next = [...list.slice(0, at), tab, ...list.slice(at)];
    if (active) void flush(active);
    const insert = addNoteTab({ id, session_id: sessionId, title: tab.title, color: tab.color, body: tab.body, position: at });
    creating.current.set(
      id,
      insert.then(
        () => creating.current.delete(id),
        (e) => {
          setErr(sessionError(e));
          setTabs((l) => l && l.filter((t) => t.id !== id));
        },
      ),
    );
    flushSync(() => {
      setMenu(null);
      setAllOpen(false);
      setFind(undefined);
      setActive(id);
      setTabs(next);
    });
    store.set(lastTabKey(sessionId), id);
    // Positions after the new tab shift by one.
    // Once it exists, save the positions as they are on screen (the local tabs keep their old
    // position numbers until then, so the shifted ones get saved).
    void creating.current.get(id)?.then(() => {
      if (tabsRef.current.some((t) => t.id === id)) saveOrder(tabsRef.current.map((t) => t.id));
    });
    startRename(id, true);
  };

  const removeTab = async (id: string) => {
    const list = tabsRef.current;
    if (list.length < 2) return;
    const i = list.findIndex((t) => t.id === id);
    clearTimeout(timers.current.get(id));
    pending.current.delete(id);
    store.del(unsavedKey(id));
    const rest = list.filter((t) => t.id !== id);
    setMenu(null);
    setActive(rest[Math.max(0, i - 1)].id);
    setTabs(rest);
    try {
      await creating.current.get(id);
      await deleteNoteTab(id);
    } catch (e) {
      setErr(sessionError(e));
    }
  };

  // ---- drag to reorder (mouse: drag; touch: press and hold, then drag) ----------------------
  const dragRef = useRef<{ id: string; x: number; y: number; touch: boolean; on: boolean; hold?: ReturnType<typeof setTimeout>; centers: { id: string; c: number }[]; self: number } | null>(null);
  const justDragged = useRef(false);
  const lastPointer = useRef("mouse");
  const dropFrom = useRef<{ id: string; left: number } | null>(null);

  const measure = () => {
    const els = [...(strip.current?.querySelectorAll<HTMLElement>("[data-tab]") ?? [])];
    return els.map((el) => ({ id: el.dataset.tab!, left: el.offsetLeft, width: el.offsetWidth }));
  };
  // The window listeners must be the same functions when removed, so they're fixed wrappers that
  // call this render's handlers.
  const dragView = useRef<{ id: string; dx: number; to: number } | null>(null);
  const showDrag = (v: { id: string; dx: number; to: number } | null) => {
    dragView.current = v;
    setDrag(v);
  };
  const handlers = useRef({ move: (_e: PointerEvent) => {}, up: () => {}, cancel: () => {} });
  const listeners = useRef({
    move: (e: PointerEvent) => handlers.current.move(e),
    up: () => handlers.current.up(),
    cancel: () => handlers.current.cancel(),
  }).current;
  const endDrag = () => {
    const d = dragRef.current;
    if (d?.hold) clearTimeout(d.hold);
    dragRef.current = null;
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.cancel);
  };
  const onMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.on) {
      if (d.touch) {
        // Moved before the hold finished: the finger is scrolling, not dragging.
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) endDrag();
        return;
      }
      if (Math.abs(dx) < 5) return;
      d.on = true;
      setMenu(null);
    }
    const centre = d.self + dx;
    const to = d.centers.filter((c) => c.id !== d.id && c.c < centre).length;
    showDrag({ id: d.id, dx, to });
  };
  const onUp = () => {
    const d = dragRef.current;
    endDrag();
    if (!d?.on) return;
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const cur = dragView.current;
    showDrag(null);
    if (!cur) return;
    const el = measure().find((m) => m.id === cur.id);
    const next = moveItem(tabsRef.current, cur.id, cur.to);
    if (next.some((t, i) => t.id !== tabsRef.current[i].id)) {
      if (el) dropFrom.current = { id: cur.id, left: el.left + cur.dx };
      saveOrder(next.map((t) => t.id));
    }
  };
  const onCancel = () => {
    endDrag();
    showDrag(null);
  };
  handlers.current = { move: onMove, up: onUp, cancel: onCancel };
  const onTabPointerDown = (e: ReactPointerEvent, id: string) => {
    lastPointer.current = e.pointerType;
    if (e.button !== 0 || renaming?.id === id) return;
    const m = measure();
    const self = m.find((x) => x.id === id);
    if (!self) return;
    dragRef.current = {
      id,
      x: e.clientX,
      y: e.clientY,
      touch: e.pointerType !== "mouse",
      on: false,
      centers: m.map((x) => ({ id: x.id, c: x.left + x.width / 2 })),
      self: self.left + self.width / 2,
    };
    if (e.pointerType !== "mouse") {
      dragRef.current.hold = setTimeout(() => {
        const d = dragRef.current;
        if (!d) return;
        d.on = true;
        setMenu(null);
        showDrag({ id, dx: 0, to: m.filter((x) => x.id !== id && x.left + x.width / 2 < d.self).length });
        navigator.vibrate?.(10);
      }, 350);
    }
    window.addEventListener("pointermove", listeners.move);
    window.addEventListener("pointerup", listeners.up);
    window.addEventListener("pointercancel", listeners.cancel);
  };
  // While a finger drags a tab, the tab row mustn't scroll (needs a non-passive listener).
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const stop = (e: TouchEvent) => dragRef.current?.on && e.preventDefault();
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, [tabs === null]);
  useEffect(() => endDrag, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tabs glide to their new places after a reorder (UI rule 18).
  const lefts = useRef(new Map<string, number>());
  const order = (tabs ?? []).map((t) => t.id).join(",");
  useLayoutEffect(() => {
    const now = measure();
    if (!reducedMotion()) {
      for (const m of now) {
        const from = dropFrom.current?.id === m.id ? dropFrom.current.left : lefts.current.get(m.id);
        if (from == null || from === m.left) continue;
        strip.current?.querySelector<HTMLElement>(`[data-tab="${m.id}"]`)?.animate([{ transform: `translateX(${from - m.left}px)` }, { transform: "none" }], { duration: 220, easing: "ease-out" });
      }
    }
    dropFrom.current = null;
    lefts.current = new Map(now.map((m) => [m.id, m.left]));
  }, [order]);

  // The open tab stays in view; "All tabs" shows when the row doesn't fit.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [order, tabs === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menus close on a tap elsewhere or Esc.
  useEffect(() => {
    if (!menu && !allOpen) return;
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".nt-menu, .nt-more, .nt-all-btn")) {
        setMenu(null);
        setAllOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setAllOpen(false);
      }
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [menu, allOpen]);

  const toggleMenu = (id: string) => {
    if (menu) return setMenu(null);
    const el = strip.current?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    const width = bar.current?.clientWidth ?? 600;
    const left = el ? Math.max(0, Math.min(el.offsetLeft - (strip.current?.scrollLeft ?? 0), width - 280)) : 0;
    setAllOpen(false);
    setMenu({ left, confirm: false });
  };

  const onTabKey = (e: ReactKeyboardEvent, id: string) => {
    const list = tabsRef.current;
    const i = list.findIndex((t) => t.id === id);
    const focusTab = (tid: string) => setTimeout(() => strip.current?.querySelector<HTMLElement>(`[data-tab="${tid}"] .nt-tab`)?.focus(), 0);
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const to = i + (e.key === "ArrowLeft" ? -1 : 1);
      if (to < 0 || to >= list.length) return;
      saveOrder(moveItem(list, id, to).map((t) => t.id));
      focusTab(id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const j = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (i + (e.key === "ArrowLeft" ? -1 : 1) + list.length) % list.length;
      open(list[j].id);
      focusTab(list[j].id);
    } else if (e.key === "F2") {
      e.preventDefault();
      startRename(id);
    }
  };

  // ---- search -----------------------------------------------------------------------------
  const texts = useMemo(() => new Map((tabs ?? []).map((t) => [t.id, htmlToText(t.body)])), [tabs]);
  const counts = useMemo(() => new Map((tabs ?? []).map((t) => [t.id, countMatches(texts.get(t.id) ?? "", query)])), [texts, query]);
  const searchGo = () => {
    if (!query.trim() || !tabs) return;
    if ((counts.get(active) ?? 0) > 0) {
      editor.current?.findFirst(query);
      return;
    }
    const hit = tabs.find((t) => (counts.get(t.id) ?? 0) > 0);
    if (hit) open(hit.id, query);
  };

  // ---- render -----------------------------------------------------------------------------
  if (!tabs) return <p className="muted">{err || "Loading notes…"}</p>;
  const cur = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!cur) return <p className="muted">{err || "Loading notes…"}</p>;
  const curChars = chars[cur.id] ?? (texts.get(cur.id) ?? "").length;
  const status = save[cur.id];
  const exportAll = () => download("Session notes", tabs.map((t) => `== ${t.title} ==\n\n${texts.get(t.id) ?? ""}`).join("\n\n\n"));
  const lineAt = drag ? linePosition(measure(), drag) : null;

  return (
    <section className="notes-tab nt" aria-label="Notes">
      <div className="nt-head">
        <h2 className="section-title">Notes</h2>
        <label className="nt-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search notes" aria-label="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchGo()} />
        </label>
        <MoreMenu label="More: export all notes">
          <button type="button" onClick={exportAll}>
            Export all notes (.txt)
          </button>
        </MoreMenu>
      </div>
      <OnlyYou>Only you see these notes.</OnlyYou>
      {err && (
        <p className="nt-err" role="alert">
          {err}{" "}
          <button type="button" className="nt-err-ok" onClick={() => setErr("")}>
            OK
          </button>
        </p>
      )}

      <div className="nt-bar" ref={bar}>
        <div className="nt-strip" ref={strip} role="tablist" aria-label="Note tabs">
          {tabs.map((t) => {
            const on = t.id === cur.id;
            const n = counts.get(t.id) ?? 0;
            const dragging = drag?.id === t.id;
            return (
              <div key={t.id} data-tab={t.id} className={`nt-tabwrap${on ? " on" : ""}${dragging ? " dragging" : ""}`} style={dragging ? { transform: `translateX(${drag!.dx}px)` } : undefined}>
                {renaming?.id === t.id ? (
                  <span className="nt-tab renaming">
                    <span className="nt-dot" style={{ background: colorHex(t.color) }} aria-hidden="true" />
                    <input
                      ref={renameInput}
                      className="nt-rename"
                      aria-label="Tab name"
                      maxLength={TITLE_MAX}
                      value={renaming.draft}
                      onChange={(e) => setRenaming({ ...renaming, draft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(true);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      onBlur={() => commitRename(false)}
                    />
                  </span>
                ) : (
                  <button
                    type="button"
                    role="tab"
                    className="nt-tab"
                    aria-selected={on}
                    aria-controls="nt-panel"
                    tabIndex={on ? 0 : -1}
                    title="Double-click to rename · drag to move"
                    onPointerDown={(e) => onTabPointerDown(e, t.id)}
                    onContextMenu={(e) => lastPointer.current !== "mouse" && e.preventDefault()}
                    onClick={() => {
                      if (justDragged.current) return;
                      if (on && lastPointer.current === "touch") startRename(t.id);
                      else open(t.id, query.trim() && n ? query : undefined);
                    }}
                    onDoubleClick={() => startRename(t.id)}
                    onKeyDown={(e) => onTabKey(e, t.id)}
                  >
                    <span className="nt-dot" style={{ background: colorHex(t.color) }} aria-hidden="true" />
                    <span className="nt-name">{t.title}</span>
                    {n > 0 && (
                      <span className="nt-count" aria-label={`${n} matches`}>
                        {n}
                      </span>
                    )}
                  </button>
                )}
                {on && renaming?.id !== t.id && (
                  <button type="button" className="nt-more" aria-label={`${t.title}: tab menu`} aria-expanded={!!menu} onClick={() => toggleMenu(t.id)}>
                    ⋯
                  </button>
                )}
              </div>
            );
          })}
          {lineAt != null && <span className="nt-drop" style={{ left: lineAt }} aria-hidden="true" />}
        </div>
        <button type="button" className="nt-add" aria-label="New tab" title={tabs.length >= MAX_TABS ? `${MAX_TABS} tabs is the most a session can have` : "New tab"} disabled={tabs.length >= MAX_TABS} onClick={() => newTab()}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {overflow && (
          <button type="button" className="nt-all-btn" aria-expanded={allOpen} onClick={() => (setMenu(null), setAllOpen((o) => !o))}>
            All tabs
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={allOpen ? "M6 15l6-6 6 6" : "m6 9 6 6 6-6"} />
            </svg>
          </button>
        )}

        {menu && (
          <div className="nt-menu" role="menu" style={{ left: menu.left }}>
            {menu.confirm ? (
              <div className="nt-confirm">
                <strong>Delete “{cur.title}”?</strong>
                <span>{(texts.get(cur.id) ?? "").length.toLocaleString()} characters. This can't be undone.</span>
                <div className="nt-confirm-actions">
                  <button type="button" className="btn" onClick={() => setMenu(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn danger" onClick={() => void removeTab(cur.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={() => startRename(cur.id)}>
                  Rename
                </button>
                <div className="nt-menu-colors">
                  <span className="nt-menu-label">Colour</span>
                  <div className="nt-swatches">
                    {NOTE_COLORS.map((c) => (
                      <button key={c.id} type="button" className="nt-swatch" style={{ background: c.hex }} aria-label={c.name} title={c.name} aria-pressed={cur.color === c.id} onClick={() => void patch(cur.id, { color: c.id })}>
                        {cur.color === c.id && (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1c1815" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" role="menuitem" disabled={tabs.length >= MAX_TABS} onClick={() => newTab(cur)}>
                  Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    download(cur.title, texts.get(cur.id) ?? "");
                    setMenu(null);
                  }}
                >
                  Export as text
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  disabled={tabs.length < 2}
                  title={tabs.length < 2 ? "There's always at least one tab" : undefined}
                  onClick={() => ((texts.get(cur.id) ?? "").trim() ? setMenu({ ...menu, confirm: true }) : void removeTab(cur.id))}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {allOpen && (
          <div className="nt-menu nt-all" role="menu">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="menuitem" className={t.id === cur.id ? "on" : ""} onClick={() => open(t.id, query.trim() && counts.get(t.id) ? query : undefined)}>
                <span className="nt-dot" style={{ background: colorHex(t.color) }} aria-hidden="true" />
                <span className="nt-name">{t.title}</span>
                <span className="nt-ago">{editedAgo(t.updated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="nt-panel" role="tabpanel" className="nt-panel" style={{ borderTopColor: colorHex(cur.color) }} aria-label={cur.title}>
        <div className="nt-panel-head">
          <h3>{cur.title}</h3>
          <span className="nt-ago">Edited {editedAgo(cur.updated_at)}</span>
          <span className={`nt-save ${status ?? ""}`} aria-live="polite">
            {status === "saving" ? "Saving…" : status === "offline" ? "Not saved yet: no connection. It saves when you're back online." : status === "error" ? "Not saved yet. Trying again…" : status === "saved" ? "Saved" : ""}
          </span>
          {curChars > MAX_CHARS * 0.9 && (
            <span className="nt-chars">
              {curChars.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          )}
        </div>
        <Suspense fallback={<div className="note-editor note-loading" aria-busy="true" />}>
          <NoteEditor key={cur.id} handle={editor} html={cur.body} label={cur.title} find={find} onChange={(html, n) => typeBody(cur.id, html, n)} />
        </Suspense>
      </div>
    </section>
  );
}

/** Where the gold drop line goes (px from the row's left edge). */
function linePosition(m: { id: string; left: number; width: number }[], drag: { id: string; to: number }): number {
  const others = m.filter((x) => x.id !== drag.id);
  if (!others.length) return 0;
  if (drag.to >= others.length) {
    const last = others[others.length - 1];
    return last.left + last.width + 1;
  }
  return others[drag.to].left - 2;
}
