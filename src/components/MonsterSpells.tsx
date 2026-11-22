// A monster's spells (REQUIREMENTS §4.9): one line per spell level (or per "3/day each"), each spell a
// pill that opens its card with dice to roll. In a fight the slots are gold dots to tick off; on the
// session's monster page the host can swap spells (a "build").
import { useEffect, useMemo, useState } from "react";
import { allSpells, type Monster, type Spell } from "../lookup";
import { applyBuild, cantripDice, cleanSpell, editableBlock, monsterSpells, ordinal, spellKey, type SpellBlock, type SpellMap, type SpellRow } from "../monsterSpells";
import { DiceText, RollChip } from "./Dice";
import { MonsterText } from "./MonsterPage";

let spellList: Promise<Spell[]> | null = null;
/** The SRD spells, by lower-case name (loaded once). */
export function useSpells(): Map<string, Spell> | null {
  const [map, setMap] = useState<Map<string, Spell> | null>(null);
  useEffect(() => {
    let live = true;
    spellList ??= (allSpells() as Promise<Spell[]>).catch((e) => {
      spellList = null;
      throw e;
    });
    spellList.then((l) => live && setMap(new Map(l.map((s) => [s.name.toLowerCase(), s]))), () => {});
    return () => {
      live = false;
    };
  }, []);
  return map;
}

const TITLE = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
const D20 = [{ n: 1, sides: 20 }];

/** What the fight keeps for one monster: how many of each slot / daily use is spent. */
export interface FightUse {
  used: Record<string, number>;
  onUse: (key: string, used: number) => void;
}
/** Editing a build on the monster page. */
export interface SpellEdit {
  map: SpellMap;
  cls: string;
  onChange: (m: SpellMap) => void;
}

/** In a fight, an innate "1/day each" line becomes one line per spell (each has its own uses). */
function shownRows(b: SpellBlock, fight: boolean): SpellRow[] {
  if (!fight) return b.rows;
  return b.rows.flatMap((r) => (r.perDay && r.spells.length > 1 ? r.spells.map((s) => ({ ...r, key: `${r.key}:${spellKey(s)}`, label: r.label.replace(/ each$/, ""), spells: [s] })) : [r]));
}
const usesOf = (r: SpellRow) => (r.level != null ? r.slots : r.perDay);
const useKey = (r: SpellRow) => (r.perDay && !r.key.includes(":") ? `${r.key}:${spellKey(r.spells[0] ?? "")}` : r.key);

/** "Slots left 4 · 3 · 3" / "Darkness ready · Faerie Fire used" for the closed box in a fight. */
export function spellSummary(b: SpellBlock, used: Record<string, number>): string {
  const rows = shownRows(b, true).filter((r) => usesOf(r) > 0);
  if (!rows.length) return "At will";
  if (b.kind === "slots") return `Slots left ${rows.map((r) => Math.max(0, r.slots - (used[r.key] ?? 0))).join(" · ")}`;
  return rows.map((r) => `${TITLE(cleanSpell(r.spells[0]).name)} ${Math.max(0, r.perDay - (used[useKey(r)] ?? 0))}/${r.perDay}`).join(" · ");
}

