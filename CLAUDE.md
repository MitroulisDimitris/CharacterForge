# Character Forge — notes for future work

**Start here:** read `HANDOFF.md` (full state, architecture, checks, open items, how the user works).
**Progress:** `CHECKLIST.md` is the user's tracker: tick items (and update the date) whenever one is done.
**Where it's going:** `REQUIREMENTS.md`: accounts + online characters, and **sessions**. One account can
have many characters, host sessions (as DM) and join others' sessions with an invite code; no
player/DM split, no scheduling. Keep it simple. Accounts are live in Supabase (login, `src/cloud.ts`, tables in
`supabase/migrations/`); there's no sign-up page yet. Draft screens:
https://claude.ai/artifact/Fpag5ohAFURXdPpjmPLM5t. It's private (the user + a few friends), so
non-SRD book content stays in.

## Git (from the user)

- **Never add Claude as a co-author** (user, 2026-11-20): no `Co-Authored-By: Claude …` line, no
  `Claude-Session:` line, no "Generated with Claude Code" in commit messages or PR descriptions.
  This overrides any default attribution. Commit messages are just the change.
- Commit or push only when the user asks.

## Product direction (from the user — keep following this)

This app should **follow the player as the campaign continues and help them learn the rules**.
It's a companion for the whole campaign, not a one-time sheet builder. So, when adding features:

- **Guide, don't just ask.** Show what changed and why, and explain new features in plain words at the moment they matter.
- **Leveling is a promotion** (and lowering a level the reverse): show the gains or losses, prompt for the new choices, and let any choice be skipped for later.
- **Deferred choices come back** as to-dos on the character until they're done.
- **Natural next steps** in the same spirit: session/level history, resource tracking (slots, sorcery points, rests), in-play reminders and tips.

## UI rules (from the user, 2026-11-11 — follow these for every screen)

