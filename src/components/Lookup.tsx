// Lookup (REQUIREMENTS §4.4): one search for monsters, spells and conditions. Monster cards show
// what a host needs first (CR, AC, HP, speed, Weak to / Resists / Immune to, 1–4 key traits);
// the full stat block is one tap away.
import { useEffect, useState } from "react";
import { CONDITIONS, EXHAUSTION } from "../live";
import {
  abilityMod,
  addRecent,
  favorites,
  getMonster,
  getSpell,
  isFavorite,
  keyTraits,
  recent,
  searchMonsters,
  searchSpells,
  speedText,
  splitList,
  toggleFavorite,
  type LookupKind,
  type LookupRef,
  type Monster,
  type Spell,
} from "../lookup";

type Kind = "all" | "monster" | "spell" | "condition";
const CR_BANDS: { id: string; label: string; test: (cr: number) => boolean }[] = [
  { id: "", label: "Any CR", test: () => true },
  { id: "low", label: "CR 0–1", test: (c) => c <= 1 },
  { id: "mid", label: "CR 2–4", test: (c) => c >= 2 && c <= 4 },
  { id: "high", label: "CR 5–10", test: (c) => c >= 5 && c <= 10 },
  { id: "top", label: "CR 11+", test: (c) => c >= 11 },
];

