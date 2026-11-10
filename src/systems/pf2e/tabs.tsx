import { useState } from "react";
import type { TabProps } from "../types";
import { newItemIdPF2, type CharacterPF2 } from "./character";
import type { DerivedPF2 } from "./derive";
import {
  ANCESTRIES,
  ATTRS,
  ATTR_NAMES,
  BACKGROUNDS_PF2,
  BLOODLINES,
  GEAR_PF2,
  GENERAL_FEATS_PF2,
  LANGUAGES_PF2,
  RANK_LETTER,
  RANK_NAMES,
  SKILLS_PF2,
  SORCERER_PF2,
  SPELLS_PF2,
  VERSATILE_HERITAGES,
  dmgAt,
  skillNamePF2,
  type Attr,
} from "./data";
import { Card, ChipPicker, Counter, Field, Select } from "../../components/ui";

type P = TabProps<CharacterPF2, DerivedPF2>;
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const AON = "https://2e.aonprd.com/";

/** Pick N distinct attributes. */
function BoostPicker({ value, count, onChange, locked = [] }: { value: Attr[]; count: number; onChange: (v: Attr[]) => void; locked?: Attr[] }) {
  return (
    <ChipPicker<Attr>
      options={ATTRS.map((a) => ({ value: a, label: ATTR_NAMES[a], sub: "+1" }))}
      selected={value.filter((a) => !locked.includes(a))}
      max={count}
      locked={locked}
      lockedLabel="already boosted"
      onChange={onChange}
    />
  );
}

