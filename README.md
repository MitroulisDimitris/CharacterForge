# Character Forge

A character builder under four rule sets. D&D 5e (2014) covers **all 12 classes plus the Artificer**,
built from scratch step by step, levels 1–5. The other rule sets
cover a **Sorcerer, levels 1–5**, built around Parry Hotter.
React + Vite + TypeScript, no backend; everything is saved in your browser.

## Run it

Double-click `start.bat`, or:

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Choosing the rules

**My characters** lists every saved character. **+ New character** asks for:

1. **Game rules**: D&D 5e (2024), D&D 5e (2014), D&D 3.5, or Pathfinder 2e (Remaster).
2. **Allowed books**: the system's core book is always on. Tick whatever else your DM allows.
3. **D&D 5e 2014: build it step by step** (Player's Handbook chapter 1 order, class first):
   Class → Race → Ability scores → Background (+ personality) → Skills & languages → Equipment →
   Spells → Details → Review. Each step explains itself; anything you skip stays on the sheet as a
   warning until it's done. **Other rule sets: start from** Parry Hotter (level 5) or a blank Sorcerer.

The rules are **fixed for that character**; the books can be changed later with the **Books** badge
at the top of the sheet (adding a book offers its options; removing one deletes nothing, it just
warns about options that now come from a book that isn't allowed). Options from books you didn't
allow aren't offered. To play the same hero under other rules, create another character.

| System | Books | What's in it |
| --- | --- | --- |
| D&D 5e — 2024 | PHB 2024 (+ legacy PHB 2014 options, Xanathar's) | Species, backgrounds with ability boosts and origin feats, 4 subclasses, prepared spells |
| D&D 5e — 2014 | PHB 2014 (+ Xanathar's, Tasha's) | 12 classes + Artificer (levels 1–5), every PHB/Xanathar's/Tasha's subclass with its features to 5th level, invocations, pact boons, infusions, all PHB races + Custom Lineage, 13 backgrounds + variants + custom background, all 72 feats with prerequisites, every class's cantrips and 1st-level spells, armor/AC and weapon proficiencies, starting equipment or starting gold, Tasha's custom origin and optional ranger features |
| D&D 3.5 | Player's Handbook v3.5 | Core races, skill points and ranks (with synergies), feats, BAB and saves, spells per day with bonus spells, familiars |
| Pathfinder 2e | Player Core + Player Core 2 | 16 ancestries with heritages, versatile heritages, 17 backgrounds, 10 bloodlines, attribute boosts (with partial boosts), proficiency ranks, repertoire and signature spells |

Every system has rule checks (a warnings panel), JSON export/import, a 5-page PDF, and both themes.

## Leveling up (and down)

Changing the level opens a **promotion** screen. It shows what improves (HP, DCs, slots…), each new feature with a plain-words tip, and the choices the new level unlocks. You can **choose now**: each choice opens the right controls, with live checks and a ✓ when it's done. Or you can **skip for later**: skipped choices stay as a to-do list at the top of the sheet until you finish them.

Lowering the level shows what you lose and which choices no longer fit, such as spells above your new level. You can remove them automatically or keep them and fix things by hand.

This follows the project's direction (see `CLAUDE.md`): the app should accompany the player through the campaign and help them learn the rules as they go.

## Where the rules data comes from

- **Pathfinder 2e**: checked against [Archives of Nethys](https://2e.aonprd.com/) (official, ORC license).
  Ancestry, class and skill **feats are typed in by name** for now; only general feats with simple
  effects (Toughness, Fleet, Canny Acumen…) are applied automatically.
- **D&D 5e 2014**: spell list and Sorcerer progression checked against a public 5e reference;
  descriptions are short summaries in our own words.
- **D&D 3.5**: written from the 3.5 SRD (Open Game License) from memory. The public SRD sites blocked
  automated checks, so compare anything surprising against your Player's Handbook.
- **D&D 5e 2024**: summaries in our own words; see the Player's Handbook.

## Project layout

| Path | What's there |
| --- | --- |
| `src/systems/types.ts` | The `GameSystem` contract every rule set implements |
| `src/systems/registry.ts` | The list of systems shown in the wizard |
| `src/systems/dnd5e/` | One engine for 2014 + 2024 (`rules.ts` holds what differs), 2024 data in `data/`, 2014 data in `data2014/` |
| `src/systems/dnd35/` | D&D 3.5: `data.ts`, `derive.ts` (math + warnings), `tabs.tsx`, `pdf.ts` |
| `src/systems/pf2e/` | Pathfinder 2e: same layout as 3.5 |
| `src/components/` | Shell: `Library`, `NewCharacterWizard`, `Editor`, shared UI |
| `src/pdf/primitives.ts` | Shared PDF drawing helpers (pdf-lib) |
| `src/storage.ts` | Library in browser storage, one-time migration of the old single save, import/export |

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run pdf:sample -- out.pdf 5 --system pf2e
```

- `npm test` runs golden tests: Parry at levels 1, 3 and 5 in every system, plus other builds, book filtering, and import/migration.
- `npm run typecheck` checks the TypeScript types.
- `npm run pdf:sample` renders a template's PDF without the browser. `--system` takes `dnd2024`, `dnd2014`, `dnd35` or `pf2e`; `--template` takes `parry` or `blank`.

## Extending later

- **Another system**: add `src/systems/<id>/` implementing `GameSystem` and register it in
  `registry.ts`. Pathfinder 1e can reuse most of the 3.5 engine.
- **Higher levels / other classes**: extend each system's class tables and spell data, and raise `maxLevel`.
