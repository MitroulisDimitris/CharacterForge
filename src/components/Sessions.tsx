// Sessions UI (REQUIREMENTS §4): the library's Sessions section, Host and Join dialogs, and the
// session page for the host and for players.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSystem, isAvailable, SYSTEMS } from "../systems/registry";
import { bookName, type AnySystem, type SystemId } from "../systems/types";
import type { StoredCharacter, Theme } from "../storage";
import { skinOf } from "../skins";
import {
  codeComplete,
  createSession,
  deleteSession,
  inviteLink,
  joinBlocker,
  joinSession,
  loadHostMembers,
  loadRoster,
  newSessionCode,
  normalizeCode,
  previewSession,
  removeMember,
  sessionCode,
  sessionError,
  summarize,
  swapCharacter,
  updateSession,
  type Membership,
  type Preview,
  type RosterRow,
  type SessionInfo,
} from "../sessions";
import { BookChecklist, normalizeBooks } from "./BookChecklist";
import { Brand, SkinPicker } from "./Brand";
import { Crest, MoreMenu, SideToggle } from "./Hero";
import { Lookup } from "./Lookup";
import { EncountersTab } from "./Encounters";
import { MemberView, NotesTab, OnlyYou, PartyTab } from "./Party";
import { setState as setFeedbackState } from "../trail";

const FOLD_KEY = "character-forge:session-side-folded";
const charName = (rec: StoredCharacter) => ((rec.data as { name?: string }).name || "Unnamed").trim();

// ---------------------------------------------------------------------------------------------
// Library sidebar: Host, Join, and the active sessions.

