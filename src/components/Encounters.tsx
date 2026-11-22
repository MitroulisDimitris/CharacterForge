// Encounters tab for the host (REQUIREMENTS §4.4, step 9): saved encounters for this session and a
// builder (search monsters, set counts) that rates the difficulty live for this party with the
// 2014 XP thresholds. Players never see encounters.
import { useEffect, useMemo, useState } from "react";
import { addEntry, DIFFICULTY_TEXT, deleteEncounter, entryKey, loadEncounters, rate, saveEncounter, xpForCr, type Encounter, type EncounterMonster, type Rating } from "../encounters";
import { allMonsters, getMonster, PLACES, searchMonsters, type Monster, type MonsterBrief } from "../lookup";
import { filterPool, SHAPE_TEXT, suggestEncounter, type Shape, type Suggestion, type Target } from "../suggest";
import { sessionError } from "../sessions";
import { MonsterCard } from "./Lookup";
import { StrengthMark } from "./MonsterSpells";
import { MoreMenu } from "./Hero";
import { cardOf, OnlyYou, type HostMember } from "./Party";
import { CombatView } from "./Combat";

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
  onRun,
  suggested,
}: {
  sessionId: string;
  start: Encounter | null;
  party: number[];
  onDone: (saved: boolean) => void;
  /** Save, then start the fight with this encounter. */
  onRun: (e: Encounter) => void;
  /** Opened from "Suggest an encounter": show what it is and offer another. */
  suggested?: { shape: Shape; retry: () => Suggestion | null };
}) {
  const [shape, setShape] = useState(suggested?.shape);
  const [noMore, setNoMore] = useState(false);
  const [name, setName] = useState(start?.name ?? "");
  const [monsters, setMonsters] = useState<EncounterMonster[]>(start?.monsters ?? []);
  const [notes, setNotes] = useState(start?.notes ?? "");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Monster[]>([]);
  const [searching, setSearching] = useState(false);
  // The line whose stat block is open (entryKey), and that monster.
  const [open, setOpen] = useState<{ key: string; m: Monster } | null>(null);
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

  const add = (m: Monster) => setMonsters((list) => addEntry(list, { slug: m.slug, name: m.name, cr: m.challenge_rating, xp: xpForCr(m.challenge_rating), count: 1, ac: m.armor_class, hp: m.hit_points }));
  const setCount = (key: string, n: number) => setMonsters((list) => (n <= 0 ? list.filter((x) => entryKey(x) !== key) : list.map((x) => (entryKey(x) === key ? { ...x, count: Math.min(50, n) } : x))));
  const showBlock = async (e: EncounterMonster) => {
    const key = entryKey(e);
    if (open?.key === key) return setOpen(null);
    try {
      setOpen({ key, m: await getMonster(e.slug) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const save = async (run = false) => {
    setBusy(true);
    setError("");
    try {
      const saved = await saveEncounter({ id: start?.id || undefined, session_id: sessionId, name: name.trim() || "Untitled encounter", monsters, notes });
      if (run) onRun(saved);
      else onDone(true);
    } catch (e) {
      setError(sessionError(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!start?.id || !confirm(`Delete "${start.name}"?`)) return;
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
        <span className="combat-head-right">
          <button type="button" className="btn small" disabled={busy || !monsters.length} onClick={() => save(true)} title="Saves it, then starts the fight: initiative, turns, HP">
            {start?.combat ? "Continue the fight" : "Run this fight"}
          </button>
        {start?.id && (
          <MoreMenu label="Encounter actions">
            <button type="button" className="danger" onClick={remove}>
              Delete encounter…
            </button>
          </MoreMenu>
        )}
        </span>
      </div>
      {suggested && shape && (
        <div className="enc-suggested" role="status">
          <span>
            <strong>Suggested:</strong> {SHAPE_TEXT[shape]}. Change anything, then save it.
          </span>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              const next = suggested.retry();
              if (next) {
                setMonsters(next.monsters);
                setShape(next.shape);
                setNoMore(false);
              } else setNoMore(true);
            }}
          >
            Try another
          </button>
          {noMore && <span className="muted">Nothing else fits these choices.</span>}
        </div>
      )}
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
              {monsters.map((m) => {
                const key = entryKey(m);
                const isOpen = open?.key === key;
                return (
                  <li key={key}>
                    <div className="enc-row">
                      <span className="enc-name">
                        <strong>
                          {m.name}
                          {m.strength && <StrengthMark kind={m.strength} note={m.strengthNote ?? ""} />}
                        </strong>
                        <small>
                          {m.build && m.of ? `${m.of} build · ` : ""}CR {m.cr} · {fmt(m.xp)} XP{m.ac ? ` · AC ${m.ac}` : ""}
                          {m.hp ? ` · HP ${m.hp}` : ""}
                        </small>
                      </span>
                      <span className="stepper" role="group" aria-label={`How many ${m.name}`}>
                        <button type="button" aria-label={`One less ${m.name}`} onClick={() => setCount(key, m.count - 1)}>
                          −
                        </button>
                        <strong>{m.count}</strong>
                        <button type="button" aria-label={`One more ${m.name}`} onClick={() => setCount(key, m.count + 1)}>
                          +
                        </button>
                      </span>
                      <button type="button" className="link enc-block-link" aria-expanded={isOpen} onClick={() => showBlock(m)}>
                        {isOpen ? "Hide" : "Stat block"}
                      </button>
                    </div>
                    {isOpen && open && <MonsterCard m={open.m} startOpen spells={m.spells} title={m.name} />}
                  </li>
                );
              })}
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
            <button type="button" className="btn primary" disabled={busy} onClick={() => save()}>
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

/** Pick a difficulty (and optionally a creature type and a place); get a fitting encounter. */
function SuggestPanel({ party, onResult, onClose }: { party: number[]; onResult: (name: string, s: Suggestion, retry: () => Suggestion | null) => void; onClose: () => void }) {
  const [pool, setPool] = useState<MonsterBrief[] | null>(null);
  const [target, setTarget] = useState<Target>("Medium");
  const [type, setType] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    allMonsters().then(setPool, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const types = useMemo(() => [...new Set((pool ?? []).map((m) => m.type))].sort(), [pool]);
  const placeDef = PLACES.find((p) => p.id === place);
  const filtered = useMemo(() => (pool ? filterPool(pool, type, placeDef?.match ?? []) : []), [pool, type, placeDef]);
  const go = () => {
    const make = () => suggestEncounter(filtered, party, target);
    const s = make();
    if (!s) return setError(`Nothing fits a ${target.toLowerCase()} fight with these choices. Try “Any” for the type or the place.`);
    const name = [target, placeDef?.label.split(" /")[0].toLowerCase(), type ? `${type.toLowerCase()}s` : "", "fight"].filter(Boolean).join(" ");
    onResult(name.charAt(0).toUpperCase() + name.slice(1), s, make);
  };
  return (
    <section className="suggest-panel" aria-label="Suggest an encounter">
      <div className="party-head">
        <h3 className="lk-group-title">Suggest an encounter</h3>
        <button type="button" className="link" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">Pick how hard it should be. Monsters are picked to fit your party; you can change them before saving.</p>
      <div className="lk-filters" role="radiogroup" aria-label="Difficulty">
        {(["Easy", "Medium", "Hard", "Deadly"] as Target[]).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={target === t} className={`lk-kind diff-${t.toLowerCase()} ${target === t ? "on" : ""}`} onClick={() => setTarget(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="suggest-row">
        <label className="auth-field">
          <span>Creature type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          <span>Place</span>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">Any</option>
            {PLACES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pool && <p className="muted suggest-count">{filtered.length} monsters match.</p>}
      {error && <p className="auth-error">{error}</p>}
      <button type="button" className="btn primary" disabled={!pool || !filtered.length} onClick={() => (setError(""), go())}>
        {pool ? "Suggest" : "Loading monsters…"}
      </button>
    </section>
  );
}

export function EncountersTab({ sessionId, system, hostMembers, onPlayersChanged }: { sessionId: string; system: string; hostMembers: HostMember[]; onPlayersChanged: () => void }) {
  const members = useMemo(
    () =>
      hostMembers.map((m) => {
        const { name, level } = cardOf(m, system);
        return { name, level };
      }),
    [hostMembers, system],
  );
  const [list, setList] = useState<Encounter[] | null>(null);
  const [editing, setEditing] = useState<Encounter | "new" | null>(null);
  const [fighting, setFighting] = useState<Encounter | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<{ shape: Shape; retry: () => Suggestion | null } | undefined>();
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

  if (fighting)
    return (
      <CombatView
        key={fighting.id}
        encounter={fighting}
        members={hostMembers}
        system={system}
        onPlayersChanged={onPlayersChanged}
        onExit={() => {
          setFighting(null);
          setTick((n) => n + 1);
        }}
      />
    );

  if (editing)
    return (
      <>
        {partyLine}
        <Builder
          sessionId={sessionId}
          start={editing === "new" ? null : editing}
          party={party}
          suggested={suggested}
          onRun={(e) => {
            setEditing(null);
            setSuggested(undefined);
            setFighting(e);
          }}
          onDone={(saved) => {
            setEditing(null);
            setSuggested(undefined);
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
        <span className="enc-actions">
          <button type="button" className="btn" onClick={() => setSuggesting((x) => !x)} aria-expanded={suggesting}>
            Suggest one
          </button>
          <button type="button" className="btn primary" onClick={() => setEditing("new")}>
            + New encounter
          </button>
        </span>
      </div>
      {partyLine}
      {suggesting && (
        <SuggestPanel
          party={party}
          onClose={() => setSuggesting(false)}
          onResult={(name, sug, retry) => {
            setSuggesting(false);
            setSuggested({ shape: sug.shape, retry });
            setEditing({ id: "", session_id: sessionId, name, monsters: sug.monsters, notes: "", updated_at: "" });
          }}
        />
      )}
      <OnlyYou>Only you see your encounters. Players don't know what's coming.</OnlyYou>
      {list?.filter((e) => e.combat).map((e) => (
        <div key={e.id} className="fight-on" role="status">
          <span>
            <strong>Fight in progress:</strong> {e.name}
            {e.combat?.started ? ` · round ${e.combat.round}` : " · rolling initiative"}
          </span>
          <button type="button" className="btn primary" onClick={() => setFighting(e)}>
            Continue the fight
          </button>
        </div>
      ))}
      <p className="muted">Difficulty uses the 2014 rules: Easy, Medium, Hard or Deadly for this party.</p>
      {error && <p className="auth-error">{error}</p>}
      {list && list.length === 0 && <p className="muted">No encounters yet. Build one before the game, then open it at the table.</p>}
      <div className="roster">
        {list?.map((e) => {
          const r = rate(e.monsters, party);
          return (
            <button key={e.id} type="button" className="enc-card" onClick={() => setEditing(e)}>
              <span className="enc-card-top">
                <strong>{e.name}</strong>
                {e.combat && <span className="pill">Fight on</span>}
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
