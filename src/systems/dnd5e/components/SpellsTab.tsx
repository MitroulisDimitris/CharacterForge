import { useState, type ReactNode } from "react";
import { ABILITY_NAMES, signed, type Ability } from "../data/core";
import { castingTimeLabel, cantripDamage, levelLabel, type Spell } from "../data/spells";
import type { TabProps } from "../../types";
import type { Character } from "../character";
import type { Derived, SpellRow } from "../derive";
import { Card, Counter, Segmented } from "../../../components/ui";
import { ResourcePips } from "../../../components/ResourcePips";
import { resources5e } from "../resources";
import { PreviewHead, WithPreview, useHover } from "./Preview";
import { RollChip } from "../../../components/Dice";
import { spellAttackRoll, spellDiceBits } from "../rollSpecs";

/**
 * Spells tab, two views (UI rules: calm first):
 *  - "Your spells": only the spells you have, one short line each; click a row for details.
 *  - "Learn or change": the full class list with tick boxes. Opens first while picks are still open
 *    (creation, level-up), otherwise one click away.
 */
export function SpellsTab({ c, d, set }: TabProps<Character, Derived>) {
  const core = c.edition === "2014" ? "PHB14" : "PHB24";
  const SP = d.spell;
  const wizard = !!SP?.spellbook;
  const always = d.spellRows.filter((r) => r.kind === "Always" || r.kind === "Innate");
  const picksOpen = c.cantrips.length < d.cantripLimit || c.prepared.length < d.preparedLimit || (wizard && c.spellbook.length < d.spellbookLimit);
  const [view, setView] = useState<"mine" | "learn">(picksOpen ? "learn" : "mine");

  if (!d.caster) {
    return (
      <div className="stack">
        <Card todo="spellcasting" title="Spellcasting">
          <p className="lead">
            {SP
              ? `${d.cls.name}s start casting spells at level ${SP.startLevel}.`
              : d.cls.subclasses.some((s) => s.spell)
                ? `${d.cls.name}s don't cast spells, except the ${d.cls.subclasses.filter((s) => s.spell).map((s) => s.name).join(" ")} (from level ${d.cls.subclassLevel}).`
                : `${d.cls.name}s don't cast spells.`}
            {d.spellRows.length ? " Spells from your race or feats are listed below." : ""}
          </p>
        </Card>
        {always.length > 0 && <MySpells c={c} d={d} core={core} onLearn={null} />}
      </div>
    );
  }

  const howTo =
    SP?.label === "Known"
      ? `You know a fixed set of ${SP?.list ?? d.cls.name.toLowerCase()} spells: pick them carefully, you can swap only one when you gain a level.`
      : wizard
        ? "First write spells into your spellbook, then tick the ones you prepare today. You can change prepared spells after each Long Rest."
        : `You prepare spells from the whole ${d.cls.name.toLowerCase()} list after each Long Rest: pick today's set, you can change it tomorrow.`;
  const pools = resources5e(c, d);

  return (
    <div className="stack">
      <Card todo="spellcasting" title="Spellcasting" aside={<span className="muted">{ABILITY_NAMES[d.castAbility]} · {SP?.focus}</span>}>
        <div className="spell-stats">
          <div>
            <strong>{d.spellDc}</strong>
            <span>Save DC</span>
          </div>
          <div>
            <strong>
              <RollChip spec={() => spellAttackRoll(d, "", d.spellAttack, d.castAbility)} label={`Roll a spell attack, ${signed(d.spellAttack)}`} icon={false}>
                {signed(d.spellAttack)}
              </RollChip>
            </strong>
            <span>Spell attack</span>
          </div>
          <div>
            <Counter count={c.cantrips.length} max={d.cantripLimit} label="Cantrips" />
            {wizard && <Counter count={c.spellbook.length} max={d.spellbookLimit} label="Spellbook" />}
            <Counter count={c.prepared.length} max={d.preparedLimit} label={d.spellsKind} />
          </div>
        </div>
        {pools.length > 0 && (
          <div className="in-play">
            <span className="hero-label">In play · tap to use</span>
            <ResourcePips c={c} pools={pools.filter((p) => p.kind !== "feature")} set={set} />
          </div>
        )}
      </Card>

      <div className="spell-views">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "mine", label: "Your spells" },
            { value: "learn", label: picksOpen ? "Learn spells •" : "Learn or change spells" },
          ]}
        />
        {view === "learn" && <span className="muted">{howTo}</span>}
        {/* The To do list asks for these when it jumps to a spell list (hidden, not tabbable). */}
        <button type="button" hidden tabIndex={-1} data-todo-reveals="cantrips spells-1 spells-2 spells-3 spells-4 spells-5" onClick={() => setView("learn")} />
        <button type="button" hidden tabIndex={-1} data-todo-reveals="your-spells" onClick={() => setView("mine")} />
      </div>

      {view === "mine" ? <MySpells c={c} d={d} core={core} onLearn={() => setView("learn")} /> : <LearnSpells c={c} d={d} set={set} core={core} always={always} />}
    </div>
  );
}

