// Items browse (REQUIREMENTS 4.5): search, filters (kind, magic, rarity, attunement, sort), the
// list and the item page with its dice as roll chips and "+ Add to a character".
import { Fragment, useEffect, useMemo, useState } from "react";
import { addRecent, isFavorite, toggleFavorite } from "../lookup";
import { KIND_LABEL, RARITIES, loadItems, loadedItems, rarityOf, type Item, type ItemKind, type Rarity } from "../items";
import type { StoredCharacter } from "../storage";
import { segmentsOf } from "../dice/rollText";
import { parseDice } from "../dice/roll";
import { RollChip } from "./Dice";
import { AddItem } from "./AddToCharacter";

export const itemIndex = () => loadedItems();

const ICON: Record<ItemKind, string> = {
  weapon: "M20 4L9 15 M15 4h5v5 M7 13l4 4 M5 19l2-2",
  armour: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  gear: "M6 8h12l1 13H5z M9 8V6a3 3 0 0 1 6 0v2",
  tool: "M14.5 5.5a4 4 0 0 0 5 5L10 20l-3-3 9.5-9.5 M4 4l4 4",
  mount: "M5 17h14 M7 17v-5h10v5 M9 12V8h6v4 M7 20a1.5 1.5 0 1 0 0-3 M17 20a1.5 1.5 0 1 0 0-3",
  wondrous: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M19 17l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
  ring: "M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M9 4h6l-1.5 4h-3z",
  rod: "M6 20L18 4 M16 4h3v3",
  staff: "M8 21L16 3 M14 4.5a2 2 0 1 0 3 1.5",
  wand: "M4 20L15 9 M17 3l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z",
  potion: "M10 3h4 M10.5 3v5L5.5 17a3 3 0 0 0 2.7 4h7.6a3 3 0 0 0 2.7-4l-5-9V3",
  scroll: "M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z M6 4a2 2 0 0 0-2 2v2h2 M9 9h7 M9 13h7",
};
const KINDS: ItemKind[] = ["weapon", "armour", "gear", "tool", "mount", "wondrous", "ring", "rod", "staff", "wand", "potion", "scroll"];
const MUNDANE = "#e8d3a6";
const colorOf = (it: Item) => rarityOf(it.rarity)?.color ?? MUNDANE;
const PAGE = 80;
const SOURCE: Record<Item["source"], string> = { PHB: "Player's Handbook (SRD 5.1)", DMG: "Dungeon Master's Guide", XGE: "Xanathar's Guide to Everything", TCE: "Tasha's Cauldron of Everything" };
const SOURCE_SHORT: Record<Item["source"], string> = { PHB: "Player's Handbook", DMG: "Dungeon Master's Guide", XGE: "Xanathar's", TCE: "Tasha's" };

