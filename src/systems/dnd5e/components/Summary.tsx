import { ABILITIES, ABILITY_NAMES, signed } from "../data/core";
import type { Character } from "../character";
import type { Derived } from "../derive";
import { EXHAUSTION } from "../../../live";
import { RollChip, useCanRoll, useDice } from "../../../components/Dice";
import { abilityCheck, attackRolls, classRolls, initiativeRoll, savingThrow, skillCheck, spellAttackRoll } from "../rollSpecs";

/** AC, speed, initiative, proficiency and the spell numbers: the top of the Sheet tab. */
export function SheetNumbers({ d }: { c: Character; d: Derived }) {
  const canRoll = useCanRoll();
  const dice = useDice();
  return (
    <section className={`summary sheet-numbers ${canRoll ? "rollable" : ""}`} aria-label="Key numbers">
      <div className="stat-row">
        <Stat label="Armor Class" value={d.ac} title={d.acNote} big />
        <Stat label="Speed" value={`${d.speed} ft`} title={d.exhaustion >= 2 ? `${d.baseSpeed} ft without exhaustion` : undefined} />
        <Stat label="Initiative" value={signed(d.initiative)} roll={canRoll ? () => dice?.roll(initiativeRoll(d)) : undefined} />
        <Stat label="Prof. Bonus" value={signed(d.pb)} />
      </div>
      {d.caster && (
        <div className="spell-line">
          <span>
            Spell save DC <strong>{d.spellDc}</strong>
          </span>
          <span>
            Spell attack{" "}
            <RollChip spec={() => spellAttackRoll(d, "", d.spellAttack, d.castAbility)} label={`Roll a spell attack, ${signed(d.spellAttack)}`} icon={false}>
              <strong>{signed(d.spellAttack)}</strong>
            </RollChip>
          </span>
        </div>
      )}
      {d.exhaustion > 0 && (
        <p className="exhaustion-note" role="note">
          <strong>Exhaustion {d.exhaustion}:</strong> {EXHAUSTION.slice(1, d.exhaustion + 1).join(" · ")}.
        </p>
      )}
    </section>
  );
}

