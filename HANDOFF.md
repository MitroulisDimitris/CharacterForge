# Character Forge — handoff (state on 2026-11-12)

Everything a new session needs to pick up this project. `CLAUDE.md` (auto-loaded) holds the
product direction and the **UI rules**; this file holds the full picture: what exists, how it is
built, how it was checked, what's open, and how the user likes to work.

---

## 1. What it is

A character builder/companion for tabletop RPGs: **D&D 5e 2014**, **D&D 5e 2024**, **D&D 3.5**,
**Pathfinder 2e**. React 19 + Vite + TypeScript, no backend, characters saved in browser
`localStorage`. Product direction (from the user): follow the player through the whole campaign
and teach the rules as they go (see `CLAUDE.md`).

| Rule set | Coverage |
|---|---|
| D&D 5e 2014 | All 12 PHB classes + Artificer, **levels 1–5**, PHB + Xanathar's + Tasha's. Guided creation from scratch. |
| D&D 5e 2024 | Sorcerer only (levels 1–5), templates (Parry Hotter, blank). |
| D&D 3.5 / PF2e | Sorcerer only (levels 1–5), templates. |

Spells: levels 0–3 only (enough for character level 5).

## 2. Run / check

- Run: `start.bat` or `npm run dev` → http://localhost:5173 (port fixed in `vite.config.ts`).
- Checks (run all three before saying something works):
  `npx tsc --noEmit` · `npx vitest run` (72 tests) · `npx vite build`.
- Browser testing used **puppeteer-core 23.11.1** with
  `C:/Program Files/Google/Chrome/Application/chrome.exe` (headless) against a second dev server:
  `npx vite --port 5179 --strictPort`. The scripts lived in the session scratchpad (gone now);
  recreate as needed. Note: localStorage is per port, so tests on 5179 never touch the user's data
  on 5173. Stop the 5179 server afterwards (`netstat -ano | grep :5179`, then `taskkill //PID … //F`).

## 3. Architecture

- `src/systems/<id>/` — one plugin per rule set implementing `GameSystem` (`src/systems/types.ts`),
  registered in `src/systems/registry.ts`. The shell (library, wizard, editor) only talks through it.
- Important `GameSystem` fields: `tabs`, `Summary`, `derive`, `normalize`, `progression`
  (snapshot / gainsAt / unlocksAt / demote — level up & down), `creation` (guided steps),
  `maxLevelFor`, `resources` (pools tracked in play), `describeChange` (the "Just changed" note).
- **D&D 5e engine** (`src/systems/dnd5e/`): one engine for 2014 and 2024.
  - `data/` shared types + 2024 data; `data2014/` 2014 classes (`classes.ts`), levels 2–5
    (`levels.ts`), subclasses (`subclasses.ts`), invocations/pact boons/infusions (`warlock.ts`),
    spells (`spells.ts`, many reuse 2024 entries via `from()` — **check 2014 differences**),
    feats, backgrounds, races, class strengths for the chart (`profiles.ts`).
  - `derive.ts` (everything on the sheet), `progression.ts`, `rules.ts`, `character.ts`
    (`SCHEMA_VERSION` 2, `normalizeCharacter` keeps unknown fields), `startingKit.ts`,
    `resources.ts` (slots, pact slots, sorcery points), `preview.ts` (`diffDerived`, `deriveWith`).
  - Components: `ClassTab` (ClassPicker with strengths radar, features, choices),
    `SubclassPicker` (new-player help panel), `SpeciesTab` (race picker + ability radar preview),
    `BackgroundTab`, `AbilitiesTab`, `SpellsTab` ("Your spells" compact rows / "Learn or change"
    picker with hover compare card), `StartingEquipment` (hover preview of AC/attacks),
    `Preview.tsx` (WithPreview layout, AbilityPreview, ChangePreview, useHover), `Summary`.
- Shell components (`src/components/`): `Editor`, `Library`, `NewCharacterWizard`,
  `CreationStepper` (has a `hero` prop for the Hero skin), `LevelChange` (promotion dialog),
  `Hero.tsx` (Crest with level ring + class colour, MoreMenu "⋯", SHORT stat labels),
  `Radar.tsx` (hexagon chart, morphs with CSS `d`), `ResourcePips.tsx`, `JustChanged.tsx`,
  `Warnings.tsx` (starts folded on the sheet), `Feedback.tsx`, `ui.tsx` (ChipPicker has `hint`).
- **Skins** (`src/skins.ts`): Hero (sidebar layout, the reference look), Dark (default), Parchment.
  A skin = CSS tokens under `:root[data-theme=…]` + a layout (`data-layout`: classic | hero).
  Hero branches live in `Editor.tsx`, `Library.tsx`, `CreationStepper.tsx`. Keep all three working.
- Styles: one file, `src/styles.css` (newer sections appended at the end, each with a comment).

## 4. Rules data: where it came from and how it was checked

- 2014 data is written in our own words (never copy book text into the app).
- The user's own copies of **PHB 2014, Xanathar's, Tasha's** are in `reference/books/`
  (PDF + `.raw.txt`/`.txt`, **git-ignored**, never commit or upload). They are scans: OCR typos
  ("ld6" = 1d6, "ll" = 1d10, split words), so confirm mismatches on the page image
  (pypdf can extract page images; XGE spell pages are ~147–171).
