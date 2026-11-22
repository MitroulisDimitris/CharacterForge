// Combat tracker (host only): roll initiative, then run the fight in turn order — whose turn it is,
// rounds, monster HP and conditions, the players' HP (shared with their sheets), XP at the end.
import { useEffect, useMemo, useRef, useState } from "react";
import { LootCard } from "./Loot";
import type { Foe } from "../loot";
import {
  addFighter,
  concentrationDc,
  damageRule,
  extraFighter,
  isDown,
  monstersBeaten,
  newCombat,
  nextTurn,
  prevTurn,
  ready,
  rollMonsters,
  rollPlayers,
  saveCombat,
  skipped,
  startCombat,
  updateFighter,
  xpEarned,
  type Combat,
  type Fighter,
  type MonsterDetails,
} from "../combat";
import type { Encounter } from "../encounters";
import { applyDamage, applyHealing, CONDITIONS, currentHp, DAMAGE_TYPES, setTemp, toggleCondition, type Live } from "../live";
import { getMonster, type Monster } from "../lookup";
import { sessionError, setLive } from "../sessions";
import { cardOf, ConditionChips, HpBar, OnlyYou, type HostMember } from "./Party";
import { MoreMenu } from "./Hero";
import { MonsterCard } from "./Lookup";
import { RollScope } from "./Dice";
import { BlockNumbers, blockTitle, SpellsBox, spellSummary } from "./MonsterSpells";
import { applyBuild, editableBlock, monsterSpells } from "../monsterSpells";
import { useSmoothHeight } from "./smooth";

const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
const fmt = (n: number) => n.toLocaleString();

type PlayerInfo = { max: number; ac?: number; resist: string[]; immune: string[] };