// ---------- "Your spells": compact rows, details on click ----------
function MySpells({ c, d, core, onLearn }: { c: Character; d: Derived; core: string; onLearn: (() => void) | null }) {
  const get = (n: string) => d.rules.getSpell(n);
  type Row = { key: string; s?: Spell; name: string; source?: string; note?: string; dc: number; atk: number; granted: boolean; ability: Ability };
  const rows: Row[] = [];
  const seen = new Set<string>();
  const add = (r: Row) => {
    if (seen.has(r.name)) return;
    seen.add(r.name);
    rows.push(r);
  };
  const own = d.castAbility;
  c.cantrips.forEach((n) => add({ key: "c" + n, s: get(n), name: n, dc: d.spellDc, atk: d.spellAttack, granted: false, ability: own }));
  c.prepared.forEach((n) => add({ key: "p" + n, s: get(n), name: n, dc: d.spellDc, atk: d.spellAttack, granted: false, ability: own }));
  d.spellRows
    .filter((r) => r.kind === "Always" || r.kind === "Innate")
    .forEach((r) => add({ key: "g" + r.source + r.name, s: r.spell, name: r.name, source: r.source, note: r.note, dc: r.saveDc, atk: r.attackBonus, granted: true, ability: r.ability }));
  const bookOnly = d.spell?.spellbook ? c.spellbook.filter((n) => !c.prepared.includes(n)) : [];

  if (!rows.length && !bookOnly.length)
    return (
      <Card todo="your-spells" title="Your spells">
        <p className="muted">You haven't picked any spells yet.</p>
        {onLearn && (
          <button type="button" className="btn primary" onClick={onLearn}>
            Learn spells
          </button>
        )}
      </Card>
    );

  const levelOf = (r: Row) => r.s?.level ?? 1;
  const levels = [...new Set(rows.map(levelOf))].sort((a, b) => a - b);
  return (
    <div className="stack">
      {levels.map((lvl) => (
        <section key={lvl} className="spell-group">
          <h3 className="hero-label">
            {lvl === 0 ? "Cantrips · at will" : `${levelLabel(lvl)} · ${d.slots[lvl - 1] ? `${d.slots[lvl - 1]} slot${d.slots[lvl - 1] > 1 ? "s" : ""}` : "no slots yet"}`}
          </h3>
          {rows
            .filter((r) => levelOf(r) === lvl)
            .map((r) => (
              <SpellRowItem key={r.key} r={r} level={c.level} core={core} d={d} />
            ))}
        </section>
      ))}
      {bookOnly.length > 0 && (
        <details className="spell-group spellbook-rest">
          <summary className="hero-label">In your spellbook, not prepared today ({bookOnly.length})</summary>
          {bookOnly.map((n) => (
            <SpellRowItem key={"b" + n} r={{ s: get(n), name: n, dc: d.spellDc, atk: d.spellAttack, granted: false, ability: own }} level={c.level} core={core} d={d} />
          ))}
        </details>
      )}
    </div>
  );
}