export function Summary({ c, d, inSheet = false }: { c: Character; d: Derived; inSheet?: boolean }) {
  const canRoll = useCanRoll();
  const dice = useDice();
  return (
    <div className={`summary ${canRoll ? "rollable" : ""} ${inSheet ? "in-sheet" : ""}`}>
      {!inSheet && (
        <>
          <div className="stat-row">
            <Stat label="Armor Class" value={d.ac} title={d.acNote} big />
            <Stat label="Hit Points" value={d.hpMax} title={d.hpExtras.join(", ") || undefined} big />
            <Stat label="Initiative" value={signed(d.initiative)} roll={canRoll ? () => dice?.roll(initiativeRoll(d)) : undefined} />
            <Stat label="Speed" value={`${d.speed} ft`} title={d.exhaustion >= 2 ? `${d.baseSpeed} ft without exhaustion` : undefined} />
            <Stat label="Prof. Bonus" value={signed(d.pb)} />
          </div>
          <div className="spell-strip">
            <div>
              <span className="muted">Spell DC</span>
              <strong>{d.caster ? d.spellDc : "—"}</strong>
            </div>
            <div>
              <span className="muted">Spell Attack</span>
              <strong>
                {d.caster ? (
                  <RollChip spec={() => spellAttackRoll(d, "", d.spellAttack, d.castAbility)} label={`Roll a spell attack, ${signed(d.spellAttack)}`} icon={false}>
                    {signed(d.spellAttack)}
                  </RollChip>
                ) : (
                  "—"
                )}
              </strong>
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
          {d.exhaustion > 0 && (
            <p className="exhaustion-note" role="note">
              <strong>Exhaustion {d.exhaustion}:</strong> {EXHAUSTION.slice(1, d.exhaustion + 1).join(" · ")}.
            </p>
          )}
        </>
      )}

      <div className="abilities-head">
        <h4>Abilities &amp; saving throws</h4>
        <span className="muted prof">
          <span className="dot" /> proficient save
        </span>
      </div>
      <div className="abilities-grid">
        {ABILITIES.map((a) => {
          const save = d.saves.find((x) => x.ability === a);
          const inner = (
            <>
              <span className="ability-name">{a}</span>
              <span className="ability-mod">{signed(d.mods[a])}</span>
              <span className="ability-score">{d.scores[a]}</span>
            </>
          );
          return (
            <div className="ability" key={a}>
              {canRoll ? (
                <button type="button" className="ability-check roll-box" title={`Roll a ${ABILITY_NAMES[a]} check`} aria-label={`Roll a ${ABILITY_NAMES[a]} check, ${signed(d.mods[a])}`} onClick={() => dice?.roll(abilityCheck(d, a))}>
                  {inner}
                </button>
              ) : (
                <div className="ability-check" title={ABILITY_NAMES[a]}>
                  {inner}
                </div>
              )}
              {save && (
                <span className={`ability-save ${save.proficient ? "prof" : ""}`}>
                  <span className="dot" aria-hidden="true" />
                  <span>Save</span>
                  <RollChip spec={() => savingThrow(d, save)} label={`Roll a ${ABILITY_NAMES[a]} saving throw, ${signed(save.bonus)}${save.proficient ? " (proficient)" : ""}`} icon={false}>
                    <strong>{signed(save.bonus)}</strong>
                  </RollChip>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <h4>Skills</h4>
      <ul className="mini-list">
        {d.skills.map((s) => (
          <li key={s.id} className={s.proficient ? "prof" : ""} title={s.sources.join(", ")}>
            <span className="dot" />
            <span>
              {s.name} <small className="muted">{s.ability}</small>
              {s.expert && <small className="pill" title="Expertise: double proficiency">E</small>}
            </span>
            <RollChip spec={() => skillCheck(d, s)} label={`Roll ${s.name}, ${signed(s.bonus)}`} icon={false}>
              <strong>{signed(s.bonus)}</strong>
            </RollChip>
          </li>
        ))}
      </ul>

      {canRoll && d.attacks.length > 0 && (
        <>
          <h4>Attacks</h4>
          <ul className="attack-rolls">
            {d.attacks.map((a) => {
              const r = attackRolls(d, a);
              return (
                <li key={a.name}>
                  <span className="attack-rolls-name">{a.name}</span>
                  <span className="attack-rolls-chips">
                    {r.hit ? (
                      <RollChip spec={r.hit} label={`Roll ${a.name} attack, ${a.bonus} to hit`}>
                        {r.hitText} to hit
                      </RollChip>
                    ) : (
                      <span className="muted">{a.bonus}</span>
                    )}
                    {r.damage ? (
                      <RollChip spec={r.damage} fire={r.fire} label={`Roll ${a.name} damage, ${r.damageText}`}>
                        {r.damageText}
                      </RollChip>
                    ) : (
                      <span className="muted">{a.damage}</span>
                    )}
                    {r.alt && (
                      <RollChip spec={r.alt} label={`Roll ${a.name} damage with two hands, ${r.altText}`}>
                        {r.altText}
                      </RollChip>
                    )}
                    {r.extras?.map((x) => (
                      <RollChip key={x.text} spec={x.spec} fire={x.fire} label={`Roll ${a.name} extra damage, ${x.text}`}>
                        {x.text}
                      </RollChip>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canRoll && (
        <>
          <h4>Class dice</h4>
          <ul className="attack-rolls class-rolls">
            {classRolls(d).map((r) => (
              <li key={r.name}>
                <span className="attack-rolls-name">
                  {r.name}
                  <small className="muted">{r.note}</small>
                </span>
                <span className="attack-rolls-chips">
                  <RollChip spec={r.spec} label={`Roll ${r.name}, ${r.text}`}>
                    {r.text}
                  </RollChip>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

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

function Stat({ label, value, title, big, roll }: { label: string; value: string | number; title?: string; big?: boolean; roll?: () => void }) {
  if (roll)
    return (
      <button type="button" className="stat roll-box" title={`Roll ${label.toLowerCase()}`} aria-label={`Roll ${label.toLowerCase()}, ${value}`} onClick={roll}>
        <strong>{value}</strong>
        <span>{label}</span>
      </button>
    );
  return (
    <div className={`stat ${big ? "big" : ""}`} title={title}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
