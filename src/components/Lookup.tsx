// Lookup (REQUIREMENTS §4.4): one search for monsters, spells and conditions. Monster cards show
// what a host needs first (CR, AC, HP, speed, Weak to / Resists / Immune to, 1–4 key traits);
// the full stat block is one tap away.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { xpForCr } from "../encounters";
import { MonsterPage, MonsterRow } from "./MonsterPage";
import { typeColor } from "../monsters";
import { CONDITIONS, EXHAUSTION } from "../live";
import { RULES } from "../systems/dnd5e/rules";
import {
  abilityMod,
  addRecent,
  allMonsters,
  allSpells,
  favorites,
  getMonster,
  getSpell,
  isFavorite,
  keyTraits,
  PLACES,
  recent,
  speedText,
  splitList,
  toggleFavorite,
  type LookupKind,
  type LookupRef,
  type Monster,
  type MonsterBrief,
  type Spell,
  type SpellBrief,
} from "../lookup";

type Kind = "all" | "monster" | "spell" | "condition";

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

const MONSTER_BANDS: { id: string; label: string; test: (cr: number) => boolean }[] = [
  { id: "", label: "Any challenge", test: () => true },
  { id: "0", label: "CR 0 – ½", test: (c) => c <= 0.5 },
  { id: "1", label: "CR 1 – 3", test: (c) => c >= 1 && c <= 3 },
  { id: "4", label: "CR 4 – 7", test: (c) => c >= 4 && c <= 7 },
  { id: "8", label: "CR 8 – 12", test: (c) => c >= 8 && c <= 12 },
  { id: "13", label: "CR 13+", test: (c) => c >= 13 },
];
const PAGE_SIZE = 60;
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
/** Spell level colour: cantrips lilac, then lighter-to-deeper blue (also differs in lightness). */
const SPELL_TINT = ["#b9a3e8", "#a9c7ec", "#8fb6e3", "#78a5db", "#6494d2", "#5584c6", "#4a76b8", "#4169a8", "#395d97", "#335387"];

/** A spell in the browse list: level badge, name, school and the basics, Concentration / Ritual tags. */
function SpellRow({ s, current, onOpen }: { s: SpellBrief; current: boolean; onOpen: () => void }) {
  const c = SPELL_TINT[s.level_int] ?? "#8fb6e3";
  return (
    <button type="button" className={`mon-row spell-row ${current ? "on" : ""}`} aria-current={current ? "page" : undefined} onClick={onOpen}>
      <span className="mon-icon spell-lvl" aria-hidden="true" style={{ width: 44, height: 44, background: `${c}1f`, borderColor: `${c}66`, color: c }}>
        {s.level_int === 0 ? "C" : s.level_int}
      </span>
      <span className="mon-row-text">
        <strong>{s.name}</strong>
        <small>
          {s.level_int === 0 ? `${s.school} cantrip` : `${ordinal(s.level_int)}-level ${s.school.toLowerCase()}`} · {s.casting_time} · {s.range}
        </small>
      </span>
      <span className="spell-tags">
        {s.requires_concentration && (
          <span className="lk-tag conc" title="Concentration">
            Conc.
          </span>
        )}
        {s.can_be_cast_as_ritual && (
          <span className="lk-tag" title="Can be cast as a ritual">
            Ritual
          </span>
        )}
      </span>
    </button>
  );
}

const CAST: Record<string, string> = { "1A": "1 action", "1BA": "1 bonus action", "1R": "1 reaction", "1m": "1 minute", "10m": "10 minutes" };
/** The app's own write-up of a spell (levels 0–3, PHB / Xanathar's / Tasha's) in the Lookup's shape. */
function appSpell(slug: string, name: string): Spell | null {
  const a = RULES["2014"].getSpell(name);
  if (!a) return null;
  const classes = [...new Set([...(a.lists ?? []).map((l) => l.split("@")[0]), ...(a.sorcerer ? ["sorcerer"] : [])])].map((c) => c.charAt(0).toUpperCase() + c.slice(1)).sort();
  return {
    slug,
    name: a.name,
    desc: a.desc,
    higher_level: "",
    range: a.range,
    components: a.components.replace(/,/g, ", "),
    material: a.material ?? "",
    duration: a.duration,
    requires_concentration: !!a.concentration,
    can_be_cast_as_ritual: !!a.ritual,
    casting_time: CAST[a.time] ?? a.time,
    level: a.level === 0 ? "Cantrip" : `${ordinal(a.level)}-level`,
    level_int: a.level,
    school: a.school,
    dnd_class: classes.join(", "),
  };
}

