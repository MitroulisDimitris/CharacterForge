// Dice at the table (user, 2026-11-24; mockup canvas "Session Versions and Table Dice", page "Dice at
// the table"). The player rolls from their character on the session page and every roll is shared with
// the DM; the DM's Rolls tab shows tonight's rolls for everyone or one player. No history (user): only
// the last 12 hours (src/rolls.ts).
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSystem } from "../systems/registry";
import type { SystemId } from "../systems/types";
import type { Membership, RosterRow } from "../sessions";
import { addTableRoll, loadTableRolls, rollTag, rollTime, tableRollOf, type TableRoll } from "../rolls";
import { NextRoll, RollScope, useDice } from "./Dice";
import { Crest } from "./Hero";
import { DamageFx, fxTypeOf, type FxMode } from "./DamageFx";
import { cardOf } from "./Party";
import { currentHp } from "../live";

const POLL_MS = 5000;
/** A pause this long between two rolls draws a faint line, so the DM's eye finds the new ones. */
const GAP_MS = 60_000;
const ARRIVE_MS = 1200;
/** The newest this many damage rolls of a list keep their animation's held picture; older ones show just
 *  the coloured banner, so a long night stays light. A roll plays its animation once when it comes in.
 *  (All of them share one WebGL context: src/dice/fxEngine.ts.) */
const FX_ROWS = 20;

/** Tonight's rolls in a session, refreshed every few seconds while `on`. */
export function useTableRolls(sessionId: string, on: boolean) {
  const [rolls, setRolls] = useState<TableRoll[] | null>(null);
  const reload = useCallback(() => {
    loadTableRolls(sessionId)
      .then(setRolls)
      .catch(() => {});
  }, [sessionId]);
  useEffect(() => {
    if (!on) return;
    reload();
    const t = setInterval(reload, POLL_MS);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", reload);
    };
  }, [on, reload]);
  /** null until the first load: lists treat what's there then as already seen. */
  return [rolls, reload] as const;
}

type Who = { name: string; identity: string; level: number; portrait?: string; maxLevel: number; hp?: { cur: number; max: number } };

function RollLine({ r, who, arrive, fx }: { r: TableRoll; who?: Who; arrive?: boolean; fx?: boolean }) {
  const tag = rollTag(r);
  const type = !r.flag ? fxTypeOf(r.unit) : null;
  const mode: FxMode = !fx ? "plain" : arrive ? "play" : "rest";
  return (
    <li className={`table-roll-line ${r.flag ?? ""} ${arrive ? "arrive" : ""} ${type ? `fx-row lf-${type}` : ""}`}>
      <span className="table-roll-time">{rollTime(r.created_at)}</span>
      {who && (
        <span className="table-roll-who">
          <Crest identity={who.identity} level={who.level} maxLevel={who.maxLevel} size={28} badge={false} portrait={who.portrait} hp={who.hp} />
          <span>{who.name}</span>
        </span>
      )}
      <span className="table-roll-what">
        <strong>{r.label}</strong>
        <small>
          {r.detail}
          {r.sub ? ` · ${r.sub}` : ""}
        </small>
      </span>
      {type ? (
        <DamageFx type={type} via={r.via} word={tag} total={r.total} mode={mode} />
      ) : (
        <>
          {tag && <span className="table-roll-tag">{tag}</span>}
          <strong className="table-roll-total">{r.total}</strong>
        </>
      )}
    </li>
  );
}

/**
 * Rolls that come in while the list is open slide in from the top (not the ones already there when it
 * opened). id → when it arrived; the flag stays for the animation's length, so a re-render in the
 * middle doesn't cut it short.
 */
function useArrivals(rolls: TableRoll[] | null): string[] {
  const known = useRef<Map<string, number> | null>(null);
  if (!rolls) return [];
  if (!known.current) known.current = new Map(rolls.map((r) => [r.id, 0]));
  const now = Date.now();
  for (const r of rolls) if (!known.current.has(r.id)) known.current.set(r.id, now);
  return rolls.filter((r) => now - (known.current!.get(r.id) || 0) < ARRIVE_MS).map((r) => r.id);
}

// ---------- The player ----------

/**
 * The player's session page: the character and its rolls on the left (with `children` below: the DM's
 * view of their HP, who's playing), and tonight's rolls filling the right side.
 */
