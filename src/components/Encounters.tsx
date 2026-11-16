// Encounters tab for the host (REQUIREMENTS §4.4, step 9): saved encounters for this session and a
// builder (search monsters, set counts) that rates the difficulty live for this party with the
// 2014 XP thresholds. Players never see encounters.
import { useEffect, useMemo, useState } from "react";
import { DIFFICULTY_TEXT, deleteEncounter, loadEncounters, rate, saveEncounter, xpForCr, type Encounter, type EncounterMonster, type Rating } from "../encounters";
import { getMonster, searchMonsters, type Monster } from "../lookup";
import { sessionError } from "../sessions";
import { MonsterCard } from "./Lookup";
import { MoreMenu } from "./Hero";

export interface PartyMember {
  name: string;
  level: number;
}

const fmt = (n: number) => n.toLocaleString();
const monsterLine = (ms: EncounterMonster[]) => ms.map((m) => `${m.count} × ${m.name}`).join(", ") || "No monsters yet";

function DifficultyChip({ r }: { r: Rating }) {
  return <span className={`diff-chip diff-${r.difficulty.toLowerCase()}`}>{r.difficulty === "None" ? "—" : r.difficulty}</span>;
}

/** The live rating: difficulty, a meter against the party's thresholds, XP numbers. */
function RatingPanel({ r, partySize }: { r: Rating; partySize: number }) {
  const top = Math.max(r.thresholds[3] * 1.25, r.adjustedXp, 1);
  const pct = (x: number) => `${Math.min(100, (x / top) * 100)}%`;
  return (
    <section className={`rating diff-${r.difficulty.toLowerCase()}`} aria-label="Difficulty">
      <span className="hero-label">Difficulty for this party</span>
      <strong className="rating-word">{r.difficulty === "None" ? "—" : r.difficulty}</strong>
      <p className="rating-text">{DIFFICULTY_TEXT[r.difficulty]}</p>
      <div className="meter" role="img" aria-label={`${fmt(r.adjustedXp)} adjusted XP; Easy ${fmt(r.thresholds[0])}, Medium ${fmt(r.thresholds[1])}, Hard ${fmt(r.thresholds[2])}, Deadly ${fmt(r.thresholds[3])}`}>
        <div className="meter-fill" style={{ width: pct(r.adjustedXp) }} />
        {(["Easy", "Medium", "Hard", "Deadly"] as const).map((label, i) => (
          <span key={label} className="meter-mark" style={{ left: pct(r.thresholds[i]) }} title={`${label}: ${fmt(r.thresholds[i])} XP`}>
            <small>{label}</small>
          </span>
        ))}
      </div>
      <dl className="rating-numbers">
        <div>
          <dt>Total XP</dt>
          <dd>{fmt(r.totalXp)}</dd>
        </div>
        <div>
          <dt>Per player</dt>
          <dd>{fmt(r.perPlayer)}</dd>
        </div>
        <div title="Total XP × the multiplier for the number of monsters. This is what sets the difficulty.">
          <dt>Adjusted</dt>
          <dd>
            {fmt(r.adjustedXp)} <small>(×{r.multiplier})</small>
          </dd>
        </div>
      </dl>
      {r.monsterCount > 1 && (
        <p className="rating-tip">
          Tip · {r.monsterCount} monsters count as ×{r.multiplier}: more attackers make a fight harder than their XP alone.
          {partySize > 0 && partySize < 3 ? " Small parties take one step more." : partySize >= 6 ? " Big parties take one step less." : ""}
        </p>
      )}
    </section>
  );
}

