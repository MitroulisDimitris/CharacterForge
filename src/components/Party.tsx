// Host tools (REQUIREMENTS §4.4, D3): the party's table cards, a member's read-only sheet with the
// in-play state the host controls (HP, damage + type, conditions, exhaustion), level awards, and
// private notes. Also the player's read-only view of that in-play state.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getSystem } from "../systems/registry";
import type { TableCard } from "../systems/types";
import { awardLevel, removeMember, sessionError, setLive, type Membership, type RosterRow } from "../sessions";
import {
  applyDamage,
  applyHealing,
  CONDITIONS,
  conditionOf,
  currentHp,
  DAMAGE_TYPES,
  EXHAUSTION,
  liveLine,
  resetLive,
  setExhaustion,
  setTemp,
  toggleCondition,
  type Live,
} from "../live";
import { Crest, MoreMenu } from "./Hero";

export type HostMember = Membership & { user_id: string };

export function cardOf(m: Membership, system: string): { card: TableCard | null; name: string; identity: string; level: number; portrait?: string } {
  const sys = getSystem(system);
  try {
    const c = sys!.normalize(m.data);
    const d = sys!.derive(c, m.books);
    return { card: sys!.tableCard?.(c, d) ?? null, name: c.name || "Unnamed", identity: d.identity, level: c.level, portrait: c.portrait };
  } catch {
    return { card: null, name: m.summary.name ?? "Unnamed", identity: m.summary.identity ?? "", level: m.summary.level ?? 1, portrait: m.summary.portrait };
  }
}
const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));

/** HP bar: green → gold → crimson as HP drops. */
export function HpBar({ live, max }: { live: Live; max: number }) {
  const hp = currentHp(live, max);
  const pct = max ? Math.round((hp / max) * 100) : 0;
  const tone = pct > 50 ? "ok" : pct > 0 ? "hurt" : "down";
  return (
    <div className="hp-bar" role="img" aria-label={`${hp} of ${max} hit points${live.temp ? `, plus ${live.temp} temporary` : ""}`}>
      <div className={`hp-fill ${tone}`} style={{ width: `${pct}%` }} />
      <span>
        {hp} / {max} HP{live.temp ? ` (+${live.temp})` : ""}
      </span>
    </div>
  );
}

export function ConditionChips({ live }: { live: Live }) {
  if (!live.conditions?.length && !live.exhaustion) return null;
  return (
    <div className="cond-chips">
      {live.conditions?.map((id) => (
        <span key={id} className="cond-chip" title={conditionOf(id)?.text} tabIndex={0}>
          {conditionOf(id)?.name ?? id}
        </span>
      ))}
      {live.exhaustion ? (
        <span className="cond-chip" title={EXHAUSTION.slice(1, live.exhaustion + 1).join("; ")} tabIndex={0}>
          Exhaustion {live.exhaustion}
        </span>
      ) : null}
    </div>
  );
}