export function PlayerTable({
  sessionId,
  membership,
  systemId,
  onOpenSheet,
  children,
}: {
  sessionId: string;
  membership: Membership;
  systemId: SystemId;
  onOpenSheet: () => void;
  children?: ReactNode;
}) {
  const system = getSystem(systemId);
  const dice = useDice();
  const [loaded, reload] = useTableRolls(sessionId, true);
  const arrived = useArrivals(loaded);
  const mine = loaded ?? [];
  const [sendError, setSendError] = useState(false);
  const c = useMemo(() => (system ? system.normalize(membership.data) : null), [system, membership.data]);
  const d = useMemo(() => (system && c ? system.derive(c, membership.books) : null), [system, c, membership.books]);

  // Every roll made while this page is open goes to the DM too.
  useEffect(() => {
    if (!dice) return;
    return dice.share({
      note: "Sent to your DM",
      send: (spec, res) => {
        const roll = tableRollOf(spec, res);
        // Shown once saved (its real id), so it slides into the list once.
        addTableRoll(sessionId, membership.id, roll)
          .then(() => {
            setSendError(false);
            reload();
          })
          .catch(() => setSendError(true));
      },
    });
  }, [dice, sessionId, membership.id, reload]);

  if (!system || !c || !d) return null;
  const Rolls = system.TableRolls;
  const s = membership.summary;
  return (
    <section className="player-table" aria-label="Your character">
      <div className="player-table-main">
        <div className="player-table-head">
          <Crest identity={s.identity ?? ""} level={s.level ?? 1} maxLevel={system.maxLevel} size={56} badge={false} portrait={s.portrait} />
          <span className="player-table-id">
            <strong>{s.name ?? "Your character"}</strong>
            <span className="muted">
              {s.identity}
              {membership.version ? " · this session's version" : ""}
            </span>
          </span>
          <button type="button" className="btn small ghost" onClick={onOpenSheet}>
            Open full sheet
          </button>
        </div>
        <div className="player-table-mode">
          <NextRoll />
          <span className="muted">Every roll here is shared with your DM.</span>
        </div>
        {sendError && <p className="form-error">Couldn't send the last roll to your DM. Check your internet connection.</p>}
        {Rolls ? (
          <RollScope>
            <Rolls c={c} d={d} />
          </RollScope>
        ) : (
          <p className="muted">Rolling from the session isn't ready for these rules yet.</p>
        )}
        {children}
      </div>
      <aside className="player-table-log" aria-label="Your rolls tonight">
        <h2 className="side-label">Your rolls tonight</h2>
        {mine.length ? (
          <ul className="table-roll-list mine">
            {mine.map((r, i) => (
              <RollLine key={r.id} r={r} arrive={arrived.includes(r.id)} fx={i < FX_ROWS} />
            ))}
          </ul>
        ) : (
          <p className="muted">No rolls yet. Tap a gold chip to roll.</p>
        )}
      </aside>
    </section>
  );
}

// ---------- The DM ----------

export function HostRolls({ rolls: loaded, roster, members: hostSeats = [], systemId }: { rolls: TableRoll[] | null; roster: RosterRow[]; members?: Membership[]; systemId: SystemId }) {
  const rolls = loaded ?? [];
  const [who, setWho] = useState<string>("all");
  const maxLevel = getSystem(systemId)?.maxLevel ?? 20;
  const byMember = new Map(roster.map((r) => [r.member_id, r]));
  const seats = new Map(hostSeats.map((m) => [m.id, m]));
  const person = (memberId: string) => {
    const r = byMember.get(memberId);
    // A player who joined after the page opened isn't in the roster yet: their seat has the summary.
    const seat = seats.get(memberId);
    const sum = r?.summary ?? seat?.summary ?? {};
    // The DM sees each character's ring as its health (green / yellow / red), not its level.
    const max = seat ? (cardOf(seat, systemId).card?.hpMax ?? 0) : 0;
    const hp = { cur: seat ? currentHp(seat.live ?? {}, max) : 0, max };
    return { name: sum.name ?? "A player", identity: sum.identity ?? "", level: sum.level ?? 1, portrait: sum.portrait, maxLevel, player: r?.display_name ?? "", hp };
  };
  // Rolls that come in while the tab is open slide in from the top (not the ones already there,
  // nor the ones a filter change shows).
  const arrived = useArrivals(loaded);
  const members = [...new Set([...roster.map((r) => r.member_id), ...rolls.map((r) => r.member_id)])];
  const shown = who === "all" ? rolls : rolls.filter((r) => r.member_id === who);
  const p = who !== "all" ? person(who) : null;
  // One line only (user, 2026-11-24): under the newest burst of rolls, at the first pause of a minute
  // or more counting from the top, labelled "New".
  const newUntil = shown.findIndex((r, i) => i + 1 < shown.length && Date.parse(r.created_at) - Date.parse(shown[i + 1].created_at) >= GAP_MS);
  return (
    <div className="host-rolls">
      <div className="host-rolls-filter" role="tablist" aria-label="Whose rolls">
        <button type="button" role="tab" aria-selected={who === "all"} className={who === "all" ? "on" : ""} onClick={() => setWho("all")}>
          Everyone <span className="counter">{rolls.length}</span>
        </button>
        {members.map((m) => {
          const x = person(m);
          return (
            <button key={m} type="button" role="tab" aria-selected={who === m} className={who === m ? "on" : ""} onClick={() => setWho(m)}>
              <Crest identity={x.identity} level={x.level} maxLevel={maxLevel} size={24} badge={false} portrait={x.portrait} hp={x.hp} />
              {x.name} <span className="counter">{rolls.filter((r) => r.member_id === m).length}</span>
            </button>
          );
        })}
      </div>
      {p && (
        <div className="host-rolls-summary">
          <Crest identity={p.identity} level={p.level} maxLevel={maxLevel} size={46} badge={false} portrait={p.portrait} hp={p.hp} />
          <span className="host-rolls-who">
            <strong>{p.name}</strong>
            <span className="muted">
              {p.identity}
              {p.player ? ` · played by ${p.player}` : ""}
            </span>
          </span>
          <span className="host-rolls-stats">
            <span>
              <strong>{shown.length}</strong> rolls tonight
            </span>
            <span className="nat20">
              <strong>{shown.filter((r) => r.flag === "nat20").length}</strong> natural 20s
            </span>
            <span className="nat1">
              <strong>{shown.filter((r) => r.flag === "nat1").length}</strong> natural 1s
            </span>
          </span>
        </div>
      )}
      <h2 className="side-label">Tonight · newest first</h2>
      {shown.length ? (
        <ul className="table-roll-list">
          {shown.map((r, i) => (
            <Fragment key={r.id}>
              <RollLine r={r} who={who === "all" ? person(r.member_id) : undefined} arrive={arrived.includes(r.id)} fx={i < FX_ROWS} />
              {i === newUntil && (
                <li className="table-roll-gap" role="separator" aria-label="Older rolls below">
                  <span>New</span>
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      ) : (
        <p className="muted">No rolls yet tonight. Players' rolls on the session page show up here as they land.</p>
      )}
    </div>
  );
}