export function CombatView({
  encounter,
  members,
  system,
  onExit,
  onPlayersChanged,
}: {
  encounter: Encounter;
  members: HostMember[];
  system: string;
  onExit: () => void;
  onPlayersChanged: () => void;
}) {
  const [combat, setCombat] = useState<Combat | null>(encounter.combat ?? null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  // Monster kinds whose stat block is shown; stays open from one goblin's turn to the next.
  const [blocks, setBlocks] = useState<string[]>([]);
  // Fighters whose spells box is open (REQUIREMENTS §4.9): starts closed, stays as left.
  const [spellsOpen, setSpellsOpen] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [ended, setEnded] = useState<{ rounds: number; xp: ReturnType<typeof xpEarned> } | null>(null);
  const [lootFoes, setLootFoes] = useState<Foe[] | null>(null);
  // Players' in-play state: what we last saved, until the next refresh from the server.
  const [playerLive, setPlayerLive] = useState<Record<string, Live>>({});
  useEffect(() => setPlayerLive({}), [members]);

  const info = useMemo(() => {
    const out: Record<string, PlayerInfo & { bonus: number; name: string }> = {};
    for (const m of members) {
      const { card, name } = cardOf(m, system);
      out[m.id] = { name, bonus: card?.initiative ?? 0, max: card?.hpMax ?? 0, ac: card?.ac, resist: (card?.resistances ?? []).map((x) => x.toLowerCase()), immune: (card?.immunities ?? []).map((x) => x.toLowerCase()) };
    }
    return out;
  }, [members, system]);
  const liveOf = (id: string): Live => playerLive[id] ?? members.find((m) => m.id === id)?.live ?? {};

  // ---- saving: debounced, flushed when leaving ----
  const pending = useRef<Combat | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flush = async () => {
    clearTimeout(timer.current);
    if (pending.current === undefined) return;
    const value = pending.current;
    pending.current = undefined;
    try {
      setSaveState("Saving…");
      await saveCombat(encounter.id, value);
      setSaveState("Saved");
    } catch (e) {
      setSaveState("");
      setError(`Couldn't save the fight: ${sessionError(e)}`);
    }
  };
  const change = (next: Combat | null, now = false) => {
    setCombat(next);
    pending.current = next;
    clearTimeout(timer.current);
    if (now) void flush();
    else timer.current = setTimeout(flush, 600);
  };
  useEffect(
    () => () => {
      void flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- a new fight: everyone in, monsters rolled ----
  useEffect(() => {
    if (combat) return;
    let live = true;
    (async () => {
      const details: Record<string, MonsterDetails | undefined> = {};
      await Promise.all(
        encounter.monsters.map(async (m) => {
          try {
            const full = await getMonster(m.slug);
            details[m.slug] = { dex: full.dexterity, resist: full.damage_resistances, immune: full.damage_immunities, vulnerable: full.damage_vulnerabilities };
          } catch {
            /* the roll just uses +0 */
          }
        }),
      );
      if (!live) return;
      const players = members.map((m) => ({ id: m.id, name: info[m.id]?.name ?? "A player", bonus: info[m.id]?.bonus ?? 0 }));
      change(rollMonsters(newCombat(encounter.monsters, details, players)), true);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ended)
    return (
      <section className="combat combat-end" aria-label="Fight over">
        <h2 className="section-title">Fight over</h2>
        <p>
          {encounter.name} took {ended.rounds} round{ended.rounds === 1 ? "" : "s"}.
        </p>
        {ended.xp.total > 0 ? (
          <div className="combat-xp">
            <span className="hero-label">Experience</span>
            <strong>
              {fmt(ended.xp.total)} XP{members.length > 1 ? ` · ${fmt(ended.xp.each)} each` : ""}
            </strong>
            <span className="muted">Defeated: {ended.xp.defeated.map((d) => `${d.count} × ${d.name}`).join(", ")}</span>
          </div>
        ) : (
          <p className="muted">No monsters were brought to 0 HP, so no XP from this fight.</p>
        )}
        {lootFoes === null && ended.xp.total > 0 && <p className="muted">Working out the loot…</p>}
        {lootFoes && lootFoes.length > 0 && (
          <LootCard foes={lootFoes} players={members.length} title="Loot from this fight" intro="From the monsters you beat. Keep what fits your story, or roll again." />
        )}
        <p className="muted">Tip · The players' HP stays as it is. After a long rest, reset it on the Party tab.</p>
        <button type="button" className="btn primary" onClick={onExit}>
          Back to encounters
        </button>
      </section>
    );

  if (!combat) return <p className="muted">Getting the fight ready…</p>;

  const endFight = () => {
    if (!confirm("End the fight? The turn order and monster HP are cleared.")) return;
    setEnded({ rounds: combat.round, xp: xpEarned(combat, members.length) });
    void beatenFoes(combat).then(setLootFoes);
    change(null, true);
  };
  const cancel = () => {
    if (!confirm("Cancel this fight? Nothing is kept.")) return;
    change(null, true);
    onExit();
  };
  const set = (id: string, fn: (f: Fighter) => Fighter) => change(updateFighter(combat, id, fn));

  // Players' HP goes to their sheet right away (they see it).
  const savePlayer = async (id: string, next: Live) => {
    setPlayerLive((p) => ({ ...p, [id]: next }));
    try {
      await setLive(id, next);
      onPlayersChanged();
    } catch (e) {
      setError(sessionError(e));
    }
  };

  const missing = members.filter((m) => !combat.fighters.some((f) => f.id === m.id));
  const head = (
    <div className="enc-builder-head">
      <button type="button" className="link" onClick={onExit}>
        ‹ Encounters
      </button>
      <span className="combat-head-right">
        <span className="muted" aria-live="polite">
          {saveState}
        </span>
        <MoreMenu label="Fight actions">
          <button type="button" onClick={() => setAdding(true)}>
            Add someone…
          </button>
          <button type="button" className="danger" onClick={cancel}>
            Cancel fight (keep nothing)
          </button>
        </MoreMenu>
      </span>
    </div>
  );

  const addPanel = adding && (
    <AddPanel
      missing={missing.map((m) => ({ id: m.id, name: info[m.id]?.name ?? "A player", bonus: info[m.id]?.bonus ?? 0 }))}
      started={combat.started}
      onAdd={(f) => {
        change(addFighter(combat, f));
        setAdding(false);
      }}
      onClose={() => setAdding(false)}
    />
  );

  // ------------------------------------------------------------------ roll initiative
  if (!combat.started) {
    const active = combat.fighters.filter((f) => !f.out);
    const count = ready(combat);
    const playersLeft = active.some((f) => f.kind === "player" && f.init == null);
    return (
      <section className="combat" aria-label="Roll initiative">
        {head}
        <h2 className="section-title">{encounter.name}</h2>
        <OnlyYou>Only you see this fight. Players see only their own HP and conditions.</OnlyYou>
        <div className="combat-intro">
          <span className="hero-label">Roll initiative</span>
          <p>Everyone rolls a d20 and adds their bonus. The highest goes first. Ask each player for their total and type it in.</p>
          <p className="muted">Tip · Monsters of the same kind share one roll and act one after another. That keeps the fight quick.</p>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <ul className="init-list">
          {active.map((f) => (
            <li key={f.id} className={`init-row ${f.kind}`}>
              <span className="enc-name">
                <strong>{f.name}</strong>
                <small>
                  {f.kind === "player" ? "Player" : f.kind === "monster" ? "Monster" : "Extra"} · d20 {signed(f.bonus)}
                </small>
              </span>
              <input
                type="number"
                inputMode="numeric"
                className="init-input"
                value={f.init ?? ""}
                aria-label={`Initiative for ${f.name}`}
                placeholder="?"
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Math.max(-10, Math.min(60, Math.round(Number(e.target.value))));
                  // Monsters of a kind share the roll.
                  change({ ...combat, fighters: combat.fighters.map((x) => (x.id === f.id || (f.group && x.group === f.group) ? { ...x, init: v } : x)) });
                }}
              />
              <button type="button" className="link small-x" aria-label={`Leave ${f.name} out`} title="Leave out of this fight" onClick={() => change({ ...combat, fighters: combat.fighters.map((x) => (x.id === f.id ? { ...x, out: true } : x)) })}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="combat-quiet">
          <button type="button" className="btn small" onClick={() => change(rollMonsters(combat, Math.random, true))}>
            Reroll monsters
          </button>
          {playersLeft && (
            <button type="button" className="btn small" onClick={() => change(rollPlayers(combat))}>
              Roll for the players
            </button>
          )}
          <button type="button" className="btn small" onClick={() => setAdding(true)}>
            + Add someone
          </button>
        </div>
        {addPanel}
        <div className="combat-start">
          <span className="counter">
            {count} of {active.length} ready
          </span>
          <button type="button" className="btn primary" disabled={count < active.length || !active.length} onClick={() => change(startCombat(combat), true)}>
            Start the fight
          </button>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------ the fight
  const now = combat.fighters[combat.turn];
  const beaten = monstersBeaten(combat);
  return (
    <section className="combat" aria-label="Fight">
      {head}
      <div className="combat-bar">
        <div>
          <span className="hero-label">
            {encounter.name} · Round {combat.round}
          </span>
          <strong className="combat-now">{now ? `${now.name}'s turn` : "—"}</strong>
        </div>
        {beaten ? (
          <button type="button" className="btn primary" onClick={endFight}>
            End fight
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => (change(nextTurn(combat)), setOpen(null))}>
            Next turn ›
          </button>
        )}
      </div>
      {beaten && (
        <p className="combat-note" role="status">
          All monsters are down or gone. End the fight to see the XP, or keep going.
        </p>
      )}
      <OnlyYou>Only you see this fight. Players see only their own HP and conditions.</OnlyYou>
      {error && <p className="auth-error">{error}</p>}
      {addPanel}
      <ol className="turn-list">
        {combat.fighters.map((f, i) => {
          if (f.out) return null;
          const isPlayer = f.kind === "player";
          const p = isPlayer ? info[f.id] : undefined;
          const live = isPlayer ? liveOf(f.id) : (f.live ?? {});
          const max = isPlayer ? (p?.max ?? 0) : (f.hpMax ?? 0);
          const hp = max ? currentHp(live, max) : null;
          const down = isDown(f);
          const current = i === combat.turn;
          const expanded = open === f.id;
          return (
            <li key={f.id} className={`turn-row ${f.kind} ${current ? "now" : ""} ${down ? "down" : ""}`} aria-current={current ? "step" : undefined}>
              <button type="button" className="turn-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : f.id)}>
                <span className="turn-init" title="Initiative">
                  {f.init}
                </span>
                <span className="turn-text">
                  <strong>
                    {f.name}
                    {current && <span className="turn-tag">Now</span>}
                  </strong>
                  <small>
                    {isPlayer ? "Player" : f.kind === "monster" ? "Monster" : "Extra"}
                    {(isPlayer ? p?.ac : f.ac) ? ` · AC ${isPlayer ? p?.ac : f.ac}` : ""}
                    {hp != null ? ` · ${hp}/${max} HP${live.temp ? ` (+${live.temp})` : ""}` : ""}
                    {down ? " · Down" : ""}
                    {isPlayer && hp === 0 ? " · Down: death saves" : ""}
                  </small>
                  <ConditionChips live={live} />
                </span>
                {max > 0 && <MiniHp hp={hp ?? 0} max={max} />}
              </button>
              {expanded && (
                <FighterPanel
                  f={f}
                  live={live}
                  max={max}
                  player={p}
                  blockOpen={!!f.group && blocks.includes(f.group)}
                  onBlock={() => f.group && setBlocks((b) => (b.includes(f.group!) ? b.filter((x) => x !== f.group) : [...b, f.group!]))}
                  spellsOpen={spellsOpen.includes(f.id)}
                  onSpells={() => setSpellsOpen((l) => (l.includes(f.id) ? l.filter((x) => x !== f.id) : [...l, f.id]))}
                  onUsed={(key, n) => set(f.id, (x) => ({ ...x, used: { ...(x.used ?? {}), [key]: Math.max(0, n) } }))}
                  onLive={(next) => (isPlayer ? savePlayer(f.id, next) : set(f.id, (x) => ({ ...x, live: next })))}
                  onInit={(v) => set(f.id, (x) => ({ ...x, init: v }))}
                  onRemove={() => {
                    if (!confirm(`Take ${f.name} out of the fight (fled, dismissed)?`)) return;
                    set(f.id, (x) => ({ ...x, out: true }));
                    setOpen(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
      {combat.fighters.some((f) => f.out) && (
        <p className="muted combat-out">
          Out of the fight: {combat.fighters.filter((f) => f.out).map((f) => f.name).join(", ")} ·{" "}
          <button type="button" className="link" onClick={() => change({ ...combat, fighters: combat.fighters.map((f) => ({ ...f, out: false })) })}>
            bring back
          </button>
        </p>
      )}
      <div className="combat-quiet">
        <button type="button" className="btn small" onClick={() => change(prevTurn(combat))} disabled={combat.round <= 1 && combat.fighters.findIndex((f) => !skipped(f)) === combat.turn}>
          ‹ Back one turn
        </button>
        {!beaten && (
          <button type="button" className="btn small" onClick={endFight}>
            End fight
          </button>
        )}
      </div>
    </section>
  );
}

/** The monsters brought to 0 HP, one entry per kind, with what loot needs from their stat block. */
async function beatenFoes(c: Combat): Promise<Foe[]> {
  const kinds = new Map<string, { name: string; count: number }>();
  for (const f of c.fighters) {
    if (f.kind !== "monster" || !isDown(f) || !f.group) continue;
    const k = kinds.get(f.group);
    if (k) k.count++;
    else kinds.set(f.group, { name: f.name.replace(/ \d+$/, ""), count: 1 });
  }
  const out = await Promise.all(
    [...kinds].map(async ([slug, k]) => {
      try {
        const m = await getMonster(slug);
        return { name: k.name, count: k.count, cr: m.cr, type: m.type, intelligence: m.intelligence };
      } catch {
        return null; // no stat block: no loot suggestion for it
      }
    }),
  );
  return out.filter((x): x is Foe => x !== null).sort((a, b) => b.cr - a.cr);
}

function MiniHp({ hp, max }: { hp: number; max: number }) {
  const pct = max ? Math.round((hp / max) * 100) : 0;
  return (
    <span className="mini-hp" aria-hidden="true">
      <span className={`hp-fill ${pct > 50 ? "ok" : pct > 0 ? "hurt" : "down"}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Damage / heal / temp HP, conditions, initiative, remove — for one fighter. */
function FighterPanel({
  f,
  live,
  max,
  player,
  blockOpen,
  onBlock,
  spellsOpen,
  onSpells,
  onUsed,
  onLive,
  onInit,
  onRemove,
}: {
  f: Fighter;
  live: Live;
  max: number;
  player?: PlayerInfo;
  blockOpen: boolean;
  onBlock: () => void;
  spellsOpen: boolean;
  onSpells: () => void;
  onUsed: (key: string, used: number) => void;
  onLive: (l: Live) => void;
  onInit: (v: number) => void;
  onRemove: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useSmoothHeight(box);
  // The monster's stat block, with its numbers to roll (attacks, damage, saves, checks).
  const slug = f.kind === "monster" ? f.group : undefined;
  const [monster, setMonster] = useState<Monster | null>(null);
  const [blockErr, setBlockErr] = useState("");
  useEffect(() => {
    if (!slug || monster) return;
    getMonster(slug).then(setMonster, (e) => setBlockErr(sessionError(e)));
  }, [slug, monster]);
  const spellBlocks = useMemo(() => {
    if (!monster) return [];
    const all = monsterSpells(monster);
    const main = editableBlock(all);
    return all.map((b) => (b === main ? applyBuild(b, f.spells) : b));
  }, [monster, f.spells]);
  // Each extra spell list keeps its uses apart ("1#3").
  const usedOf = (i: number) => {
    const pre = i ? `${i}#` : "";
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(f.used ?? {})) if (i ? k.startsWith(pre) : !/^\d+#/.test(k)) out[k.slice(pre.length)] = v;
    return out;
  };
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Slashing");
  const [note, setNote] = useState("");
  const rule = player
    ? player.immune.includes(type.toLowerCase())
      ? ({ kind: "immune", conditional: false, text: type } as const)
      : player.resist.includes(type.toLowerCase())
        ? ({ kind: "resist", conditional: false, text: type } as const)
        : null
    : damageRule(f, type);
  const [apply, setApply] = useState(true);
  useEffect(() => setApply(!rule?.conditional), [type, rule?.conditional]);
  const n = Number(amount);
  const ok = amount !== "" && Number.isFinite(n) && n > 0;
  const halve = rule?.kind === "resist" && apply;
  const double = rule?.kind === "vulnerable" && apply;
  const immune = rule?.kind === "immune" && apply;
  const name = f.name;

  const damage = () => {
    if (immune) return setNote(`${name} is immune: no damage.`);
    const next = applyDamage(live, max, n, type, halve, double);
    const taken = Math.floor(halve ? n / 2 : double ? n * 2 : n);
    const tips: string[] = [];
    if (live.conditions?.includes("concentrating")) tips.push(`Concentration: ${name} makes a Constitution save, DC ${concentrationDc(taken)}, or the spell ends.`);
    if (currentHp(next, max) === 0) tips.push(f.kind === "player" ? `${name} is down. On their turns they roll death saves: 3 successes and they're stable, 3 failures and they die.` : `${name} is down and skipped in the turn order.`);
    setNote(tips.join(" "));
    onLive(next);
    setAmount("");
  };

  return (
    <div className="fighter-panel" ref={box}>
      {max > 0 && <HpBar live={live} max={max} />}
      <div className="live-row">
        <label className="live-amount">
          <span>Amount</span>
          <input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok && max > 0 && damage()} />
        </label>
        <label className="live-type">
          <span>Damage type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {DAMAGE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn primary" disabled={!ok || !max} onClick={damage}>
          Damage
        </button>
        <button type="button" className="btn" disabled={!ok || !max} onClick={() => (onLive(applyHealing(live, max, n)), setAmount(""), setNote(""))}>
          Heal
        </button>
        <button type="button" className="btn ghost" disabled={!ok || !max} title="Temporary hit points don't stack: this replaces them" onClick={() => (onLive(setTemp(live, n)), setAmount(""))}>
          Temp HP
        </button>
      </div>
      {!max && <p className="live-hint muted">No HP set for {name}.</p>}
      {rule && (
        <label className="check live-hint">
          <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />{" "}
          {rule.kind === "immune" ? `Immune to ${rule.text.toLowerCase()}: no damage` : rule.kind === "resist" ? `Resists ${rule.text.toLowerCase()}: halve the damage` : `Vulnerable to ${rule.text.toLowerCase()}: double the damage`}
        </label>
      )}
      {note && (
        <p className="combat-note" role="status">
          Tip · {note}
        </p>
      )}
      {spellBlocks.length > 0 && (
        <RollScope>
        <div className="fight-spells">
          <button type="button" className="fight-spells-head" aria-expanded={spellsOpen} onClick={onSpells}>
            <span>
              <strong>Spells · {blockTitle(spellBlocks[0])}</strong>
              <small>{spellBlocks.map((b, i) => spellSummary(b, usedOf(i))).join(" · ")}</small>
            </span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={spellsOpen ? "flip" : ""}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {spellsOpen &&
            spellBlocks.map((b, i) => (
              <div key={b.trait} className="fight-spells-body">
                <div className="msp-head">
                  {spellBlocks.length > 1 ? <strong>{b.trait}</strong> : <span />}
                  <BlockNumbers b={b} who={name} />
                </div>
                <SpellsBox block={b} who={name} fight={{ used: usedOf(i), onUse: (k, n) => onUsed(`${i ? `${i}#` : ""}${k}`, n) }} />
              </div>
            ))}
        </div>
        </RollScope>
      )}
      {slug && (
        <div className="fighter-block">
          <button type="button" className="link enc-block-link" aria-expanded={blockOpen} onClick={onBlock}>
            {blockOpen ? "Hide" : "Stat block"}
          </button>
          {blockOpen && (monster ? <MonsterCard m={monster} startOpen spells={f.spells} hideSpells={spellBlocks.length > 0} /> : <p className="muted">{blockErr || "Loading…"}</p>)}
        </div>
      )}
      <details className="fighter-more">
        <summary>Conditions{live.conditions?.length ? ` (${live.conditions.length})` : ""}</summary>
        <div className="cond-toggle" role="group" aria-label={`Conditions for ${name}`}>
          {CONDITIONS.map((cd) => {
            const on = live.conditions?.includes(cd.id) ?? false;
            return (
              <button key={cd.id} type="button" className={`cond-btn ${on ? "on" : ""}`} aria-pressed={on} title={cd.text} onClick={() => onLive(toggleCondition(live, cd.id))}>
                {cd.name}
              </button>
            );
          })}
        </div>
      </details>
      <div className="fighter-foot">
        <label className="fighter-init">
          <span>Initiative</span>
          <input type="number" inputMode="numeric" defaultValue={f.init ?? ""} onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== f.init && onInit(Math.round(Number(e.target.value)))} />
        </label>
        <button type="button" className="btn small ghost" onClick={onRemove}>
          Take out of the fight
        </button>
      </div>
    </div>
  );
}

/** Add someone: a player who wasn't in yet, or an extra (NPC, reinforcements, a summon). */
function AddPanel({ missing, started, onAdd, onClose }: { missing: { id: string; name: string; bonus: number }[]; started: boolean; onAdd: (f: Fighter) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [init, setInit] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? undefined : Math.round(Number(s)));
  const needInit = started && num(init) == null;
  return (
    <section className="suggest-panel" aria-label="Add someone to the fight">
      <div className="party-head">
        <h3 className="lk-group-title">Add someone</h3>
        <button type="button" className="link" onClick={onClose}>
          Close
        </button>
      </div>
      {missing.length > 0 && (
        <div className="combat-quiet">
          {missing.map((m) => (
            <button
              key={m.id}
              type="button"
              className="btn small"
              disabled={needInit}
              onClick={() => onAdd({ id: m.id, kind: "player", name: m.name, init: num(init) ?? null, bonus: m.bonus })}
              title={needInit ? "Type their initiative first" : undefined}
            >
              + {m.name}
            </button>
          ))}
        </div>
      )}
      <p className="muted">An NPC, reinforcements or a summoned creature. HP and AC are optional.</p>
      <div className="add-grid">
        <label className="auth-field">
          <span>Name</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Captain Vex" />
        </label>
        <label className="auth-field">
          <span>Initiative{started ? "" : " (optional)"}</span>
          <input type="number" inputMode="numeric" value={init} onChange={(e) => setInit(e.target.value)} />
        </label>
        <label className="auth-field">
          <span>HP</span>
          <input type="number" inputMode="numeric" min={1} value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
        <label className="auth-field">
          <span>AC</span>
          <input type="number" inputMode="numeric" min={1} value={ac} onChange={(e) => setAc(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn" disabled={!name.trim() || needInit} onClick={() => onAdd(extraFighter(name, num(init) ?? null, num(hp), num(ac)))}>
        Add {name.trim() || "them"}
      </button>
    </section>
  );
}

