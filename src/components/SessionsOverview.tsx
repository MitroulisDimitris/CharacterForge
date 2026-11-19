// Sessions on the main page ("Your sessions" cards) and the full Sessions page: every session I
// host or play in, filter Hosting / Playing, Active / Ended, sort by last activity, name or start.
import { useMemo, useState } from "react";
import type { Membership, Overview, SessionInfo } from "../sessions";
import type { StoredCharacter, Theme } from "../storage";
import { getSystem } from "../systems/registry";
import { skinOf } from "../skins";
import { Brand, SkinPicker } from "./Brand";
import { DrawerHead, DrawerScrim, MainNav, MenuButton, type Place } from "./MainMenu";

export interface SessionRow {
  s: SessionInfo;
  hosting: boolean;
  character: string;
  players: number;
  encounters: number | null;
  last: number;
  started: number;
  active: boolean;
}

export function sessionRows(sessions: SessionInfo[], memberships: Membership[], lib: StoredCharacter[], overview: Overview[], userId: string): SessionRow[] {
  return sessions.map((s) => {
    const o = overview.find((x) => x.session_id === s.id);
    const m = memberships.find((x) => x.session_id === s.id);
    const rec = m && lib.find((r) => r.id === m.character_id);
    const started = Date.parse(s.created_at);
    return {
      s,
      hosting: s.host_id === userId,
      character: rec ? ((rec.data as { name?: string }).name || "Unnamed").trim() : (m?.summary?.name ?? ""),
      players: o?.players ?? 0,
      encounters: o?.encounters ?? null,
      last: o ? Date.parse(o.last_activity) : started,
      started,
      active: s.status === "active",
    };
  });
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "4 days ago", or the date. */
export function timeAgo(t: number, now = Date.now()): string {
  const min = Math.floor((now - t) / 60000);
  if (min < 2) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(t).toLocaleDateString();
}

const roleLine = (r: SessionRow) => (r.hosting ? "You host" : r.character ? `You play ${r.character}` : "You play");
const players = (n: number) => `${n} player${n === 1 ? "" : "s"}`;

function RoleChip({ r }: { r: SessionRow }) {
  return <span className={`sess-role ${r.hosting ? "host" : "player"}`}>{r.hosting ? "Hosting" : "Playing"}</span>;
}

/** Main page: the active sessions as cards, most recent first, plus Host / Join and "See all". */
export function SessionsStrip({ rows, onOpen, onAll, onHost, onJoin }: { rows: SessionRow[]; onOpen: (id: string) => void; onAll: () => void; onHost: () => void; onJoin: () => void }) {
  const active = rows.filter((r) => r.active).sort((a, b) => b.last - a.last);
  const shown = active.slice(0, 4);
  return (
    <section className="sess-strip" aria-label="Your sessions">
      <div className="sess-strip-head">
        <h2 className="section-title">
          Your sessions <span className="counter">{active.length}</span>
        </h2>
        <span className="sess-strip-actions">
          <button type="button" className="btn small" onClick={onHost}>
            Host a session
          </button>
          <button type="button" className="btn small" onClick={onJoin}>
            Join a session
          </button>
          {rows.length > 0 && (
            <button type="button" className="link sess-all" onClick={onAll}>
              See all sessions ›
            </button>
          )}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="muted sess-empty">{rows.length ? "No active sessions. Ended ones are under “See all sessions”." : "Play with friends: host a session for your table, or join one with the code your DM sent you."}</p>
      ) : (
        <div className="sess-cards">
          {shown.map((r) => (
            <button key={r.s.id} type="button" className={`sess-card ${r.hosting ? "host" : "player"}`} onClick={() => onOpen(r.s.id)}>
              <span className="sess-card-top">
                <RoleChip r={r} />
                <span className="sess-when">{timeAgo(r.last)}</span>
              </span>
              <strong className="sess-name">{r.s.name}</strong>
              <span className="sess-meta">
                {r.hosting ? players(r.players) : roleLine(r)}
                {r.hosting && r.encounters ? ` · ${r.encounters} encounter${r.encounters === 1 ? "" : "s"}` : ""}
              </span>
              <span className="sess-open">Open ›</span>
            </button>
          ))}
        </div>
      )}
      {active.length > shown.length && (
        <button type="button" className="link sess-all" onClick={onAll}>
          {active.length - shown.length} more active · See all sessions ›
        </button>
      )}
    </section>
  );
}

type Who = "all" | "host" | "player";
type Status = "active" | "ended" | "all";
type Sort = "last" | "name" | "started";

