// Monster browse rows and the monster page (Lookup, host only). The list shows a small icon per
// monster; the page shows the DM's own picture when they added one (else the icon), the numbers,
// "At the table", the full SRD stat block with Roll buttons, and the Monster Manual page.
import { Fragment, useEffect, useRef, useState } from "react";
import { LootCard } from "./Loot";
import { abilityMod, getMonster, keyTraits, speedText, splitList, toggleFavorite, isFavorite, type Monster, type MonsterBrief } from "../lookup";
import { xpForCr, loadEncounters, saveEncounter, type Encounter } from "../encounters";
import { sessionError } from "../sessions";
import { atTheTable, initiative, loadIcons, mmPage, passivePerception, pictureUrl, removePicture, savePicture, signed, typeColor } from "../monsters";
import { RollChip, RollScope } from "./Dice";
import { parseDice, type RollSpec } from "../dice/roll";
import { halfOnSave, segmentsOf, type Segment } from "../dice/rollText";
import { MoreMenu } from "./Hero";

const fmt = (n: number) => n.toLocaleString();

/** The monster's icon in a tinted tile (type colour). */
export function MonsterIcon({ slug, type, size = 44 }: { slug: string; type: string; size?: number }) {
  const [d, setD] = useState("");
  useEffect(() => {
    let live = true;
    loadIcons()
      .then((f) => live && setD(f.icons[f.map[slug]] ?? ""))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);
  const c = typeColor(type);
  return (
    <span className="mon-icon" aria-hidden="true" style={{ width: size, height: size, background: `${c}1a`, borderColor: `${c}55` }}>
      <svg viewBox="0 0 512 512" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)}>
        <path fill={c} d={d} />
      </svg>
    </span>
  );
}

export function MonsterRow({ m, current, onOpen }: { m: MonsterBrief; current: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`mon-row ${current ? "on" : ""}`} aria-current={current ? "page" : undefined} onClick={onOpen}>
      <MonsterIcon slug={m.slug} type={m.type} />
      <span className="mon-row-text">
        <strong>{m.name}</strong>
        <small>
          {m.size} {m.type.toLowerCase()}
        </small>
      </span>
      <span className="mon-row-nums">
        AC {m.armor_class}
        <br />
        HP {m.hit_points}
      </span>
    </button>
  );
}

const D20 = [{ n: 1, sides: 20 }];
const ABILITY_LABEL: Record<string, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const modOf = (score: number) => Math.floor((score - 10) / 2);
const check = (who: string, label: string, kind: "check" | "save", bonus: number): RollSpec => ({ label: `${who} · ${label}`, kind, groups: D20, parts: [{ label: "Bonus", value: bonus }], tone: "monster" });

/** Stat block text with its rolls as gold chips: to hit, damage dice, recharge (REQUIREMENTS 4.6). */
export function MonsterText({ title, text }: { title: string; text: string }) {
  const half = halfOnSave(text);
  const chip = (s: Segment, i: number) => {
    if (s.kind === "text") return <Fragment key={i}>{s.text}</Fragment>;
    if (s.kind === "hit")
      return (
        <RollChip key={i} label={`Roll ${title} attack, ${s.text}`} spec={{ label: `${title} · attack`, kind: "attack", groups: D20, parts: [{ label: "Attack bonus", value: s.bonus }], tone: "monster" }}>
          {s.text}
        </RollChip>
      );
    if (s.kind === "recharge")
      return (
        <RollChip key={i} label={`Roll to recharge ${title}: ${s.need} or higher on a d6`} spec={{ label: `${title} · recharge`, kind: "recharge", groups: [{ n: 1, sides: 6 }], need: s.need, tone: "monster" }}>
          {s.text}
        </RollChip>
      );
    const p = parseDice(s.dice);
    if (!p) return <Fragment key={i}>{s.text}</Fragment>;
    const fire = s.unit === "fire";
    return (
      <RollChip
        key={i}
        fire={fire}
        label={`Roll ${s.dice}${s.unit ? ` ${s.unit} damage` : ""}`}
        spec={{ label: `${title} · ${s.unit ? `${s.unit} damage` : s.dice}`, kind: "damage", groups: p.groups.map((g) => ({ ...g, tone: fire ? "fire" : undefined })), bonus: p.bonus, unit: s.unit, half: half && !!s.unit, tone: "monster" }}
      >
        {s.text}
      </RollChip>
    );
  };
  return <>{segmentsOf(text).map(chip)}</>;
}

