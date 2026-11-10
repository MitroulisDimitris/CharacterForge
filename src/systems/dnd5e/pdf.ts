// D&D 5e character sheet PDF (2014 and 2024): core stats, features, equipment, details, spells.
import { ABILITIES, ABILITY_NAMES, signed } from "./data/core";
import { cantripDamage, castingTimeLabel, levelLabel } from "./data/spells";
import type { Character } from "./character";
import type { Derived, SpellRow } from "./derive";
import { ACCENT, H, HEAD_FILL, INK, LINE, M, MUTED, Sheet, W, WHITE, createDoc, fit } from "../../pdf/primitives";

function pageMain(s: Sheet, c: Character, d: Derived, credits: string) {
  const f = s.f;
  s.blankPage();
  s.identityHeader(c.name, [
    ["Class & Level", `${d.cls.name} ${c.level}${d.subclassActive && d.subclass ? ` (${d.subclass.name.replace(" Sorcery", "").replace(" Bloodline", "").replace(" Domain", "").replace(/^The /, "")})` : ""}`],
    [d.rules.speciesWord, d.species.name.replace(" (2014 legacy)", "") + (d.lineage ? ` (${d.lineage.name})` : "")],
    ["Background", d.bg.name.replace(" (2014 legacy)", "")],
    ["Player Name", c.playerName],
    ["Alignment", c.details.alignment],
    ["Rules", `D&D ${c.edition}`],
  ]);

  const top = 92;
  ABILITIES.forEach((a, i) => {
    const y = top + i * 76;
    s.box(M, y, 64, 68);
    s.center(ABILITY_NAMES[a].toUpperCase(), M, 64, y + 11, 6.2, f.bold, ACCENT);
    s.center(signed(d.mods[a]), M, 64, y + 38, 20, f.head);
    s.page.drawEllipse({ x: M + 32, y: H - y - 56, xScale: 13, yScale: 7.5, color: WHITE, borderColor: LINE, borderWidth: 0.7 });
    s.center(String(d.scores[a]), M, 64, y + 59, 9, f.bold);
  });

  const sx = M + 74;
  const sw = 160;
  s.box(sx, top, sw, 128, "Saving Throws");
  d.saves.forEach((sv, i) => {
    const y = top + 12 + i * 14.5;
    s.dot(sx + 10, y + 2.5, sv.proficient);
    s.text(signed(sv.bonus), sx + 18, y + 5, 8.5, f.bold);
    s.text(ABILITY_NAMES[sv.ability], sx + 40, y + 5, 8.5, f.reg);
  });
  if (d.species.savingThrowNote) s.para(d.species.savingThrowNote, sx + 6, top + 99, sw - 12, 22, 6, f.ital);

  s.box(sx, top + 140, sw, 314, "Skills");
  d.skills.forEach((sk, i) => {
    const y = top + 150 + i * 16.6;
    s.dot(sx + 10, y + 2.5, sk.proficient);
    s.text(signed(sk.bonus), sx + 18, y + 5, 8.5, f.bold);
    s.text(sk.name, sx + 40, y + 5, 8.5, sk.proficient ? f.bold : f.reg);
    s.text(sk.ability, sx + sw - 24, y + 5, 6.5, f.reg, MUTED);
  });

  const rx = sx + sw + 10;
  const rw = W - M - rx;
  const third = (rw - 12) / 3;
  s.statBox(rx, top, third, "Armor Class", String(d.ac));
  s.statBox(rx + third + 6, top, third, "Initiative", signed(d.initiative));
  s.statBox(rx + 2 * (third + 6), top, third, "Speed", `${d.speed} ft`);

  s.box(rx, top + 64, rw, 56, "Hit Points");
  const hpw = rw / 3;
  [["Max HP", String(d.hpMax)], ["Current HP", ""], ["Temp HP", ""]].forEach(([l, v], i) => {
    s.center(l.toUpperCase(), rx + i * hpw, hpw, top + 75, 6, f.bold, MUTED);
    if (v) s.center(v, rx + i * hpw, hpw, top + 103, 20, f.head, ACCENT);
    if (i > 0) s.line(rx + i * hpw, top + 70, rx + i * hpw, top + 114, 0.5);
  });

  const half = (rw - 6) / 2;
  s.box(rx, top + 132, half, 40, "Hit Dice");
  s.center(d.hitDice, rx, half, top + 158, 14, f.head);
  s.box(rx + half + 6, top + 132, half, 40, "Death Saves");
  ["Successes", "Failures"].forEach((l, i) => {
    const y = top + 146 + i * 12;
    s.text(l, rx + half + 12, y + 3, 6.5, f.reg, MUTED);
    for (let k = 0; k < 3; k++) s.dot(rx + half + 62 + k * 11, y + 0.5, false, 3.5);
  });

  s.statBox(rx, top + 184, third, "Prof. Bonus", signed(d.pb));
  s.statBox(rx + third + 6, top + 184, third, "Spell Save DC", d.caster ? String(d.spellDc) : "—");
  s.statBox(rx + 2 * (third + 6), top + 184, third, "Spell Attack", d.caster ? signed(d.spellAttack) : "—");

  s.box(rx, top + 248, rw, 92, "Senses & Defenses");
  const senses = [
    `Passive Perception ${d.passivePerception} · Insight ${d.passiveInsight} · Investigation ${d.passiveInvestigation}`,
    d.darkvision ? `Darkvision ${d.darkvision} ft.` : "",
    d.resistances.length ? `Resistances: ${d.resistances.join(", ")}` : "",
    d.immunities.length ? `Immunities: ${d.immunities.join(", ")}` : "",
    d.species.savingThrowNote ?? "",
    `${d.cls.sorcery ? `Sorcery Points: ${d.sorceryPoints} · ` : ""}${c.edition === "2024" ? "Heroic Inspiration: [  ]" : "Inspiration: [  ]"}`,
  ]
    .filter(Boolean)
    .join("\n");
  s.para(senses, rx + 7, top + 254, rw - 14, 80, 7.5);

  s.box(rx, top + 352, rw, 102, "Proficiencies & Languages");
  s.para(`Armor: ${d.armorText}\nWeapons: ${d.weaponText}\nTools: ${d.tools || "—"}\nLanguages: ${c.languages.join(", ") || "—"}`, rx + 7, top + 358, rw - 14, 90, 7.5);

  const at = top + 466;
  const ah = H - 38 - at;
  s.box(M, at, W - 2 * M, ah, "Weapon Attacks & Cantrips");
  const cols = [
    { l: "NAME", x: M + 8, w: 120 },
    { l: "HIT / DC", x: M + 132, w: 50 },
    { l: "DAMAGE / TYPE", x: M + 186, w: 120 },
    { l: "NOTES", x: M + 310, w: W - 2 * M - 318 },
  ];
  cols.forEach((col) => s.text(col.l, col.x, at + 14, 6, f.bold, MUTED));
  d.attacks.slice(0, Math.floor((ah - 26) / 14)).forEach((a, i) => {
    const y = at + 28 + i * 14;
    if (i % 2 === 0) s.page.drawRectangle({ x: M + 4, y: H - y - 4, width: W - 2 * M - 8, height: 13, color: HEAD_FILL, opacity: 0.45 });
    s.text(fit(a.name, f.bold, 8, cols[0].w), cols[0].x, y + 5, 8, f.bold);
    s.text(fit(a.bonus, f.reg, 8, cols[1].w), cols[1].x, y + 5, 8);
    s.text(fit(a.damage, f.reg, 8, cols[2].w), cols[2].x, y + 5, 8);
    s.text(fit(a.notes, f.reg, 7, cols[3].w), cols[3].x, y + 5, 7, f.reg, MUTED);
  });
  s.creditsLine(credits);
}