export function SpellsBox({ block, who, fight, edit }: { block: SpellBlock; who: string; fight?: FightUse; edit?: SpellEdit }) {
  const spells = useSpells();
  const [open, setOpen] = useState("");
  const [pick, setPick] = useState<{ row: string; spell: string } | null>(null);
  useEffect(() => {
    if (!edit) setPick(null);
    setOpen("");
  }, [!!edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = shownRows(block, !!fight);

  const choose = (row: SpellRow, from: string, to: Spell) => {
    if (!edit) return;
    const m: SpellMap = {};
    for (const [k, v] of Object.entries(edit.map)) m[k] = [...v];
    const lv = String(to.level_int);
    const name = to.name.toLowerCase();
    if (from) {
      const list = m[row.key] ?? [];
      const i = list.findIndex((s) => spellKey(s) === spellKey(from));
      if (lv === row.key && i >= 0) list[i] = name;
      else {
        if (i >= 0) list.splice(i, 1);
        m[lv] = [...(m[lv] ?? []), name];
      }
      m[row.key] = list;
    } else m[lv] = [...(m[lv] ?? []), name];
    edit.onChange(m);
    setPick(null);
  };
  const remove = (row: SpellRow, s: string) => {
    if (!edit) return;
    edit.onChange({ ...edit.map, [row.key]: (edit.map[row.key] ?? []).filter((x) => spellKey(x) !== spellKey(s)) });
    setPick(null);
  };

  return (
    <div className={`msp ${fight ? "in-fight" : ""} ${edit ? "editing" : ""}`}>
      {rows.map((r) => {
        const total = usesOf(r);
        const key = useKey(r);
        const spent = Math.min(total, fight?.used[key] ?? 0);
        const left = total - spent;
        const openSpell = r.spells.find((s) => open === `${r.key}|${spellKey(s)}`);
        const picking = edit && pick?.row === r.key ? pick : null;
        return (
          <div key={r.key} className="msp-row">
            <div className="msp-line">
              <div className="msp-label">
                <strong>{r.label}</strong>
                <span className="msp-uses">
                  {fight && total > 0 && (
                    <span className="msp-pips" role="group" aria-label={`${r.label}: ${left} of ${total} left`}>
                      {Array.from({ length: total }, (_, i) => {
                        const full = i < left;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`msp-pip ${full ? "full" : ""}`}
                            aria-label={full ? `Mark one ${r.level != null ? `${ordinal(r.level)}-level slot` : "use"} as used` : "Give one back"}
                            title={full ? "Mark as used" : "Give back"}
                            onClick={() => fight.onUse(key, full ? spent + 1 : spent - 1)}
                          />
                        );
                      })}
                    </span>
                  )}
                  <small>{total ? (fight ? `${left} of ${total} left` : r.level != null ? `${total} slot${total > 1 ? "s" : ""}` : "") : r.level != null && r.level > 0 ? "No slots" : "At will"}</small>
                </span>
              </div>
              <div className="msp-pills">
                {r.spells.map((raw) => {
                  const c = cleanSpell(raw);
                  const s = spells?.get(c.name.toLowerCase());
                  const k = `${r.key}|${spellKey(raw)}`;
                  const on = edit ? picking?.spell === raw : open === k;
                  return (
                    <button
                      key={raw}
                      type="button"
                      className={`msp-pill ${on ? "on" : ""} ${s ? "" : "unknown"}`}
                      aria-expanded={on}
                      title={c.note || (s ? undefined : "Not in the spell list")}
                      onClick={() => (edit ? setPick(on ? null : { row: r.key, spell: raw }) : s && setOpen(on ? "" : k))}
                    >
                      {s?.name ?? TITLE(c.name)}
                      {c.star && <span aria-label="see the note below">*</span>}
                      {c.note && <small>({c.note})</small>}
                      {s?.requires_concentration && (
                        <span className="msp-conc" title="Concentration" aria-label="concentration">
                          C
                        </span>
                      )}
                    </button>
                  );
                })}
                {edit && (
                  <button type="button" className="msp-add" onClick={() => setPick(picking && !picking.spell ? null : { row: r.key, spell: "" })}>
                    + Add
                  </button>
                )}
                {!r.spells.length && !edit && <span className="muted">No spells at this level.</span>}
              </div>
            </div>
            {picking && edit && spells && (
              <Picker
                row={r}
                from={picking.spell}
                edit={edit}
                spells={spells}
                onPick={(to) => choose(r, picking.spell, to)}
                onRemove={() => remove(r, picking.spell)}
                onClose={() => setPick(null)}
              />
            )}
            {openSpell && spells?.get(cleanSpell(openSpell).name.toLowerCase()) && (
              <SpellDetail
                s={spells.get(cleanSpell(openSpell).name.toLowerCase())!}
                block={block}
                who={who}
                onClose={() => setOpen("")}
                cast={
                  fight && total > 0
                    ? {
                        left,
                        label: r.level != null ? `Cast · use a ${ordinal(r.level)}-level slot` : "Cast · use it",
                        none: r.level != null ? `No ${ordinal(r.level)}-level slots left` : "Used up today",
                        go: () => fight.onUse(key, spent + 1),
                      }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}
      {block.after && <p className="muted msp-after">{block.after.replace(/^\*\s*/gm, "* ")}</p>}
    </div>
  );
}

/** The spell's card: facts, what it does with its dice as gold chips, the save and higher levels. */
function SpellDetail({ s, block, who, onClose, cast }: { s: Spell; block: SpellBlock; who: string; onClose: () => void; cast?: { left: number; label: string; none: string; go: () => void } }) {
  const [more, setMore] = useState(false);
  const paras = s.desc.split(/\n\s*\n/).map((p) => p.replace(/\*\*/g, "").trim()).filter(Boolean);
  const shown = more ? paras : paras.slice(0, 2);
  const save = /(strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/i.exec(s.desc)?.[1];
  const attack = block.hit != null && /spell attack/i.test(s.desc);
  const firstDice = /(\d+d\d+)(?:\s+(\w+)\s+damage)?/.exec(s.desc);
  const scaled = s.level_int === 0 && firstDice && block.casterLevel && block.casterLevel >= 5 ? cantripDice(firstDice[1], block.casterLevel) : "";
  const title = `${who} · ${s.name}`;
  return (
    <div className="msp-card" role="region" aria-label={s.name}>
      <div className="msp-card-head">
        <div>
          <strong>{s.name}</strong>
          <span>
            {s.level_int === 0 ? `Cantrip · ${s.school.toLowerCase()}` : `${ordinal(s.level_int)}-level ${s.school.toLowerCase()}`}
            {s.requires_concentration ? " · concentration" : ""}
          </span>
        </div>
        <button type="button" className="btn small ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="msp-facts">
        {[
          ["Casting time", s.casting_time],
          ["Range", s.range],
          ["Components", s.components],
          ["Duration", s.duration],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {(attack || save || scaled) && (
        <div className="msp-rolls">
          {attack && (
            <RollChip label={`Roll ${s.name} spell attack, +${block.hit}`} spec={{ label: `${title} · attack`, kind: "attack", groups: D20, parts: [{ label: "Spell attack", value: block.hit! }], tone: "monster" }}>
              {block.hit! >= 0 ? `+${block.hit}` : block.hit} to hit
            </RollChip>
          )}
          {scaled && (
            <span className="msp-scaled">
              At its level: <DiceText text={scaled} label={`${title}${firstDice?.[2] ? ` · ${firstDice[2]} damage` : ""}`} unit={firstDice?.[2]?.toLowerCase()} tone="monster" fire={firstDice?.[2]?.toLowerCase() === "fire"} />
              {firstDice?.[2] ? ` ${firstDice[2].toLowerCase()}` : ""}
            </span>
          )}
          {save && (
            <span className="msp-save">
              {save.slice(0, 3).toUpperCase()} save{block.dc != null ? ` · DC ${block.dc}` : ""}
            </span>
          )}
        </div>
      )}
      {shown.map((p, i) => (
        <p key={i}>
          <MonsterText title={title} text={p} />
        </p>
      ))}
      {paras.length > 2 && (
        <button type="button" className="link" onClick={() => setMore((m) => !m)}>
          {more ? "Show less" : "Show the rest"}
        </button>
      )}
      {s.higher_level && (
        <p className="msp-higher">
          <strong>Higher slot.</strong> <MonsterText title={title} text={s.higher_level} />
        </p>
      )}
      {cast && (
        <div className="msp-cast">
          <button type="button" className="btn primary" disabled={cast.left <= 0} onClick={cast.go}>
            {cast.left > 0 ? cast.label : cast.none}
          </button>
        </div>
      )}
    </div>
  );
}

/** Swap or add: same-level spells from the class list first; any spell behind "Show all spells". */
function Picker({ row, from, edit, spells, onPick, onRemove, onClose }: { row: SpellRow; from: string; edit: SpellEdit; spells: Map<string, Spell>; onPick: (s: Spell) => void; onRemove: () => void; onClose: () => void }) {
  const lvl = row.level ?? 0;
  const [all, setAll] = useState(false);
  const [allLvl, setAllLvl] = useState(lvl);
  const [q, setQ] = useState("");
  const have = useMemo(() => new Set(Object.values(edit.map).flat().map(spellKey)), [edit.map]);
  const list = [...spells.values()].sort((a, b) => a.name.localeCompare(b.name));
  const inClass = (s: Spell) => s.dnd_class.toLowerCase().split(/,\s*/).includes(edit.cls);
  const book = list.filter((s) => s.level_int === lvl && inClass(s) && !have.has(s.name.toLowerCase()));
  const other = list.filter((s) => s.level_int === allLvl && !have.has(s.name.toLowerCase()) && !(allLvl === lvl && inClass(s)) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));
  const fromName = from ? spells.get(cleanSpell(from).name.toLowerCase())?.name ?? TITLE(cleanSpell(from).name) : "";
  const cls = TITLE(edit.cls);
  return (
    <div className="msp-pick">
      <div className="msp-card-head">
        <div>
          <strong>{from ? `Swap ${fromName} for…` : `Add a ${lvl ? `${ordinal(lvl)}-level spell` : "cantrip"}`}</strong>
          <span>
            {lvl ? `${ordinal(lvl)}-level` : "Cantrip"} {cls.toLowerCase()} spells keep the monster as strong as the book has it.
          </span>
        </div>
        <button type="button" className="btn small ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="msp-options">
        {book.map((s) => (
          <button key={s.slug} type="button" className="msp-pill" onClick={() => onPick(s)}>
            {s.name}
          </button>
        ))}
        {!book.length && <span className="muted">No other {cls.toLowerCase()} spells of this level.</span>}
      </div>
      <div className="msp-pick-foot">
        {from && (
          <button type="button" className="btn small danger-ghost" onClick={onRemove}>
            Remove {fromName}
          </button>
        )}
        <button type="button" className="link" aria-expanded={all} onClick={() => setAll((a) => !a)}>
          {all ? "Hide other spells" : "Show all spells (any level or class)"}
        </button>
      </div>
      {all && (
        <div className="msp-all">
          <p className="msp-warn-line">
            <WarnIcon /> These break the book's rule: the monster ends up stronger or weaker than its challenge rating.
          </p>
          <div className="seg msp-levels" role="group" aria-label="Spell level">
            {Array.from({ length: 10 }, (_, i) => (
              <button key={i} type="button" className={`seg-btn ${allLvl === i ? "on" : ""}`} aria-pressed={allLvl === i} onClick={() => setAllLvl(i)}>
                {i === 0 ? "0" : ordinal(i)}
              </button>
            ))}
          </div>
          <input type="search" className="msp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a spell" aria-label="Find a spell" />
          <div className="msp-options">
            {other.map((s) => (
              <button key={s.slug} type="button" className="msp-pill other" onClick={() => onPick(s)}>
                {s.name}
                {!inClass(s) && <small>{s.dnd_class.split(/,\s*/)[0].toLowerCase()}</small>}
              </button>
            ))}
            {!other.length && <span className="muted">Nothing here.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export const WarnIcon = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 2 20h20z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);
const ARROWS = { up: "↑", down: "↓", off: "≈", "": "" } as const;

/** ⚠ ↑ / ↓ / ≈: the build is outside the book's rule. The note shows on hover, focus and tap. */
export function StrengthMark({ kind, note, label }: { kind: "" | "up" | "down" | "off"; note: string; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!kind) return null;
  // The note opens in the page flow, on its own line under the mark, so it never covers buttons.
  return (
    <>
      <span className={`str-mark ${kind}`}>
        <button type="button" className="str-btn" aria-expanded={open} title={note} aria-label={`${label ?? ""} ${note}`.trim()} onClick={(e) => (e.stopPropagation(), setOpen((o) => !o))}>
          <WarnIcon />
          <b aria-hidden="true">{ARROWS[kind]}</b>
          {label && <span>{label}</span>}
        </button>
      </span>
      {open && (
        <span className="str-note" role="note">
          {note}
        </span>
      )}
    </>
  );
}

/** Spell traits as text, for the ones we can't show as rows (kept so nothing is lost). */
export function SpellIntro({ block }: { block: SpellBlock }) {
  return (
    <p className="msp-intro">
      <MonsterText title={block.trait} text={block.intro} />
    </p>
  );
}

/** Heading line for a spell block: "18th-level wizard · Intelligence" / "Innate · Charisma". */
export function blockTitle(b: SpellBlock): string {
  const who = b.kind === "innate" ? "Innate" : [b.casterLevel ? `${b.casterLevel}${b.casterLevel === 1 ? "st" : b.casterLevel === 2 ? "nd" : b.casterLevel === 3 ? "rd" : "th"}-level` : "", b.className].filter(Boolean).join(" ") || "Spells";
  return [who.charAt(0).toUpperCase() + who.slice(1), b.ability].filter(Boolean).join(" · ");
}

/** Every spell list of a monster as its own section (stat blocks and the monster page). */
export function SpellSections({ m, spells, edit, who }: { m: Pick<Monster, "special_abilities" | "actions" | "name">; spells?: SpellMap; edit?: SpellEdit; who?: string }) {
  const blocks = monsterSpells(m);
  const main = editableBlock(blocks);
  return (
    <>
      {blocks.map((b) => {
        const shown = b === main ? applyBuild(b, edit?.map ?? spells) : b;
        return (
          <section key={b.trait} className="msp-sec" aria-label={b.trait}>
            <div className="msp-head">
              <div>
                <span className="msp-kicker">{/innate/i.test(b.trait) ? "Innate spells" : /shared/i.test(b.trait) ? b.trait : "Spellcasting"}</span>
                <strong>{blockTitle(b)}</strong>
              </div>
              <BlockNumbers b={b} who={who ?? m.name} />
            </div>
            <SpellIntro block={b} />
            <SpellsBox block={shown} who={who ?? m.name} edit={b === main ? edit : undefined} />
          </section>
        );
      })}
    </>
  );
}

/** "Save DC 20" and a "+12 to hit" chip. */
export function BlockNumbers({ b, who }: { b: SpellBlock; who: string }) {
  if (b.dc == null && b.hit == null) return null;
  return (
    <div className="msp-nums">
      {b.dc != null && <span className="msp-save">Save DC {b.dc}</span>}
      {b.hit != null && (
        <RollChip label={`Roll a spell attack for ${who}, ${b.hit >= 0 ? "+" : ""}${b.hit}`} spec={{ label: `${who} · spell attack`, kind: "attack", groups: D20, parts: [{ label: "Spell attack", value: b.hit }], tone: "monster" }}>
          {b.hit >= 0 ? `+${b.hit}` : b.hit} to hit
        </RollChip>
      )}
    </div>
  );
}

/** Traits that show as spell sections instead of text. */
export const spellTraitNames = (m: Pick<Monster, "special_abilities" | "actions">) => new Set(monsterSpells(m).map((b) => b.trait));