/** "Only you see this" for the host's private screens: a small lock and one plain line. */
export function OnlyYou({ children }: { children: ReactNode }) {
  return (
    <p className="only-you">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// Party tab

export function PartyTab({
  sessionId,
  system,
  members,
  roster,
  onOpen,
  onChanged,
}: {
  sessionId: string;
  system: string;
  members: HostMember[];
  roster: RosterRow[];
  onOpen: (memberId: string) => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const sys = getSystem(system);
  const act = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(sessionError(e));
    }
  };
  const privacy = <OnlyYou>Only you see the whole party. Each player sees only their own HP and conditions.</OnlyYou>;
  if (!members.length)
    return (
      <>
        {privacy}
        <p className="muted">Nobody has joined yet. Send your players the invite code.</p>
      </>
    );
  return (
    <section aria-label="Party">
      <div className="party-head">
        <h2 className="section-title">
          Party <span className="counter">{members.length}</span>
        </h2>
        <button type="button" className="btn small" onClick={() => confirm("Give everyone one more level? Each player gets a “Level up ready” to-do.") && act(() => awardLevel(sessionId))}>
          Award a level to everyone
        </button>
      </div>
      {privacy}
      {error && <p className="auth-error">{error}</p>}
      <div className="roster">
        {members.map((m) => {
          const { card, name, identity, level, portrait } = cardOf(m, system);
          const player = roster.find((r) => r.member_id === m.id)?.display_name || "A player";
          return (
            <article key={m.id} className="roster-card party-card">
              <button type="button" className="party-open" onClick={() => onOpen(m.id)} aria-label={`Open ${name}'s sheet`}>
                <Crest identity={identity} level={level} maxLevel={sys?.maxLevel ?? 20} size={60} badge={false} portrait={portrait} hp={card ? { cur: currentHp(m.live ?? {}, card.hpMax), max: card.hpMax } : { cur: 0, max: 0 }} />
                <span className="roster-text">
                  <strong>{name}</strong>
                  <span className="muted">
                    Level {level} · {identity}
                  </span>
                  <span className="roster-player">{player}</span>
                </span>
              </button>
              {card && (
                <>
                  <HpBar live={m.live ?? {}} max={card.hpMax} />
                  <dl className="card-stats">
                    <div title="Armor Class">
                      <dt>AC</dt>
                      <dd>{card.ac}</dd>
                    </div>
                    <div title="Passive Perception">
                      <dt>Pass. Perc.</dt>
                      <dd>{card.passivePerception}</dd>
                    </div>
                    <div title="Initiative bonus">
                      <dt>Init</dt>
                      <dd>{signed(card.initiative)}</dd>
                    </div>
                    <div title="Speed">
                      <dt>Speed</dt>
                      <dd>{card.speed} ft</dd>
                    </div>
                    {card.spellDc != null && (
                      <div title="Spell save DC">
                        <dt>Spell DC</dt>
                        <dd>{card.spellDc}</dd>
                      </div>
                    )}
                  </dl>
                </>
              )}
              <ConditionChips live={m.live ?? {}} />
              {m.level_award && m.level_award > level && <span className="award-chip">Level {m.level_award} awarded · waiting for the player</span>}
              <div className="party-actions">
                <button type="button" className="btn small" onClick={() => onOpen(m.id)}>
                  HP & conditions
                </button>
                <MoreMenu label={`More for ${name}`}>
                  <button type="button" onClick={() => act(() => awardLevel(sessionId, m.id))}>
                    Award a level
                  </button>
                  {/* The host's way to remove a player (the old "Who's playing" list isn't on the host's page). */}
                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      confirm(`Remove ${name} (${player}) from the session?`) && act(() => removeMember(m.id))
                    }
                  >
                    Remove from session…
                  </button>
                </MoreMenu>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// One member: in-play controls + read-only sheet

export function MemberView({ member, system, player, onBack, onChanged }: { member: HostMember; system: string; player: string; onBack: () => void; onChanged: () => void }) {
  const sys = getSystem(system)!;
  const { c, d } = useMemo(() => {
    const c = sys.normalize(member.data);
    return { c, d: sys.derive(c, member.books) };
  }, [sys, member.data, member.books]);
  const card = sys.tableCard?.(c, d);
  const max = card?.hpMax ?? 0;
  const [live, setLiveState] = useState<Live>(member.live ?? {});
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Slashing");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const resists = (card?.resistances ?? []).map((r) => r.toLowerCase());
  const immune = (card?.immunities ?? []).map((r) => r.toLowerCase());
  const resistant = resists.includes(type.toLowerCase());
  const isImmune = immune.includes(type.toLowerCase());
  const [halve, setHalve] = useState(true);
  const Summary = sys.Summary;

  useEffect(() => setLiveState(member.live ?? {}), [member.live]);

  const save = async (next: Live) => {
    setLiveState(next);
    setSaving(true);
    setError("");
    try {
      await setLive(member.id, next);
      onChanged();
    } catch (e) {
      setError(sessionError(e));
    } finally {
      setSaving(false);
    }
  };
  const n = Number(amount);
  const ok = amount !== "" && Number.isFinite(n) && n > 0;

  return (
    <div className="member-view">
      <button type="button" className="link" onClick={onBack}>
        ‹ Party
      </button>
      <header className="member-head">
        <Crest identity={d.identity} level={c.level} maxLevel={sys.maxLevel} size={72} badge={false} portrait={c.portrait} hp={{ cur: currentHp(live, max), max }} />
        <div>
          <h2>{c.name || "Unnamed"}</h2>
          <span className="muted">
            Level {c.level} · {d.identity} · played by {player}
          </span>
        </div>
      </header>

      <section className="live-panel" aria-label="In play">
        <div className="live-top">
          <span className="hero-label">In play · only you can change this</span>
          <span className="muted" aria-live="polite">
            {saving ? "Saving…" : ""}
          </span>
        </div>
        <HpBar live={live} max={max} />
        <div className="live-row">
          <label className="live-amount">
            <span>Amount</span>
            <input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="live-type">
            <span>Damage type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {DAMAGE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn primary" disabled={!ok || isImmune} onClick={() => (save(applyDamage(live, max, n, type, resistant && halve)), setAmount(""))}>
            Damage
          </button>
          <button type="button" className="btn" disabled={!ok} onClick={() => (save(applyHealing(live, max, n)), setAmount(""))}>
            Heal
          </button>
          <button type="button" className="btn ghost" disabled={!ok} onClick={() => (save(setTemp(live, n)), setAmount(""))} title="Temporary hit points don't stack: this replaces them">
            Set temp HP
          </button>
        </div>
        {resistant && (
          <label className="check live-hint">
            <input type="checkbox" checked={halve} onChange={(e) => setHalve(e.target.checked)} /> {c.name || "They"} resists {type.toLowerCase()}: halve the damage
          </label>
        )}
        {isImmune && <p className="live-hint">Tip · {c.name || "They"} is immune to {type.toLowerCase()} damage.</p>}

        <span className="hero-label">Conditions</span>
        <div className="cond-toggle" role="group" aria-label="Conditions">
          {CONDITIONS.map((cd) => {
            const on = live.conditions?.includes(cd.id) ?? false;
            return (
              <button key={cd.id} type="button" className={`cond-btn ${on ? "on" : ""}`} aria-pressed={on} title={cd.text} onClick={() => save(toggleCondition(live, cd.id))}>
                {cd.name}
              </button>
            );
          })}
        </div>
        <div className="live-row">
          <span className="hero-label">Exhaustion</span>
          <button type="button" className="btn small" aria-label="Less exhaustion" disabled={!live.exhaustion} onClick={() => save(setExhaustion(live, (live.exhaustion ?? 0) - 1))}>
            −
          </button>
          <strong className="exh-level">{live.exhaustion ?? 0}</strong>
          <button type="button" className="btn small" aria-label="More exhaustion" disabled={(live.exhaustion ?? 0) >= 6} onClick={() => save(setExhaustion(live, (live.exhaustion ?? 0) + 1))}>
            +
          </button>
          <span className="muted">{EXHAUSTION[live.exhaustion ?? 0]}</span>
          <button type="button" className="btn small ghost reset-live" onClick={() => confirm("Full HP, no temporary HP, no conditions?") && save(resetLive(live))}>
            Reset (long rest)
          </button>
        </div>
        {error && <p className="auth-error">{error}</p>}
        {live.log?.length ? (
          <details className="live-log">
            <summary>What happened ({live.log.length})</summary>
            <ul>
              {live.log.map((l) => (
                <li key={l.t}>
                  <span className="muted">{new Date(l.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> {l.text}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="member-sheet" aria-label="Character sheet (read-only)">
        <h3 className="section-title">Sheet</h3>
        <p className="muted">Read-only: the player makes their own choices.</p>
        <Summary c={c} d={d} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Private notes

// ---------------------------------------------------------------------------------------------
// Player: what the host set (read-only)

export function LiveView({ live, max, sessionName }: { live: Live; max: number; sessionName: string }) {
  if (!live || (!live.log?.length && live.hp == null && !live.temp && !live.conditions?.length && !live.exhaustion)) return null;
  return (
    <section className="live-panel player" aria-label="In this session">
      <span className="hero-label">In {sessionName} · set by your DM</span>
      <HpBar live={live} max={max} />
      <ConditionChips live={live} />
      {live.log?.length ? <p className="muted live-last">Last: {live.log[0].text}</p> : null}
    </section>
  );
}

export { liveLine };