const Icon = ({ it, size = 20 }: { it: Item; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={colorOf(it)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICON[it.kind]} />
  </svg>
);

export function ItemsBrowse({ lib, onSave, start }: { lib: StoredCharacter[]; onSave: (rec: StoredCharacter) => void; start?: string }) {
  const [items, setItems] = useState<Item[] | null>(() => (loadedItems().length ? loadedItems() : null));
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ItemKind | "">("");
  const [magic, setMagic] = useState<"" | "magic" | "mundane">("");
  const [rar, setRar] = useState<Rarity[]>([]);
  const [more, setMore] = useState(false);
  const [attune, setAttune] = useState<"" | "yes" | "no">("");
  const [sort, setSort] = useState<"name" | "rarity" | "cost">("name");
  const [books, setBooks] = useState<Item["source"][]>([]);
  const [openId, setOpenId] = useState<string | null>(start ?? null);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => {
    if (!items) loadItems().then(setItems, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [items]);
  useEffect(() => setLimit(PAGE), [q, kind, magic, rar, attune, sort, books]);

  const query = q.trim().toLowerCase();
  const list = useMemo(() => {
    const out = (items ?? []).filter(
      (it) =>
        (!kind || it.kind === kind) &&
        (!magic || (magic === "magic") === !!it.rarity) &&
        (!rar.length || (it.rarity && rar.includes(it.rarity))) &&
        (!attune || (attune === "yes") === !!it.attune) &&
        (!books.length || books.includes(it.source)) &&
        (!query || it.name.toLowerCase().includes(query) || it.words.includes(query)),
    );
    if (sort === "rarity") out.sort((a, b) => (rarityOf(b.rarity)?.rank ?? 0) - (rarityOf(a.rarity)?.rank ?? 0) || a.name.localeCompare(b.name));
    if (sort === "cost") out.sort((a, b) => (b.cost ?? -1) - (a.cost ?? -1) || a.name.localeCompare(b.name));
    return out;
  }, [items, kind, magic, rar, attune, query, sort, books]);
  const cur = openId ? items?.find((i) => i.id === openId) : undefined;
  useEffect(() => {
    if (cur) addRecent({ kind: "item", slug: cur.id, name: cur.name });
  }, [cur]);
  const extra = (attune ? 1 : 0) + (sort !== "name" ? 1 : 0) + books.length;
  const chip = (on: boolean) => `lk-kind ${on ? "on" : ""}`;

  return (
    <div className={`lookup items-browse ${cur ? "has-page" : ""}`}>
      <header className="wiki-head">
        <h1>Items</h1>
      </header>
      <label className="lk-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, or words inside them (cloak, fire, invisible)" aria-label="Search items" />
      </label>
      <div className="lk-filters item-kinds" role="group" aria-label="Kind">
        <button type="button" className={chip(!kind)} aria-pressed={!kind} onClick={() => setKind("")}>
          All
        </button>
        {KINDS.map((k) => (
          <button key={k} type="button" className={chip(kind === k)} aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="lk-filters" role="group" aria-label="Magic and rarity">
        {(
          [
            ["", "Any"],
            ["magic", "Magic"],
            ["mundane", "Not magic"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className={chip(magic === k)} aria-pressed={magic === k} onClick={() => setMagic(k)}>
            {l}
          </button>
        ))}
        <span className="item-sep" aria-hidden="true" />
        {RARITIES.map((r) => {
          const on = rar.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              className={`lk-kind rarity-chip ${on ? "on" : ""}`}
              style={on ? { borderColor: r.color, background: `${r.color}26` } : undefined}
              aria-pressed={on}
              onClick={() => {
                setRar(on ? rar.filter((x) => x !== r.id) : [...rar, r.id]);
                if (magic === "mundane") setMagic("");
              }}
            >
              <span className="rarity-letter" style={{ color: r.color, borderColor: r.color }}>
                {r.letter}
              </span>
              {r.label}
            </button>
          );
        })}
        <button type="button" className="lk-kind item-more" aria-expanded={more} onClick={() => setMore(!more)}>
          {more ? "Fewer filters" : extra ? `More filters (${extra})` : "More filters"}
        </button>
      </div>
      {more && (
        <div className="lk-filters item-more-row">
          <span className="hero-label">Attunement</span>
          {(
            [
              ["", "Any"],
              ["yes", "Needs it"],
              ["no", "Doesn't"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={chip(attune === k)} aria-pressed={attune === k} onClick={() => setAttune(k)}>
              {l}
            </button>
          ))}
          <span className="hero-label">Book</span>
          {(Object.keys(SOURCE) as Item["source"][]).map((k) => (
            <button key={k} type="button" className={chip(books.includes(k))} aria-pressed={books.includes(k)} onClick={() => setBooks(books.includes(k) ? books.filter((x) => x !== k) : [...books, k])}>
              {SOURCE_SHORT[k]}
            </button>
          ))}
          <span className="hero-label">Sort</span>
          {(
            [
              ["name", "Name"],
              ["rarity", "Rarity"],
              ["cost", "Cost"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={chip(sort === k)} aria-pressed={sort === k} onClick={() => setSort(k)}>
              {l}
            </button>
          ))}
        </div>
      )}
      <div className="lk-browse">
        <div className="lk-list">
          {error && <p className="auth-error">{error}</p>}
          <span className="mon-count muted">{items ? `${list.length} item${list.length === 1 ? "" : "s"}` : "Loading items…"}</span>
          <div className="mon-rows">
            {list.slice(0, limit).map((it) => {
              const r = rarityOf(it.rarity);
              const on = cur?.id === it.id;
              return (
                <button key={it.id} type="button" className={`mon-row ${on ? "on" : ""}`} aria-current={on ? "page" : undefined} onClick={() => setOpenId(on ? null : it.id)}>
                  <span className="mon-icon" aria-hidden="true" style={{ width: 44, height: 44, background: `${colorOf(it)}1a`, borderColor: `${colorOf(it)}55` }}>
                    <Icon it={it} />
                  </span>
                  <span className="mon-row-text">
                    <strong>{it.name}</strong>
                    <small>{it.line}</small>
                  </span>
                  {r && (
                    <span className="rarity-letter" style={{ color: r.color, borderColor: r.color }} title={r.label}>
                      {r.letter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {list.length > limit && (
            <button type="button" className="btn mon-more" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, list.length - limit)} more
            </button>
          )}
          {items && !list.length && (
            <p className="muted">
              No items match.{" "}
              <button type="button" className="link" onClick={() => (setQ(""), setKind(""), setMagic(""), setRar([]), setAttune(""), setBooks([]))}>
                Clear the filters
              </button>
            </p>
          )}
        </div>
        {cur && (
          <div className="lk-page">
            <ItemPage key={cur.id} it={cur} lib={lib} onSave={onSave} onBack={() => setOpenId(null)} />
          </div>
        )}
      </div>
      <p className="credits muted">Includes material from the System Reference Document 5.1 (CC-BY-4.0).</p>
    </div>
  );
}

function ItemStar({ it }: { it: Item }) {
  const ref = { kind: "item" as const, slug: it.id, name: it.name };
  const [on, setOn] = useState(() => isFavorite(ref));
  return (
    <button
      type="button"
      className={`lk-star mon-star ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${it.name} from starred` : `Star ${it.name}`}
      onClick={() => {
        toggleFavorite(ref);
        setOn(!on);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z" />
      </svg>
    </button>
  );
}

/** Item text with its dice as roll chips (Potion of Healing 2d4 + 2, Flame Tongue 2d6 fire). */
function ItemText({ it, text }: { it: Item; text: string }) {
  return (
    <>
      {segmentsOf(text).map((s, i) => {
        if (s.kind !== "dice") return <Fragment key={i}>{s.text}</Fragment>;
        const p = parseDice(s.dice);
        if (!p) return <Fragment key={i}>{s.text}</Fragment>;
        const fire = s.unit === "fire";
        return (
          <RollChip key={i} fire={fire} label={`Roll ${s.dice}`} spec={{ label: `${it.name} · ${s.dice}`, kind: "damage", groups: p.groups.map((g) => ({ ...g, tone: fire ? "fire" : undefined })), bonus: p.bonus, unit: s.unit, tone: "player" }}>
            {s.text}
          </RollChip>
        );
      })}
    </>
  );
}

function ItemPage({ it, lib, onSave, onBack }: { it: Item; lib: StoredCharacter[]; onSave: (rec: StoredCharacter) => void; onBack: () => void }) {
  const color = colorOf(it);
  const paras = it.desc.split(/\n+/).map((p) => p.replace(/^#+\s*/, "").trim()).filter(Boolean);
  return (
    <article className="mon-page wiki-page item-page" aria-label={it.name} style={{ ["--mon" as string]: color }}>
      <button type="button" className="link mon-back" onClick={onBack}>
        ‹ Items
      </button>
      <header className="wiki-page-head">
        <span className="mon-icon" aria-hidden="true" style={{ width: 60, height: 60, background: `${color}1a`, borderColor: `${color}66` }}>
          <Icon it={it} size={30} />
        </span>
        <div className="wiki-page-title">
          <h2>{it.name}</h2>
          <span style={{ color: it.rarity ? color : undefined }}>{it.line}</span>
        </div>
        <ItemStar it={it} />
      </header>
      {it.attune && <p className="item-attune">{it.attune}</p>}
      {it.stats.length > 0 && (
        <div className="wiki-tiles">
          {it.stats.map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="wiki-text">
        {paras.map((p, i) => (
          <p key={i}>
            <ItemText it={it} text={p} />
          </p>
        ))}
      </div>
      <p className="muted wiki-book">Source · {SOURCE[it.source]}</p>
      <AddItem item={it} lib={lib} onSave={onSave} />
    </article>
  );
}