export function SessionsNav({ count, onAll, onHost, onJoin }: { count: number; onAll: () => void; onHost: () => void; onJoin: () => void }) {
  return (
    <nav className="sessions-nav" aria-label="Sessions">
      <span className="hero-label">Sessions</span>
      <div className="sessions-actions">
        <button type="button" className="btn small" onClick={onHost}>
          Host a session
        </button>
        <button type="button" className="btn small" onClick={onJoin}>
          Join a session
        </button>
      </div>
      {count > 0 && (
        <button type="button" className="session-link" onClick={onAll}>
          <span className="session-link-name">All sessions ({count}) ›</span>
          <span className="session-link-sub">Hosting and playing, last activity</span>
        </button>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------
// Small dialog shell.

function Dialog({ title, intro, children, foot, onClose, label }: { title: string; intro?: ReactNode; children: ReactNode; foot: ReactNode; onClose: () => void; label?: string }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={label ?? title} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="modal session-modal">
        <header className="modal-hero compact">
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-foot">{foot}</footer>
      </div>
    </div>
  );
}

const Err = ({ text }: { text: string }) =>
  text ? (
    <p className="auth-error" role="alert">
      {text}
    </p>
  ) : null;

/** Copy / share buttons for the invite code and link. */
function InviteBox({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState("");
  const link = inviteLink(code);
  const copy = async (what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      prompt("Copy this:", what === "code" ? code : link);
    }
  };
  const share = () => navigator.share?.({ title: name, text: `Join "${name}" on Character Forge with the code ${code}`, url: link }).catch(() => {});
  return (
    <div className="invite-box">
      <span className="hero-label">Invite code</span>
      <strong className="invite-code">{code}</strong>
      <div className="invite-actions">
        <button type="button" className="btn small" onClick={() => copy("code")}>
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
        <button type="button" className="btn small" onClick={() => copy("link")}>
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        {typeof navigator.share === "function" && (
          <button type="button" className="btn small" onClick={share}>
            Share
          </button>
        )}
      </div>
    </div>
  );
}

/** Rule-set picker: only the available ones can be picked; the rest say "Coming soon". */
function RulesPicker({ value, onChange }: { value: SystemId; onChange: (s: AnySystem) => void }) {
  return (
    <div className="rules-picker" role="radiogroup" aria-label="Rules">
      {SYSTEMS.map((s) => {
        const ok = isAvailable(s.id);
        return (
          <button key={s.id} type="button" role="radio" aria-checked={value === s.id} disabled={!ok} className={`rules-option ${value === s.id ? "on" : ""}`} onClick={() => onChange(s)}>
            <strong>{s.name}</strong>
            {!ok && <span className="soon">Coming soon</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Host a session (§4.1).

export function HostDialog({ onClose, onCreated, onOpen }: { onClose: () => void; onCreated: () => void; onOpen: (id: string) => void }) {
  const first = SYSTEMS.find((s) => isAvailable(s.id))!;
  const [name, setName] = useState("");
  const [system, setSystem] = useState<AnySystem>(first);
  const [books, setBooks] = useState<string[]>(first.books.map((b) => b.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<{ id: string; code: string } | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const s = await createSession(name.trim(), system.id, normalizeBooks(system, books));
      const code = await sessionCode(s.id);
      setMade({ id: s.id, code });
      onCreated();
    } catch (err) {
      setError(sessionError(err));
    } finally {
      setBusy(false);
    }
  };

  if (made)
    return (
      <Dialog
        title="Your session is ready"
        intro="Send the code or the link to your players. They join with one of their characters."
        onClose={onClose}
        foot={
          <>
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn primary" onClick={() => onOpen(made.id)}>
              Open the session
            </button>
          </>
        }
      >
        <InviteBox code={made.code} name={name.trim()} />
      </Dialog>
    );

  return (
    <Dialog
      title="Host a session"
      intro="A session is your game. It stays open for as many game nights as you play."
      onClose={onClose}
      foot={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="host-form" className="btn primary" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create session"}
          </button>
        </>
      }
    >
      <form id="host-form" className="auth-form" onSubmit={create}>
        <label className="auth-field">
          <span>Name</span>
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Curse of the Ashen King" autoFocus />
        </label>
        <div className="auth-field">
          <span>Rules</span>
          <RulesPicker
            value={system.id}
            onChange={(s) => {
              setSystem(s);
              setBooks(s.books.map((b) => b.id));
            }}
          />
        </div>
        <div className="auth-field">
          <span>Allowed books</span>
          <BookChecklist system={system} books={books} onChange={setBooks} />
          <small className="auth-hint">Players can join with characters that use only these books.</small>
        </div>
        <Err text={error} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Join a session (§4.2), also used to swap the character in a session.

export function JoinDialog({
  lib,
  initialCode = "",
  swap,
  onClose,
  onJoined,
  onCreateFor,
}: {
  lib: StoredCharacter[];
  initialCode?: string;
  /** Swap mode: the session is known; pick another character. */
  swap?: { session: SessionInfo; current: string };
  onClose: () => void;
  onJoined: (sessionId: string) => void;
  onCreateFor?: (p: Preview, code: string) => void;
}) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [preview, setPreview] = useState<Preview | null>(
    swap ? { ...swap.session, host_name: "", is_host: false, my_character: swap.current } : null,
  );
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lookUp = async (c = code) => {
    setBusy(true);
    setError("");
    try {
      const p = await previewSession(c);
      if (!p) setError("No session has that code. Check it and try again.");
      else setPreview(p);
    } catch (err) {
      setError(sessionError(err));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!swap && codeComplete(normalizeCode(initialCode))) lookUp(normalizeCode(initialCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    const rec = lib.find((r) => r.id === pick);
    if (!rec || !preview) return;
    setBusy(true);
    setError("");
    try {
      if (swap) await swapCharacter(preview.id, rec);
      else await joinSession(code, rec);
      onJoined(preview.id);
    } catch (err) {
      setError(sessionError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!preview)
    return (
      <Dialog
        title="Join a session"
        intro="Enter the invite code your host sent you."
        onClose={onClose}
        foot={
          <>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="join-form" className="btn primary" disabled={busy || !codeComplete(code)}>
              {busy ? "Looking…" : "Find session"}
            </button>
          </>
        }
      >
        <form
          id="join-form"
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            lookUp();
          }}
        >
          <label className="auth-field">
            <span>Invite code</span>
            <input className="code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} placeholder="K7P-2QX" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} />
          </label>
          <Err text={error} />
        </form>
      </Dialog>
    );

  const system = getSystem(preview.system);
  const blockedTop = preview.is_host
    ? "You host this session."
    : !swap && preview.my_character
      ? "You're already in this session."
      : preview.status !== "active"
        ? "This session has ended."
        : !swap && preview.joining_locked
          ? "The host has locked joining for now. Ask them to unlock it."
          : "";
  const rows = [...lib].sort((a, b) => b.updated - a.updated).map((rec) => ({ rec, block: joinBlocker(rec, preview) }));
  const eligible = rows.filter((r) => !r.block);

  return (
    <Dialog
      title={swap ? "Swap character" : preview.name}
      intro={
        swap ? (
          "Pick the character to play in this session. Its current state is copied in."
        ) : (
          <>
            Hosted by <strong>{preview.host_name || "someone"}</strong> · {system?.name} · {preview.books.map((b) => (system ? bookName(system, b) : b)).join(", ")}
          </>
        )
      }
      onClose={onClose}
      foot={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {!blockedTop && (
            <button type="button" className="btn primary" disabled={busy || !pick || pick === swap?.current} onClick={join}>
              {busy ? "Joining…" : swap ? "Swap character" : "Join"}
            </button>
          )}
        </>
      }
    >
      {blockedTop ? (
        <p className="auth-tip">{blockedTop}</p>
      ) : (
        <>
          <p className="join-ask">
            Which character will you play? <span className="counter">{eligible.length} can join</span>
          </p>
          <ul className="join-list" role="radiogroup" aria-label="Your characters">
            {rows.map(({ rec, block }) => {
              const s = summarize(rec.system, rec.books, rec.data);
              const sys = getSystem(rec.system);
              return (
                <li key={rec.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pick === rec.id}
                    disabled={!!block || rec.id === swap?.current}
                    className={`join-row ${pick === rec.id ? "on" : ""}`}
                    onClick={() => setPick(rec.id)}
                  >
                    <Crest identity={s.identity ?? ""} level={s.level ?? 1} maxLevel={sys?.maxLevel ?? 20} size={52} badge={false} />
                    <span className="join-row-text">
                      <strong>{s.name}</strong>
                      <span className="muted">
                        Level {s.level} · {s.identity}
                      </span>
                      {rec.id === swap?.current && <span className="muted">Playing now</span>}
                      {block && <span className="join-reason">{block.reason}</span>}
                      {block?.tip && <span className="join-tip">{block.tip}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {lib.length === 0 && <p className="muted">You don't have any characters yet.</p>}
          {!swap && onCreateFor && (
            <button type="button" className="link" onClick={() => onCreateFor(preview, code)}>
              Create a new character for this session
            </button>
          )}
          <Err text={error} />
        </>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Small dialogs for the host's menu.

function RenameDialog({ session, onClose, onSaved }: { session: SessionInfo; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(session.name);
  const [error, setError] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateSession(session.id, { name: name.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(sessionError(err));
    }
  };
  return (
    <Dialog
      title="Rename the session"
      onClose={onClose}
      foot={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="rename-form" className="btn primary" disabled={!name.trim() || name.trim() === session.name}>
            Save
          </button>
        </>
      }
    >
      <form id="rename-form" className="auth-form" onSubmit={save}>
        <label className="auth-field">
          <span>Name</span>
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <Err text={error} />
      </form>
    </Dialog>
  );
}

function BooksDialog({ session, onClose, onSaved }: { session: SessionInfo; onClose: () => void; onSaved: () => void }) {
  const system = getSystem(session.system)!;
  const [books, setBooks] = useState(session.books);
  const [error, setError] = useState("");
  const next = normalizeBooks(system, [...new Set([...session.books, ...books])]);
  const save = async () => {
    try {
      await updateSession(session.id, { books: next });
      onSaved();
      onClose();
    } catch (err) {
      setError(sessionError(err));
    }
  };
  return (
    <Dialog
      title="Allowed books"
      intro="Add books players may use. Books already allowed stay on, so nobody's character stops fitting."
      onClose={onClose}
      foot={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={next.join() === session.books.join()} onClick={save}>
            Save books
          </button>
        </>
      }
    >
      <BookChecklist system={system} books={books} onChange={(b) => setBooks([...new Set([...session.books, ...b])])} />
      <Err text={error} />
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// The session page (§4.3 player, §4.4 host).

export function SessionPage({
  session,
  userId,
  membership,
  lib,
  theme,
  onTheme,
  onBack,
  onChanged,
  onOpenSheet,
}: {
  session: SessionInfo;
  userId: string;
  membership?: Membership;
  lib: StoredCharacter[];
  theme: Theme;
  onTheme: (t: Theme) => void;
  onBack: () => void;
  /** Sessions or memberships changed: reload them. */
  onChanged: () => Promise<void> | void;
  onOpenSheet: (characterId: string, memberId: string) => void;
}) {
  const isHost = session.host_id === userId;
  const system = getSystem(session.system);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"rename" | "books" | "swap" | null>(null);
  const [tick, setTick] = useState(0);
  const ended = session.status !== "active";
  const [sideOpen, setSideOpen] = useState(false);
  // PC: the side panel folds to a thin strip (remembered on this device).
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(FOLD_KEY) === "1";
    } catch {
      return false;
    }
  });
  const fold = () =>
    setFolded((f) => {
      try {
        localStorage.setItem(FOLD_KEY, f ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !f;
    });
  const [hostTab, setHostTab] = useState<"lookup" | "party" | "encounters" | "notes">("lookup");
  const [members, setMembers] = useState<Awaited<ReturnType<typeof loadHostMembers>>>([]);
  const [viewMember, setViewMember] = useState<string | null>(null);

  // The host's full view of the members (table cards, in-play state); refreshed every 20 s.
  useEffect(() => {
    if (!isHost) return;
    let live = true;
    const load = () =>
      loadHostMembers(session.id)
        .then((m) => live && setMembers(m))
        .catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [isHost, session.id, tick]);

  useEffect(() => {
    setFeedbackState("session", { name: session.name, role: isHost ? "host" : "player", status: session.status, members: roster?.length ?? null, hostTab: isHost ? hostTab : undefined });
    return () => setFeedbackState("session", undefined);
  }, [session.name, session.status, isHost, roster, hostTab]);

  useEffect(() => {
    let live = true;
    loadRoster(session.id)
      .then((r) => live && setRoster(r))
      .catch((e) => live && setError(sessionError(e)));
    if (isHost)
      sessionCode(session.id)
        .then((c) => live && setCode(c))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [session.id, isHost, tick, membership?.updated_at]);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError("");
    try {
      await fn();
      await onChanged();
      setTick((n) => n + 1);
      after?.();
    } catch (e) {
      setError(sessionError(e));
    }
  };

  const myChar = membership && lib.find((r) => r.id === membership.character_id);
  const books = session.books.map((b) => (system ? bookName(system, b) : b)).join(", ");

  const menu = (
    <MoreMenu label="Session actions">
      {isHost ? (
        <>
          {!ended && (
            <button type="button" onClick={() => confirm("Make a new invite code? The old code and link stop working.") && act(async () => setCode(await newSessionCode(session.id)))}>
              New invite code
            </button>
          )}
          {!ended && (
            <button type="button" onClick={() => act(() => updateSession(session.id, { joining_locked: !session.joining_locked }))}>
              {session.joining_locked ? "Unlock joining" : "Lock joining"}
            </button>
          )}
          <button type="button" onClick={() => setDialog("rename")}>
            Rename
          </button>
          <button type="button" onClick={() => setDialog("books")}>
            Allowed books
          </button>
          {ended ? (
            <button type="button" onClick={() => act(() => updateSession(session.id, { status: "active" }))}>
              Reopen session
            </button>
          ) : (
            <button
              type="button"
              onClick={() => confirm("End this session? It moves to Past sessions. Players keep their characters; nothing is deleted.") && act(() => updateSession(session.id, { status: "ended" }))}
            >
              End session
            </button>
          )}
          <button type="button" className="danger" onClick={() => confirm(`Delete "${session.name}" for everyone? This can't be undone.`) && act(() => deleteSession(session.id), onBack)}>
            Delete session…
          </button>
        </>
      ) : (
        <>
          {!ended && (
            <button type="button" onClick={() => setDialog("swap")}>
              Swap character
            </button>
          )}
          <button
            type="button"
            className="danger"
            onClick={() => membership && confirm(`Leave "${session.name}"? Your character's session version is removed; your own character stays.`) && act(() => removeMember(membership.id), onBack)}
          >
            Leave session…
          </button>
        </>
      )}
    </MoreMenu>
  );

  const status = (
    <div className="session-status">
      {ended && <span className="pill">Ended</span>}
      {isHost && session.joining_locked && !ended && <span className="pill">Joining locked</span>}
    </div>
  );

  const rosterView = (
    <section aria-label="Who's playing">
      <h2 className="section-title">
        Who's playing <span className="counter">{roster ? roster.length : "…"}</span>
      </h2>
      {roster && roster.length === 0 && (
        <p className="muted">{isHost ? "Nobody has joined yet. Send your players the invite code." : "Nobody else has joined yet."}</p>
      )}
      <div className="roster">
        {roster?.map((r) => {
          const mine = r.user_id === userId;
          return (
            <article key={r.member_id} className={`roster-card ${mine ? "mine" : ""}`}>
              <Crest identity={r.summary.identity ?? ""} level={r.summary.level ?? 1} maxLevel={system?.maxLevel ?? 20} size={64} badge={false} />
              <div className="roster-text">
                <strong>{r.summary.name ?? "Unnamed"}</strong>
                <span className="muted">
                  Level {r.summary.level ?? "?"} · {r.summary.identity ?? ""}
                </span>
                <span className="roster-player">{mine ? "You" : r.display_name || "A player"}</span>
              </div>
              {mine && membership && (
                <button type="button" className="btn small" onClick={() => onOpenSheet(membership.character_id, membership.id)}>
                  Open sheet
                </button>
              )}
              {isHost && (
                <MoreMenu label={`Actions for ${r.summary.name ?? "this player"}`}>
                  <button type="button" className="danger" onClick={() => confirm(`Remove ${r.display_name || "this player"} from the session?`) && act(() => removeMember(r.member_id))}>
                    Remove from session…
                  </button>
                </MoreMenu>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );

  const mainAction = isHost ? null : membership ? (
    <button type="button" className="btn primary hero-levelup" onClick={() => onOpenSheet(membership.character_id, membership.id)}>
      Open {myChar ? charName(myChar) : "my character"}
    </button>
  ) : null;

  const dialogs = (
    <>
      {dialog === "rename" && <RenameDialog session={session} onClose={() => setDialog(null)} onSaved={() => act(async () => {})} />}
      {dialog === "books" && <BooksDialog session={session} onClose={() => setDialog(null)} onSaved={() => act(async () => {})} />}
      {dialog === "swap" && membership && (
        <JoinDialog
          lib={lib}
          swap={{ session, current: membership.character_id }}
          onClose={() => setDialog(null)}
          onJoined={() => {
            setDialog(null);
            act(async () => {});
          }}
        />
      )}
    </>
  );

  const shown = viewMember ? members.find((m) => m.id === viewMember) : undefined;
  const hostBody = (
    <>
      <nav className="tabs" role="tablist">
        {(["lookup", "party", "encounters", "notes"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={hostTab === t}
            className={hostTab === t ? "on" : ""}
            onClick={() => {
              setHostTab(t);
              setViewMember(null);
            }}
          >
            {t === "lookup" ? "Lookup" : t === "party" ? "Party" : t === "encounters" ? "Encounters" : "Notes"}
            {t === "party" && members.length > 0 && <span className="tab-count">{members.length}</span>}
          </button>
        ))}
      </nav>
      <div className="tab-body">
        {hostTab === "lookup" && (
          <>
            <OnlyYou>Only you see what you look up.</OnlyYou>
            <Lookup userId={userId} sessionId={session.id} />
          </>
        )}
        {hostTab === "party" &&
          (shown ? (
            <MemberView
              member={shown}
              system={session.system}
              player={roster?.find((r) => r.member_id === shown.id)?.display_name || "a player"}
              onBack={() => setViewMember(null)}
              onChanged={() => setTick((n) => n + 1)}
            />
          ) : (
            <PartyTab sessionId={session.id} system={session.system} members={members} roster={roster ?? []} onOpen={setViewMember} onChanged={() => setTick((n) => n + 1)} />
          ))}
        {hostTab === "encounters" && (
          <EncountersTab sessionId={session.id} system={session.system} hostMembers={members} onPlayersChanged={() => setTick((n) => n + 1)} />
        )}
        {hostTab === "notes" && <NotesTab sessionId={session.id} />}
      </div>
    </>
  );

  const identity = (
    <div className="session-id">
      <h1>{session.name}</h1>
      <span className="hero-sub">{isHost ? "You host this session" : `You play ${myChar ? charName(myChar) : "here"}`}</span>
      <span className="hero-system" title={`Books: ${books}`}>
        {system?.short} · {session.books.length} book{session.books.length === 1 ? "" : "s"}
      </span>
      {status}
    </div>
  );

  if (skinOf(theme).layout === "hero")
    return (
      <div className="hero-shell">
        <aside className={`hero-side session-side ${sideOpen ? "open" : ""} ${folded ? "folded" : ""}`}>
          <div className="side-top">
            <button type="button" className="side-fold" onClick={fold} aria-expanded={!folded} aria-label={folded ? "Show the side panel" : "Hide the side panel"} title={folded ? "Show the side panel" : "Hide the side panel"}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
              </svg>
            </button>
            <button type="button" className="hero-back" onClick={onBack} aria-label="My characters">
              ‹ <span className="back-label">My characters</span>
            </button>
          </div>
          <span className="side-mono" title={session.name} aria-hidden="true">
            {session.name.trim().charAt(0).toUpperCase() || "S"}
          </span>
          {identity}
          <SideToggle open={sideOpen} onToggle={() => setSideOpen((o) => !o)} label={isHost ? "Code & menu" : "Menu"} />
          <div className="hero-side-extra">
          {isHost && code && !ended && <InviteBox code={code} name={session.name} />}
          <div className="hero-foot">
            {mainAction}
            <div className="hero-foot-row">
              <SkinPicker theme={theme} onChange={onTheme} />
              {menu}
            </div>
          </div>
          </div>
        </aside>
        <main className="hero-main">
          <Err text={error} />
          {isHost ? hostBody : rosterView}
        </main>
        {dialogs}
      </div>
    );

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={onBack} />
        <div className="identity">
          <h1 className="page-title">{session.name}</h1>
          <span className="identity-sub">
            {isHost ? "You host this session" : `You play ${myChar ? charName(myChar) : "here"}`} · {system?.short} · {books}
          </span>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← My characters
          </button>
          <SkinPicker theme={theme} onChange={onTheme} />
          {mainAction}
          {menu}
        </div>
      </header>
      {status}
      <Err text={error} />
      <div className="session-classic">
        {isHost && code && !ended && (
          <div className="card">
            <InviteBox code={code} name={session.name} />
          </div>
        )}
        {isHost ? hostBody : rosterView}
      </div>
      {dialogs}
    </div>
  );
}