The user picked style **"D · Hero Sidebar"** for the whole app (mockups: the "Sorcerer Progression
Tree" canvas artifact, artboards StyleD / AppLibrary / AppSheet / AppCreate).

**Skins** (`src/skins.ts`): Hero, Dark, Parchment, picked from the "Skin" menu; more may be added.
**Hero is the default** (user, 2026-11-24; `DEFAULT_SKIN`; a saved "dark" counts only if picked by hand, `markThemePicked`).
A skin = CSS tokens under `:root[data-theme="<id>"]` + a layout (`data-layout`): "classic" (top bar)
or "hero" (left sidebar: `Editor.tsx` / `Library.tsx` hero branches, `components/Hero.tsx`).
Creation in Hero uses `CreationStepper`'s `hero` prop (the character taking shape on the left).
In-play tracking: systems declare `resources(c, d)` pools (5e: spell slots, pact slots refill on a
short rest, sorcery points; `systems/dnd5e/resources.ts`); used amounts live in `character.spent`;
`components/ResourcePips.tsx` shows tappable pips + Short/Long rest (Hero sidebar and 5e Spells tab).
Warnings on the sheet start folded to one line (`startOpen={false}`).
Keep Dark and Parchment working when changing screens. New screens follow the rules below in
every skin; the Hero skin is the reference look.

**Calm first: don't overwhelm the user when we don't need to.**
1. One main action per screen (the crimson button). Everything else is quieter.
2. Show what matters now; detail is one step away (hover card, expand, "Show all"), at most 2–3
   layers deep, with an obvious "more" link.
3. Show only what the character can use at their current level (at creation: level 1). No greyed-out
   "unlocks at level N" sections and no "coming later" lines (the user asked to remove them).
   One exception (user, 2026-11-16): rule-set pickers show the switched-off rule sets greyed
   with "Coming soon" (only D&D 5e 2014 is available for now; see `REQUIREMENTS.md`).
   Future levels belong only in the progression tree or the folded "What you get at each level".
   Every decision gets help for new players: one plain sentence on what the choice is, a
   "Beginner-friendly" pick, and hover explanations (SubclassPicker, skill hints, ability lines).
4. Choices: suggest 2–3 good picks (tag "Popular" / "Beginner-friendly"), the rest behind "Show all".
   Exception (user, 2026-11-17): no "Beginner-friendly" tags on the class cards (5 of 13 classes is
   clutter); difficulty shows in the class details only. Possible later addition: see CHECKLIST "Later".
   Show progress as counters ("1 of 2 chosen", "0/2").
5. Secondary actions (export, duplicate, PDF, delete) live in a "⋯" menu, not as visible buttons.
6. Squint test: in 3 seconds you can tell the main information and the main action. If not, cut.
7. Explain at the moment it matters: a short tooltip when a feature unlocks or is offered;
   no walls of text, no forced tutorials. Plain words, short sentences, "Tip ·" for advice.
   **Preview before you commit:** when choosing from a list, a sticky panel beside it shows what the
   hovered option changes (dnd5e: `components/Preview.tsx` + `preview.ts` diffDerived; class chart
   from `data2014/profiles.ts`; hexagon `components/Radar.tsx`). After any pick a short "Just changed"
   note lists what it did (`components/JustChanged.tsx`, `GameSystem.describeChange`). Options that
   suit the class get a "Good for <Class>" tag.
7a. **The page never talks about itself** (user, 2026-11-19: "it's like my page is talking to me").
   Never write text about where content came from or who wrote it: no "Its entry in your book",
   "from your books", "in our own words", "in plain words", "summarized", "from Open5e", "saved in
   the app", "this app's list", "the app picks…", "check your book". Just show the content.
   Only exception: the bare licence credit lines (e.g. "Includes material from the System Reference
   Document 5.1 (CC-BY-4.0)."), with nothing added to them. Code comments may say anything.
   Book references are wanted (the user likes them as real proof): "Monster Manual, page 317",
   with no sentence explaining them.

**Layout**
8. Character screens have a left **hero sidebar**: portrait crest with a level ring, name,
   race · class, a "To do" box for pending choices, and the main action (Level up) at the bottom.
   The numbers, resource pips and full summary live in the first tab, **Sheet**
   (`components/SheetTab.tsx`; user request 2026-11-16: it's what a player uses most).
   The library and creation use the same sidebar idea (brand + New character / the hero taking shape + steps).
9. The main area has tabs across the top (active = crimson underline; a gold dot marks a tab with a to-do).
10. No horizontal page scroll. At phone width the sidebar becomes a compact top bar, with a ☰ button
    at its left that slides in the main menu (My characters, Sessions, Wiki; user 2026-11-19).
    Not on character pages (sheet, creation, level up): those keep their own bar with the way back.

**Look**
11. Dark warm base (#110e0c–#1c1815) with texture, never flat: a faint diagonal pattern
    (repeating 45° lines, ~1.5% white) plus a soft crimson radial glow. Panels #1c1815 / #251f1a,
    borders #3b3027 / #5a4636, radius 10–16 px, soft deep shadows.
12. Colour has meaning: **gold = you can act / progress**, **crimson = current / main action**,
    green = gained/new, plus fixed category colours: core #e8d3a6, origin/subclass #e0485e,
    growth #6fbf73, spells #8fb6e3, class options/metamagic #d4a64a, cantrips/concentration #b9a3e8.
13. **Glow means "act on this now"** and nothing else glows. Filled = you have it; dim outline =
    later ("Lv 6"); faded = not chosen.
14. Type: Cinzel for headings and names, Inter for text. Section labels are small uppercase with
    letter-spacing (11–12 px, #a3927f). Numbers big and bold.
15. Icons: simple line icons (stroke 1.6–2), drawn inline; no emoji.

**Hover cards** (every game term and feature has one)
16. Card: category-coloured top border, title, status line ("You have this" / "Unlocks at level 6" /
    "Choose now"), 1–2 plain sentences, optional "Tip". They must also open on keyboard focus and tap.

**Accessibility**
17. Text contrast ≥ 4.5:1; touch targets ≥ 44 px; real buttons and links; colours that must be told
    apart also differ in lightness or shape.

**Platforms**
17a. Everything works on **iPhone (iOS Safari), Android, Windows and Mac** (user, 2026-11-19): plan
    every feature, animation and graphic for all of them. Check WebKit/Safari and touch behaviour
    before relying on a web feature; test with real taps at phone width; say so when something
    couldn't be tested on a platform.

**Motion**
18. **Nothing jumps** (user, 2026-11-19, the race picker): when a pick or hover changes how tall a box
    is, it glides to its new height (~250 ms) and the content below follows smoothly. A panel that
    changes on every hover (previews) only grows, so what's below doesn't bounce up and down.
    Use `useSmoothHeight` (`components/smooth.ts`; `Card`, `WithPreview` and the To do box already
    do). Respect reduced motion (no glide, just the new size).

## Plan in progress (approved by the user 2026-11-10)

- Done: **Books** button on every character (edit allowed books later).
- Done (phase 2): D&D 2014 guided creation from scratch (`systems/dnd5e/creation.tsx`,
  `components/CreationStepper.tsx`), no templates for 2014; all 12 classes + Artificer at level 1
  (`data2014/classes.ts`), PHB + Xanathar's + Tasha's content. Parry is only a saved character.
- Done (phase 3, 2026-11-10): every 2014 class levels 1-5 (`data2014/levels.ts`), ~80 subclasses
  (`data2014/subclasses.ts`), invocations/pact boons/infusions (`data2014/warlock.ts`), 2nd/3rd-level
  spell lists for all classes, Eldritch Knight/Arcane Trickster spellcasting via `Subclass.spell`.
  Tests: `classes2014.test.ts`, `levels2014.test.ts`.
- Later (phase 4): SCAG, Elemental Evil, Volo's, Tome of Foes, Monsters of the Multiverse (replaces
  Volo's/Tome of Foes races), Fizban's, DMG player options. Phase 5: setting books, and moving the
  other rule sets to guided creation.

## Feedback from the user ("fix the feedback")

The app has a Feedback button on every page, also logged out (`src/components/Feedback.tsx`). Notes
are saved online (Supabase table `feedback`, screenshots in the private `feedback` bucket). When
asked to fix the feedback: run `npm run feedback:pull` (writes `feedback/feedback.json`, newest
first, + `feedback/images/`; open images with Read), work through every `status: "open"` item, then
for each run `npm run feedback:fix -- <id> "short note of what changed"` (the sender sees it).
Items marked `local: true` are from before feedback went online: set their status/fixNote in the
JSON by hand. Each item has `note`, `context`, optional `target`, `sender`, `details` (page,
window size, browser, skin). The folder is git-ignored. The scripts log in as the admin with
`CF_ADMIN_EMAIL` / `CF_ADMIN_PASSWORD` from `.env.local`.

**Activity log:** `npm run audit` (last 50), `npm run audit -- <character id>` (one row's history),
`npm run audit -- restore <id>` (prints a deleted character's full row). Written by database
triggers on characters, sessions, session_members, profiles (`audit_log`, admin-only).
**One active login per account:** a fresh login signs out other devices (`claimIfFresh` in
`cloud.ts`, `profiles.active_session`). Don't log into the user's own account in browser tests:
it would log them out. Use the test account (`CF_TEST_EMAIL` / `CF_TEST_PASSWORD` in `.env.local`).

## Dev notes

- Session notes (2026-11-20, REQUIREMENTS 4.8): tabs in `components/NotesTabs.tsx`, the TipTap editor +
  toolbar in `components/NoteEditor.tsx` (lazy-loaded), helpers `src/notes.ts`, table `session_notes`
  (`ensure_session_notes` turns the old `sessions.notes` into "Notes 1"; the old column is a backup, never written).
- Player tracker (2026-11-22): rules in `src/play.ts` (tests `play.test.ts`), UI `components/InPlay.tsx`
  (`PlayHp` in the hero sidebar, `InPlayPanel` on the Sheet), stored as `play` in the character and stripped
  from session copies (`sessionData` in `sessions.ts`). Feature trackers: `systems/dnd5e/resources.ts`
  (`parseUses` reads the data's "uses" text). Session seats follow the character unless the seat is a per-session version (below).
- Greek (2026-11-21): `src/text.ts` (`fold` = case/accent-free, length-keeping; Greek keyboard → Latin for
  invite codes); fonts via `scripts/fetchFonts.py` (Inter Greek subsets, EB Garamond Greek as the fallback
  for Cinzel/Crimson Pro); PDFs switch to Noto TTFs in `public/fonts/pdf` + `@pdf-lib/fontkit` when
  `needsUnicode` (embedded whole: pdf-lib's subsetting garbles these fonts).
- Monster spells (2026-11-21, REQUIREMENTS 4.9): parsing + builds + the book check in `src/monsterSpells.ts`,
  UI `components/MonsterSpells.tsx` (SpellSections / SpellsBox), build picker `components/MonsterBuilds.tsx`,
  table `monster_builds`; encounter lines carry `build`/`spells`, fighters carry `spells`/`used`.
- Spell rolls (2026-11-22): character Spells tab chips from `spellDiceBits` / `spellAttackRoll`
  (`dnd5e/rollSpecs.ts`; one d20 chip per spell, on its row); Wiki/Lookup spell text from
  `spellTextRolls` (`src/dice/rollText.ts`). The Wiki spell list = SRD file + the 2014 book spells it
  lacks (`withBookSpells`, `bookSpell` in `src/lookup.ts`).
- Per-session versions (2026-11-24): `session_members.version` (migration `20261124_session_versions.sql`;
  `selectMembers` in `sessions.ts` falls back when the column is missing). A version seat's `data`/`pending`/
  `books` are its own sheet; the player's trackers for it live in `character.versionPlay[seatId]` (stripped by
  `sessionData`). App.tsx builds the shown record and routes saves; UI `components/Versions.tsx`
  (`VersionPicker` in the hero sidebar / classic bar, `VersionStrip` above the tabs). Join asks copy/version only
  when the character already plays elsewhere (`JoinDialog`, `setSeatVersion`).
- Dice at the table (2026-11-24): table `session_rolls` (migration `20261124_session_rolls.sql`; a new roll deletes
  that session's rolls older than 12 h), helpers `src/rolls.ts`. `DiceProvider.share()` (Dice.tsx) hands every
  finished roll to the player's session page while it's open; UI `components/TableDice.tsx` (`PlayerTable`,
  `HostRolls`, `useTableRolls` polls every 5 s); per system `GameSystem.TableRolls` (dnd5e `components/TableRolls.tsx`).
- Damage animations (2026-11-25, replaced the CSS/SVG version): GSAP stories + one shared WebGL context.
  `src/dice/fxEngine.ts` (`runFx`: waits for the host's full size, plays or shows the held picture; one WebGL
  context draws every effect and copies it onto each host's 2D canvas), `fxShaders.ts` (GLSL; never reversed
  `smoothstep`, use `sstep`; never `distance * step(…)`; no `fract(sin(…) * 43758…)` hash: phone GPUs compute
  `sin` of big numbers coarsely and the noise turns into stripes, use the sine-free `hash`/`hash2` already there), `fxStories.ts` (one per type, `"fire:melee"`-style
  keys for how it was dealt), component `components/DamageFx.tsx` (`fxTypeOf`), styles `src/damageFx.css`
  (type colours `.lf-<type>`). Copied from the mockup canvas (page "Damage animations", boards "Every damage
  type" / "How it was dealt"; their files `project/DamageAll.dc.html`, `DamageDeliv.dc.html` hold the same code).
  How damage was dealt: `RollSpec.via` (`Via` in `dice/roll.ts`; `viaOfText` in `rollText.ts`, `Attack.via`
  in derive, `spellVia`), sent as `session_rolls.via` (migration `20261125_session_rolls_via.sql`;
  `rolls.ts` falls back without it). Used by `RollLine` (TableDice.tsx, `FX_ROWS`) and the result card (Dice.tsx).
  Check animations by recording them (web-motion skill) before showing the user.
- Progression tree (2026-11-25): the **Progression** tab right after Sheet (`GameSystem.Progress`, dnd5e
  `components/ProgressionTab.tsx`). Content per character from the class data in `dnd5e/tree/build.ts` (rows 1–5, at
  most 4 steps a row, choices picked in the panel via `pickPatch`; tests `tree/tree.test.ts`), each class's look in
  `tree/looks.ts`, motion in `tree/fx.ts` (one WebGL canvas behind the tree + GSAP level-up stories, the "Level up!"
  card, the final-level story for Sorcerer/Fighter/Wizard at the class's top level), GLSL in `tree/shaders.ts`, styles
  `src/tree.css`. Layout: one trunk up the middle, steps branch left/right, a second step on a side hangs off the first.
  A level-up (Editor `closeDialog`) switches to the tab and passes `celebrate`; LevelChange's `celebrated` skips its
  "Welcome to level N" page. Copied from the mockup canvas https://claude.ai/artifact/EELKVpJ2uGxC75wo1evU4Z
  (boards "Class trees, all 13 classes" and "Final level up story"). WebGL contexts are released only once their
  canvas has left the page (StrictMode mounts twice; a lost context can't be reused).
- **Phone GPU check** (2026-11-25, after the tree's fire striped on the user's Android phone): desktop GPUs do
  shader maths exactly, phones don't. `src/shaders.phone.test.ts` (in `npm test`, or `npm run test:phone`) draws every
  WebGL effect in Chrome twice, SwiftShader (exact) vs ANGLE on Vulkan (`--use-angle=vulkan`: the RTX 3060 then does
  phone-like looser maths, half-precision mediump), and fails when they differ; a control scene (the old sine hash)
  proves the phone mode still works. Pictures of failures in `test-results/phone-gpu/` (`PHONE_GPU_SAVE=1`: all).
  `PHONE_GPU_OLD=1` adds older phones without highp: most effects fail that today (would need a noise texture).
  Needs Chrome + a Vulkan GPU (puppeteer-core), else skipped. For screenshots/recordings of the real app, also run
  Chrome with `--use-angle=vulkan`: it reproduced the user's phone bug on the live site. Not a model of iPhones.
- Sessions (2026-11-22): `sessions.level` (host picks it; join/swap set `level_award` when it differs);
  name and level edit in place in the session side panel (`SessionName`, `SessionLevel` in `Sessions.tsx`).
- Sheet tab layout (2026-11-23): `GameSystem.SheetNumbers` (dnd5e: `SheetNumbers` in `Summary.tsx`) shows the key
  numbers at the top; `Summary` with `inSheet` leaves them out and merges saving throws into the ability tiles.
  Conditions / exhaustion / concentration live in `StatusDialog` (`InPlay.tsx`), opened from the Status line.
  Phones: `.char-side` (hero sidebar) scrolls away, `.char-main > .tabs` is sticky.
- **Book text, page by page** (2026-11-24): `reference/books/<PHB|XGE|TCE|MM|DMG>.md` (and `.pages.json`) hold
  every page's cleaned OCR text under its printed page number (`python scripts/bookextract.py`). Look things up
  there first, not in the PDFs. Not hand-checked: confirm tables and numbers on the page image before using them.
  Pages: XGE/TCE/MM = PDF page − 1, DMG = PDF page; the PHB scan lacks 22 art pages, offsets in `PHB_OFFSETS`.
- Full spell text (2026-11-23): `src/spellText.ts` loads `public/spell-text-2014.json` (254 spells; SRD
  spells = SRD text, the 90 others = the books, OCR cleaned + hand fixes checked on the page images;
  PHB pages unknown: the scan lacks ~28 pages and prints no numbers). Rendered by
  `components/SpellParts.tsx` (paragraphs, bullets, tables, stat blocks) in the Spells tab (2014) and Wiki.
- Spells with no effect on a monster (2026-11-23): `src/spellImmunity.ts` (rules from each spell's text,
  plus the condition-immunity rule), shown folded on the monster page (`NoEffectSpells`).
- **No regex lookbehind** (`(?<=…)`, `(?<!…)`) in app code: Safari before 16.4 fails to parse the
  whole module. Use `\b` or capture groups.
- Portraits (2026-11-20): `portrait` on every character = a 256 px JPEG data URL (`src/portrait.ts`, crop dialog
  `components/Portrait.tsx`), shown by `Crest`'s `portrait` prop; session summaries carry it (`session_roster`).
- Dice (2026-11-19): `src/dice/` (roll maths `roll.ts`, the canvas 3D table `engine.ts`, stat-block
  text → rolls `rollText.ts`); `components/Dice.tsx` (provider in `main.tsx`, `RollChip` only rolls
  inside a `RollScope`: character tabs, monster pages, the Wiki). Sheet roll specs: `dnd5e/rollSpecs.ts`.
- Wiki (`components/Wiki.tsx`, `src/wiki.ts`) reuses `Lookup` (`only="spell" | "monster"`). Items:
  `src/items.ts` reads `public/srd-items.json` (rebuild: `npx vite-node scripts/fetchItems.ts`) plus
  Xanathar's / Tasha's items written in our own words (`src/bookItems.ts`).
- Nothing loads from outside but Supabase (user, 2026-11-19: "download everything that we use"):
  SRD monsters and spells `public/srd-monsters.json` / `srd-spells.json` (`npx vite-node
  scripts/fetchSrd.ts`), fonts `public/fonts` + `src/fonts.css` (`python scripts/fetchFonts.py`).
  New Open5e queries can take minutes, so never fetch from it at runtime. Magic item effects from item
  names: `dnd5e/magicItems.ts` (inventory `equipped` missing = worn, `attuned`).

- D&D 5e classes share one shape (`data/classes.ts` → `ClassDef`); the engine (`derive.ts`,
  `progression.ts`) works from it, so a new class is data plus its level-1 choices.
- Each rule set is a plugin under `src/systems/<id>/` implementing `GameSystem` (`src/systems/types.ts`), registered in `src/systems/registry.ts`.
- Level-up/down flows use each system's `progression` (snapshot, featuresAt, unlocksAt, demote).
- `npm test` runs golden tests for every system; keep them passing and add cases when rules change.
- **Game content comes from the user's books or the user** (user, 2026-11-19): use `reference/books/`
  (PHB, XGE, TCE, Monster Manual, Dungeon Master's Guide + `DMG.raw.txt`); if something isn't
  there, ask the user for it. Never fill gaps from memory or other sources.
- Rules data provenance:
  - Pathfinder 2e: checked against Archives of Nethys.
  - D&D 3.5: written from memory of the SRD (unverified; SRD sites blocked automated reads).
  - D&D 5e: short summaries (`desc`) plus, for 2014 spells, the full book text. 2014 data checked against the SRD 5.1 (CC-BY-4.0) on
    2026-11-10: `npx vite-node scripts/dump2014.ts > app.json`, then
    `python scripts/srdcheck.py srd_raw.txt app.json` (srd_raw.txt = `pdftotext SRD_CC_v5.1.pdf`).
    Spells, spell lists, classes (levels 1-5), races, weapons and armor matched after fixes.
    Shillelagh / Plant Growth flags are known false positives. Xanathar's/Tasha's content is unverified.
    Watch out: 2014 spells built with `from()` inherit 2024 values; override where 2014 differs.
  - The user's own copies of PHB 2014, Xanathar's and Tasha's are in `reference/books/` (PDF + text,
    git-ignored). **Book text may go into the app** (user, 2026-11-23: legally bought copies, a private
    app that makes no money): e.g. full spell text in `public/spell-text-2014.json`
    (`scripts/spelltext.py` + `spelltextclean.py` + hand fixes `spelltext-fixes.json`). They're scans: the text has OCR typos
    ("ld6" = 1d6, "ll" = 1d10, split words), so check mismatches against the PDF page.
    `npx vite-node scripts/bookcoverage.ts` confirms every app item exists in its book (663/663).
    `python scripts/bookcheck.py app.json` compares spell stat lines with the books. 2026-11-10: all
    254 spells verified (229 by script, 25 by reading the page images); only Revivify was wrong.
    Class spell lists (levels 0-3) verified the same day: `scripts/listcheck.py` (PHB, by script),
    `scripts/listcheck_xge.py` and `scripts/listcheck_tce.py` (lists typed from the book pages).
    Fixed: Melf's Minute Meteors (wizard), Tasha's additions for druid/ranger/wizard, artificer 3rd level.
    Subclass spells (`scripts/subclasscheck.py`, 45 subclasses), subclass feature levels
    (`scripts/featurelevels.py`) and scaling class numbers verified too. Added from that check:
    College of Swords scimitar, Bladesinging weapon pick, Kensei weapons (proficient + monk weapons,
    one melee + one ranged), Phantom's Whispers of the Dead skill, Lay on Hands pool size.
    Not modelled (no effect on numbers): subclass tool choices (Battle Master artisan's tool, Kensei
    calligrapher's/painter's supplies, Mastermind gaming set).
    Feats (`scripts/featcheck.py`: ability increases, prerequisites), invocations, infusions,
    fighting styles and backgrounds verified 2026-11-10. Added: 6 invocations (Cloak of Flies, Gift of
    the Ever-Living Ones, Maddening Hex, Tomb of Levistus, Far Scribe, Undying Servitude; `hex`
    prerequisite) and the Armor of Magical Strength infusion. The 2014 data is now fully cross-checked
    against PHB/XGE/TCE for levels 1-5.