function Star({ refItem, onChange }: { refItem: LookupRef; onChange?: () => void }) {
  const [on, setOn] = useState(isFavorite(refItem));
  return (
    <button
      type="button"
      className={`lk-star ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${refItem.name} from favorites` : `Add ${refItem.name} to favorites`}
      title={on ? "In your favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(refItem);
        setOn(!on);
        onChange?.();
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z" />
      </svg>
    </button>
  );
}

const Chips = ({ label, items, tone }: { label: string; items: string[]; tone: string }) =>
  items.length ? (
    <div className={`lk-chips ${tone}`}>
      <span className="lk-chip-label">{label}</span>
      {items.map((x) => (
        <span key={x} className="lk-chip">
          {x}
        </span>
      ))}
    </div>
  ) : null;

function Blocks({ title, items }: { title: string; items: { name: string; desc: string }[] | null | undefined }) {
  if (!items?.length) return null;
  return (
    <section className="lk-block">
      <h4>{title}</h4>
      {items.map((a) => (
        <p key={a.name}>
          <strong>{a.name}.</strong> {a.desc}
        </p>
      ))}
    </section>
  );
}

export function MonsterCard({ m, startOpen = false }: { m: Monster; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const ref: LookupRef = { kind: "monster", slug: m.slug, name: m.name };
  const conds = splitList(m.condition_immunities);
  const traits = keyTraits(m);
  const saves = (["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const)
    .map((a) => [a, m[`${a}_save` as const]] as const)
    .filter(([, v]) => v != null)
    .map(([a, v]) => `${a.slice(0, 3).toUpperCase()} +${v}`);
  return (
    <article className="lk-card monster">
      <header className="lk-head">
        <div>
          <h3>{m.name}</h3>
          <span className="lk-sub">
            {m.size} {m.type.toLowerCase()}
            {m.subtype ? ` (${m.subtype})` : ""} · <strong>CR {m.challenge_rating}</strong>
          </span>
        </div>
        <Star refItem={ref} />
      </header>
      <div className="lk-stats">
        <span title={m.armor_desc ?? undefined}>
          <small>AC</small>
          <strong>{m.armor_class}</strong>
        </span>
        <span title={m.hit_dice}>
          <small>HP</small>
          <strong>{m.hit_points}</strong>
        </span>
        <span>
          <small>Speed</small>
          <strong>{speedText(m) || "—"}</strong>
        </span>
      </div>
      <Chips label="Weak to" items={splitList(m.damage_vulnerabilities)} tone="weak" />
      <Chips label="Resists" items={splitList(m.damage_resistances)} tone="resist" />
      <Chips label="Immune to" items={[...splitList(m.damage_immunities), ...conds.map((c) => c.toLowerCase())]} tone="immune" />
      {traits.length > 0 && <p className="lk-traits">{traits.join(" · ")}</p>}
      <button type="button" className="link lk-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide stat block" : "Full stat block"}
      </button>
      {open && (
        <div className="lk-full">
          <div className="lk-abilities">
            {(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const).map((a) => (
              <span key={a}>
                <small>{a.slice(0, 3).toUpperCase()}</small>
                <strong>{m[a]}</strong>
                <em>{abilityMod(m[a])}</em>
              </span>
            ))}
          </div>
          <dl className="lk-dl">
            {saves.length > 0 && (
              <>
                <dt>Saves</dt>
                <dd>{saves.join(", ")}</dd>
              </>
            )}
            {Object.keys(m.skills ?? {}).length > 0 && (
              <>
                <dt>Skills</dt>
                <dd>
                  {Object.entries(m.skills)
                    .map(([k, v]) => `${k} +${v}`)
                    .join(", ")}
                </dd>
              </>
            )}
            <dt>Senses</dt>
            <dd>{m.senses || "—"}</dd>
            <dt>Languages</dt>
            <dd>{m.languages || "—"}</dd>
            {m.environments?.length > 0 && (
              <>
                <dt>Found in</dt>
                <dd>{m.environments.join(", ")}</dd>
              </>
            )}
          </dl>
          <Blocks title="Traits" items={m.special_abilities} />
          <Blocks title="Actions" items={m.actions} />
          <Blocks title="Bonus actions" items={m.bonus_actions} />
          <Blocks title="Reactions" items={m.reactions} />
          {m.legendary_actions?.length ? (
            <section className="lk-block">
              <h4>Legendary actions</h4>
              {m.legendary_desc && <p className="muted">{m.legendary_desc}</p>}
              {m.legendary_actions.map((a) => (
                <p key={a.name}>
                  <strong>{a.name}.</strong> {a.desc}
                </p>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </article>
  );
}

export function SpellCard({ s, startOpen = false }: { s: Spell; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <article className="lk-card spell">
      <header className="lk-head">
        <div>
          <h3>{s.name}</h3>
          <span className="lk-sub">
            {s.level_int === 0 ? `${s.school} cantrip` : `${s.level} ${s.school.toLowerCase()}`}
            {s.requires_concentration && <span className="lk-tag conc">Concentration</span>}
            {s.can_be_cast_as_ritual && <span className="lk-tag">Ritual</span>}
          </span>
        </div>
        <Star refItem={{ kind: "spell", slug: s.slug, name: s.name }} />
      </header>
      <dl className="lk-dl">
        <dt>Casting time</dt>
        <dd>{s.casting_time}</dd>
        <dt>Range</dt>
        <dd>{s.range}</dd>
        <dt>Components</dt>
        <dd>
          {s.components}
          {s.material ? ` (${s.material})` : ""}
        </dd>
        <dt>Duration</dt>
        <dd>{s.duration}</dd>
        <dt>Classes</dt>
        <dd>{s.dnd_class || "—"}</dd>
      </dl>
      <button type="button" className="link lk-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide description" : "What it does"}
      </button>
      {open && (
        <div className="lk-full lk-text">
          {s.desc.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.higher_level && (
            <p>
              <strong>At higher levels.</strong> {s.higher_level}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ConditionCard({ id }: { id: string }) {
  const c = CONDITIONS.find((x) => x.id === id);
  if (id === "exhaustion")
    return (
      <article className="lk-card condition">
        <header className="lk-head">
          <h3>Exhaustion</h3>
          <Star refItem={{ kind: "condition", slug: "exhaustion", name: "Exhaustion" }} />
        </header>
        <p>Comes in 6 levels; each adds to the ones before. A long rest with food and drink removes one level.</p>
        <ol className="lk-exhaustion">
          {EXHAUSTION.slice(1).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </article>
    );
  if (!c) return null;
  return (
    <article className="lk-card condition">
      <header className="lk-head">
        <h3>{c.name}</h3>
        <Star refItem={{ kind: "condition", slug: c.id, name: c.name }} />
      </header>
      <p>{c.text}</p>
    </article>
  );
}

const CONDITION_IDS = [...CONDITIONS.map((c) => c.id), "exhaustion"];
const conditionName = (id: string) => (id === "exhaustion" ? "Exhaustion" : (CONDITIONS.find((c) => c.id === id)?.name ?? id));

/** Opens one remembered item (favorite / recent) in full. */
function OpenRef({ r }: { r: LookupRef }) {
  const [m, setM] = useState<Monster | null>(null);
  const [s, setS] = useState<Spell | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (r.kind === "monster") getMonster(r.slug).then(setM, (e) => setErr(String(e.message ?? e)));
    if (r.kind === "spell") getSpell(r.slug).then(setS, (e) => setErr(String(e.message ?? e)));
  }, [r]);
  if (r.kind === "condition") return <ConditionCard id={r.slug} />;
  if (err) return <p className="auth-error">{err}</p>;
  if (m) return <MonsterCard m={m} startOpen />;
  if (s) return <SpellCard s={s} startOpen />;
  return <p className="muted">Loading {r.name}…</p>;
}

export function Lookup() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [cr, setCr] = useState("");
  const [type, setType] = useState("");
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<LookupRef | null>(null);
  const [, setTick] = useState(0);

  const query = q.trim();
  useEffect(() => {
    setError("");
    if (query.length < 2) {
      setMonsters([]);
      setSpells([]);
      return;
    }
    let live = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const [ms, ss] = await Promise.all([kind === "all" || kind === "monster" ? searchMonsters(query) : [], kind === "all" || kind === "spell" ? searchSpells(query) : []]);
        if (!live) return;
        setMonsters(ms);
        setSpells(ss);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setBusy(false);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, kind]);

  const band = CR_BANDS.find((b) => b.id === cr)!;
  const types = [...new Set(monsters.map((m) => m.type))].sort();
  const shownMonsters = monsters.filter((m) => band.test(m.cr) && (!type || m.type === type));
  const conds = kind === "all" || kind === "condition" ? CONDITION_IDS.filter((id) => !query || conditionName(id).toLowerCase().includes(query.toLowerCase())) : [];
  const remember = (r: LookupRef) => addRecent(r);
  const favs = favorites();
  const recents = recent();

  const refList = (title: string, list: LookupRef[]) =>
    list.length > 0 && (
      <section className="lk-group">
        <h3 className="lk-group-title">{title}</h3>
        <div className="lk-refs">
          {list.map((r) => (
            <button key={`${r.kind}:${r.slug}`} type="button" className={`lk-ref ${r.kind}`} onClick={() => setPicked(r)}>
              {r.name}
              <small>{r.kind}</small>
            </button>
          ))}
        </div>
      </section>
    );

  return (
    <div className="lookup">
      <label className="lk-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPicked(null);
          }}
          placeholder="Look up a monster, spell or condition"
          aria-label="Look up a monster, spell or condition"
          autoFocus
        />
      </label>
      <div className="lk-filters" role="group" aria-label="What to look up">
        {(["all", "monster", "spell", "condition"] as Kind[]).map((k) => (
          <button key={k} type="button" className={`lk-kind ${kind === k ? "on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "all" ? "Everything" : k === "monster" ? "Monsters" : k === "spell" ? "Spells" : "Conditions"}
          </button>
        ))}
        {(kind === "all" || kind === "monster") && query.length >= 2 && (
          <>
            <select value={cr} onChange={(e) => setCr(e.target.value)} aria-label="Challenge rating">
              {CR_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {types.length > 1 && (
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Creature type">
                <option value="">Any type</option>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {picked ? (
        <div className="lk-picked">
          <button type="button" className="link" onClick={() => setPicked(null)}>
            ‹ Back
          </button>
          <OpenRef r={picked} />
        </div>
      ) : query.length < 2 ? (
        <>
          {refList("Favorites", favs)}
          {refList("Recently viewed", recents)}
          {!favs.length && !recents.length && (
            <p className="muted lk-empty">
              Type at least two letters, e.g. <em>goblin</em>, <em>fireball</em> or <em>prone</em>. Tip · Star what you use often; it stays one tap away here.
            </p>
          )}
          {kind === "condition" && (
            <section className="lk-group">
              <h3 className="lk-group-title">Conditions</h3>
              <div className="lk-grid">
                {CONDITION_IDS.map((id) => (
                  <ConditionCard key={id} id={id} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {error && <p className="auth-error">{error}</p>}
          {busy && <p className="muted">Searching…</p>}
          {conds.length > 0 && (
            <section className="lk-group">
              <h3 className="lk-group-title">Conditions</h3>
              <div className="lk-grid" onClickCapture={() => setTick((n) => n + 1)}>
                {conds.map((id) => (
                  <ConditionCard key={id} id={id} />
                ))}
              </div>
            </section>
          )}
          {shownMonsters.length > 0 && (
            <section className="lk-group">
              <h3 className="lk-group-title">
                Monsters <span className="counter">{shownMonsters.length}</span>
              </h3>
              <div className="lk-grid" onClickCapture={(e) => {
                const card = (e.target as Element).closest(".lk-card.monster");
                const name = card?.querySelector("h3")?.textContent;
                const m = shownMonsters.find((x) => x.name === name);
                if (m) remember({ kind: "monster", slug: m.slug, name: m.name });
              }}>
                {shownMonsters.map((m) => (
                  <MonsterCard key={m.slug} m={m} />
                ))}
              </div>
            </section>
          )}
          {spells.length > 0 && (
            <section className="lk-group">
              <h3 className="lk-group-title">
                Spells <span className="counter">{spells.length}</span>
              </h3>
              <div className="lk-grid" onClickCapture={(e) => {
                const card = (e.target as Element).closest(".lk-card.spell");
                const name = card?.querySelector("h3")?.textContent;
                const s = spells.find((x) => x.name === name);
                if (s) remember({ kind: "spell", slug: s.slug, name: s.name });
              }}>
                {spells.map((s) => (
                  <SpellCard key={s.slug} s={s} />
                ))}
              </div>
            </section>
          )}
          {!busy && !error && !shownMonsters.length && !spells.length && !conds.length && <p className="muted">Nothing found for “{query}”. Try a shorter word.</p>}
        </>
      )}
      <p className="credits muted">Monsters and spells: System Reference Document 5.1 (CC-BY-4.0), served by Open5e.</p>
    </div>
  );
}

export type { LookupKind };