- Check scripts (`scripts/`), all re-runnable:
  - `npx vite-node scripts/dump2014.ts > app.json` — export app data.
  - `python scripts/srdcheck.py srd_raw.txt app.json` — vs SRD 5.1 (download the SRD PDF and
    `pdftotext` it; not stored).
  - `python scripts/bookcheck.py app.json` — spell stat lines vs the books.
  - `python scripts/listcheck.py` / `listcheck_xge.py` / `listcheck_tce.py app.json` — class spell lists.
  - `python scripts/subclasscheck.py app.json` — subclass spell tables.
  - `python scripts/featurelevels.py app.json` — subclass feature levels.
  - `python scripts/featcheck.py app.json` — feat ability increases / prerequisites.
  - `npx vite-node scripts/bookcoverage.ts` — every app item exists in its book.
- Result (2026-11-10): all spells, lists, subclass spells/levels, feats, invocations, infusions,
  fighting styles, backgrounds, races, classes 1–5 verified; fixes listed in `CLAUDE.md`.

## 5. Features built (newest last)

1. Books button (change allowed books later); guided 2014 creation (9 steps); all classes 1–5.
2. Rules cross-check against SRD + books (above).
3. **Feedback button** on every page → saved by the dev server to `feedback/feedback.json`
   (+ `feedback/images/`), git-ignored. When the user says **"fix the feedback"**: do every
   `status: "open"` item, then set `status: "fixed"` + a short `fixNote`.
4. **Skins**: Hero / Dark / Parchment (Skin menu).
5. Hero sheet sidebar: crest + level ring, name, identity, books, 4 stat tiles (+ "More numbers"),
   "In play" pips, To-do box, folded Full summary, Level up, level picker, "⋯" menu (PDF, export,
   books, skin). Library: sidebar (New, rule-set filter, import, skin) + hero cards + "⋯".
   Creation: hero-taking-shape sidebar with steps.
6. Tap-to-spend spell slots / sorcery points + Short/Long rest (`spent` on the character).
7. Spells tab split: "Your spells" (compact rows, click to expand) / "Learn or change spells"
   (opens first while picks are open).
8. Only what's available at the current level is shown (no greyed "unlocks at" sections, **no
   "coming later" lines** — the user asked to remove them). Class level table is folded.
9. Live previews while choosing: class strengths radar, race ability radar (now vs with race +
   DC/HP/AC/speed/darkvision…), background (new skills, clashes), equipment (AC/attacks),
   spell compare card, "Just changed" note after any pick, "Good for <Class>" tags.
10. New-player help: SubclassPicker (plain sentence + Beginner-friendly pick + panel with what it
    gives now and what changes), skill hints on hover, a line per ability (main one marked).

## 6. Open items / backlog

- **Not pushed**: 6 local commits on `main` ahead of `origin/main`
  (https://github.com/MitroulisDimitris/CharacterForge). The user hasn't said whether to push
  routinely; ask before pushing.
- **Feedback file**: 1 open item ("why do I get Sorcerous Origin at creation?"). Answered in chat:
  correct for 2014 rules (PHB p.100–101: chosen at level 1; the user's D&D Beyond character is 2024,
  where it's level 3). Ask the user whether to mark it fixed.
- **Progression tree** per class: mockup approved in direction (skill-tree look, hover explains
  everything, pick choices only at the right level, visible at character selection and after
  creation). Mockup artifact: https://claude.ai/artifact/5GUNPqB2jQDm5SEqQvrcdN (canvas also holds
  the style options A–D, the Hero-style app screens, and the class/race chart drafts). **Not built.**
- Question left open: should the folded "What you get at each level" table on the Class tab go too?
- Previews and pips exist for D&D 5e only (PF2e / 3.5 have the shared hooks but no pools/previews).
- Previews need a mouse (touch shows the current choice only).
- Phase 4 books (SCAG, Elemental Evil — free PDF, Volo's, Tome of Foes, Monsters of the Multiverse,
  Fizban's, DMG options): user said "leave them for now". Phase 5: setting books, guided creation
  for the other rule sets.
- Levels 6–20, spells above 3rd level, multiclassing: not built.
- Text-only (no numbers): subclass tool choices (Battle Master artisan's tool, Kensei
  calligrapher's/painter's supplies, Mastermind gaming set); Gloom Stalker +30 ft darkvision when
  already having darkvision; Bladesong AC; various feat/invocation effects.
- Possible next ideas: help text for other dense choices (fighting styles/metamagic already have
  text; equipment packs, tools, languages could use hints); progression tree; PF2e/3.5 previews.

## 7. How the user likes to work

- Plain words, short answers; explain game rules simply (they're learning the rules).
- **Calm UI** above all (see UI rules in `CLAUDE.md`): don't overwhelm; one main action; detail
  one step away; previews before committing; help new players at every decision.
- They test in the browser and send screenshots or Feedback-button notes; they prefer drafts/
  mockups (Design canvas artifact) for bigger UI changes before building.
- Verify before claiming: types + tests + build + a browser run; say plainly what wasn't checked.
- Commits end with the session attribution lines; ask before pushing.

## 8. Environment gotchas (Windows, Git Bash)

- Bash heredocs that contain apostrophes or backticks often fail (`unexpected EOF`). Write a Python
  script with the Write tool into the scratchpad and run it with `python -I`, or use Edit.
- `sed` in-place edits on files with non-ASCII text are fine; avoid sed for multi-line edits.
- No prettier in the project; keep formatting consistent by hand (2-space, double quotes).
- Python prints to a cp1252 console: set `PYTHONIOENCODING=utf-8` when printing book text.
- `pdftotext` is available (mingw); `pdfinfo`/`pdftoppm` are not; pypdf 6 is installed.