/** Plain-text summary (the Learn preview). */
function shortMeta(s: Spell, level: number, dc: number, atk: number) {
  const dmg = s.level === 0 ? cantripDamage(s, level) : s.damage;
  const time = castingTimeLabel(s.time);
  return [time !== "Action" ? time : "", s.range, s.save ? `${s.save} save` : s.attack ? `attack ${signed(atk)}` : "", dmg ?? ""].filter(Boolean).join(" · ") || `DC ${dc}`;
}

type RowInfo = { s?: Spell; name: string; source?: string; note?: string; dc: number; atk: number; granted: boolean; ability: Ability };

/** Damage or healing text with its dice as gold chips (plain text outside a roll scope). */
function SpellDice({ text, r, d }: { text: string; r: RowInfo; d: Derived }) {
  const s = r.s!;
  const half = !!s.save && /half/i.test(s.desc);
  return (
    <>
      {spellDiceBits(text, { label: r.name, mod: d.mods[r.ability], half }).map((b, i) =>
        b.spec ? (
          <RollChip key={i} spec={b.spec} fire={b.fire} label={`Roll ${b.text}${b.spec.unit ? ` ${b.spec.unit}` : ""} for ${r.name}`}>
            {b.text}
          </RollChip>
        ) : (
          <span key={i}>{b.text}</span>
        ),
      )}
    </>
  );
}

function AttackChip({ r, d }: { r: RowInfo; d: Derived }) {
  return (
    <RollChip spec={() => spellAttackRoll(d, r.name, r.atk, r.ability)} label={`Roll a spell attack for ${r.name}, ${signed(r.atk)}`}>
      {signed(r.atk)}
    </RollChip>
  );
}

function SpellMeta({ r, level, d }: { r: RowInfo; level: number; d: Derived }) {
  const s = r.s!;
  const dmg = s.level === 0 ? cantripDamage(s, level) : s.damage;
  const time = castingTimeLabel(s.time);
  const parts: ReactNode[] = [];
  if (time !== "Action") parts.push(time);
  if (s.range) parts.push(s.range);
  if (s.save) parts.push(`${s.save} save DC ${r.dc}`);
  else if (s.attack)
    parts.push(
      <>
        attack <AttackChip r={r} d={d} />
      </>,
    );
  if (dmg) parts.push(<SpellDice text={dmg} r={r} d={d} />);
  if (!parts.length) parts.push(`DC ${r.dc}`);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className="spell-meta-bit">
          {i > 0 && <span aria-hidden="true">· </span>}
          {p}
        </span>
      ))}
    </>
  );
}

function SpellRowItem({ r, level, core, d }: { r: RowInfo; level: number; core: string; d: Derived }) {
  const s = r.s;
  return (
    <details className="spell-row">
      <summary>
        <span className="spell-chip">{s ? (s.level === 0 ? "C" : s.level) : "?"}</span>
        <span className="spell-row-name">{r.name}</span>
        <span className="spell-row-meta">{s ? <SpellMeta r={r} level={level} d={d} /> : ""}</span>
        {s?.concentration && (
          <span className="tag conc" title="Concentration: you can keep only one such spell going; taking damage means a CON save to keep it.">
            Concentration
          </span>
        )}
        {s?.ritual && (
          <span className="tag" title="Ritual: you can cast it 10 minutes slower without using a spell slot.">
            Ritual
          </span>
        )}
        {r.granted && (
          <span className="tag granted" title={`Granted by ${r.source}${r.note ? ` · ${r.note}` : ""}. Doesn't count against your limits.`}>
            {r.source}
          </span>
        )}
        <span className="spell-chev" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="spell-row-body">
        {s ? (
          <>
            <p>
              <SpellDice text={s.desc} r={r} d={d} />
            </p>
            <p className="muted">
              {s.school} · {castingTimeLabel(s.time)} · {s.range} · {s.components}
              {s.material ? ` (${s.material})` : ""} · {s.duration}
              {s.save ? ` · ${s.save} save DC ${r.dc}` : ""}
              {s.attack && (
                <>
                  {" · spell attack "}
                  <AttackChip r={r} d={d} />
                </>
              )}
              {s.book !== core ? ` · ${s.book}` : ""}
            </p>
            {r.granted && r.note && <p className="muted">{r.note}</p>}
          </>
        ) : (
          <p className="muted">DC {r.dc}, attack {signed(r.atk)}.</p>
        )}
      </div>
    </details>
  );
}