function pageEquipment(s: Sheet, c: Character, d: Derived) {
  const f = s.f;
  s.newPage("Equipment");
  const top = 76;
  const coinW = (W - 2 * M - 24) / 5;
  (["cp", "sp", "ep", "gp", "pp"] as const).forEach((k, i) => {
    const x = M + i * (coinW + 6);
    s.box(x, top, coinW, 40, k.toUpperCase());
    s.center(String(c.coins[k]), x, coinW, top + 26, 15, f.head);
  });
  const t2 = top + 56;
  const third = (W - 2 * M - 12) / 3;
  [["Weight Carried", `${d.carried.toFixed(1)} lb.`], ["Carrying Capacity", `${d.capacity} lb.`], ["Push / Drag / Lift", `${d.capacity * 2} lb.`]].forEach(([l, v], i) => {
    const x = M + i * (third + 6);
    s.box(x, t2, third, 32, l);
    s.center(v, x, third, t2 + 20, 11, f.bold);
  });

  const it = t2 + 46;
  const ih = H - 34 - it;
  s.box(M, it, W - 2 * M, ih, "Inventory");
  const colW = (W - 2 * M - 24) / 2;
  const rowsPerCol = Math.floor((ih - 26) / 13);
  for (let side = 0; side < 2; side++) {
    const x = M + 8 + side * (colW + 8);
    s.text("NAME", x, it + 14, 6, f.bold, MUTED);
    s.text("QTY", x + colW - 74, it + 14, 6, f.bold, MUTED);
    s.text("WEIGHT", x + colW - 40, it + 14, 6, f.bold, MUTED);
  }
  c.inventory.slice(0, rowsPerCol * 2).forEach((item, i) => {
    const side = Math.floor(i / rowsPerCol);
    const row = i % rowsPerCol;
    const x = M + 8 + side * (colW + 8);
    const y = it + 26 + row * 13;
    s.line(x, y + 3, x + colW, y + 3, 0.3);
    s.text(fit(item.name, f.reg, 8, colW - 82), x, y, 8);
    s.text(String(item.qty), x + colW - 70, y, 8);
    s.text(`${+(item.qty * item.weight).toFixed(2)} lb.`, x + colW - 40, y, 8);
  });
  if (c.inventory.length > rowsPerCol * 2) s.text(`+${c.inventory.length - rowsPerCol * 2} more items`, M + 8, it + ih - 6, 7, f.ital, MUTED);
}

