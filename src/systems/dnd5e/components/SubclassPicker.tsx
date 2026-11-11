// Choosing a subclass (Sorcerous Origin, Divine Domain, Otherworldly Patron…) with help for new
// players: one plain sentence on what the choice is, a beginner-friendly pick, and a panel that
// shows what the hovered option gives you right now and what it changes on your sheet.
import type { Character } from "../character";
import type { Derived } from "../derive";
import type { TabProps } from "../../types";
import { inBooks } from "../rules";
import { deriveWith, diffDerived } from "../preview";
import { ChangeList, PreviewHead, WithPreview, useHover } from "./Preview";

/** A simple, strong first pick per class. */
const BEGINNER: Record<string, string> = {
  barbarian: "berserker",
  bard: "lore",
  cleric: "life",
  druid: "moon",
  fighter: "champion",
  monk: "openHand",
  paladin: "devotion",
  ranger: "hunter",
  rogue: "thief",
  sorcerer: "draconic",
  warlock: "fiend",
  wizard: "evocation",
  artificer: "battleSmith",
};

/** What the subclass choice means, in plain words. */
const WHAT: Record<string, string> = {
  cleric: "the god or ideal you serve",
  sorcerer: "where your magic comes from",
  warlock: "the being you made your pact with",
  paladin: "the oath you swore",
  druid: "the circle of druids you belong to",
  wizard: "the school of magic you master",
  bard: "the college that trained you",
  monk: "the tradition you follow",
};

export function SubclassPicker({ c, d, set, books }: TabProps<Character, Derived>) {
  const CL = d.cls;
  const subs = CL.subclasses.filter((s) => inBooks(books, s.book));
  const { hover, bind } = useHover<string>();
  const patch = (id: string): Partial<Character> => {
    const s = subs.find((x) => x.id === id)!;
    return { subclass: id, subclassOption: "", subclassSkills: [], subclassCantrip: "", subclassPicks: [], ...(s.spell || CL.spell ? {} : { cantrips: [], prepared: [] }) };
  };
  const previewId = hover && hover !== c.subclass ? hover : null;
  const shownId = previewId ?? (c.subclass || null);
  const shown = subs.find((s) => s.id === shownId);
  const after = previewId ? deriveWith(c, patch(previewId), books) : c.subclass ? d : null;
  const before = previewId ? d : c.subclass ? deriveWith(c, { subclass: "" }, books) : d;
  const what = WHAT[CL.id] ?? `your specialty as a ${CL.name.toLowerCase()}`;
  const level = c.level;

  const panel = shown ? (
    <div className="preview-card">
      <PreviewHead title={shown.name} previewing={!!previewId} />
      <p className="small-text plays">{shown.summary}</p>
      {BEGINNER[CL.id] === shown.id && <p className="small-text tip-line">A good first pick: simple and strong.</p>}
      {(() => {
        const now = shown.features.filter((f) => f.level <= level);
        return now.length ? (
          <div className="sub-now">
            <span className="hero-label">What you get now</span>
            <ul>
              {now.map((f) => (
                <li key={f.name}>
                  <strong>{f.name}</strong>
                  {f.uses ? <span className="muted"> · {f.uses}</span> : null}
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      })()}
      {shown.spells.some((g) => g.minLevel <= level) && (
        <p className="small-text">
          <span className="hero-label">Free spells </span>
          {shown.spells.filter((g) => g.minLevel <= level).map((g) => g.spell).join(", ")}
        </p>
      )}
      {shown.expanded && shown.expanded.some(([, l]) => l <= level) && (
        <p className="small-text">
          <span className="hero-label">Extra spells you can learn </span>
          {shown.expanded.filter(([, l]) => l <= level).map(([n]) => n).join(", ")}
        </p>
      )}
      {shown.options && (
        <p className="small-text">
          <span className="hero-label">{shown.optionLabel ?? "Option"} </span>
          you'll pick one: {shown.options.slice(0, 4).map((o) => o.name.split(" (")[0]).join(", ")}
          {shown.options.length > 4 ? "…" : ""}
        </p>
      )}
      {after && (
        <>
          <span className="hero-label">On your sheet</span>
          <ChangeList lines={diffDerived(before, after)} empty="No change to your numbers; its powers are listed above." />
        </>
      )}
    </div>
  ) : (
    <div className="preview-card">
      <PreviewHead title={CL.subclassLabel} previewing={false} empty />
      <p className="small-text">Hover an option to see what it gives you and how it changes your character.</p>
    </div>
  );

  return (
    <>
      <p className="choice-intro">
        Your {CL.subclassLabel.toLowerCase()} is {what}. It gives you powers now and more as you level up, and it can't be changed later. Hover one to see what it gives you.
      </p>
      <WithPreview panel={panel}>
        <div className="option-grid">
          {subs.map((s) => (
            <button type="button" key={s.id} className={`option ${c.subclass === s.id ? "on" : ""}`} onClick={() => s.id !== c.subclass && set(patch(s.id))} aria-pressed={c.subclass === s.id} {...bind(s.id)}>
              <strong>
                {s.name} {s.book !== "PHB14" && s.book !== "PHB24" && <span className="pill">{s.book}</span>}
                {BEGINNER[CL.id] === s.id && <span className="fit-tag">Beginner-friendly</span>}
              </strong>
              <span>{s.summary}</span>
            </button>
          ))}
        </div>
      </WithPreview>
    </>
  );
}
