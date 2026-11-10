import { useState } from "react";
import { ABILITY_NAMES, signed } from "../data/core";
import { castingTimeLabel, cantripDamage, levelLabel, type Spell } from "../data/spells";
import type { TabProps } from "../../types";
import type { Character } from "../character";
import type { Derived, SpellRow } from "../derive";
import { Card, Counter } from "../../../components/ui";

export function SpellsTab({ c, d, set }: TabProps<Character, Derived>) {
  const core = c.edition === "2014" ? "PHB14" : "PHB24";
  const classSpells = d.rules.spells.filter((s) => d.onList(s));
  const SP = d.spell;
  const wizard = !!SP?.spellbook;
  const [query, setQuery] = useState("");
  const [onlyChosen, setOnlyChosen] = useState(false);
  const always = d.spellRows.filter((r) => r.kind === "Always" || r.kind === "Innate");
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

  if (!d.caster) {
    return (
      <div className="stack">
        <Card title="Spellcasting">
          <p className="lead">
            {SP
              ? `${d.cls.name}s start casting spells at level ${SP.startLevel}.`
              : d.cls.subclasses.some((s) => s.spell)
                ? `${d.cls.name}s don't cast spells, except the ${d.cls.subclasses.filter((s) => s.spell).map((s) => s.name).join(" ")} (from level ${d.cls.subclassLevel}).`
                : `${d.cls.name}s don't cast spells.`}
            {d.spellRows.length ? " Spells from your race or feats are listed below." : ""}
          </p>
        </Card>
        {always.length > 0 && (
          <Card title="Granted spells (race & feats)">
            <ul className="spell-list">
              {always.map((r) => (
                <GrantedRow key={`${r.source}-${r.name}`} r={r} level={c.level} core={core} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }
  const howTo =
    SP?.label === "Known"
      ? `You know a fixed set of ${SP?.list ?? d.cls.name.toLowerCase()} spells: pick them carefully, you can swap only one when you gain a level.`
      : wizard
        ? "First write spells into your spellbook, then tick the ones you prepare today. You can change prepared spells after each Long Rest."
        : `You prepare spells from the whole ${d.cls.name.toLowerCase()} list after each Long Rest: pick today's set, you can change it tomorrow.`;

  const levels = Array.from({ length: d.maxSpellLevel + 1 }, (_, i) => i);

  return (
    <div className="stack">
      <Card title="Spellcasting" aside={<span className="muted">{ABILITY_NAMES[d.castAbility]} · {SP?.focus}</span>}>
        <p className="muted">{howTo}</p>
        <div className="spell-stats">
          <div>
            <strong>{d.spellDc}</strong>
            <span>Save DC</span>
          </div>
          <div>
            <strong>{signed(d.spellAttack)}</strong>
            <span>Spell attack</span>
          </div>
          <div>
            <strong>{d.slots.length ? d.slots.map((n, i) => (n ? `${n}×${i + 1}` : "")).filter(Boolean).join("  ") + (d.pact ? " (pact)" : "") : "—"}</strong>
            <span>Slots</span>
          </div>
          <div>
            <Counter count={c.cantrips.length} max={d.cantripLimit} label="Cantrips" />
            {wizard && <Counter count={c.spellbook.length} max={d.spellbookLimit} label="Spellbook" />}
            <Counter count={c.prepared.length} max={d.preparedLimit} label={d.spellsKind} />
          </div>
        </div>
      </Card>

      {always.length > 0 && (
        <Card title={c.edition === "2014" ? "Granted spells (subclass & race)" : "Always prepared & innate"} aside={<span className="muted">Don't count against your limits</span>}>
          <ul className="spell-list">
            {always.map((r) => (
              <GrantedRow key={`${r.source}-${r.name}`} r={r} level={c.level} core={core} />
            ))}
          </ul>
        </Card>
      )}

      <div className="spell-filter">
        <input type="search" placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search spells" />
        <label className="check">
          <input type="checkbox" checked={onlyChosen} onChange={(e) => setOnlyChosen(e.target.checked)} /> Only chosen
        </label>
      </div>

      {levels.map((lvl) => {
        const list = classSpells.filter((s) => s.level === lvl && matches(s));
        if (!list.length) return null;
        const isCantrip = lvl === 0;
        const chosen = isCantrip ? c.cantrips : c.prepared;
        const full = isCantrip ? c.cantrips.length >= d.cantripLimit : c.prepared.length >= d.preparedLimit;
        return (
          <Card key={lvl} title={isCantrip ? "Cantrips" : `${levelLabel(lvl)} spells`} aside={!isCantrip && <span className="muted">{d.slots[lvl - 1] || "no"} slots</span>}>
            <ul className="spell-list">
              {list.map((s) => {
                const on = chosen.includes(s.name);
                const isAlways = alwaysNames.has(s.name) && !on;
                const inBook = c.spellbook.includes(s.name);
                const bookFull = c.spellbook.length >= d.spellbookLimit;
                if (wizard && !isCantrip)
                  return (
                    <li key={s.name} className={`${inBook ? "on" : ""}`}>
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
                  <li key={s.name} className={`${on ? "on" : ""} ${isAlways ? "granted" : ""}`}>
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
      {d.maxSpellLevel < 3 && <p className="muted center">Higher-level spells unlock as you level up.</p>}
    </div>
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

function GrantedRow({ r, level, core }: { r: SpellRow; level: number; core: string }) {
  return (
    <li>
      <span className="spell-pick">
        <span className="granted-mark" aria-hidden="true">
          ◆
        </span>
        {r.spell ? (
          <SpellLine s={r.spell} level={level} dc={r.saveDc} atk={r.attackBonus} core={core} />
        ) : (
          <span className="spell-line">
            <span className="spell-name">{r.name}</span>
            <span className="spell-meta">Not in this app's spell list — check your book for details. DC {r.saveDc}, attack {signed(r.attackBonus)}.</span>
          </span>
        )}
      </span>
      <span className="pill">
        {r.source}
        {r.note ? ` · ${r.note}` : ""}
      </span>
    </li>
  );
}