function pageDetails(s: Sheet, c: Character) {
  const dt = c.details;
  s.newPage("Character Details");
  const top = 72;
  const cw = (W - 2 * M - 24) / 4;
  const short: [string, string][] = [
    ["Gender", dt.gender],
    ["Age", dt.age],
    ["Height", dt.height],
    ["Weight", dt.weight],
    ["Eyes", dt.eyes],
    ["Hair", dt.hair],
    ["Skin", dt.skin],
    ["Faith", dt.faith],
    ["Size", c.size],
    ["Alignment", dt.alignment],
  ];
  short.forEach(([l, v], i) => s.labeledValue(l, v || "—", M + (i % 4) * (cw + 8), top + Math.floor(i / 4) * 28, cw));
  const leftW = (W - 2 * M - 10) * 0.42;
  const rightX = M + leftW + 10;
  s.stackedBoxes(M, top + 96, leftW, [
    ["Personality Traits", dt.personality, 78],
    ["Ideals", dt.ideals, 56],
    ["Bonds", dt.bonds, 56],
    ["Flaws", dt.flaws, 70],
    ["Appearance", dt.appearance, 70],
  ]);
  s.stackedBoxes(rightX, top + 96, W - M - rightX, [
    ["Backstory", dt.backstory, 230],
    ["Allies & Organizations", dt.allies, 90],
    ["Additional Notes", dt.notes, 96],
  ]);
}

const kindOrder = (r: SpellRow) => ({ Cantrip: 0, Prepared: 0, Always: 1, Innate: 2 })[r.kind];

