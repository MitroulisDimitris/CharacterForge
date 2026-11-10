// D&D 3.5 character sheet PDF: abilities/combat/skills, features, spells, equipment, details.
import { ABILITIES, ABILITY_NAMES, signed } from "../dnd5e/data/core";
import { ACCENT, H, HEAD_FILL, LINE, M, MUTED, Sheet, W, WHITE, createDoc, fit } from "../../pdf/primitives";
import type { Character35 } from "./character";
import type { Derived35 } from "./derive";

function pageMain(s: Sheet, c: Character35, d: Derived35, credits: string) {
  const f = s.f;
  s.blankPage();
  s.identityHeader(c.name, [
    ["Class & Level", `Sorcerer ${c.level}`],
    ["Race", d.race.name],
    ["Alignment", c.details.alignment],
    ["Player", c.playerName],
    ["Deity", c.details.deity],
    ["Size / Speed", `${d.race.size} / ${d.speed} ft.`],
  ]);
  const top = 92;

  // Abilities
  ABILITIES.forEach((a, i) => {
    const y = top + i * 40;
    s.box(M, y, 128, 34);
    s.text(a, M + 6, y + 14, 10, f.head, ACCENT);
    s.text(ABILITY_NAMES[a], M + 6, y + 25, 5.8, f.reg, MUTED);
    s.center(String(d.scores[a]), M + 52, 34, y + 23, 15, f.head);
    s.page.drawRectangle({ x: M + 92, y: H - y - 28, width: 30, height: 22, color: WHITE, borderColor: LINE, borderWidth: 0.7 });
    s.center(signed(d.mods[a]), M + 92, 30, y + 21, 12, f.bold);
  });

  // Saves
  const sy = top + 248;
  s.box(M, sy, 128, 78, "Saving Throws");
  d.saves.forEach((sv, i) => {
    const y = sy + 16 + i * 18;
    s.text(sv.name, M + 6, y, 8, f.bold);
    s.text(`${sv.base}+${sv.mod}${sv.misc ? `+${sv.misc}` : ""}`.replace(/\+-/g, "-"), M + 62, y, 6.5, f.reg, MUTED);
    s.text(signed(sv.total), M + 104, y, 10, f.head);
  });
  if (d.saveNotes.length) s.para(d.saveNotes.join("; "), M, sy + 84, 128, 24, 5.8, f.ital);

  // Combat column
  const cx = M + 138;
  const cw = 150;
  const half = (cw - 6) / 2;
  s.statBox(cx, top, half, "Hit Points", String(d.hpMax), 46, 18);
  s.statBox(cx + half + 6, top, half, "Armor Class", String(d.ac), 46, 18);
  s.statBox(cx, top + 58, half, "Touch AC", String(d.touchAc), 40, 14);
  s.statBox(cx + half + 6, top + 58, half, "Flat-Footed", String(d.flatAc), 40, 14);
  s.statBox(cx, top + 110, half, "Initiative", signed(d.initiative), 40, 14);
  s.statBox(cx + half + 6, top + 110, half, "Base Attack", signed(d.bab), 40, 14);
  s.statBox(cx, top + 162, half, "Grapple", signed(d.grapple), 40, 14);
  s.statBox(cx + half + 6, top + 162, half, "Hit Dice", d.hitDice, 40, 14);
  s.box(cx, top + 214, cw, 112, "Spellcasting");
  s.para(
    [
      `Caster level ${d.cl}. Save DC = 10 + spell level + ${d.mods.CHA}.`,
      `Spells per day: ${d.perDay.map((n, i) => `${i === 0 ? "0" : i}: ${n}`).join(", ")}.`,
      `Spells known: ${d.known.map((n, i) => `${i === 0 ? "0" : i}: ${n}`).join(", ")}.`,
      `Melee touch ${signed(d.meleeAtk)}, ranged touch ${signed(d.rangedAtk)}.`,
      d.familiar.id ? `Familiar: ${d.familiar.name} (${d.familiar.benefit}).` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    cx + 6,
    top + 220,
    cw - 12,
    100,
    7.2,
  );
  s.box(cx, top + 338, cw, 58, "Languages");
  s.para(c.languages.join(", "), cx + 6, top + 344, cw - 12, 46, 7.5);

  // Skills
  const kx = cx + cw + 10;
  const kw = W - M - kx;
  const kh = 396;
  s.box(kx, top, kw, kh, "Skills");
  const rowH = (kh - 22) / d.skills.length;
  s.text("CLASS · SKILL", kx + 6, top + 11, 5.5, f.bold, MUTED);
  s.text("RANKS", kx + kw - 60, top + 11, 5.5, f.bold, MUTED);
  s.text("TOTAL", kx + kw - 26, top + 11, 5.5, f.bold, MUTED);
  d.skills.forEach((sk, i) => {
    const y = top + 21 + i * rowH;
    s.dot(kx + 9, y - 2.2, sk.classSkill, 2.4);
    s.text(fit(sk.name + (sk.trainedOnly ? "*" : ""), sk.ranks ? f.bold : f.reg, 6.6, kw - 80), kx + 16, y, 6.6, sk.ranks ? f.bold : f.reg);
    if (sk.ranks) s.text(String(sk.ranks), kx + kw - 52, y, 6.6);
    s.text(sk.usable ? signed(sk.total) : "—", kx + kw - 22, y, 6.8, f.bold);
  });
  s.text("* trained only · ● class skill", kx + 6, top + kh - 4, 5.5, f.ital, MUTED);

  // Attacks
  const at = top + 408;
  const ah = H - 38 - at;
  s.box(M, at, W - 2 * M, ah, "Attacks");
  const cols = [
    { l: "WEAPON / SPELL", x: M + 8, w: 130 },
    { l: "ATTACK", x: M + 142, w: 44 },
    { l: "DAMAGE", x: M + 190, w: 150 },
    { l: "CRITICAL", x: M + 344, w: 50 },
    { l: "NOTES", x: M + 398, w: W - 2 * M - 406 },
  ];
  cols.forEach((col) => s.text(col.l, col.x, at + 14, 6, f.bold, MUTED));
  d.attacks.slice(0, Math.floor((ah - 26) / 14)).forEach((a, i) => {
    const y = at + 28 + i * 14;
    if (i % 2 === 0) s.page.drawRectangle({ x: M + 4, y: H - y - 4, width: W - 2 * M - 8, height: 13, color: HEAD_FILL, opacity: 0.45 });
    s.text(fit(a.name, f.bold, 8, cols[0].w), cols[0].x, y + 5, 8, f.bold);
    s.text(a.bonus, cols[1].x, y + 5, 8);
    s.text(fit(a.damage, f.reg, 8, cols[2].w), cols[2].x, y + 5, 8);
    s.text(a.crit, cols[3].x, y + 5, 8);
    s.text(fit(a.notes, f.reg, 7, cols[4].w), cols[4].x, y + 5, 7, f.reg, MUTED);
  });
  s.creditsLine(credits);
}

function pageSpells(s: Sheet, d: Derived35) {
  const f = s.f;
  s.newPage("Spells");
  let y = 76;
  const cols = [
    { l: "SPELL", w: 110 },
    { l: "SCHOOL", w: 62 },
    { l: "COMP", w: 34 },
    { l: "RANGE", w: 82 },
    { l: "DURATION", w: 84 },
    { l: "SAVE / DC", w: 70 },
    { l: "EFFECT", w: 0 },
  ];
  const tableW = W - 2 * M;
  cols[cols.length - 1].w = tableW - cols.reduce((a, b) => a + b.w, 0);
  for (let lvl = 0; lvl < d.known.length; lvl++) {
    const rows = d.spellRows.filter((r) => r.level === lvl && r.spell);
    y += 6;
    s.text(lvl === 0 ? "0-LEVEL SPELLS" : `LEVEL ${lvl} SPELLS`, M, y + 6, 9, f.head, ACCENT);
    s.text(`Known ${rows.length}/${d.known[lvl]} · Per day ${d.perDay[lvl]}  ${"o ".repeat(d.perDay[lvl])}`, M + 140, y + 6, 7.5, f.bold, MUTED);
    s.line(M, y + 10, M + tableW, y + 10, 0.8, ACCENT);
    y += 16;
    let x = M;
    s.page.drawRectangle({ x: M, y: H - y - 3, width: tableW, height: 11, color: HEAD_FILL });
    cols.forEach((col) => {
      s.text(col.l, x + 3, y + 5, 5.6, f.bold, MUTED);
      x += col.w;
    });
    y += 12;
    for (const r of rows) {
      const sp = r.spell!;
      const cells = [r.name, sp.school, sp.components, r.range, sp.duration, r.dc ? `${sp.save} (DC ${r.dc})` : sp.save, [r.attack ? `touch ${r.attack}` : "", r.effect ?? ""].filter(Boolean).join("; ")];
      x = M;
      cells.forEach((cell, i) => {
        const font = i === 0 ? f.bold : f.reg;
        s.text(fit(cell, font, i === 0 ? 7.2 : 6.6, cols[i].w - 5), x + 3, y + 5, i === 0 ? 7.2 : 6.6, font);
        x += cols[i].w;
      });
      s.line(M, y + 8, M + tableW, y + 8, 0.25);
      y += 12;
    }
    y += 6;
  }
  y += 6;
  s.para(d.spellRows.filter((r) => r.spell).map((r) => `${r.name}: ${r.spell!.desc}`).join("\n"), M, y, W - 2 * M, H - 40 - y, 7);
}

function pageEquipment(s: Sheet, c: Character35, d: Derived35) {
  const f = s.f;
  s.newPage("Equipment");
  const top = 76;
  const coinW = (W - 2 * M - 18) / 4;
  (["cp", "sp", "gp", "pp"] as const).forEach((k, i) => {
    const x = M + i * (coinW + 6);
    s.box(x, top, coinW, 40, k.toUpperCase());
    s.center(String(c.coins[k]), x, coinW, top + 26, 15, f.head);
  });
  const t2 = top + 56;
  const third = (W - 2 * M - 12) / 3;
  [["Carried", `${d.carried.toFixed(1)} lb.`], ["Light / Medium load", `${d.load.light} / ${d.load.medium} lb.`], ["Heavy load", `${d.load.heavy} lb.`]].forEach(([l, v], i) => {
    const x = M + i * (third + 6);
    s.box(x, t2, third, 32, l);
    s.center(v, x, third, t2 + 20, 11, f.bold);
  });
  const it = t2 + 46;
  const ih = H - 34 - it;
  s.box(M, it, W - 2 * M, ih, "Inventory");
  c.inventory.slice(0, Math.floor((ih - 26) / 13)).forEach((item, i) => {
    const y = it + 20 + i * 13;
    s.line(M + 8, y + 3, W - M - 8, y + 3, 0.3);
    s.text(fit(item.name, f.reg, 8, 360), M + 8, y, 8);
    s.text(`× ${item.qty}`, W - M - 120, y, 8);
    s.text(`${+(item.qty * item.weight).toFixed(2)} lb.`, W - M - 60, y, 8);
  });
}

function pageDetails(s: Sheet, c: Character35) {
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
    ["Deity", dt.deity],
  ];
  short.forEach(([l, v], i) => s.labeledValue(l, v || "—", M + (i % 4) * (cw + 8), top + Math.floor(i / 4) * 28, cw));
  s.stackedBoxes(M, top + 70, W - 2 * M, [
    ["Personality", dt.personality, 120],
    ["Backstory", dt.backstory, 200],
    ["Allies & Organizations", dt.allies, 80],
    ["Notes", dt.notes, 90],
  ]);
}

export async function buildPdf35(c: Character35, d: Derived35, credits: string): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc(`${c.name} - Sorcerer ${c.level} (D&D 3.5)`, c.playerName);
  const s = new Sheet(doc, fonts, { name: c.name, subtitle: `${d.identity} · D&D 3.5 rules` });
  pageMain(s, c, d, credits);
  s.flowSections("Features & Feats", d.featureGroups);
  pageSpells(s, d);
  pageEquipment(s, c, d);
  pageDetails(s, c);
  return doc.save();
}