function Builder({
  sessionId,
  start,
  party,
  onDone,
}: {
  sessionId: string;
  start: Encounter | null;
  party: number[];
  onDone: (saved: boolean) => void;
}) {
  const [name, setName] = useState(start?.name ?? "");
  const [monsters, setMonsters] = useState<EncounterMonster[]>(start?.monsters ?? []);
  const [notes, setNotes] = useState(start?.notes ?? "");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Monster[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState<Monster | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const r = rate(monsters, party);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return setResults([]);
    let live = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchMonsters(query)
        .then((ms) => live && setResults(ms.slice(0, 12)))
        .catch((e) => live && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => live && setSearching(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const add = (m: Monster) =>
    setMonsters((list) =>
      list.some((x) => x.slug === m.slug)
        ? list.map((x) => (x.slug === m.slug ? { ...x, count: x.count + 1 } : x))
        : [...list, { slug: m.slug, name: m.name, cr: m.challenge_rating, xp: xpForCr(m.challenge_rating), count: 1, ac: m.armor_class, hp: m.hit_points }],
    );
  const setCount = (slug: string, n: number) => setMonsters((list) => (n <= 0 ? list.filter((x) => x.slug !== slug) : list.map((x) => (x.slug === slug ? { ...x, count: Math.min(50, n) } : x))));
  const showBlock = async (slug: string) => {
    if (open?.slug === slug) return setOpen(null);
    try {
      setOpen(await getMonster(slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await saveEncounter({ id: start?.id, session_id: sessionId, name: name.trim() || "Untitled encounter", monsters, notes });
      onDone(true);
    } catch (e) {
      setError(sessionError(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!start || !confirm(`Delete "${start.name}"?`)) return;
    try {
      await deleteEncounter(start.id);
      onDone(true);
    } catch (e) {
      setError(sessionError(e));
    }
  };

  return (
    <div className="enc-builder">
      <div className="enc-builder-head">
        <button type="button" className="link" onClick={() => onDone(false)}>
          ‹ Encounters
        </button>
        {start && (
          <MoreMenu label="Encounter actions">
            <button type="button" className="danger" onClick={remove}>
              Delete encounter…
            </button>
          </MoreMenu>
        )}
      </div>
      <div className="enc-layout">
        <div className="enc-main">
          <label className="auth-field">
            <span>Name</span>
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Goblin ambush on the road" />
          </label>

          <section aria-label="Monsters in this encounter">
            <h3 className="lk-group-title">
              Monsters <span className="counter">{r.monsterCount}</span>
            </h3>
            {monsters.length === 0 && <p className="muted">Search below and add monsters. Tip · Start with one or two kinds; it's easier to run.</p>}
            <ul className="enc-list">
              {monsters.map((m) => (
                <li key={m.slug}>
                  <div className="enc-row">
                    <span className="enc-name">
                      <strong>{m.name}</strong>
                      <small>
                        CR {m.cr} · {fmt(m.xp)} XP{m.ac ? ` · AC ${m.ac}` : ""}
                        {m.hp ? ` · HP ${m.hp}` : ""}
                      </small>
                    </span>
                    <span className="stepper" role="group" aria-label={`How many ${m.name}`}>
                      <button type="button" aria-label={`One less ${m.name}`} onClick={() => setCount(m.slug, m.count - 1)}>
                        −
                      </button>
                      <strong>{m.count}</strong>
                      <button type="button" aria-label={`One more ${m.name}`} onClick={() => setCount(m.slug, m.count + 1)}>
                        +
                      </button>
                    </span>
                    <button type="button" className="link enc-block-link" aria-expanded={open?.slug === m.slug} onClick={() => showBlock(m.slug)}>
                      {open?.slug === m.slug ? "Hide" : "Stat block"}
                    </button>
                  </div>
                  {open?.slug === m.slug && <MonsterCard m={open} startOpen />}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Add monsters">
            <label className="lk-search">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a monster: goblin, wolf, bandit…" aria-label="Add a monster" />
            </label>
            {searching && <p className="muted">Searching…</p>}
            <ul className="enc-results">
              {results.map((m) => {
                const xp = xpForCr(m.challenge_rating);
                return (
                  <li key={m.slug}>
                    <span className="enc-name">
                      <strong>{m.name}</strong>
                      <small>
                        CR {m.challenge_rating} · {fmt(xp)} XP · {m.size} {m.type.toLowerCase()}
                      </small>
                    </span>
                    <button type="button" className="btn small" onClick={() => add(m)}>
                      + Add
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <label className="auth-field">
            <span>Notes</span>
            <textarea rows={3} value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} placeholder="Where they hide, tactics, loot…" />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <div className="enc-save">
            <button type="button" className="btn primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save encounter"}
            </button>
          </div>
        </div>
        <aside className="enc-side">
          <RatingPanel r={r} partySize={party.length} />
        </aside>
      </div>
    </div>
  );
}

export function EncountersTab({ sessionId, members }: { sessionId: string; members: PartyMember[] }) {
  const [list, setList] = useState<Encounter[] | null>(null);
  const [editing, setEditing] = useState<Encounter | "new" | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  // With nobody in the session yet, the host sets a party to plan with.
  const [plan, setPlan] = useState({ players: 4, level: 1 });
  const party = useMemo(() => (members.length ? members.map((m) => m.level) : Array.from({ length: plan.players }, () => plan.level)), [members, plan]);

  useEffect(() => {
    loadEncounters(sessionId).then(setList, (e) => setError(sessionError(e)));
  }, [sessionId, tick]);

  const partyLine = members.length ? (
    <p className="muted enc-party">
      Party: {members.length} player{members.length === 1 ? "" : "s"} · {members.map((m) => `${m.name} (level ${m.level})`).join(", ")}
    </p>
  ) : (
    <div className="enc-party plan">
      <span className="muted">Nobody has joined yet. Plan for</span>
      <label>
        <input type="number" min={1} max={10} value={plan.players} onChange={(e) => setPlan((p) => ({ ...p, players: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))} aria-label="Number of players" />
        players at level
      </label>
      <label>
        <input type="number" min={1} max={20} value={plan.level} onChange={(e) => setPlan((p) => ({ ...p, level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))} aria-label="Level" />
      </label>
    </div>
  );

  if (editing)
    return (
      <>
        {partyLine}
        <Builder
          sessionId={sessionId}
          start={editing === "new" ? null : editing}
          party={party}
          onDone={(saved) => {
            setEditing(null);
            if (saved) setTick((n) => n + 1);
          }}
        />
      </>
    );

  return (
    <section className="encounters" aria-label="Encounters">
      <div className="party-head">
        <h2 className="section-title">
          Encounters <span className="counter">{list ? list.length : "…"}</span>
        </h2>
        <button type="button" className="btn primary" onClick={() => setEditing("new")}>
          + New encounter
        </button>
      </div>
      {partyLine}
      <p className="muted">Only you see these. Difficulty uses the 2014 rules: Easy, Medium, Hard or Deadly for this party.</p>
      {error && <p className="auth-error">{error}</p>}
      {list && list.length === 0 && <p className="muted">No encounters yet. Build one before the game, then open it at the table.</p>}
      <div className="roster">
        {list?.map((e) => {
          const r = rate(e.monsters, party);
          return (
            <button key={e.id} type="button" className="enc-card" onClick={() => setEditing(e)}>
              <span className="enc-card-top">
                <strong>{e.name}</strong>
                <DifficultyChip r={r} />
              </span>
              <span className="muted">{monsterLine(e.monsters)}</span>
              <span className="enc-card-xp">
                {fmt(r.totalXp)} XP · {fmt(r.perPlayer)} per player
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
