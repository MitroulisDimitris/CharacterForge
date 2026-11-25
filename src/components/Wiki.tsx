// The Wiki on the main page (REQUIREMENTS 4.7): spells, monsters, items, classes, races,
// backgrounds, feats and rules, with one search. Spells and monsters are the session Lookup's own
// lists and pages, minus the session actions; items and spells can be added to a character.
// Mockups: "Dice and Items" canvas, rows C and D.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addRecent, allMonsters, allSpells, favorites, isFavorite, recent, toggleFavorite, type LookupKind, type LookupRef, type MonsterBrief, type SpellBrief } from "../lookup";
import { CONDITIONS, EXHAUSTION } from "../live";
import { CHIPS, RULE_PAGES, SECTIONS, bookLabel, featReq, localEntries, rules2014, sectionOf, type WikiEntry, type WikiSection } from "../wiki";
import { ABILITY_NAMES, skillName, type SkillId } from "../systems/dnd5e/data/core";
import type { Spell as LookupSpell } from "../lookup";
import { skinOf } from "../skins";
import type { StoredCharacter, Theme } from "../storage";
import { Brand, SkinPicker } from "./Brand";
import { Lookup, pageHidesList } from "./Lookup";
import { entryKey, refOf } from "../wikiRefs";
import { DrawerHead, DrawerScrim, MainNav, MenuButton, type Place } from "./MainMenu";
import { RollScope } from "./Dice";
import { ItemsBrowse } from "./Items";
import { loadItems, type Item } from "../items";
import { AddSpell } from "./AddToCharacter";

const KIND_OF: Record<WikiSection, LookupKind> = { spells: "spell", monsters: "monster", items: "item", classes: "class", races: "race", backgrounds: "background", feats: "feat", rules: "rule" };
const SECTION_OF: Record<LookupKind, WikiSection> = { spell: "spells", monster: "monsters", item: "items", class: "classes", race: "races", background: "backgrounds", feat: "feats", rule: "rules", condition: "rules" };

const Icon = ({ d, color, size = 20 }: { d: string; color: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Where a remembered page (favorite / recent) opens. */
interface Target {
  sec: WikiSection;
  id?: string;
}
const targetOf = (r: LookupRef): Target => (r.kind === "condition" ? { sec: "rules", id: `cond-${r.slug}` } : { sec: SECTION_OF[r.kind], id: r.slug });

export function Wiki({
  lib,
  theme,
  onTheme,
  go,
  userId,
  onSave,
  start,
}: {
  lib: StoredCharacter[];
  theme: Theme;
  onTheme: (t: Theme) => void;
  go: (p: Place) => void;
  userId: string;
  onSave: (rec: StoredCharacter) => void;
  start?: Target;
}) {
  const [at, setAt] = useState<Target | null>(start ?? null);
  const [menu, setMenu] = useState(false);
  const open = (t: Target | null) => {
    setAt(t);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };

  const sections = (
    <div className="wiki-nav-secs">
      {SECTIONS.map((s) => (
        <button key={s.id} type="button" className={`wiki-nav-sec ${at?.sec === s.id ? "on" : ""}`} aria-current={at?.sec === s.id ? "page" : undefined} onClick={() => open({ sec: s.id })}>
          <span className="wiki-dot" style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </button>
      ))}
    </div>
  );
  const nav = (
    <MainNav current="wiki" go={(p) => (p === "wiki" ? open(null) : go(p))}>
      {sections}
    </MainNav>
  );
  const title = at ? sectionOf(at.sec).label : "Wiki";

  const body = (
    <RollScope>
      {!at ? (
        <WikiHome onOpen={open} />
      ) : at.sec === "spells" ? (
        <WikiLookup key="spells" title="Spells" only="spell" userId={userId} start={at.id} spellAction={(s) => <AddSpell spell={s} lib={lib} onSave={onSave} />} />
      ) : at.sec === "monsters" ? (
        <WikiLookup key="monsters" title="Monsters" only="monster" userId={userId} start={at.id} />
      ) : at.sec === "items" ? (
        <ItemsBrowse key={at.id ?? "items"} lib={lib} onSave={onSave} start={at.id} />
      ) : (
        <LocalBrowse key={`${at.sec}:${at.id ?? ""}`} sec={at.sec} start={at.id} />
      )}
    </RollScope>
  );

  if (skinOf(theme).layout === "hero")
    return (
      <div className="hero-shell">
        <aside className={`hero-side drawer-side wiki-side ${menu ? "open" : ""}`}>
          <MenuButton open={menu} onClick={() => setMenu(true)} />
          <Brand />
          <span className="drawer-title">{title}</span>
          <div className="hero-side-extra">
            <DrawerHead open={menu} onClose={() => setMenu(false)} />
            {nav}
            <div className="hero-foot">
              <SkinPicker theme={theme} onChange={onTheme} />
            </div>
          </div>
          <DrawerScrim open={menu} onClose={() => setMenu(false)} />
        </aside>
        <main className="hero-main wiki-main">{body}</main>
      </div>
    );

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={() => go("characters")} />
        <div className="identity">
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="actions">
          <MainNav current="wiki" go={(p) => (p === "wiki" ? open(null) : go(p))} />
          <SkinPicker theme={theme} onChange={onTheme} />
        </div>
      </header>
      <div className="wiki-classic">
        <div className="wiki-classic-secs">{sections}</div>
        {body}
      </div>
    </div>
  );
}

/** A section heading with the way back to the Wiki home. */
function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="wiki-head">
      <h1>{title}</h1>
      {children}
    </header>
  );
}