// ---------- "Learn or change": the full class list with tick boxes ----------
function LearnSpells({ c, d, set, core, always }: { c: Character; d: Derived; set: TabProps<Character, Derived>["set"]; core: string; always: SpellRow[] }) {
  const classSpells = d.rules.spells.filter((s) => d.onList(s));
  const wizard = !!d.spell?.spellbook;
  const [query, setQuery] = useState("");
  const [onlyChosen, setOnlyChosen] = useState(false);
  const alwaysNames = new Set(always.map((r) => r.name));
  const matches = (s: Spell) =>
    (!query || `${s.name} ${s.school} ${s.desc}`.toLowerCase().includes(query.toLowerCase())) &&
    (!onlyChosen || c.cantrips.includes(s.name) || c.prepared.includes(s.name) || c.spellbook.includes(s.name));
  const toggle = (s: Spell) => {
    if (s.level === 0) {
      const on = c.cantrips.includes(s.name);
      set({ cantrips: on ? c.cantrips.filter((n) => n !== s.name) : [...c.cantrips, s.name] });
    } else {
      const on = c.prepared.includes(s.name);
      set({ prepared: on ? c.prepared.filter((n) => n !== s.name) : [...c.prepared, s.name] });
    }
  };
  const toggleBook = (s: Spell) => {
    const on = c.spellbook.includes(s.name);
    set(on ? { spellbook: c.spellbook.filter((n) => n !== s.name), prepared: c.prepared.filter((n) => n !== s.name) } : { spellbook: [...c.spellbook, s.name] });
  };
  const levels = Array.from({ length: d.maxSpellLevel + 1 }, (_, i) => i);
  const { hover, bind } = useHover<string>();
  const hs = hover ? d.rules.getSpell(hover) : undefined;
  const mine = hs ? (hs.level === 0 ? c.cantrips : c.prepared).map((n) => d.rules.getSpell(n)).filter((x): x is Spell => !!x && x.level === hs.level && x.name !== hs.name) : [];
  const panel = hs ? (
    <div className="preview-card">
      <PreviewHead title={hs.name} previewing={!(hs.level === 0 ? c.cantrips : c.prepared).includes(hs.name)} />
      <div className="spell-compare-head">
        <span className="spell-chip">{hs.level === 0 ? "C" : hs.level}</span>
        <span className="spell-row-meta">{shortMeta(hs, c.level, d.spellDc, d.spellAttack)}</span>
      </div>
      <p className="small-text">{hs.desc}</p>
      <p className="muted small-text">
        {castingTimeLabel(hs.time)} · {hs.range} · {hs.components} · {hs.duration}
        {hs.concentration ? " · Concentration" : ""}
      </p>
      <span className="hero-label">{mine.length ? `Compared with your other ${hs.level === 0 ? "cantrips" : `${levelLabel(hs.level)} spells`}` : `Your first ${hs.level === 0 ? "cantrip" : `${levelLabel(hs.level)} spell`}`}</span>
      {mine.length > 0 && (
        <ul className="change-list">
          {mine.map((m) => (
            <li key={m.name} className="change info">
              <span className="change-label">{m.name}</span>
              <span className="change-val">{shortMeta(m, c.level, d.spellDc, d.spellAttack)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    <div className="preview-card">
      <PreviewHead title="Pick your spells" previewing={false} empty />
      <p className="muted small-text">Hover a spell to see it at your level, next to the spells you've already picked.</p>
    </div>
  );

  return (
    <>
      <div className="spell-filter">
        <input type="search" placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search spells" />
        <label className="check">
          <input type="checkbox" checked={onlyChosen} onChange={(e) => setOnlyChosen(e.target.checked)} /> Only chosen
        </label>
      </div>
      <WithPreview panel={panel}>
      {levels.map((lvl) => {
        const list = classSpells.filter((s) => s.level === lvl && matches(s));
        if (!list.length) return null;
        const isCantrip = lvl === 0;
        const chosen = isCantrip ? c.cantrips : c.prepared;
        const full = isCantrip ? c.cantrips.length >= d.cantripLimit : c.prepared.length >= d.preparedLimit;
        return (
          <Card key={lvl} todo={isCantrip ? "cantrips" : `spells-${lvl}`} title={isCantrip ? "Cantrips" : `${levelLabel(lvl)} spells`} aside={!isCantrip && <span className="muted">{d.slots[lvl - 1] || "no"} slots</span>}>
            <ul className="spell-list">
              {list.map((s) => {
                const on = chosen.includes(s.name);
                const isAlways = alwaysNames.has(s.name) && !on;
                const inBook = c.spellbook.includes(s.name);
                const bookFull = c.spellbook.length >= d.spellbookLimit;
                if (wizard && !isCantrip)
                  return (
                    <li key={s.name} className={`${inBook ? "on" : ""}`} {...bind(s.name)}>
                      <label className="spell-pick">
                        <input type="checkbox" checked={inBook} disabled={!inBook && bookFull} onChange={() => toggleBook(s)} aria-label={`${s.name} in spellbook`} />
                        <SpellLine s={s} level={c.level} dc={d.spellDc} atk={d.spellAttack} core={core} />
                      </label>
                      {inBook && (
                        <label className="check small">
                          <input type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(s)} /> Prepared
                        </label>
                      )}
                    </li>
                  );
                return (
                  <li key={s.name} className={`${on ? "on" : ""} ${isAlways ? "granted" : ""}`} {...bind(s.name)}>
                    <label className="spell-pick">
                      <input type="checkbox" checked={on} disabled={isAlways || (!on && full)} onChange={() => toggle(s)} />
                      <SpellLine s={s} level={c.level} dc={d.spellDc} atk={d.spellAttack} core={core} />
                    </label>
                    {isAlways && <span className="pill">Already granted</span>}
                    {d.expandedSpells.includes(s.name) && <span className="pill">Patron</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      </WithPreview>
      {d.maxSpellLevel < 3 && <p className="muted center">Higher-level spells unlock as you level up.</p>}
    </>
  );
}

function SpellLine({ s, level, dc, atk, core }: { s: Spell; level: number; dc: number; atk: number; core: string }) {
  const dmg = s.level === 0 ? cantripDamage(s, level) : s.damage;
  return (
    <span className="spell-line">
      <span className="spell-name">
        {s.name}
        {s.concentration && <abbr title="Concentration">C</abbr>}
        {s.ritual && <abbr title="Ritual">R</abbr>}
        {s.costly && <abbr title={`Needs ${s.costly.item}`}>$</abbr>}
        {s.book !== core && <abbr title={`From ${s.book}`}>{s.book}</abbr>}
        {s.listBook && s.sorcerer && <abbr title={`On the sorcerer list via ${s.listBook}`}>{s.listBook}</abbr>}
      </span>
      <span className="spell-meta">
        {s.school} · {castingTimeLabel(s.time)} · {s.range} · {s.components} · {s.duration}
        {s.save ? ` · ${s.save} save DC ${dc}` : s.attack ? ` · attack ${signed(atk)}` : ""}
        {dmg ? ` · ${dmg}` : ""}
      </span>
      <span className="spell-desc">{s.desc}</span>
    </span>
  );
}