/** The Sessions page. */
export function SessionsPage({
  rows,
  theme,
  onTheme,
  onBack,
  go,
  onOpen,
  onHost,
  onJoin,
}: {
  rows: SessionRow[];
  theme: Theme;
  onTheme: (t: Theme) => void;
  onBack: () => void;
  go?: (p: Place) => void;
  onOpen: (id: string) => void;
  onHost: () => void;
  onJoin: () => void;
}) {
  const [who, setWho] = useState<Who>("all");
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<Sort>("last");
  const [menu, setMenu] = useState(false);
  const counts = {
    all: rows.filter((r) => status === "all" || r.active === (status === "active")).length,
    host: rows.filter((r) => r.hosting && (status === "all" || r.active === (status === "active"))).length,
    player: rows.filter((r) => !r.hosting && (status === "all" || r.active === (status === "active"))).length,
  };
  const list = useMemo(
    () =>
      rows
        .filter((r) => (who === "all" || r.hosting === (who === "host")) && (status === "all" || r.active === (status === "active")))
        .sort((a, b) => (sort === "last" ? b.last - a.last : sort === "started" ? b.started - a.started : a.s.name.localeCompare(b.s.name))),
    [rows, who, status, sort],
  );
  const ended = rows.filter((r) => !r.active).length;

  const body = (
    <section className="sess-page" aria-label="All sessions">
      <div className="sess-controls">
        <div className="segmented sess-who" role="radiogroup" aria-label="Show">
          {(["all", "host", "player"] as Who[]).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={who === w} className={`lk-kind ${who === w ? "on" : ""}`} onClick={() => setWho(w)}>
              {w === "all" ? "All" : w === "host" ? "Hosting" : "Playing"} <span className="tab-count">{counts[w]}</span>
            </button>
          ))}
        </div>
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="active">Active</option>
            <option value="ended">Ended{ended ? ` (${ended})` : ""}</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="last">Last activity</option>
            <option value="started">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      {list.length === 0 ? (
        <div className="sess-none">
          <p className="muted">{rows.length ? "No sessions match. Try “All”." : "No sessions yet. Host one for your table, or join one with the code your DM sent you."}</p>
          {!rows.length && (
            <span className="sess-strip-actions">
              <button type="button" className="btn" onClick={onHost}>
                Host a session
              </button>
              <button type="button" className="btn" onClick={onJoin}>
                Join a session
              </button>
            </span>
          )}
        </div>
      ) : (
        <div className="sess-table" role="table" aria-label="Sessions">
          <div className="sess-tr sess-th" role="row">
            <span role="columnheader">Session</span>
            <span role="columnheader">Players</span>
            <span role="columnheader">Encounters</span>
            <span role="columnheader">Started</span>
            <span role="columnheader">Last activity</span>
            <span role="columnheader">Status</span>
          </div>
          {list.map((r) => (
            <button key={r.s.id} type="button" role="row" className="sess-tr" onClick={() => onOpen(r.s.id)}>
              <span role="cell" className="sess-td-name">
                <RoleChip r={r} />
                <strong>{r.s.name}</strong>
                <small>
                  {roleLine(r)} · {getSystem(r.s.system)?.short ?? r.s.system}
                </small>
              </span>
              <span role="cell" data-label="Players">
                {r.players}
              </span>
              <span role="cell" data-label="Encounters">
                {r.hosting ? (r.encounters ?? 0) : "—"}
              </span>
              <span role="cell" data-label="Started">
                {new Date(r.started).toLocaleDateString()}
              </span>
              <span role="cell" data-label="Last activity" title={new Date(r.last).toLocaleString()}>
                {timeAgo(r.last)}
              </span>
              <span role="cell" data-label="Status">
                <span className={`pill ${r.active ? "" : "muted-pill"}`}>{r.active ? (r.s.joining_locked ? "Joining locked" : "Active") : "Ended"}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="muted sess-note">Last activity counts someone joining, a player's character changing and, for sessions you host, your encounters.</p>
    </section>
  );

  if (skinOf(theme).layout === "hero")
    return (
      <div className="hero-shell">
        <aside className={`hero-side sess-side drawer-side ${menu ? "open" : ""}`}>
          {go ? (
            <MenuButton open={menu} onClick={() => setMenu(true)} />
          ) : (
            <button type="button" className="hero-back" onClick={onBack} aria-label="My characters">
              ‹ <span className="back-label">My characters</span>
            </button>
          )}
          <div className="session-id">
            <h1>Sessions</h1>
            <span className="hero-sub">
              {rows.filter((r) => r.hosting).length} hosting · {rows.filter((r) => !r.hosting).length} playing
            </span>
          </div>
          <div className="hero-side-extra">
            <DrawerHead open={menu} onClose={() => setMenu(false)} />
            {go && <MainNav current="sessions" go={(p) => (setMenu(false), go(p))} />}
            <div className="sessions-actions">
              <button type="button" className="btn small" onClick={onHost}>
                Host a session
              </button>
              <button type="button" className="btn small" onClick={onJoin}>
                Join a session
              </button>
            </div>
            <div className="hero-foot">
              <div className="hero-foot-row">
                <SkinPicker theme={theme} onChange={onTheme} />
              </div>
            </div>
          </div>
        </aside>
        <DrawerScrim open={menu} onClose={() => setMenu(false)} />
        <main className="hero-main">{body}</main>
      </div>
    );

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={onBack} />
        <div className="identity">
          <h1 className="page-title">Sessions</h1>
        </div>
        <div className="actions">
          {go ? (
            <MainNav current="sessions" go={go} />
          ) : (
            <button type="button" className="btn ghost" onClick={onBack}>
              ← My characters
            </button>
          )}
          <SkinPicker theme={theme} onChange={onTheme} />
          <button type="button" className="btn" onClick={onHost}>
            Host a session
          </button>
          <button type="button" className="btn" onClick={onJoin}>
            Join a session
          </button>
        </div>
      </header>
      {body}
    </div>
  );
}