function pageSpells(s: Sheet, c: Character, d: Derived) {
  const f = s.f;
  s.newPage("Spells");
  const top = 72;
  const items: [string, string][] = [
    ["Class", d.cls.name],
    ["Ability", d.castAbility],
    ["Save DC", String(d.spellDc)],
    ["Attack", signed(d.spellAttack)],
    d.cls.sorcery ? ["Sorcery Pts", String(d.sorceryPoints)] : ["Slots", d.slots.map((n, i) => (n ? `${n}x${i + 1}` : "")).filter(Boolean).join(" ") || "—"],
    [`Cantrips / ${d.spellsKind}`, `${d.cantripLimit} / ${d.preparedLimit}`],
  ];
  const bw = (W - 2 * M - 25) / 6;
  items.forEach(([l, v], i) => {
    const x = M + i * (bw + 5);
    s.box(x, top, bw, 34, l);
    s.center(v, x, bw, top + 22, 12, f.head);
  });

  const cols = [
    { l: d.spellsKind === "Known" ? "KNOWN" : "PREP", w: 24 },
    { l: "SPELL NAME", w: 104 },
    { l: "SOURCE", w: 90 },
    { l: "SAVE/ATK", w: 40 },
    { l: "TIME", w: 30 },
    { l: "RANGE", w: 62 },
    { l: "COMP", w: 30 },
    { l: "DURATION", w: 62 },
    { l: "NOTES", w: 0 },
  ];
  const tableW = W - 2 * M;
  cols[cols.length - 1].w = tableW - cols.reduce((a, b) => a + b.w, 0);
  let y = top + 52;
  const bottom = H - 32;
  const header = () => {
    let x = M;
    s.page.drawRectangle({ x: M, y: H - y - 10, width: tableW, height: 12, color: HEAD_FILL });
    cols.forEach((col) => {
      s.text(col.l, x + 3, y, 5.8, f.bold, MUTED);
      x += col.w;
    });
    y += 12;
  };
  header();

  const rows = [...d.spellRows].sort((a, b) => a.level - b.level || kindOrder(a) - kindOrder(b));
  for (const lvl of [...new Set(rows.map((r) => r.level))]) {
    if (y + 30 > bottom) {
      s.newPage("Spells (cont.)");
      y = 76;
      header();
    }
    const n = d.slots[lvl - 1] ?? 0;
    y += 6;
    s.text(lvl === 0 ? "CANTRIPS" : levelLabel(lvl).toUpperCase(), M + 3, y + 6, 8.5, f.head, ACCENT);
    s.text(lvl === 0 ? "At will" : `${n} slots  ${"o ".repeat(n)}`, M + 130, y + 6, 7.5, f.bold, MUTED);
    s.line(M, y + 9, M + tableW, y + 9, 0.8, ACCENT);
    y += 13;
    for (const r of rows.filter((x) => x.level === lvl)) {
      if (y + 12 > bottom) {
        s.newPage("Spells (cont.)");
        y = 76;
        header();
      }
      spellRow(s, c, r, cols, y);
      y += 12;
    }
  }
  y += 10;
  if (y + 30 < bottom) s.text("O = chosen, * = granted by subclass, I = innate (race/species or feat). C = Concentration, R = Ritual.", M, y + 6, 6.5, f.ital, MUTED);
}

function spellRow(s: Sheet, c: Character, r: SpellRow, cols: { l: string; w: number }[], y: number) {
  const f = s.f;
  const sp = r.spell;
  const mark = r.kind === "Always" ? "*" : r.kind === "Innate" ? "I" : "O";
  const saveAtk = sp?.attack ? signed(r.attackBonus) : sp?.save ? `${sp.save} ${r.saveDc}` : "—";
  const flags = [sp?.concentration ? "C" : "", sp?.ritual ? "R" : ""].filter(Boolean).join(" ");
  const dmg = sp && sp.level === 0 ? cantripDamage(sp, c.level) : sp?.damage;
  const notes = [dmg, sp?.costly ? `Needs ${sp.costly.item}` : "", r.note].filter(Boolean).join("; ");
  const cells = [
    mark,
    r.name + (flags ? ` (${flags})` : ""),
    r.source,
    saveAtk,
    sp ? castingTimeLabel(sp.time).replace("Bonus Action", "BA").replace("Reaction", "R").replace("Action", "A") : "",
    sp?.range ?? "",
    sp?.components ?? "",
    sp?.duration ?? "",
    notes,
  ];
  s.line(M, y + 7.8, W - M, y + 7.8, 0.25);
  let x = M;
  cells.forEach((cell, i) => {
    const font = i === 1 ? f.bold : f.reg;
    const size = i === 1 ? 7.2 : 6.6;
    s.text(fit(cell, font, size, cols[i].w - 5), x + 3, y + 5, size, font, i === 2 || i === 8 ? MUTED : INK);
    x += cols[i].w;
  });
}

export async function buildPdf(c: Character, d: Derived, credits: string): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc(`${c.name} - ${d.cls.name} ${c.level} (D&D ${c.edition})`, c.playerName);
  const s = new Sheet(doc, fonts, { name: c.name, subtitle: `${d.identity} · ${d.bg.name.replace(" (2014 legacy)", "")} · D&D ${c.edition} rules` });
  pageMain(s, c, d, credits);
  s.flowSections("Features & Traits", d.featureGroups);
  pageEquipment(s, c, d);
  pageDetails(s, c);
  if (d.caster || d.spellRows.length) pageSpells(s, c, d);
  return doc.save();
}