function WikiLookup({ title, only, userId, start, spellAction }: { title: string; only: "monster" | "spell"; userId: string; start?: string; spellAction?: (s: LookupSpell) => ReactNode }) {
  return (
    <>
      <SectionHead title={title} />
      <Lookup only={only} userId={userId} initialOpen={start ? { kind: only, slug: start } : undefined} spellAction={spellAction} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Home: one search, the sections, recently viewed and starred.

function WikiHome({ onOpen }: { onOpen: (t: Target) => void }) {
  const [q, setQ] = useState("");
  const [monsters, setMonsters] = useState<MonsterBrief[]>([]);
  const [spells, setSpells] = useState<SpellBrief[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const query = q.trim().toLowerCase();
  const searching = !!query;
  useEffect(() => {
    if (!searching) return;
    allMonsters().then(setMonsters, () => {});
    allSpells().then(setSpells, () => {});
    loadItems().then(setItems, () => {});
  }, [searching]);
  const groups = useMemo(() => {
    if (!query) return [];
    const local = localEntries();
    const hit = (name: string, words = "") => name.toLowerCase().includes(query) || words.includes(query);
    const rows: Record<WikiSection, { id: string; name: string; line: string }[]> = {
      spells: spells.filter((s) => hit(s.name)).map((s) => ({ id: s.slug, name: s.name, line: s.level_int === 0 ? `${s.school} cantrip` : `Level ${s.level_int} ${s.school.toLowerCase()}` })),
      monsters: monsters.filter((m) => hit(m.name, m.type.toLowerCase())).map((m) => ({ id: m.slug, name: m.name, line: `${m.size} ${m.type.toLowerCase()} · CR ${m.challenge_rating}` })),
      items: items.filter((i) => hit(i.name, i.words)).map((i) => ({ id: i.id, name: i.name, line: i.line })),
      classes: [],
      races: [],
      backgrounds: [],
      feats: [],
      rules: [],
    };
    for (const e of local) if (hit(e.name, e.words)) rows[e.sec].push({ id: e.id, name: e.name, line: e.line });
    return SECTIONS.map((s) => ({ s, rows: rows[s.id] })).filter((g) => g.rows.length);
  }, [query, monsters, spells, items]);
  const [, tick] = useState(0);
  const recents = recent();
  const favs = favorites();

  return (
    <div className="wiki-home">
      <SectionHead title="Wiki">
        <p className="muted">Spells, monsters, items and rules.</p>
      </SectionHead>
      <label className="lk-search wiki-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything: spells, monsters, items, rules…" aria-label="Search the wiki" />
      </label>

      {query ? (
        <div className="wiki-results">
          {groups.map(({ s, rows }) => (
            <section key={s.id} className="wiki-group" aria-label={s.label}>
              <h2 className="wiki-group-title">
                <span className="wiki-dot" style={{ background: s.color }} aria-hidden="true" />
                {s.label} <span className="counter">{rows.length}</span>
              </h2>
              <div className="mon-rows">
                {rows.slice(0, 6).map((r) => (
                  <button key={r.id} type="button" className="mon-row" onClick={() => onOpen({ sec: s.id, id: r.id })}>
                    <span className="mon-icon" aria-hidden="true" style={{ width: 40, height: 40, background: `${s.color}1a`, borderColor: `${s.color}55` }}>
                      <Icon d={s.icon} color={s.color} />
                    </span>
                    <span className="mon-row-text">
                      <strong>{r.name}</strong>
                      <small>{r.line}</small>
                    </span>
                  </button>
                ))}
              </div>
              {rows.length > 6 && (
                <button type="button" className="link" onClick={() => onOpen({ sec: s.id })}>
                  {rows.length - 6} more in {s.label} ›
                </button>
              )}
            </section>
          ))}
          {!groups.length && <p className="muted">Nothing matches “{q.trim()}”. Try fewer letters, or a word from the text (fire, invisible, prone).</p>}
        </div>
      ) : (
        <>
          <h2 className="hero-label wiki-label">Browse</h2>
          <div className="wiki-cards">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className="wiki-card" style={{ borderTopColor: s.color }} onClick={() => onOpen({ sec: s.id })}>
                <span className="mon-icon" aria-hidden="true" style={{ width: 44, height: 44, background: `${s.color}1a`, borderColor: `${s.color}55` }}>
                  <Icon d={s.icon} color={s.color} size={22} />
                </span>
                <strong>{s.label}</strong>
                <span className="wiki-card-desc">{s.desc}</span>
              </button>
            ))}
          </div>
          {recents.length > 0 && (
            <>
              <h2 className="hero-label wiki-label">Recently viewed</h2>
              <div className="lk-refs">
                {recents.map((r) => (
                  <button key={`${r.kind}:${r.slug}`} type="button" className={`lk-ref ${r.kind}`} onClick={() => onOpen(targetOf(r))}>
                    {r.name}
                    <small>{r.kind}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <h2 className="hero-label wiki-label">Starred</h2>
          {favs.length ? (
            <div className="lk-refs" onClick={() => tick((n) => n + 1)}>
              {favs.map((r) => (
                <button key={`${r.kind}:${r.slug}`} type="button" className={`lk-ref ${r.kind}`} onClick={() => onOpen(targetOf(r))}>
                  {r.name}
                  <small>{r.kind}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Star a page to keep it here.</p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Classes, races, backgrounds, feats, rules: the app's own data.

function Star({ r }: { r: LookupRef }) {
  const [on, setOn] = useState(() => isFavorite(r));
  return (
    <button
      type="button"
      className={`lk-star mon-star ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${r.name} from starred` : `Star ${r.name}`}
      onClick={() => {
        toggleFavorite(r);
        setOn(!on);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z" />
      </svg>
    </button>
  );
}

function LocalBrowse({ sec, start }: { sec: WikiSection; start?: string }) {
  const S = sectionOf(sec);
  const [q, setQ] = useState("");
  const [chip, setChip] = useState("");
  const [openId, setOpenId] = useState<string | null>(start ?? null);
  const all = useMemo(() => localEntries().filter((e) => e.sec === sec), [sec]);
  const query = q.trim().toLowerCase();
  const list = all.filter((e) => (!chip || e.tags.includes(chip)) && (!query || e.name.toLowerCase().includes(query) || e.words.includes(query)));
  const cur = openId ? all.find((e) => e.id === openId) : undefined;
  useEffect(() => {
    if (cur) addRecent({ kind: KIND_OF[sec], slug: cur.id, name: cur.name });
  }, [cur, sec]);
  const chips = CHIPS[sec];

  return (
    <div className={`lookup ${cur ? "has-page" : ""}`}>
      <SectionHead title={S.label} />
      <label className="lk-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input type="search" value={q} onChange={(e) => (setQ(e.target.value), pageHidesList() && setOpenId(null))} placeholder={`Search ${S.label.toLowerCase()}, or browse below`} aria-label={`Search ${S.label.toLowerCase()}`} />
      </label>
      {chips && (
        <div className="lk-filters" role="group" aria-label="Filter">
          {chips.map(([id, label]) => (
            <button key={id} type="button" className={`lk-kind ${chip === id ? "on" : ""}`} aria-pressed={chip === id} onClick={() => (setChip(id), pageHidesList() && setOpenId(null))}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="lk-browse">
        <div className="lk-list">
          <span className="mon-count muted">
            {list.length} {list.length === 1 ? "entry" : "entries"}
          </span>
          <div className="mon-rows">
            {list.map((e) => (
              <button key={e.id} type="button" className={`mon-row ${cur?.id === e.id ? "on" : ""}`} aria-current={cur?.id === e.id ? "page" : undefined} onClick={() => setOpenId(cur?.id === e.id ? null : e.id)}>
                <span className="mon-icon" aria-hidden="true" style={{ width: 44, height: 44, background: `${S.color}1a`, borderColor: `${S.color}55` }}>
                  <Icon d={S.icon} color={S.color} />
                </span>
                <span className="mon-row-text">
                  <strong>{e.name}</strong>
                  <small>{e.line}</small>
                </span>
              </button>
            ))}
          </div>
          {!list.length && (
            <p className="muted">
              Nothing matches.{" "}
              <button type="button" className="link" onClick={() => (setQ(""), setChip(""))}>
                Clear the search
              </button>
            </p>
          )}
        </div>
        {cur && (
          <div className="lk-page">
            <article className="mon-page wiki-page" aria-label={cur.name} style={{ ["--mon" as string]: S.color }}>
              <button type="button" className="link mon-back" onClick={() => setOpenId(null)}>
                ‹ {S.label}
              </button>
              <header className="wiki-page-head">
                <span className="mon-icon" aria-hidden="true" style={{ width: 60, height: 60, background: `${S.color}1a`, borderColor: `${S.color}66` }}>
                  <Icon d={S.icon} color={S.color} size={30} />
                </span>
                <div className="wiki-page-title">
                  <h2>{cur.name}</h2>
                  <span style={{ color: S.color }}>{cur.line}</span>
                </div>
                <Star r={{ kind: KIND_OF[sec], slug: cur.id, name: cur.name }} />
              </header>
              <EntryBody e={cur} />
            </article>
          </div>
        )}
      </div>
    </div>
  );
}

const Tiles = ({ tiles }: { tiles: [string, string][] }) => (
  <div className="wiki-tiles">
    {tiles
      .filter(([, v]) => v)
      .map(([k, v]) => (
        <div key={k}>
          <span>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
  </div>
);

const Feats = ({ items }: { items: { name: string; text: string; sub?: string }[] }) => (
  <ul className="wiki-feats">
    {items.map((f, i) => (
      <li key={`${f.name}${i}`}>
        <strong>{f.name}.</strong> {f.text}
        {f.sub && <small className="muted"> {f.sub}</small>}
      </li>
    ))}
  </ul>
);

function EntryBody({ e }: { e: WikiEntry }) {
  const R = rules2014;
  if (e.sec === "classes") {
    const c = R.classes.find((x) => x.id === e.id)!;
    const byLevel = new Map<number, { name: string; text: string }[]>();
    for (const f of c.features.filter((f) => f.level <= 5)) byLevel.set(f.level, [...(byLevel.get(f.level) ?? []), f]);
    return (
      <>
        <p className="wiki-lead">{c.summary}</p>
        <Tiles
          tiles={[
            ["Hit die", `d${c.hitDie}`],
            ["Main ability", c.primary],
            ["Saving throws", c.saves.map((a) => ABILITY_NAMES[a]).join(", ")],
            ["Armour", c.armor.length ? c.armor.map((a) => (a === "shield" ? "shields" : a)).join(", ") : "None"],
            ["Weapons", c.weaponText],
            ["Skills", `Choose ${c.skills.count}`],
          ]}
        />
        <h3>{c.subclassLabel} (level {c.subclassLevel})</h3>
        <Feats items={c.subclasses.map((s) => ({ name: s.name, text: s.summary, sub: refOf(`sub:${c.id}:${s.id}`) ?? bookLabel(s.book) }))} />
        <details className="wiki-levels">
          <summary>What you get at each level (1–5)</summary>
          {[...byLevel].map(([lvl, fs]) => (
            <div key={lvl}>
              <h4>Level {lvl}</h4>
              <Feats items={fs} />
            </div>
          ))}
        </details>
        <p className="muted wiki-book">{refOf(`class:${c.id}`) ?? bookLabel(c.book)}</p>
      </>
    );
  }
  if (e.sec === "races") {
    const s = R.species.find((x) => x.id === e.id)!;
    const asi = Object.entries(s.asi?.fixed ?? {})
      .map(([k, v]) => `+${v} ${k}`)
      .join(", ");
    return (
      <>
        <Tiles
          tiles={[
            ["Ability scores", asi || (s.asi?.chooseCount ? `+1 to ${s.asi.chooseCount} of your choice` : "")],
            ["Size", s.sizes.join(" or ")],
            ["Speed", `${s.speed} ft`],
            ["Darkvision", s.darkvision ? `${s.darkvision} ft` : ""],
            ["Resistance", s.resistances.join(", ")],
          ]}
        />
        <h3>Traits</h3>
        <Feats items={s.traits.map((t) => ({ name: t.name, text: t.text, sub: t.minLevel ? `From level ${t.minLevel}.` : undefined }))} />
        {s.lineages?.length ? (
          <>
            <h3>{s.lineageLabel ?? "Subraces"}</h3>
            <Feats
              items={s.lineages.map((l) => ({
                name: l.name,
                text: l.text,
                sub: [
                  Object.entries(l.asi ?? {})
                    .map(([k, v]) => `+${v} ${k}`)
                    .join(", "),
                  refOf(`lineage:${s.id}:${(l as { id?: string }).id ?? l.name}`),
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </>
        ) : null}
        <p className="muted wiki-book">{refOf(`race:${s.id}`) ?? bookLabel(s.book)}</p>
      </>
    );
  }
  if (e.sec === "backgrounds") {
    const b = R.backgrounds.find((x) => x.id === e.id)!;
    return (
      <>
        <Tiles
          tiles={[
            ["Skills", b.skills.map((x) => skillName(x as SkillId)).join(", ")],
            ["Tools", b.tools],
            ["Languages", b.languages ? `${b.languages} of your choice` : ""],
            ["Gold", b.gp ? `${b.gp} gp` : ""],
          ]}
        />
        {b.feature && (
          <>
            <h3>Feature</h3>
            <Feats items={[{ name: b.feature.name, text: b.feature.text }]} />
          </>
        )}
        {b.equipment && (
          <>
            <h3>Equipment</h3>
            <p>{b.equipment}</p>
          </>
        )}
        <p className="muted wiki-book">{refOf(`bg:${b.id}`) ?? bookLabel(b.book)}</p>
      </>
    );
  }
  if (e.sec === "feats") {
    const f = R.feats.find((x) => x.id === e.id)!;
    const req = featReq(f);
    return (
      <>
        <Tiles
          tiles={[
            ["Prerequisite", req || "None"],
            ["Ability increase", f.plusOne?.length ? `+1 ${f.plusOne.join(" or ")}` : ""],
          ]}
        />
        <p className="wiki-lead">{f.text}</p>
        <p className="muted wiki-book">{refOf(`feat:${f.id}`) ?? bookLabel(f.book)}</p>
      </>
    );
  }
  // rules
  if (e.id === "cond-exhaustion")
    return (
      <>
        <p className="wiki-lead">Levels add up: each level keeps the ones before it.</p>
        <ol className="wiki-points">
          {EXHAUSTION.slice(1).map((t, i) => (
            <li key={i}>
              <strong>Level {i + 1}:</strong> {t}.
            </li>
          ))}
        </ol>
        <p className="muted">A long rest with food and water removes one level.</p>
        <p className="muted wiki-book">{refOf("cond:exhaustion")}</p>
      </>
    );
  if (e.id.startsWith("cond-")) {
    const c = CONDITIONS.find((x) => `cond-${x.id}` === e.id)!;
    return (
      <>
        <p className="wiki-lead">{c.text}</p>
        <p className="muted wiki-book">{refOf(entryKey("rules", e.id))}</p>
      </>
    );
  }
  const p = RULE_PAGES.find((x) => x.id === e.id)!;
  return (
    <>
      <ul className="wiki-points">
        {p.points.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="muted wiki-book">{refOf(entryKey("rules", e.id))}</p>
    </>
  );
}
