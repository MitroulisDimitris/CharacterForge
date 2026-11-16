// What feedback sends automatically (REQUIREMENTS §6.1): the last ~50 steps in plain words,
// recent errors and failed requests, and the current state (open character / session).
// Kept in memory and in sessionStorage (survives a reload); only sent with feedback.
// Typing is recorded as "Typed in <field>", never the text; password fields are ignored.

export interface Step {
  t: number;
  what: string;
}

const STEPS_KEY = "character-forge:trail";
const MAX_STEPS = 50;
const MAX_ERRORS = 20;

let steps: Step[] = load();
const errors: Step[] = [];
const state: Record<string, unknown> = {};

function load(): Step[] {
  try {
    const s = JSON.parse(sessionStorage.getItem(STEPS_KEY) ?? "[]");
    return Array.isArray(s) ? s.slice(-MAX_STEPS) : [];
  } catch {
    return [];
  }
}
function persist() {
  try {
    sessionStorage.setItem(STEPS_KEY, JSON.stringify(steps));
  } catch {
    /* ignore */
  }
}

/** Record one step ("Opened efiah", "Clicked “Level up to 3”"). Repeats within 1 s are merged. */
export function record(what: string) {
  const last = steps[steps.length - 1];
  if (last && last.what === what && Date.now() - last.t < 1000) return;
  steps = [...steps, { t: Date.now(), what: what.slice(0, 200) }].slice(-MAX_STEPS);
  persist();
}

export function recordError(what: string) {
  errors.push({ t: Date.now(), what: what.slice(0, 400) });
  if (errors.length > MAX_ERRORS) errors.shift();
  record(`Error: ${what.slice(0, 120)}`);
}

/** Screens publish what's open (e.g. "character", "session"); undefined removes it. */
export function setState(key: string, value: unknown) {
  if (value === undefined) delete state[key];
  else state[key] = value;
}

export const getSteps = () => steps;
export const getErrors = () => [...errors];
export const getState = () => ({ ...state });

// ---------------------------------------------------------------------------------------------
// Automatic recording: clicks on buttons / links / tabs, picks in dropdowns and checkboxes, typing,
// dialogs opening and closing, screen changes, errors, failed requests.

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
const inFeedback = (el: Element | null) => !!el?.closest("[data-fb-ui]");

function fieldLabel(el: Element): string {
  const id = el.getAttribute("id");
  const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  const wrap = el.closest("label");
  const txt =
    el.getAttribute("aria-label") ||
    clean(byFor?.textContent) ||
    clean(wrap?.querySelector("span, strong")?.textContent) ||
    clean(wrap?.textContent) ||
    el.getAttribute("placeholder") ||
    el.getAttribute("name") ||
    el.tagName.toLowerCase();
  return clean(txt);
}

let started = false;
export function startTrail() {
  if (started || typeof window === "undefined") return;
  started = true;

  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element | null)?.closest("button, a, [role=tab], [role=radio], summary");
      if (!el || inFeedback(el)) return;
      const label = clean(el.getAttribute("aria-label") || el.querySelector("strong, h3")?.textContent || el.textContent) || el.getAttribute("title") || el.tagName.toLowerCase();
      const kind = el.getAttribute("role") === "tab" ? "Switched to the tab" : el.tagName === "SUMMARY" ? "Opened / closed" : "Clicked";
      record(`${kind} “${label}”`);
    },
    true,
  );

  document.addEventListener(
    "change",
    (e) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement;
      if (!el || inFeedback(el) || (el as HTMLInputElement).type === "password") return;
      if (el instanceof HTMLSelectElement) record(`Picked “${clean(el.selectedOptions[0]?.textContent)}” in ${fieldLabel(el)}`);
      else if (el.type === "checkbox" || el.type === "radio") record(`${el.checked ? "Ticked" : "Unticked"} “${fieldLabel(el)}”`);
      else if (el.type === "file") record(`Chose a file in ${fieldLabel(el)}`);
    },
    true,
  );

  const typed = new Map<Element, number>();
  document.addEventListener(
    "input",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      const el = t;
      if (inFeedback(el) || el.type === "password") return;
      if (["checkbox", "radio", "file"].includes(el.type)) return;
      const last = typed.get(el) ?? 0;
      if (Date.now() - last > 5000) record(`Typed in ${fieldLabel(el)}`);
      typed.set(el, Date.now());
    },
    true,
  );

  // Screens and dialogs: watch the page heading and dialog titles.
  let lastH1 = "";
  let lastDialog = "";
  const watch = () => {
    const h1 = clean(document.querySelector("h1")?.textContent);
    if (h1 && h1 !== lastH1) {
      lastH1 = h1;
      record(`Screen: ${h1}`);
    }
    const d = clean(document.querySelector("[role=dialog] h2, .modal-hero h2")?.textContent);
    if (d !== lastDialog) {
      if (d) record(`Opened the dialog “${d}”`);
      else if (lastDialog) record(`Closed the dialog “${lastDialog}”`);
      lastDialog = d;
    }
  };
  new MutationObserver(() => watch()).observe(document.body, { childList: true, subtree: true });

  window.addEventListener("error", (e) => recordError(`${e.message} (${e.filename?.split("/").pop()}:${e.lineno})`));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | undefined;
    recordError(`Unhandled: ${r?.message ?? String(e.reason)}`);
  });

  // Failed requests (to the database or elsewhere).
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = String(args[0] instanceof Request ? args[0].url : args[0]);
    const short = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    try {
      const res = await orig(...args);
      if (!res.ok && res.status !== 401) recordError(`Request failed: ${res.status} ${short}`);
      return res;
    } catch (err) {
      recordError(`Request failed (no connection?): ${short}`);
      throw err;
    }
  };
}