/** "+ Add to an encounter": pick one of this session's encounters, or start a new one. */
function AddToEncounter({ sessionId, m }: { sessionId: string; m: Monster }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Encounter[] | null>(null);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    loadEncounters(sessionId).then(setList, (e) => setNote(sessionError(e)));
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open, sessionId]);
  const entry = { slug: m.slug, name: m.name, cr: m.challenge_rating, xp: xpForCr(m.challenge_rating), count: 1, ac: m.armor_class, hp: m.hit_points };
  const add = async (e: Encounter | null) => {
    setOpen(false);
    try {
      if (e) {
        const has = e.monsters.some((x) => x.slug === m.slug);
        const monsters = has ? e.monsters.map((x) => (x.slug === m.slug ? { ...x, count: x.count + 1 } : x)) : [...e.monsters, entry];
        await saveEncounter({ id: e.id, session_id: sessionId, name: e.name, monsters, notes: e.notes });
        setNote(`Added to “${e.name}”.`);
      } else {
        const saved = await saveEncounter({ session_id: sessionId, name: `${m.name} encounter`, monsters: [entry], notes: "" });
        setNote(`Started “${saved.name}” on the Encounters tab.`);
      }
    } catch (err) {
      setNote(sessionError(err));
    }
  };
  return (
    <div className="mon-add" ref={ref}>
      <button type="button" className="btn primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        + Add to an encounter
      </button>
      {open && (
        <div className="mon-add-menu" role="menu">
          {list === null && <p className="muted">Loading…</p>}
          {list?.map((e) => (
            <button key={e.id} type="button" role="menuitem" onClick={() => add(e)}>
              {e.name}
              <small>{e.monsters.reduce((n, x) => n + x.count, 0)} monsters</small>
            </button>
          ))}
          <button type="button" role="menuitem" className="mon-add-new" onClick={() => add(null)}>
            + New encounter with {m.name}
          </button>
        </div>
      )}
      {note && (
        <p className="mon-add-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

export function MonsterPage({ slug, userId, sessionId, onBack }: { slug: string; userId: string; sessionId?: string; onBack: () => void }) {
  const [m, setM] = useState<Monster | null>(null);
  const [error, setError] = useState("");
  const [pic, setPic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fav, setFav] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setM(null);
    setPic(null);
    setError("");
    getMonster(slug).then(
      (x) => live && setM(x),
      (e) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    pictureUrl(userId, slug).then((u) => live && setPic(u));
    return () => {
      live = false;
    };
  }, [slug, userId]);
  useEffect(() => setFav(isFavorite({ kind: "monster", slug, name: m?.name ?? slug })), [slug, m]);

  if (error)
    return (
      <div className="mon-page">
        <button type="button" className="link mon-back" onClick={onBack}>
          ‹ Monsters
        </button>
        <p className="auth-error">{error}</p>
      </div>
    );
  if (!m) return <p className="muted mon-page">Loading…</p>;

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      setPic(await savePicture(userId, slug, f));
    } catch (e) {
      setError(`Couldn't save the picture: ${sessionError(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const page = mmPage(slug);
  const weak = splitList(m.damage_vulnerabilities);
  const resist = splitList(m.damage_resistances);
  const immune = [...splitList(m.damage_immunities), ...splitList(m.condition_immunities).map((c) => c.toLowerCase())];
  const traits = keyTraits(m);
  const color = typeColor(m.type);
  const pp = passivePerception(m);
  const saves = (["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const)
    .map((a) => [a, m[`${a}_save` as const]] as const)
    .filter((x): x is readonly [(typeof x)[0], number] => x[1] != null);
  const numbers = [
    { label: "Armor Class", value: String(m.armor_class), sub: m.armor_desc ?? "" },
    { label: "Hit Points", value: String(m.hit_points), sub: m.hit_dice, roll: "hp" },
    { label: "Speed", value: speedText(m).split(",")[0] || "—", sub: speedText(m).split(",").slice(1).join(",").trim() },
    { label: "Initiative", value: signed(initiative(m)), sub: `d20 ${signed(initiative(m))}`, roll: "init" },
    ...(pp != null ? [{ label: "Passive Perception", value: String(pp), sub: "notices sneaking" }] : []),
  ];
  const blocks: [string, { name: string; desc: string }[] | null | undefined][] = [
    ["Traits", m.special_abilities],
    ["Actions", m.actions],
    ["Bonus actions", m.bonus_actions],
    ["Reactions", m.reactions],
  ];

  return (
    <RollScope>
    <article className="mon-page" aria-label={m.name} style={{ ["--mon" as string]: color }}>
      <button type="button" className="link mon-back" onClick={onBack}>
        ‹ Monsters
      </button>
      <header className={`mon-hero ${pic ? "has-pic" : ""}`} style={pic ? { backgroundImage: `linear-gradient(180deg, rgba(17,14,12,0) 35%, rgba(17,14,12,0.92) 88%), url("${pic}")` } : undefined}>
        {!pic && <MonsterIcon slug={m.slug} type={m.type} size={96} />}
        <div className="mon-hero-text">
          <h2>{m.name}</h2>
          <span className="mon-hero-sub">
            {m.size} {m.type.toLowerCase()}
            {m.subtype ? ` (${m.subtype})` : ""} · {m.alignment}
          </span>
          <span className="mon-chips">
            <span className="mon-chip cr">
              CR {m.challenge_rating} · {fmt(xpForCr(m.challenge_rating))} XP
            </span>
            {m.environments?.length > 0 && <span className="mon-chip">{m.environments.slice(0, 4).join(" · ")}</span>}
          </span>
        </div>
        <div className="mon-hero-actions">
          <button
            type="button"
            className={`lk-star mon-star ${fav ? "on" : ""}`}
            aria-pressed={fav}
            aria-label={fav ? `Remove ${m.name} from favorites` : `Add ${m.name} to favorites`}
            onClick={() => {
              toggleFavorite({ kind: "monster", slug: m.slug, name: m.name });
              setFav(!fav);
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z" />
            </svg>
          </button>
          <MoreMenu label={`More for ${m.name}`}>
            <button type="button" onClick={() => fileRef.current?.click()}>
              {pic ? "Change the picture…" : "Add a picture…"}
            </button>
            {pic && (
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  try {
                    await removePicture(userId, slug);
                    setPic(null);
                  } catch (e) {
                    setError(sessionError(e));
                  }
                }}
              >
                Remove the picture
              </button>
            )}
          </MoreMenu>
          {sessionId && <AddToEncounter sessionId={sessionId} m={m} />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (pickFile(e.target.files?.[0]), (e.target.value = ""))} />
      </header>
      {busy && <p className="muted">Saving the picture…</p>}
      {!pic && <p className="mon-pic-tip muted">Tip · ⋯ → Add a picture to show your own image here. Only you see it.</p>}
      {!sessionId && <p className="mon-pic-tip muted">Tip · Fighting it? Add it to an encounter from a session's Lookup.</p>}

      <div className="mon-numbers">
        {numbers.map((n) => {
          const hp = "roll" in n && n.roll === "hp" && parseDice(n.sub);
          return (
            <div key={n.label}>
              <span>{n.label}</span>
              {"roll" in n && n.roll === "init" ? (
                <RollChip className="mon-num-roll" icon={false} label={`Roll initiative for ${m.name}, ${n.value}`} spec={check(m.name, "initiative", "check", initiative(m))}>
                  <strong>{n.value}</strong>
                </RollChip>
              ) : (
                <strong>{n.value}</strong>
              )}
              {hp ? (
                <small>
                  <RollChip label={`Roll hit points for ${m.name}, ${n.sub}`} spec={{ label: `${m.name} · hit points`, kind: "heal", groups: hp.groups, bonus: hp.bonus, unit: "hit points", tone: "monster" }}>
                    {n.sub}
                  </RollChip>
                </small>
              ) : (
                <small>{n.sub}</small>
              )}
            </div>
          );
        })}
      </div>

      <div className="mon-cols">
        <div className="mon-main">
          <section className="mon-table" aria-label="At the table">
            <h3>At the table</h3>
            <ul>
              {atTheTable(m).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {(resist.length > 0 || immune.length > 0) && (
              <div className="mon-chips-row">
                {weak.length > 0 && <span className="mon-tag weak">Weak to: {weak.join(", ")}</span>}
                {resist.length > 0 && <span className="mon-tag resist">Resists: {resist.join(", ")}</span>}
                {immune.length > 0 && <span className="mon-tag immune">Immune to: {immune.join(", ")}</span>}
              </div>
            )}
            {traits.length > 0 && <p className="muted">{traits.join(" · ")}</p>}
          </section>

          <LootCard
            foes={[{ name: m.name, count: 1, cr: m.cr, type: m.type, intelligence: m.intelligence }]}
            title="Suggested loot"
            intro={`What one ${m.name} might carry.`}
          />
          <section className="mon-block" aria-label="Stat block">
            <div className="mon-abilities">
              {(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const).map((a) => (
                <div key={a}>
                  <span>{a.slice(0, 3).toUpperCase()}</span>
                  <RollChip className="mon-num-roll" icon={false} label={`Roll a ${ABILITY_LABEL[a]} check for ${m.name}, ${signed(modOf(m[a]))}`} spec={check(m.name, `${ABILITY_LABEL[a]} check`, "check", modOf(m[a]))}>
                    <strong>{abilityMod(m[a]).replace("-", "−")}</strong>
                  </RollChip>
                  <small>{m[a]}</small>
                </div>
              ))}
            </div>
            <dl className="lk-dl">
              {saves.length > 0 && (
                <>
                  <dt>Saves</dt>
                  <dd className="mon-roll-list">
                    {saves.map(([a, v]) => (
                      <RollChip key={a} label={`Roll a ${ABILITY_LABEL[a]} saving throw for ${m.name}, ${signed(v)}`} spec={check(m.name, `${ABILITY_LABEL[a]} saving throw`, "save", v)}>
                        {a.slice(0, 3).toUpperCase()} {signed(v)}
                      </RollChip>
                    ))}
                  </dd>
                </>
              )}
              {Object.keys(m.skills ?? {}).length > 0 && (
                <>
                  <dt>Skills</dt>
                  <dd className="mon-roll-list">
                    {Object.entries(m.skills).map(([k, v]) => {
                      const name = `${k.charAt(0).toUpperCase()}${k.slice(1)}`;
                      return (
                        <RollChip key={k} label={`Roll ${name} for ${m.name}, ${signed(v)}`} spec={check(m.name, name, "check", v)}>
                          {name} {signed(v)}
                        </RollChip>
                      );
                    })}
                  </dd>
                </>
              )}
              <dt>Senses</dt>
              <dd>{m.senses || "—"}</dd>
              <dt>Languages</dt>
              <dd>{m.languages || "—"}</dd>
            </dl>
            {blocks.map(([title, items]) =>
              items?.length ? (
                <section key={title} className="mon-sec">
                  <h4>{title}</h4>
                  {items.map((a) => {
                    const short = a.name.replace(/\s*\(Recharge[^)]*\)/i, "");
                    return (
                      <div key={a.name} className="mon-action">
                        <p>
                          <strong>
                            <MonsterText title={short} text={a.name} />.
                          </strong>{" "}
                          <MonsterText title={short} text={a.desc} />
                        </p>
                      </div>
                    );
                  })}
                </section>
              ) : null,
            )}
            {m.legendary_actions?.length ? (
              <section className="mon-sec">
                <h4>Legendary actions</h4>
                {m.legendary_desc && <p className="muted">{m.legendary_desc}</p>}
                {m.legendary_actions.map((a) => (
                  <p key={a.name}>
                    <strong>{a.name}.</strong> <MonsterText title={a.name} text={a.desc} />
                  </p>
                ))}
              </section>
            ) : null}
          </section>
        </div>
        <aside className="mon-side">
          {page && (
            <section className="mon-book">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
                <path d="M4 21V5M8 7h7" />
              </svg>
              <div>
                <strong>Monster Manual, page {page}</strong>
                <span className="muted">Its entry in your book.</span>
              </div>
            </section>
          )}
          <p className="muted mon-credit">Stat block: SRD 5.1 (CC-BY-4.0). Icon: game-icons.net (CC BY 3.0).</p>
        </aside>
      </div>
    </article>
    </RollScope>
  );
}