/** The spell open beside the list: everything about it. The app's own write-up shows at once;
 *  the full SRD text replaces it when Open5e answers (it can be slow). */
function SpellPage({ slug, name, onBack, action }: { slug: string; name?: string; onBack: () => void; action?: (s: Spell) => ReactNode }) {
  const [s, setS] = useState<Spell | null>(() => (name ? appSpell(slug, name) : null));
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    getSpell(slug).then(
      (x) => live && setS(x),
      (e) => live && setErr(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [slug]);
  return (
    <div className="mon-page spell-page">
      <button type="button" className="link mon-back" onClick={onBack}>
        ‹ Spells
      </button>
      {err && !s ? (
        <p className="auth-error">{err}</p>
      ) : s ? (
        <>
          <SpellCard s={s} startOpen />
          {action?.(s)}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </div>
  );
}
/** "Monsters only": the types that are foes almost every time (no animals, people or angels). */
const ENEMY_TYPES = ["Aberration", "Dragon", "Fiend", "Giant", "Monstrosity", "Ooze", "Undead"];

const same = (a: string[], b: string[]) => a.length === b.length && b.every((x) => a.includes(x));

/** Creature types, several at a time: a button that opens a list of checkboxes. */
function TypePicker({ types, picks, onChange }: { types: { t: string; count: number }[]; picks: string[]; onChange: (p: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  const label = !picks.length ? "Any type" : same(picks, ENEMY_TYPES) ? "Monsters only" : picks.length <= 2 ? picks.join(", ") : `${picks.length} types`;
  const toggle = (t: string) => onChange(picks.includes(t) ? picks.filter((x) => x !== t) : [...picks, t]);
  return (
    <div className="type-pick" ref={ref}>
      <span className="type-pick-label">Type</span>
      <button type="button" className={`type-pick-btn ${picks.length ? "on" : ""}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="type-pick-menu" role="group" aria-label="Creature types">
          <div className="type-pick-presets">
            <button type="button" className={`lk-kind ${same(picks, ENEMY_TYPES) ? "on" : ""}`} onClick={() => onChange(ENEMY_TYPES)}>
              Monsters only
            </button>
            <button type="button" className={`lk-kind ${!picks.length ? "on" : ""}`} onClick={() => onChange([])}>
              All types
            </button>
          </div>
          <p className="type-pick-hint">Or pick one or more:</p>
          {types.map(({ t, count }) => (
            <label key={t} className={`type-pick-row ${picks.includes(t) ? "on" : ""}`}>
              <input type="checkbox" checked={picks.includes(t)} onChange={() => toggle(t)} />
              <span className="type-dot" style={{ background: typeColor(t) }} aria-hidden="true" />
              <span className="type-pick-name">{t}</span>
              <small>{count}</small>
            </label>
          ))}
          <button type="button" className="btn small type-pick-done" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export function Lookup({
  userId = "",
  sessionId,
  only,
  spellAction,
  initialOpen,
}: {
  userId?: string;
  sessionId?: string;
  /** The Wiki's Spells / Monsters sections: one kind, no kind buttons. */
  only?: "monster" | "spell";
  /** Shown under an open spell (the Wiki's "Add to a character"). */
  spellAction?: (s: Spell) => ReactNode;
  /** Open this monster or spell first (from the Wiki's search, recent or starred). */
  initialOpen?: { kind: "monster" | "spell"; slug: string };
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>(only ?? "all");
  const [band, setBand] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [sort, setSort] = useState<"cr" | "az">("cr");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [brief, setBrief] = useState<MonsterBrief[] | null>(null);
  const [spellBrief, setSpellBrief] = useState<SpellBrief[] | null>(null);
  const [spellLevel, setSpellLevel] = useState<number | null>(null);
  const [spellClass, setSpellClass] = useState("");
  const [error, setError] = useState("");
  /** The monster or spell open beside the list. */
  const [open, setOpen] = useState<{ kind: "monster" | "spell"; slug: string } | null>(initialOpen ?? null);
  const [picked, setPicked] = useState<LookupRef | null>(null);
  const [, setTick] = useState(0);

  const query = q.trim();
  const wantMonsters = kind === "all" || kind === "monster";

  // The whole monster list (SRD, ~320) once: browsing and name search work without the network.
  useEffect(() => {
    allMonsters().then(setBrief, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // The whole spell list (SRD, ~320) the first time spells are wanted: browsing and name search.
  const wantSpells = kind === "spell" || (kind === "all" && query.length > 0);
  useEffect(() => {
    if (!wantSpells || spellBrief) return;
    allSpells().then(setSpellBrief, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [wantSpells, spellBrief]);
  useEffect(() => setLimit(PAGE_SIZE), [query, band, picks, place, sort, kind, spellLevel, spellClass]);

  const types = useMemo(() => {
    const n = new Map<string, number>();
    for (const m of brief ?? []) n.set(m.type, (n.get(m.type) ?? 0) + 1);
    return [...n].sort((a, z) => a[0].localeCompare(z[0])).map(([t, count]) => ({ t, count }));
  }, [brief]);
  const monsters = useMemo(() => {
    if (!brief || !wantMonsters) return [];
    const b = MONSTER_BANDS.find((x) => x.id === band)!;
    const p = PLACES.find((x) => x.id === place);
    const needle = query.toLowerCase();
    return brief
      .filter((m) => (!needle || m.name.toLowerCase().includes(needle)) && b.test(m.cr) && (!picks.length || picks.includes(m.type)) && (!p || m.environments?.some((e) => p.match.includes(e))))
      .sort((a, z) => (sort === "cr" ? a.cr - z.cr || a.name.localeCompare(z.name) : a.name.localeCompare(z.name)));
  }, [brief, wantMonsters, query, band, picks, place, sort]);
  const shown = monsters.slice(0, limit);
  const groups = useMemo(() => {
    if (sort !== "cr") return [{ title: "", xp: "", rows: shown }];
    const out: { title: string; xp: string; rows: MonsterBrief[] }[] = [];
    for (const m of shown) {
      const last = out[out.length - 1];
      if (last && last.title === `CR ${m.challenge_rating}`) last.rows.push(m);
      else out.push({ title: `CR ${m.challenge_rating}`, xp: `${xpForCr(m.challenge_rating).toLocaleString()} XP each`, rows: [m] });
    }
    return out;
  }, [shown, sort]);

  const spellClasses = useMemo(() => [...new Set((spellBrief ?? []).flatMap((x) => x.dnd_class.split(",").map((c) => c.trim())).filter((c) => c && c !== "Ritual Caster"))].sort(), [spellBrief]);
  const spells = useMemo(() => {
    if (!spellBrief || !wantSpells) return [];
    const needle = query.toLowerCase();
    return spellBrief
      // Level and class filters only show (and apply) under "Spells".
      .filter((x) => (!needle || x.name.toLowerCase().includes(needle)) && (kind !== "spell" || ((spellLevel == null || x.level_int === spellLevel) && (!spellClass || x.dnd_class.split(",").map((c) => c.trim()).includes(spellClass)))))
      .sort((a, z) => a.level_int - z.level_int || a.name.localeCompare(z.name));
  }, [spellBrief, wantSpells, query, spellLevel, spellClass, kind]);
  const spellGroups = useMemo(() => {
    const out: { title: string; rows: SpellBrief[] }[] = [];
    for (const x of spells.slice(0, limit)) {
      const title = x.level_int === 0 ? "Cantrips" : `${ordinal(x.level_int)} level`;
      const last = out[out.length - 1];
      if (last && last.title === title) last.rows.push(x);
      else out.push({ title, rows: [x] });
    }
    return out;
  }, [spells, limit]);

  const conds = kind === "all" || kind === "condition" ? CONDITION_IDS.filter((id) => !query || conditionName(id).toLowerCase().includes(query.toLowerCase())) : [];
  const favs = favorites();
  const recents = recent();
  const filtered = band || picks.length || place;
  // Clicking the monster that's already open closes its page (back to the full list).
  const openItem = (k: "monster" | "spell", slug: string, name: string) => {
    setPicked(null);
    if (open?.kind === k && open.slug === slug) return setOpen(null);
    addRecent({ kind: k, slug, name });
    setOpen({ kind: k, slug });
  };
  const openMonster = (slug: string, name: string) => openItem("monster", slug, name);

  const refList = (title: string, list: LookupRef[]) =>
    list.length > 0 && (
      <section className="lk-group">
        <h3 className="lk-group-title">{title}</h3>
        <div className="lk-refs">
          {list.filter((r) => r.kind === "monster" || r.kind === "spell" || r.kind === "condition").map((r) => (
            <button key={`${r.kind}:${r.slug}`} type="button" className={`lk-ref ${r.kind}`} onClick={() => (r.kind === "condition" ? setPicked(r) : openItem(r.kind as "monster" | "spell", r.slug, r.name))}>
              {r.name}
              <small>{r.kind}</small>
            </button>
          ))}
        </div>
      </section>
    );

  const monsterList = wantMonsters && (
    <section className="lk-group" aria-label="Monsters">
      <div className="mon-filters">
        <label>
          <span>Challenge</span>
          <select value={band} onChange={(e) => setBand(e.target.value)}>
            {MONSTER_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <TypePicker types={types} picks={picks} onChange={setPicks} />
        <label>
          <span>Place</span>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">Anywhere</option>
            {PLACES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as "cr" | "az")}>
            <option value="cr">By challenge</option>
            <option value="az">A to Z</option>
          </select>
        </label>
        <span className="mon-count muted">
          {brief ? `${monsters.length} monster${monsters.length === 1 ? "" : "s"}` : "Loading monsters…"}
          {filtered ? (
            <>
              {" · "}
              <button type="button" className="link" onClick={() => (setBand(""), setPicks([]), setPlace(""))}>
                clear filters
              </button>
            </>
          ) : null}
        </span>
      </div>
      {groups.map((g, i) => (
        <div key={g.title || i} className="mon-group">
          {g.title && (
            <h3 className="mon-group-title">
              <span>{g.title}</span>
              <span>{g.xp}</span>
            </h3>
          )}
          <div className="mon-rows">
            {g.rows.map((m) => (
              <MonsterRow key={m.slug} m={m} current={open?.kind === "monster" && open.slug === m.slug} onOpen={() => openMonster(m.slug, m.name)} />
            ))}
          </div>
        </div>
      ))}
      {monsters.length > limit && (
        <button type="button" className="btn mon-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, monsters.length - limit)} more
        </button>
      )}
      {brief && !monsters.length && <p className="muted">No monster matches{query ? ` “${query}”` : ""}. Try fewer filters.</p>}
    </section>
  );

  return (
    <div className={`lookup ${open ? "has-page" : ""}`}>
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
          placeholder={only === "monster" ? "Search monsters, or browse below" : only === "spell" ? "Search spells, or browse below" : "Look up a monster, spell or condition, or browse below"}
          aria-label={only === "monster" ? "Search monsters" : only === "spell" ? "Search spells" : "Look up a monster, spell or condition"}
        />
      </label>
      {!only && <div className="lk-filters" role="group" aria-label="What to look up">
        {(["all", "monster", "spell", "condition"] as Kind[]).map((k) => (
          <button key={k} type="button" className={`lk-kind ${kind === k ? "on" : ""}`} aria-pressed={kind === k} onClick={() => (setKind(k), setPicked(null), k === "monster" && setPicks(ENEMY_TYPES))}>
            {k === "all" ? "Everything" : k === "monster" ? "Monsters" : k === "spell" ? "Spells" : "Conditions"}
          </button>
        ))}
      </div>}

      {picked ? (
        <div className="lk-picked">
          <button type="button" className="link" onClick={() => setPicked(null)}>
            ‹ Back
          </button>
          <OpenRef r={picked} />
        </div>
      ) : (
        <div className="lk-browse">
          <div className="lk-list">
            {error && <p className="auth-error">{error}</p>}
            {!query && kind === "all" && (
              <>
                {refList("Favorites", favs)}
                {refList("Recently viewed", recents)}
              </>
            )}
            {conds.length > 0 && (query || kind === "condition") && (
              <section className="lk-group">
                <h3 className="lk-group-title">Conditions</h3>
                <div className="lk-grid" onClickCapture={() => setTick((n) => n + 1)}>
                  {conds.map((id) => (
                    <ConditionCard key={id} id={id} />
                  ))}
                </div>
              </section>
            )}
            {monsterList}
            {wantSpells && (
              <section className="lk-group" aria-label="Spells">
                {kind === "spell" && (
                  <div className="spell-browse-filters">
                    <div className="lk-filters spell-levels" role="radiogroup" aria-label="Spell level">
                      {[null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                        <button key={String(l)} type="button" role="radio" aria-checked={spellLevel === l} className={`lk-kind ${spellLevel === l ? "on" : ""}`} onClick={() => setSpellLevel(l)}>
                          {l == null ? "Any level" : l === 0 ? "Cantrips" : ordinal(l)}
                        </button>
                      ))}
                    </div>
                    <label className="spell-class-pick">
                      <span>Class</span>
                      <select value={spellClass} onChange={(e) => setSpellClass(e.target.value)}>
                        <option value="">Any class</option>
                        {spellClasses.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <span className="mon-count muted">{spellBrief ? `${spells.length} spell${spells.length === 1 ? "" : "s"}` : "Loading spells…"}</span>
                  </div>
                )}
                {kind === "all" && spells.length > 0 && <h3 className="lk-group-title">Spells <span className="counter">{spells.length}</span></h3>}
                {spellGroups.map((g) => (
                  <div key={g.title} className="mon-group">
                    {kind === "spell" && <h3 className="mon-group-title"><span>{g.title}</span></h3>}
                    <div className="mon-rows">
                      {g.rows.map((x) => (
                        <SpellRow key={x.slug} s={x} current={open?.kind === "spell" && open.slug === x.slug} onOpen={() => openItem("spell", x.slug, x.name)} />
                      ))}
                    </div>
                  </div>
                ))}
                {spells.length > limit && (
                  <button type="button" className="btn mon-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, spells.length - limit)} more
                  </button>
                )}
                {spellBrief && kind === "spell" && !spells.length && <p className="muted">No spell matches{query ? ` “${query}”` : ""}. Try another level or class.</p>}
              </section>
            )}
          </div>
          {open && (
            <div className="lk-page">
              {open.kind === "monster" ? (
                <MonsterPage key={open.slug} slug={open.slug} userId={userId} sessionId={sessionId} onBack={() => setOpen(null)} />
              ) : (
                <SpellPage key={open.slug} slug={open.slug} name={spellBrief?.find((x) => x.slug === open.slug)?.name} onBack={() => setOpen(null)} action={spellAction} />
              )}
            </div>
          )}
        </div>
      )}
      <p className="credits muted">Monsters and spells: System Reference Document 5.1 (CC-BY-4.0), from Open5e, saved in the app. Monster icons: game-icons.net (CC BY 3.0).</p>
    </div>
  );
}

export type { LookupKind };
