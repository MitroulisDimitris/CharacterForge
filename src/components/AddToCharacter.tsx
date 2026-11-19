// "+ Add to a character" from the Wiki (REQUIREMENTS 4.5 / 4.7): pick one of your characters.
// Items go into the inventory (respecting the carrying limit); spells are listed only for the
// characters who can take them now, and a short line says why the others can't.
import { useEffect, useRef, useState } from "react";
import type { StoredCharacter } from "../storage";
import { getSystem } from "../systems/registry";
import type { Character } from "../systems/dnd5e/character";
import { newId } from "../systems/dnd5e/character";
import type { Derived } from "../systems/dnd5e/derive";
import { inBooks, RULES } from "../systems/dnd5e/rules";
import type { Spell as LookupSpell } from "../lookup";
import { weightOf, type Item } from "../items";

interface Choice {
  rec: StoredCharacter;
  name: string;
  line: string;
  verb: string;
  apply: () => StoredCharacter;
}

/** 5e characters in the library with their derived numbers. */
function fivee(lib: StoredCharacter[]) {
  const out: { rec: StoredCharacter; c: Character; d: Derived }[] = [];
  for (const rec of lib) {
    if (rec.system !== "dnd2014" && rec.system !== "dnd2024") continue;
    const sys = getSystem(rec.system);
    if (!sys) continue;
    try {
      const c = sys.normalize(rec.data) as Character;
      out.push({ rec, c, d: sys.derive(c, rec.books) as Derived });
    } catch {
      /* skip characters that can't be read */
    }
  }
  return out;
}
const who = (c: Character, d: Derived) => `${c.name || "Unnamed"} (${d.identity.split(" · ").slice(1).join(" · ") || d.identity})`;

function Picker({ title, choices, blocked, empty, onPick }: { title: string; choices: Choice[]; blocked: string[]; empty: string; onPick: (c: Choice) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="add-char" ref={ref}>
      <button type="button" className="btn primary add-char-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        + Add to a character
      </button>
      {open && (
        <section className="add-char-pop" aria-label="Add to a character">
          <p className="add-char-q">{title}</p>
          {choices.length ? (
            <div className="add-char-list">
              {choices.map((ch) => (
                <button
                  key={ch.rec.id}
                  type="button"
                  className="add-char-pick"
                  onClick={() => {
                    onPick(ch);
                    setOpen(false);
                  }}
                >
                  <span className="add-char-initial" aria-hidden="true">
                    {(ch.name.trim()[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="add-char-text">
                    <strong>{ch.name}</strong>
                    <small>{ch.line}</small>
                  </span>
                  <span className="add-char-verb">{ch.verb}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">{empty}</p>
          )}
          {blocked.length > 0 && (
            <div className="add-char-blocked">
              <span className="hero-label">Not listed</span>
              {blocked.map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function useDone() {
  const [done, setDone] = useState("");
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(""), 4000);
    return () => window.clearTimeout(t);
  }, [done]);
  return [done, setDone] as const;
}

/** A spell from the SRD list: added to a character who can take it now. */
export function AddSpell({ spell, lib, onSave }: { spell: LookupSpell; lib: StoredCharacter[]; onSave: (rec: StoredCharacter) => void }) {
  const [done, setDone] = useDone();
  const app = RULES["2014"].getSpell(spell.name);
  if (!app) return null;
  const choices: Choice[] = [];
  const blocked: string[] = [];
  for (const { rec, c, d } of fivee(lib)) {
    const name = who(c, d);
    const known = [...c.cantrips, ...c.prepared, ...c.spellbook].includes(app.name);
    if (known) blocked.push(`${name}: already has it.`);
    else if (!d.caster) blocked.push(`${name}: doesn't cast spells.`);
    else if (!d.onList(app)) blocked.push(`${name}: not on the ${d.cls.name.toLowerCase()} list.`);
    else if (!inBooks(rec.books, app.book)) blocked.push(`${name}: its book isn't allowed for this character.`);
    else if (app.level > d.maxSpellLevel) blocked.push(`${name}: ${app.level === 1 ? "1st" : app.level === 2 ? "2nd" : app.level === 3 ? "3rd" : `${app.level}th`}-level spells come later.`);
    else if (app.level === 0 && c.cantrips.length >= d.cantripLimit) blocked.push(`${name}: no free cantrip (${d.cantripLimit} known). Swap one on the Spells tab.`);
    else if (app.level > 0 && d.spell?.spellbook && c.spellbook.length >= d.spellbookLimit) blocked.push(`${name}: the spellbook is full for now (${d.spellbookLimit}).`);
    else if (app.level > 0 && !d.spell?.spellbook && c.prepared.length >= d.preparedLimit) blocked.push(`${name}: all ${d.preparedLimit} spells chosen. Swap one on the Spells tab.`);
    else {
      const field = app.level === 0 ? "cantrips" : d.spell?.spellbook ? "spellbook" : "prepared";
      choices.push({
        rec,
        name: c.name || "Unnamed",
        line: d.identity,
        verb: app.level === 0 ? "Learn it" : field === "spellbook" ? "Add to spellbook" : d.spellsKind === "Prepared" ? "Prepare it" : "Learn it",
        apply: () => ({ ...rec, updated: Date.now(), data: { ...c, [field]: [...c[field], app.name] } }),
      });
    }
  }
  return (
    <div className="wiki-add">
      <Picker title={`Which character gets ${spell.name}?`} choices={choices} blocked={blocked} empty={lib.length ? "None of your characters can take this spell right now." : "Make a character first."} onPick={(ch) => (onSave(ch.apply()), setDone(`Added ${spell.name} to ${ch.name}.`))} />
      {done && (
        <p className="add-char-done" role="status">
          {done}
        </p>
      )}
    </div>
  );
}

/** An item: into a character's inventory, if they can carry it. */
export function AddItem({ item, lib, onSave }: { item: Item; lib: StoredCharacter[]; onSave: (rec: StoredCharacter) => void }) {
  const [done, setDone] = useDone();
  const w = weightOf(item);
  const choices: Choice[] = [];
  const blocked: string[] = [];
  for (const { rec, c, d } of fivee(lib)) {
    const name = who(c, d);
    if (d.carried + w > d.capacity + 1e-9) {
      blocked.push(`${name}: carrying ${+d.carried.toFixed(1)} of ${d.capacity} lb; ${item.name} (${w} lb) would be too much.`);
      continue;
    }
    choices.push({
      rec,
      name: c.name || "Unnamed",
      line: d.identity,
      verb: "Add",
      apply: () => {
        const has = c.inventory.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
        const inventory = has ? c.inventory.map((i) => (i === has ? { ...i, qty: i.qty + 1 } : i)) : [...c.inventory, { id: newId(), name: item.name, qty: 1, weight: w }];
        return { ...rec, updated: Date.now(), data: { ...c, inventory } };
      },
    });
  }
  return (
    <div className="wiki-add">
      <Picker title={`Which character gets ${item.name}?`} choices={choices} blocked={blocked} empty={lib.length ? "None of your characters can carry it right now." : "Make a character first."} onPick={(ch) => (onSave(ch.apply()), setDone(`Added ${item.name} to ${ch.name}'s equipment.`))} />
      {done && (
        <p className="add-char-done" role="status">
          {done}
        </p>
      )}
    </div>
  );
}
