// Pathfinder 2e character sheet PDF: stats/skills/strikes, features & feats, spells, inventory, details.
import { ACCENT, H, HEAD_FILL, M, MUTED, Sheet, W, createDoc, fit } from "../../pdf/primitives";
import type { CharacterPF2 } from "./character";
import type { DerivedPF2 } from "./derive";
import { ATTRS, ATTR_NAMES, RANK_LETTER } from "./data";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function pageMain(s: Sheet, c: CharacterPF2, d: DerivedPF2, credits: string) {
  const f = s.f;
  s.blankPage();
  s.identityHeader(c.name, [
    ["Ancestry & Heritage", d.identity.split(" · ")[0]],
    ["Background", d.bg.name],
    ["Class & Level", `Sorcerer ${c.level}`],
    ["Bloodline", `${d.bloodline.name}${d.option ? ` (${d.option.name})` : ""}`],
    ["Player", c.playerName],
    ["Deity", c.details.deity],
  ]);
  const top = 92;

  // Attributes row
  const aw = (W - 2 * M - 25) / 6;
  ATTRS.forEach((a, i) => {
    const x = M + i * (aw + 5);
    s.box(x, top, aw, 46);
    s.center(ATTR_NAMES[a].toUpperCase(), x, aw, top + 11, 6, f.bold, ACCENT);
    s.center(signed(d.mods[a]) + (d.partial.has(a) ? "*" : ""), x, aw, top + 34, 18, f.head);
  });

  // Defense/stats row
  const r2 = top + 60;
  const sw = (W - 2 * M - 30) / 6;
  const stats: [string, string][] = [
    ["Armor Class", String(d.ac)],
    ["Hit Points", String(d.hpMax)],
    ["Perception", signed(d.perception)],
    ["Speed", `${d.speed} ft`],
    ["Class DC", String(d.classDc)],
    ["Spell DC / Atk", `${d.spellDc} / ${signed(d.spellAttack)}`],
  ];
  stats.forEach(([l, v], i) => s.statBox(M + i * (sw + 6), r2, sw, l, v, 44, v.length > 6 ? 12 : 17));

  // Saves
  const r3 = r2 + 58;
  const third = (W - 2 * M - 12) / 3;
  d.saves.forEach((sv, i) => {
    const x = M + i * (third + 6);
    s.box(x, r3, third, 34, `${sv.name} (${RANK_LETTER[sv.rank]})`);
    s.center(signed(sv.total), x, third, r3 + 22, 15, f.head);
  });

  // Skills (left) and info (right)
  const r4 = r3 + 48;
  const kw = 230;
  const rows = [...d.skills.map((sk) => ({ name: sk.name, attr: sk.attr, rank: sk.rank, total: sk.total })), { name: d.lore.name, attr: "INT", rank: 1, total: d.lore.total }];
  const kh = 22 + rows.length * 13.5;
  s.box(M, r4, kw, kh, "Skills");
  rows.forEach((sk, i) => {
    const y = r4 + 18 + i * 13.5;
    s.dot(M + 9, y - 2.5, sk.rank > 0);
    s.text(fit(sk.name, sk.rank ? f.bold : f.reg, 8, 130), M + 16, y, 8, sk.rank ? f.bold : f.reg);
    s.text(sk.attr, M + 150, y, 6.5, f.reg, MUTED);
    s.text(RANK_LETTER[sk.rank], M + 178, y, 7.5, f.bold, ACCENT);
    s.text(signed(sk.total), M + kw - 28, y, 8.5, f.bold);
  });

  const ix = M + kw + 10;
  const iw = W - M - ix;
  s.box(ix, r4, iw, 92, "Senses & Traits");
  s.para(
    [
      `${d.vision}. Size ${d.ancestry.size}. Ancestry HP ${d.ancestryHp}.`,
      d.ancestry.trait ?? "",
      d.heritage ? `${d.heritage.name}: ${d.heritage.text}` : "",
      `Focus Points: 1. Hero Points: [ ] [ ] [ ]`,
    ]
      .filter(Boolean)
      .join("\n"),
    ix + 7,
    r4 + 6,
    iw - 14,
    82,
    7.4,
  );
  s.box(ix, r4 + 104, iw, 70, "Languages");
  s.para(c.languages.join(", "), ix + 7, r4 + 110, iw - 14, 58, 7.8);
  s.box(ix, r4 + 186, iw, kh - 186, "Proficiencies");
  s.para(`Weapons: simple and unarmed (trained)\nDefense: unarmored (trained)\nSpellcasting: ${d.tradition ?? "?"} (trained)\nClass DC: trained`, ix + 7, r4 + 192, iw - 14, kh - 200, 7.6);

  // Strikes
  const at = r4 + kh + 14;
  const ah = H - 38 - at;
  s.box(M, at, W - 2 * M, ah, "Strikes");
  const cols = [
    { l: "NAME", x: M + 8, w: 130 },
    { l: "ATTACK (MAP)", x: M + 142, w: 90 },
    { l: "DAMAGE", x: M + 236, w: 130 },
    { l: "TRAITS", x: M + 370, w: W - 2 * M - 378 },
  ];
  cols.forEach((col) => s.text(col.l, col.x, at + 14, 6, f.bold, MUTED));
  d.strikes.slice(0, Math.max(0, Math.floor((ah - 26) / 14))).forEach((st, i) => {
    const y = at + 28 + i * 14;
    if (i % 2 === 0) s.page.drawRectangle({ x: M + 4, y: H - y - 4, width: W - 2 * M - 8, height: 13, color: HEAD_FILL, opacity: 0.45 });
    s.text(fit(st.name, f.bold, 8, cols[0].w), cols[0].x, y + 5, 8, f.bold);
    s.text(fit(st.attack, f.reg, 8, cols[1].w), cols[1].x, y + 5, 8);
    s.text(fit(st.damage, f.reg, 8, cols[2].w), cols[2].x, y + 5, 8);
    s.text(fit(st.traits, f.reg, 7, cols[3].w), cols[3].x, y + 5, 7, f.reg, MUTED);
  });
  s.creditsLine(credits);
}