export function AncestryTab({ c, d, set }: P) {
  const a = d.ancestry;
  return (
    <div className="stack">
      <Card title="Ancestry">
        <div className="option-grid">
          {ANCESTRIES.map((x) => (
            <button
              type="button"
              key={x.id}
              className={`option ${c.ancestry === x.id ? "on" : ""}`}
              aria-pressed={c.ancestry === x.id}
              onClick={() => set({ ancestry: x.id, heritage: VERSATILE_HERITAGES.some((h) => h.id === c.heritage) ? c.heritage : x.heritages[0].id, ancestryFree: [], heritageSkill: "" })}
            >
              <strong>
                {x.name} <span className="pill">{x.book === "PC" ? "Player Core" : "Player Core 2"}</span>
              </strong>
              <span>
                {x.hp} HP · {x.size} · {x.speed} ft · {x.vision === "normal" ? "normal vision" : x.vision}
              </span>
              <small className="muted">
                Boosts: {[...x.boosts, ...Array(x.freeBoosts).fill("free")].join(", ")}
                {x.flaw ? ` · Flaw: ${x.flaw}` : ""}
              </small>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Ancestry boosts">
        <label className="check">
          <input type="checkbox" checked={c.altBoosts} onChange={(e) => set({ altBoosts: e.target.checked, ancestryFree: [] })} /> Use two free boosts and no flaw instead
        </label>
        {!c.altBoosts && a.boosts.length > 0 && <p className="muted">Fixed: {a.boosts.map((b) => ATTR_NAMES[b]).join(", ")}{a.flaw ? `. Flaw: ${ATTR_NAMES[a.flaw]}` : ""}.</p>}
        <BoostPicker value={c.ancestryFree} count={c.altBoosts ? 2 : a.freeBoosts} locked={c.altBoosts ? [] : a.boosts} onChange={(ancestryFree) => set({ ancestryFree })} />
      </Card>

      <Card title="Heritage">
        <h4>{a.name} heritages</h4>
        <div className="option-grid compact">
          {a.heritages.map((h) => (
            <button type="button" key={h.id} className={`option ${c.heritage === h.id ? "on" : ""}`} aria-pressed={c.heritage === h.id} onClick={() => set({ heritage: h.id })}>
              <strong>{h.name}</strong>
              <span>{h.text}</span>
            </button>
          ))}
        </div>
        <h4>Versatile heritages</h4>
        <div className="option-grid compact">
          {VERSATILE_HERITAGES.map((h) => (
            <button type="button" key={h.id} className={`option ${c.heritage === h.id ? "on" : ""}`} aria-pressed={c.heritage === h.id} onClick={() => set({ heritage: h.id })}>
              <strong>
                {h.name} <span className="pill">{h.book === "PC" ? "Player Core" : "Player Core 2"}</span>
              </strong>
              <span>{h.text}</span>
            </button>
          ))}
        </div>
        {d.heritage?.skillChoice && (
          <div className="grid-3">
            <Field label="Skilled Human: trained skill">
              <Select value={c.heritageSkill} options={[{ value: "", label: "Choose…" }, ...SKILLS_PF2.map((s) => ({ value: s.id, label: s.name }))]} onChange={(heritageSkill) => set({ heritageSkill })} />
            </Field>
          </div>
        )}
        {d.heritage?.generalFeat && (
          <div className="grid-3">
            <Field label="Versatile Human: general feat" hint={GENERAL_FEATS_PF2.find((f) => f.id === c.heritageFeat)?.text}>
              <Select value={c.heritageFeat} options={GENERAL_FEATS_PF2.filter((f) => f.id !== "other").map((f) => ({ value: f.id, label: f.name }))} onChange={(heritageFeat) => set({ heritageFeat })} />
            </Field>
          </div>
        )}
      </Card>

      <Card title="Languages" aside={<Counter count={c.languages.length} max={d.languageLimit} label="Known" />}>
        <p className="muted">Common plus your ancestry's languages, and one more per point of Intelligence modifier. Check your ancestry's entry for its exact languages.</p>
        <ChipPicker options={LANGUAGES_PF2.map((l) => ({ value: l, label: l }))} selected={c.languages} max={99} onChange={(languages) => set({ languages })} />
      </Card>
    </div>
  );
}

export function BackgroundTabPF2({ c, d, set }: P) {
  const bg = d.bg;
  return (
    <div className="stack">
      <Card title="Background" aside={<span className="muted">Player Core</span>}>
        <div className="option-grid">
          {BACKGROUNDS_PF2.map((b) => (
            <button type="button" key={b.id} className={`option ${c.background === b.id ? "on" : ""}`} aria-pressed={c.background === b.id} onClick={() => set({ background: b.id, bgBoost: b.boosts.includes("CHA") ? "CHA" : b.boosts[0], bgSkill: "", bgLore: "" })}>
              <strong>{b.name}</strong>
              <span>
                {b.boosts.join(" or ")} + free · {b.skills.length ? b.skills.map(skillNamePF2).join(", ") : (b.skillChoice ?? []).map(skillNamePF2).join(" or ")}
              </span>
              <small className="muted">
                {b.lore} · {b.feat}
              </small>
            </button>
          ))}
        </div>
      </Card>
      <Card title={`${bg.name} choices`}>
        <div className="grid-3">
          <Field label="Boost (one of two)">
            <Select<Attr> value={d.bgBoost} options={bg.boosts.map((a) => ({ value: a, label: ATTR_NAMES[a], disabled: a === c.bgFree }))} onChange={(bgBoost) => set({ bgBoost })} />
          </Field>
          <Field label="Free boost">
            <Select<Attr> value={c.bgFree} options={ATTRS.map((a) => ({ value: a, label: ATTR_NAMES[a], disabled: a === d.bgBoost }))} onChange={(bgFree) => set({ bgFree })} />
          </Field>
          {bg.skillChoice && (
            <Field label="Trained skill">
              <Select value={c.bgSkill} options={[{ value: "", label: "Choose…" }, ...bg.skillChoice.map((s) => ({ value: s, label: skillNamePF2(s) }))]} onChange={(bgSkill) => set({ bgSkill })} />
            </Field>
          )}
          <Field label="Lore skill" hint="Rename it if your background lets you choose (e.g. a city or terrain).">
            <input value={c.bgLore} onChange={(e) => set({ bgLore: e.target.value })} placeholder={bg.lore} />
          </Field>
        </div>
        <dl className="kv wide">
          <dt>Skill feat</dt>
          <dd>
            {bg.feat}
            {bg.featText ? ` — ${bg.featText}` : ""}
          </dd>
        </dl>
      </Card>
    </div>
  );
}

export function ClassTabPF2({ c, d, set }: P) {
  const bl = d.bloodline;
  return (
    <div className="stack">
      <Card title="Sorcerer (Player Core 2)" aside={<span className="muted">6 HP + CON per level · Key attribute Charisma</span>}>
        <table className="level-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Features & feats</th>
              <th>Slots (cantrips / 1 / 2 / 3)</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((l) => (
              <tr key={l} className={l === c.level ? "current" : l > c.level ? "future" : ""}>
                <td>{l}</td>
                <td>
                  {[
                    ...SORCERER_PF2.features.filter((f) => f.level === l).map((f) => f.name),
                    l === 1 ? "Ancestry feat" : "",
                    l === 2 || l === 4 ? "Sorcerer feat, Skill feat" : "",
                    l === 3 ? "General feat, Skill increase" : "",
                    l === 5 ? "Attribute boosts, Ancestry feat, Skill increase" : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </td>
                <td>{SORCERER_PF2.slots[l].join(" / ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Bloodline">
        <div className="option-grid">
          {BLOODLINES.map((b) => (
            <button type="button" key={b.id} className={`option ${c.bloodline === b.id ? "on" : ""}`} aria-pressed={c.bloodline === b.id} onClick={() => set({ bloodline: b.id, bloodlineOption: "" })}>
              <strong>{b.name}</strong>
              <span>
                {b.tradition ? `${b.tradition[0].toUpperCase()}${b.tradition.slice(1)}` : "Tradition by choice"} · {b.skills.map(skillNamePF2).join(", ")}
              </span>
              <small className="muted">Focus: {b.focus.name}</small>
            </button>
          ))}
        </div>
        {bl.options && (
          <div className="grid-3">
            <Field label={bl.optionLabel ?? "Option"}>
              <Select value={c.bloodlineOption} options={[{ value: "", label: "Choose…" }, ...bl.options.map((o) => ({ value: o.id, label: `${o.name}${o.tradition ? ` (${o.tradition})` : ""}` }))]} onChange={(bloodlineOption) => set({ bloodlineOption })} />
            </Field>
          </div>
        )}
        <dl className="kv wide">
          <dt>Tradition</dt>
          <dd>{d.tradition ?? "—"}</dd>
          <dt>Trained skills</dt>
          <dd>{d.bloodlineSkills.map(skillNamePF2).join(", ")}</dd>
          <dt>Gifted spells</dt>
          <dd>{Object.entries(d.gifts).map(([r, n]) => `${r === "0" ? "cantrip" : `rank ${r}`}: ${n}`).join(" · ")}</dd>
          <dt>Focus spell</dt>
          <dd>
            {bl.focus.name} ({bl.focus.actions} action{bl.focus.actions === "1" ? "" : "s"}): {bl.focus.text}
          </dd>
          <dt>Blood magic</dt>
          <dd>{bl.bloodMagic}</dd>
        </dl>
      </Card>
    </div>
  );
}

export function AttributesTab({ c, d, set }: P) {
  return (
    <div className="stack">
      <Card title="Attribute modifiers">
        <table className="ability-table">
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Modifier</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            {ATTRS.map((a) => (
              <tr key={a}>
                <td>
                  <strong>{ATTR_NAMES[a]}</strong>
                </td>
                <td>
                  <strong>{signed(d.mods[a])}</strong>
                  {d.partial.has(a) && <small className="muted"> (partial boost)</small>}
                </td>
                <td className="muted">{d.sources[a].join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Each boost adds +1. At 5th level, a boost to a modifier of +4 or more is a partial boost: two of them add +1.</p>
      </Card>
      <Card title="Level 1: four free boosts" aside={<Counter count={c.boosts1.length} max={4} label="Chosen" />}>
        <BoostPicker value={c.boosts1} count={4} onChange={(boosts1) => set({ boosts1 })} />
      </Card>
      <Card title="Level 5: four free boosts" aside={c.level < 5 ? <span className="muted">Unlocks at level 5</span> : <Counter count={c.boosts5.length} max={4} label="Chosen" />}>
        <BoostPicker value={c.boosts5} count={4} onChange={(boosts5) => set({ boosts5 })} />
      </Card>
    </div>
  );
}

export function SkillsTabPF2({ c, d, set }: P) {
  const trained = d.skills.filter((s) => s.rank > 0).map((s) => s.id);
  const otherTrained = d.skills.filter((s) => s.rank > 0 && !s.sources.includes("Sorcerer")).map((s) => s.id);
  return (
    <div className="stack">
      <Card title="Sorcerer skills" aside={<Counter count={c.classSkills.length} max={d.classSkillCount} label="Chosen" />}>
        <p className="muted">Trained in 2 + your Intelligence modifier more skills.</p>
        <ChipPicker
          options={SKILLS_PF2.map((s) => ({ value: s.id, label: s.name }))}
          selected={c.classSkills}
          max={d.classSkillCount}
          locked={otherTrained.filter((s) => !c.classSkills.includes(s))}
          lockedLabel="trained already"
          onChange={(classSkills) => set({ classSkills })}
        />
      </Card>
      <Card title="Skill increases">
        <div className="grid-3">
          <Field label="Level 3 (trained → expert)">
            <Select value={c.skillIncrease3} options={[{ value: "", label: c.level >= 3 ? "Choose…" : "Unlocks at 3" }, ...trained.map((s) => ({ value: s, label: skillNamePF2(s) }))]} onChange={(skillIncrease3) => set({ skillIncrease3 })} />
          </Field>
          <Field label="Level 5 (trained → expert)">
            <Select value={c.skillIncrease5} options={[{ value: "", label: c.level >= 5 ? "Choose…" : "Unlocks at 5" }, ...trained.filter((s) => s !== c.skillIncrease3).map((s) => ({ value: s, label: skillNamePF2(s) }))]} onChange={(skillIncrease5) => set({ skillIncrease5 })} />
          </Field>
        </div>
      </Card>
      <Card title="All skills">
        <table className="skill-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Attr</th>
              <th>Proficiency</th>
              <th>Total</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            {d.skills.map((s) => (
              <tr key={s.id} className={s.rank ? "prof" : ""}>
                <td>
                  <span className="dot" /> {s.name}
                </td>
                <td className="muted">{s.attr}</td>
                <td>{RANK_NAMES[s.rank]}</td>
                <td>
                  <strong>{signed(s.total)}</strong>
                </td>
                <td className="muted">{s.sources.join(", ")}</td>
              </tr>
            ))}
            <tr className="prof">
              <td>
                <span className="dot" /> {d.lore.name}
              </td>
              <td className="muted">INT</td>
              <td>Trained</td>
              <td>
                <strong>{signed(d.lore.total)}</strong>
              </td>
              <td className="muted">{d.bg.name}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function FeatsTabPF2({ c, d, set }: P) {
  const general = GENERAL_FEATS_PF2.find((f) => f.id === c.generalFeat3);
  const text = (label: string, key: keyof CharacterPF2, lvl: number, hint: string) => (
    <Field label={`${label} (level ${lvl})`} hint={c.level < lvl ? `Unlocks at level ${lvl}` : hint}>
      <input value={c[key] as string} disabled={c.level < lvl} onChange={(e) => set({ [key]: e.target.value } as Partial<CharacterPF2>)} placeholder="Type the feat's name" />
    </Field>
  );
  return (
    <div className="stack">
      <Card title="Feats" aside={<a className="link" href={`${AON}Feats.aspx`} target="_blank" rel="noreferrer">Browse feats on Archives of Nethys ↗</a>}>
        <p className="muted">Ancestry, class and skill feats are typed in by name; this app doesn't include their full rules yet. General feats with simple effects are applied automatically.</p>
        <div className="grid-2">
          {text("Ancestry feat", "ancestryFeat1", 1, `A 1st-level ${d.ancestry.name}${d.versatile ? ` or ${d.heritage?.name.split(" (")[0]}` : ""} feat`)}
          <Field label="Background skill feat (level 1)">
            <input value={d.bg.feat} disabled />
          </Field>
          {text("Sorcerer feat", "classFeat2", 2, "A sorcerer feat of level 2 or lower")}
          {text("Skill feat", "skillFeat2", 2, "A skill feat for a skill you're trained in")}
          <Field label="General feat (level 3)" hint={c.level < 3 ? "Unlocks at level 3" : general?.text}>
            <Select value={c.generalFeat3} options={GENERAL_FEATS_PF2.map((f) => ({ value: f.id, label: f.name }))} onChange={(generalFeat3) => set({ generalFeat3 })} />
          </Field>
          {c.generalFeat3 === "other" && (
            <Field label="General feat name">
              <input value={c.generalFeatOther} onChange={(e) => set({ generalFeatOther: e.target.value })} />
            </Field>
          )}
          {(c.generalFeat3 === "cannyAcumen" || c.heritageFeat === "cannyAcumen") && (
            <Field label="Canny Acumen: become expert in">
              <Select value={c.cannyAcumen} options={[{ value: "fort", label: "Fortitude" }, { value: "ref", label: "Reflex" }, { value: "will", label: "Will" }, { value: "perception", label: "Perception" }]} onChange={(cannyAcumen) => set({ cannyAcumen })} />
            </Field>
          )}
          {text("Sorcerer feat", "classFeat4", 4, "A sorcerer feat of level 4 or lower")}
          {text("Skill feat", "skillFeat4", 4, "A skill feat")}
          {text("Ancestry feat", "ancestryFeat5", 5, "An ancestry feat of level 5 or lower")}
        </div>
      </Card>
    </div>
  );
}

export function SpellsTabPF2({ c, d, set }: P) {
  const [query, setQuery] = useState("");
  const toggle = (name: string, rank: number) => {
    if (rank === 0) set({ cantrips: c.cantrips.includes(name) ? c.cantrips.filter((n) => n !== name) : [...c.cantrips, name] });
    else set({ spells: c.spells.includes(name) ? c.spells.filter((n) => n !== name) : [...c.spells, name], signature: c.signature.filter((n) => n !== name) });
  };
  const toggleSig = (name: string) => set({ signature: c.signature.includes(name) ? c.signature.filter((n) => n !== name) : [...c.signature, name] });
  return (
    <div className="stack">
      <Card title="Spellcasting" aside={<span className="muted">{d.tradition ? `${d.tradition} tradition` : "Choose a bloodline option"} · Charisma</span>}>
        <div className="spell-stats">
          <div>
            <strong>{d.spellDc}</strong>
            <span>Spell DC</span>
          </div>
          <div>
            <strong>{signed(d.spellAttack)}</strong>
            <span>Spell attack</span>
          </div>
          <div>
            <strong>{d.slots.slice(1).join(" / ") || "—"}</strong>
            <span>Slots per rank</span>
          </div>
          <div>
            <strong>{d.cantripRank}</strong>
            <span>Cantrip rank</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Focus Point</span>
          </div>
        </div>
      </Card>
      <Card title="Bloodline gifts & focus spell" aside={<span className="muted">Always in your repertoire</span>}>
        <ul className="spell-list">
          {d.repertoire
            .filter((r) => r.gift)
            .map((r) => (
              <li key={r.name}>
                <span className="spell-pick">
                  <span className="granted-mark">◆</span>
                  <span className="spell-line">
                    <span className="spell-name">
                      {r.name} <span className="pill">{r.rank === 0 ? "cantrip" : `rank ${r.rank}`}</span>
                    </span>
                    <span className="spell-desc">
                      {r.spell ? `${[`${r.spell.actions} actions`, r.spell.range, r.spell.defense !== "—" ? r.spell.defense : "", r.damage ?? ""].filter(Boolean).join(" · ")} — ${r.spell.desc}` : "See this spell on Archives of Nethys."}
                    </span>
                  </span>
                </span>
                {c.level >= 3 && r.rank > 0 && (
                  <label className="check">
                    <input type="checkbox" checked={c.signature.includes(r.name)} onChange={() => toggleSig(r.name)} /> Signature
                  </label>
                )}
              </li>
            ))}
          <li>
            <span className="spell-pick">
              <span className="granted-mark">◆</span>
              <span className="spell-line">
                <span className="spell-name">
                  {d.bloodline.focus.name} <span className="pill">focus</span>
                </span>
                <span className="spell-desc">{d.bloodline.focus.text}</span>
              </span>
            </span>
          </li>
        </ul>
      </Card>
      <div className="spell-filter">
        <input type="search" placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search spells" />
      </div>
      {d.slots.map((_, rank) => {
        const list = SPELLS_PF2.filter((s) => s.rank === rank && (!d.tradition || s.traditions.includes(d.tradition)) && (!query || `${s.name} ${s.desc}`.toLowerCase().includes(query.toLowerCase())));
        const chosen = rank === 0 ? c.cantrips.length : c.spells.filter((n) => SPELLS_PF2.find((s) => s.name === n)?.rank === rank).length;
        const limit = d.chosenLimit[rank];
        return (
          <Card key={rank} title={rank === 0 ? "Cantrips" : `Rank ${rank}`} aside={<Counter count={chosen} max={limit} label="Chosen" />}>
            <ul className="spell-list">
              {list.map((s) => {
                const on = rank === 0 ? c.cantrips.includes(s.name) : c.spells.includes(s.name);
                const gift = Object.values(d.gifts).includes(s.name);
                return (
                  <li key={s.name} className={`${on ? "on" : ""} ${gift ? "granted" : ""}`}>
                    <label className="spell-pick">
                      <input type="checkbox" checked={on} disabled={gift || (!on && chosen >= limit)} onChange={() => toggle(s.name, rank)} />
                      <span className="spell-line">
                        <span className="spell-name">{s.name}</span>
                        <span className="spell-meta">
                          {s.actions} action{s.actions === "1" ? "" : "s"} · {s.range}{s.defense !== "—" ? ` · ${s.defense}` : ""}
                          {s.duration ? ` · ${s.duration}` : ""}
                          {s.dmg ? ` · ${dmgAt(s, rank === 0 ? d.cantripRank : rank)}` : ""} · {s.traditions.join(", ")}
                        </span>
                        <span className="spell-desc">{s.desc}</span>
                      </span>
                    </label>
                    {on && rank > 0 && c.level >= 3 && (
                      <label className="check">
                        <input type="checkbox" checked={c.signature.includes(s.name)} onChange={() => toggleSig(s.name)} /> Signature
                      </label>
                    )}
                    {gift && <span className="pill">Gifted</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      <p className="muted center">
        Only the most common Player Core spells are listed. <a className="link" href={`${AON}Spells.aspx`} target="_blank" rel="noreferrer">See all spells ↗</a>
      </p>
    </div>
  );
}

export function EquipmentTabPF2({ c, d, set }: P) {
  const [preset, setPreset] = useState(GEAR_PF2[0].name);
  const setItems = (inventory: CharacterPF2["inventory"]) => set({ inventory });
  const update = (id: string, patch: Partial<CharacterPF2["inventory"][number]>) => setItems(c.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div className="stack">
      <Card title="Strikes" aside={<span className="muted">Attack shows first / second attack (multiple attack penalty)</span>}>
        <table className="attack-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Attack</th>
              <th>Damage</th>
              <th>Traits</th>
            </tr>
          </thead>
          <tbody>
            {d.strikes.map((s) => (
              <tr key={s.name}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{s.attack}</td>
                <td>{s.damage}</td>
                <td className="muted">{s.traits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Inventory" aside={<span className="muted">{d.bulkText(d.bulk)} Bulk · encumbered over {d.encumbered}, max {d.maxBulk}</span>}>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Bulk (each; L = 0.1)</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => (
              <tr key={i.id}>
                <td>
                  <input value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} aria-label="Item name" />
                </td>
                <td>
                  <input type="number" min={0} value={i.qty} onChange={(e) => update(i.id, { qty: Math.max(0, Number(e.target.value) || 0) })} aria-label="Quantity" />
                </td>
                <td>
                  <input type="number" min={0} step={0.1} value={i.bulk} onChange={(e) => update(i.id, { bulk: Math.max(0, Number(e.target.value) || 0) })} aria-label="Bulk" />
                </td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => setItems(c.inventory.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.name}`}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row-actions">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Common item">
            {GEAR_PF2.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.bulk === 0.1 ? "L" : g.bulk || "—"})
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost" onClick={() => setItems([...c.inventory, { id: newItemIdPF2(), name: preset, qty: 1, bulk: GEAR_PF2.find((g) => g.name === preset)!.bulk }])}>
            Add
          </button>
          <button type="button" className="btn ghost" onClick={() => setItems([...c.inventory, { id: newItemIdPF2(), name: "New item", qty: 1, bulk: 0 }])}>
            Add custom
          </button>
        </div>
      </Card>
      <Card title="Coins">
        <div className="coins">
          {(["cp", "sp", "gp", "pp"] as const).map((k) => (
            <label key={k} className="coin">
              <span>{k.toUpperCase()}</span>
              <input type="number" min={0} value={c.coins[k]} onChange={(e) => set({ coins: { ...c.coins, [k]: Math.max(0, Number(e.target.value) || 0) } })} />
            </label>
          ))}
        </div>
        <p className="muted">New 1st-level characters start with 15 GP. 1,000 coins are 1 Bulk.</p>
      </Card>
    </div>
  );
}

export function DetailsTabPF2({ c, set }: P) {
  const setD = (k: keyof CharacterPF2["details"], v: string) => set({ details: { ...c.details, [k]: v } });
  const short: [keyof CharacterPF2["details"], string][] = [
    ["deity", "Deity"],
    ["gender", "Gender / pronouns"],
    ["age", "Age"],
    ["height", "Height"],
    ["weight", "Weight"],
  ];
  const long: [keyof CharacterPF2["details"], string, number][] = [
    ["edicts", "Edicts", 2],
    ["anathema", "Anathema", 2],
    ["appearance", "Appearance", 3],
    ["personality", "Personality", 4],
    ["backstory", "Backstory", 6],
    ["allies", "Allies & organizations", 3],
    ["notes", "Notes", 3],
  ];
  return (
    <div className="stack">
      <Card title="Identity">
        <div className="grid-3">
          <Field label="Character name">
            <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Player name">
            <input value={c.playerName} onChange={(e) => set({ playerName: e.target.value })} />
          </Field>
          {short.map(([k, label]) => (
            <Field key={k} label={label}>
              <input value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
      <Card title="Story">
        <div className="grid-2">
          {long.map(([k, label, rows]) => (
            <Field key={k} label={label}>
              <textarea rows={rows} value={c.details[k]} onChange={(e) => setD(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function SummaryPF2({ d }: { c: CharacterPF2; d: DerivedPF2 }) {
  return (
    <div className="summary">
      <div className="stat-row">
        <div className="stat big">
          <strong>{d.ac}</strong>
          <span>Armor Class</span>
        </div>
        <div className="stat big">
          <strong>{d.hpMax}</strong>
          <span>Hit Points</span>
        </div>
        <div className="stat">
          <strong>{signed(d.perception)}</strong>
          <span>Perception</span>
        </div>
        <div className="stat">
          <strong>{d.speed} ft</strong>
          <span>Speed</span>
        </div>
        <div className="stat">
          <strong>{d.classDc}</strong>
          <span>Class DC</span>
        </div>
      </div>
      <div className="abilities-grid">
        {ATTRS.map((a) => (
          <div className="ability" key={a} title={ATTR_NAMES[a]}>
            <span className="ability-name">{a}</span>
            <span className="ability-mod">{signed(d.mods[a])}</span>
            <span className="ability-score">{d.partial.has(a) ? "partial" : "mod"}</span>
          </div>
        ))}
      </div>
      <div className="spell-strip">
        <div>
          <span className="muted">Spell DC</span>
          <strong>{d.spellDc}</strong>
        </div>
        <div>
          <span className="muted">Spell Attack</span>
          <strong>{signed(d.spellAttack)}</strong>
        </div>
        <div>
          <span className="muted">Focus</span>
          <strong>1</strong>
        </div>
        <div>
          <span className="muted">Slots</span>
          <strong>{d.slots.slice(1).join(" / ")}</strong>
        </div>
      </div>
      <h4>Saving Throws</h4>
      <ul className="mini-list">
        {d.saves.map((s) => (
          <li key={s.id} className="prof">
            <span className="dot" />
            <span>
              {s.name} <small className="muted">{RANK_LETTER[s.rank]}</small>
            </span>
            <strong>{signed(s.total)}</strong>
          </li>
        ))}
      </ul>
      <h4>Skills</h4>
      <ul className="mini-list">
        {d.skills.map((s) => (
          <li key={s.id} className={s.rank ? "prof" : ""}>
            <span className="dot" />
            <span>
              {s.name} <small className="muted">{RANK_LETTER[s.rank]}</small>
            </span>
            <strong>{signed(s.total)}</strong>
          </li>
        ))}
        <li className="prof">
          <span className="dot" />
          <span>
            {d.lore.name} <small className="muted">T</small>
          </span>
          <strong>{signed(d.lore.total)}</strong>
        </li>
      </ul>
      <h4>Senses</h4>
      <dl className="kv">
        <dt>Vision</dt>
        <dd>{d.vision}</dd>
        <dt>Size</dt>
        <dd>{d.ancestry.size}</dd>
        <dt>Ancestry HP</dt>
        <dd>{d.ancestryHp}</dd>
      </dl>
    </div>
  );
}
