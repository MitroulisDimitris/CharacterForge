// A spell's full text (src/spellText.ts): paragraphs, bullet lists, small tables and stat blocks,
// then "At Higher Levels.". `prose` turns a sentence into text with dice chips (the character's
// Spells tab and the Wiki each have their own).
import type { ReactNode } from "react";
import type { SpellPart } from "../spellText";

/** "Fireworks. The target…" / "Coming of Age. You touch…" / "Pack Tactics (Land Only). The…": the
 *  lead words in bold (up to five words, then an optional bracket). */
const LEAD = /^((?:[A-Z][A-Za-z'’-]*|of|the|and|or)(?: (?:[A-Z][A-Za-z'’-]*|of|the|and|or)){0,4}(?: \([^)]{1,40}\))?)\.\s/;
const BLOCK_LABEL = /^(Armor Class|Hit Points|Speed|Damage Immunities|Damage Resistances|Damage Vulnerabilities|Condition Immunities|Senses|Languages|Challenge)\b/;
const BLOCK_HEAD = /^(Actions|Bonus Actions|Reactions)$/;

function Lead({ text, prose }: { text: string; prose: (t: string) => ReactNode }) {
  const m = LEAD.exec(text);
  // A one-word lead must be followed by a capitalised sentence ("Smoke. Thick black smoke…")
  if (m && /[a-z]/.test(m[1]) && /^[A-Z]/.test(text.slice(m[0].length)))
    return (
      <>
        <strong>{m[1]}.</strong> {prose(text.slice(m[0].length))}
      </>
    );
  return <>{prose(text)}</>;
}

function Block({ lines, prose }: { lines: string[]; prose: (t: string) => ReactNode }) {
  const [name, kind, ...rest] = lines;
  return (
    <div className="spell-block" role="group" aria-label={name}>
      <strong className="spell-block-name">{name}</strong>
      <em className="spell-block-kind">{kind}</em>
      {rest.map((l, i) => {
        if (BLOCK_HEAD.test(l))
          return (
            <h5 key={i} className="spell-block-head">
              {l}
            </h5>
          );
        if (/^STR \d/.test(l))
          return (
            <dl key={i} className="spell-block-abilities">
              {l.split(" · ").map((a) => {
                const [k, ...v] = a.split(" ");
                return (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v.join(" ")}</dd>
                  </div>
                );
              })}
            </dl>
          );
        const lab = BLOCK_LABEL.exec(l);
        if (lab)
          return (
            <p key={i}>
              <strong>{lab[1]}</strong>
              {l.slice(lab[1].length)}
            </p>
          );
        return (
          <p key={i}>
            <Lead text={l} prose={prose} />
          </p>
        );
      })}
    </div>
  );
}

export function SpellParts({ parts, higher, prose }: { parts: SpellPart[]; higher?: string; prose: (t: string) => ReactNode }) {
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === "string") {
          if (p.startsWith("• "))
            return (
              <p key={i} className="spell-bullet">
                <Lead text={p.slice(2)} prose={prose} />
              </p>
            );
          return (
            <p key={i}>
              <Lead text={p} prose={prose} />
            </p>
          );
        }
        if ("table" in p) {
          const [head, ...rows] = p.table;
          return (
            <table key={i} className="spell-table">
              <thead>
                <tr>
                  {head.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return <Block key={i} lines={p.block} prose={prose} />;
      })}
      {higher && (
        <p>
          <strong>At Higher Levels.</strong> {prose(higher)}
        </p>
      )}
    </>
  );
}