function pageSpells(s: Sheet, d: DerivedPF2) {
  const f = s.f;
  s.newPage("Spells");
  let y = 72;
  const items: [string, string][] = [
    ["Tradition", d.tradition ?? "—"],
    ["Spell DC", String(d.spellDc)],
    ["Spell attack", signed(d.spellAttack)],
    ["Cantrip rank", String(d.cantripRank)],
    ["Focus points", "1"],
  ];
  const bw = (W - 2 * M - 20) / 5;
  items.forEach(([l, v], i) => s.statBox(M + i * (bw + 5), y, bw, l, v, 34, 12));
  y += 52;
  const tableW = W - 2 * M;
  for (let rank = 0; rank < d.slots.length; rank++) {
    const rows = d.repertoire.filter((r) => r.rank === rank);
    s.text(rank === 0 ? "CANTRIPS" : `RANK ${rank}`, M, y + 6, 9, f.head, ACCENT);
    s.text(rank === 0 ? "At will" : `${d.slots[rank]} slots  ${"o ".repeat(d.slots[rank])}`, M + 90, y + 6, 7.5, f.bold, MUTED);
    s.line(M, y + 10, M + tableW, y + 10, 0.8, ACCENT);
    y += 18;
    for (const r of rows) {
      const tag = [r.gift ? "gift" : "", r.signature ? "signature" : ""].filter(Boolean).join(", ");
      s.text(fit(r.name + (tag ? ` (${tag})` : ""), f.bold, 7.6, 170), M + 4, y, 7.6, f.bold);
      const meta = r.spell ? `${[`${r.spell.actions} act`, r.spell.range, r.spell.defense !== "—" ? r.spell.defense : "", r.damage ?? ""].filter(Boolean).join(" · ")} — ${r.spell.desc}` : "See Archives of Nethys.";
      s.text(fit(meta, f.reg, 6.8, tableW - 180), M + 178, y, 6.8, f.reg, MUTED);
      s.line(M, y + 3.5, M + tableW, y + 3.5, 0.25);
      y += 12;
    }
    y += 8;
  }
  s.text("FOCUS SPELL", M, y + 6, 9, f.head, ACCENT);
  s.line(M, y + 10, M + tableW, y + 10, 0.8, ACCENT);
  y += 18;
  s.para(`${d.bloodline.focus.name} (${d.bloodline.focus.actions} action(s)): ${d.bloodline.focus.text}\nBlood magic: ${d.bloodline.bloodMagic}`, M + 4, y - 8, tableW - 8, 60, 7.6);
}

