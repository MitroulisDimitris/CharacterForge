import { ABILITIES, ABILITY_NAMES, signed } from "../data/core";
import type { Character } from "../character";
import type { Derived } from "../derive";

export function Summary({ c, d }: { c: Character; d: Derived }) {
  return (
    <div className="summary">
      <div className="stat-row">
        <Stat label="Armor Class" value={d.ac} title={d.acNote} big />
        <Stat label="Hit Points" value={d.hpMax} title={d.hpExtras.join(", ") || undefined} big />
        <Stat label="Initiative" value={signed(d.initiative)} />
        <Stat label="Speed" value={`${d.speed} ft`} />
        <Stat label="Prof. Bonus" value={signed(d.pb)} />
      </div>

      <div className="abilities-grid">
        {ABILITIES.map((a) => (
          <div className="ability" key={a} title={ABILITY_NAMES[a]}>
            <span className="ability-name">{a}</span>
            <span className="ability-mod">{signed(d.mods[a])}</span>
            <span className="ability-score">{d.scores[a]}</span>
          </div>
        ))}
      </div>

      <div className="spell-strip">
        <div>
          <span className="muted">Spell DC</span>
          <strong>{d.caster ? d.spellDc : "—"}</strong>
        </div>
        <div>
          <span className="muted">Spell Attack</span>
          <strong>{d.caster ? signed(d.spellAttack) : "—"}</strong>
        </div>
        {d.cls.sorcery ? (
          <div>
            <span className="muted">Sorcery Pts</span>
            <strong>{d.sorceryPoints}</strong>
          </div>
        ) : (
          <div>
            <span className="muted">Hit Die</span>
            <strong>d{d.cls.hitDie}</strong>
          </div>
        )}
        <div>
          <span className="muted">Slots</span>
          <strong>{d.slots.filter(Boolean).length ? d.slots.map((n, i) => (n ? `${n}×${i + 1}` : "")).filter(Boolean).join(" ") + (d.pact ? " (pact)" : "") : "—"}</strong>
        </div>
      </div>

      <h4>Saving Throws</h4>
      <ul className="mini-list cols-2">
        {d.saves.map((s) => (
          <li key={s.ability} className={s.proficient ? "prof" : ""}>
            <span className="dot" />
            <span>{ABILITY_NAMES[s.ability]}</span>
            <strong>{signed(s.bonus)}</strong>
          </li>
        ))}
      </ul>

      <h4>Skills</h4>
      <ul className="mini-list">
        {d.skills.map((s) => (
          <li key={s.id} className={s.proficient ? "prof" : ""} title={s.sources.join(", ")}>
            <span className="dot" />
            <span>
              {s.name} <small className="muted">{s.ability}</small>
              {s.expert && <small className="pill" title="Expertise: double proficiency">E</small>}
            </span>
            <strong>{signed(s.bonus)}</strong>
          </li>
        ))}
      </ul>

      <h4>Senses & Defenses</h4>
      <dl className="kv">
        <dt>Passive Perception</dt>
        <dd>{d.passivePerception}</dd>
        <dt>Passive Insight</dt>
        <dd>{d.passiveInsight}</dd>
        <dt>Passive Investigation</dt>
        <dd>{d.passiveInvestigation}</dd>
        {d.darkvision > 0 && (
          <>
            <dt>Darkvision</dt>
            <dd>{d.darkvision} ft</dd>
          </>
        )}
        {d.resistances.length > 0 && (
          <>
            <dt>Resistances</dt>
            <dd>{d.resistances.join(", ")}</dd>
          </>
        )}
        {d.immunities.length > 0 && (
          <>
            <dt>Immunities</dt>
            <dd>{d.immunities.join(", ")}</dd>
          </>
        )}
        <dt>Hit Dice</dt>
        <dd>{d.hitDice}</dd>
        <dt>Languages</dt>
        <dd>{c.languages.join(", ") || "—"}</dd>
      </dl>
    </div>
  );
}

function Stat({ label, value, title, big }: { label: string; value: string | number; title?: string; big?: boolean }) {
  return (
    <div className={`stat ${big ? "big" : ""}`} title={title}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