function pageInventory(s: Sheet, c: CharacterPF2, d: DerivedPF2) {
  const f = s.f;
  s.newPage("Inventory");
  const top = 76;
  const coinW = (W - 2 * M - 18) / 4;
  (["cp", "sp", "gp", "pp"] as const).forEach((k, i) => {
    const x = M + i * (coinW + 6);
    s.statBox(x, top, coinW, k.toUpperCase(), String(c.coins[k]), 40, 15);
  });
  const t2 = top + 56;
  const third = (W - 2 * M - 12) / 3;
  [["Bulk carried", d.bulkText(d.bulk)], ["Encumbered over", String(d.encumbered)], ["Maximum", String(d.maxBulk)]].forEach(([l, v], i) => s.statBox(M + i * (third + 6), t2, third, l, v, 32, 11));
  const it = t2 + 46;
  const ih = H - 34 - it;
  s.box(M, it, W - 2 * M, ih, "Items");
  c.inventory.slice(0, Math.floor((ih - 26) / 13)).forEach((item, i) => {
    const y = it + 20 + i * 13;
    s.line(M + 8, y + 3, W - M - 8, y + 3, 0.3);
    s.text(fit(item.name, f.reg, 8, 360), M + 8, y, 8);
    s.text(`× ${item.qty}`, W - M - 120, y, 8);
    s.text(item.bulk === 0 ? "—" : item.bulk < 1 ? "L" : String(item.bulk), W - M - 50, y, 8);
  });
}

function pageDetails(s: Sheet, c: CharacterPF2) {
  const dt = c.details;
  s.newPage("Character Details");
  const top = 72;
  const cw = (W - 2 * M - 24) / 4;
  ([
    ["Deity", dt.deity],
    ["Gender", dt.gender],
    ["Age", dt.age],
    ["Height / Weight", `${dt.height} / ${dt.weight}`],
  ] as [string, string][]).forEach(([l, v], i) => s.labeledValue(l, v || "—", M + i * (cw + 8), top, cw));
  s.stackedBoxes(M, top + 42, W - 2 * M, [
    ["Edicts & Anathema", `Edicts: ${dt.edicts || "—"}\nAnathema: ${dt.anathema || "—"}`, 50],
    ["Appearance", dt.appearance, 50],
    ["Personality", dt.personality, 100],
    ["Backstory", dt.backstory, 150],
    ["Allies & Organizations", dt.allies, 60],
    ["Notes", dt.notes, 60],
  ]);
}

export async function buildPdfPF2(c: CharacterPF2, d: DerivedPF2, credits: string): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc(`${c.name} - Sorcerer ${c.level} (Pathfinder 2e)`, c.playerName);
  const s = new Sheet(doc, fonts, { name: c.name, subtitle: `${d.identity} · ${d.bg.name} · Pathfinder 2e Remaster` });
  pageMain(s, c, d, credits);
  s.flowSections("Features & Feats", d.featureGroups);
  pageSpells(s, d);
  pageInventory(s, c, d);
  pageDetails(s, c);
  return doc.save();
}
