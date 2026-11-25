# Character Forge — handoff (state on 2026-11-22)

Everything a new session needs to pick up this project. `CLAUDE.md` (auto-loaded) holds the
product direction and the **UI rules**; this file holds the full picture: what exists, how it is
built, how it was checked, what's open, and how the user likes to work. **`REQUIREMENTS.md`** is
the roadmap; **`CHECKLIST.md`** is the user's tracker (tick items as they're done). Sections 0a and
below are older history: where they disagree with section 00, section 00 wins.

---

## 00. Current state (2026-11-22) — start here

**Live:** https://character-forge-d8q.pages.dev (Cloudflare Pages, builds from `origin/main`
automatically on push; GitHub `MitroulisDimitris/CharacterForge`). Netlify is no longer used.
Supabase project `jyjnarwlylmpsjdnanrx` (accounts, characters, sessions, notes, encounters,
builds, feedback, audit log).

**Git:** everything is committed and pushed (2026-11-23: the calmer Sheet tab, from the "UI is cramped"
feedback; mockup canvas https://claude.ai/artifact/E3VPUAeBnk1aWySVCPaaWr). Commit only when the user asks.
Never add Claude as co-author/session lines.

**Built in the 2026-11-20 → 22 sessions** (details in `CHECKLIST.md` §13 and `CLAUDE.md` dev notes):
- Character portraits (256 px crop dialog), shown in sessions too.
- Monster spells as their own section, spell cards with dice, monster **builds** (save/rename/
  delete, ⚠ ↑/↓ "stronger/weaker than the books" check), per-monster slots in the fight.
- **Greek** everywhere you can type (fonts, accent-free search, Greek-keyboard invite codes,
  Unicode PDFs via Noto TTFs + fontkit, embedded whole).
- **Player tracker** (`play` on the character, private, stripped from session copies): HP, temp
  HP, damage types (resist/immune/vulnerable), conditions, concentration (CON save DC), death
  saves (3D die), hit dice, short/long rest, exhaustion (speed halved at 2, HP max halved at 4,
  speed 0 at 5; long rest only *suggests* lowering it). Feature trackers (Channel Divinity, Rage,
  Ki, Lay on Hands, Lucky, racial spells).
- QA fixes: starting equipment applied on Next, dwarf tool choice, real proficiencies in Skills.
- **Session level**: host picks "Characters' level" when creating; joining offers **Use the same
  character** or **Join with a copy**; a different level becomes a "Level up to N" to-do or a
  "Lower to level N?" suggestion (never automatic). The per-session version picker was removed
  (rework is in CHECKLIST "Later").
- Session **name and level edit in place** in the side panel (click the name; level picker under
  it; phone: in the ☰ drawer). "Name and level" left the ⋯ menu.
- **Spell rolls on the character**: Spells tab rows have a to-hit chip (+N, d20) and damage/
  healing dice chips (`spellDiceBits`, `spellAttackRoll` in `dnd5e/rollSpecs.ts`); the Spell attack
  numbers on Sheet and Spells tab roll. Not yet: casting uses a slot, upcast dice.
- **Wiki spells**: the list merges the SRD file with the 90 2014 book spells it lacks
  (`withBookSpells` in `src/lookup.ts`; 409 spells; "Book" line on their page). Their text is the
  short write-up, no "At higher levels". Spell pages roll dice from the text (`spellTextRolls` in
  `src/dice/rollText.ts`: damage type, half on a save, healing, temp HP, plain rolls like Bless).

**Database migrations** (all applied; the user prefers to run SQL themselves when asked):
`20261120_portrait_roster.sql`, `20261121_monster_builds.sql`, `20261122_session_level.sql`.

**Checks:** `npx tsc --noEmit` (never `tsc -b`), `npx vitest run` (222 tests), `npx vite build`.
**Browser checks:** puppeteer-core 23.11.1 + Chrome headless against the **user's own dev server
on http://localhost:5173** (don't start/restart it unless asked; check it's up with curl). Log in
with the **test account** (`CF_TEST_EMAIL` / `CF_TEST_PASSWORD` in `.env.local`), never the
user's (one active login per account). Create throwaway "QA …" rows with the Supabase JS client
signed in as the test account, delete them in `finally`. The scripts lived in the session
scratchpad (`pp/*.cjs`: tracker, mspells, slevel, spellcast, wikiorb…) and may be gone; recreate
from this recipe. Selectors that matter: dice result `.dice-card`, library open `.hero-card-open`,
back `.hero-back`, tabs `.tabs button`.

**Open / next** (ask the user which):
- Spells: "Cast" with a slot (spend it), upcast dice; "At higher levels" for the 90 book spells
  (needs reading each spell in the user's books, same work as upcasting).
- QA quick wins not done: Parchment library portraits, the Feedback button covering content,
  the potion table's markdown, slot taps one at a time on the sheet.
- Untested in a browser: a second account actually joining (same/copy) and its level suggestion
  (the user can run `docs/qa-new-features.md` in Claude-in-Chrome); real iPhone/Safari.
- Feedback button: open items exist (badge showed 7 on 2026-11-22); "fix the feedback" flow is
  in `CLAUDE.md`.
- CHECKLIST "Later": per-session versions rework; dice at the table (player rolls seen by the DM).

**Answered for the user (rules):** 2014 sorcerers choose Sorcerous Origin (Draconic Bloodline)
at **1st level** (PHB p.101, XGE p.50, TCE agree); in the 2024 PHB subclasses come at level 3.
The user's "Parry Hotter Impr…" is a 2014 Half-Elf Draconic Sorcerer 3.
Shocking Grasp etc.: the +N chip is the d20 to-hit roll; damage only on a hit.

---

## 0a. Latest: Sheet tab + login + online characters (2026-11-16, later the same day)

- The user's `[NOTE:]`s in `REQUIREMENTS.md` were applied: public site shared with friends;
  every screen must fit 375–1920 px; **D2** a character can be in many sessions (a session copy
  per session + a version dropdown on the sheet, §4.2a); **D3** host can't edit a player's sheet
  but can change in-play state (HP, damage + type, conditions, exhaustion); **D4** summary only;
  monster lookup shows what a host needs first (Weak to / Resists / Immune to). New milestone
  order in §10.
- **Sheet tab** (`components/SheetTab.tsx`): first tab, opens by default, holds the summary and
  the "In play" pips + rests. The hero sidebar keeps crest, name, To do, Level up, menu. Classic
  skins lost the right-hand summary column (it's the Sheet tab now).
- **Supabase is live** (project `jyjnarwlylmpsjdnanrx`): tables `profiles` (display_name,
  is_admin; trigger fills it from sign-up metadata) and `characters` (id text, owner_id, system,
  books, data jsonb, pending, timestamps), RLS = owner only. SQL in
  `supabase/migrations/20261116_profiles_and_characters.sql`. `rls_auto_enable()` (a
  pre-existing helper) had EXECUTE revoked from anon/authenticated (advisor warning).
  Remaining advisor note: leaked-password protection is off (a dashboard setting).
- **The user's account** (email in the user context, display name "Fart enjoyer", admin) was made
  by SQL with a confirmed email. Their 2 characters (efiah 2014 lvl 2, Parry Hotter 2024 lvl 5)
  were read from Chrome's localStorage on port 5173 (LevelDB, parsed by a scratch script) and
  uploaded while logged in as them. The old browser copy is untouched.
- **App:** `src/cloud.ts` (client, load/save/delete), `App.tsx` = login gate → `Account`
  (loads profile + characters, saves changed records 600 ms after a change, retries every 8 s,
  warns before closing while unsaved). `components/Login.tsx` (email + password; no sign-up or
  reset yet: needs the email sender). Library sidebar has the account row (⋯ → Log out).
  `.env.local` holds `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (publishable key).
  `localStorage` still holds the skin and last-open character per device.
- Checked: tsc, 72 tests, build, puppeteer run (login, wrong password, library, Sheet tab,
  spend + reload + long rest saved, 375 px no sideways scroll, Dark/Parchment, log out).
- **Netlify** needs the two `VITE_SUPABASE_*` variables before the next deploy, or the site
  shows "not connected to its server". Not pushed.

## 0. Planning accounts, sessions and publishing (2026-11-16)

No app code changed in this round; it was planning, drafts and setup. Pick up here.

### What was decided (all written into `REQUIREMENTS.md`)
- **One app.** A separate "DM Helper" app was dropped; its folder was deleted.
- **One kind of account**, no player/DM split. An account has many characters, can **host**
  sessions (as DM) and **join** others' sessions. A **session** = a game someone hosts, with one
  invite code, open until the host ends it. No scheduling / RSVPs / campaign bookkeeping: the
  user wants it **simple**.
- **Join rule:** same rules, and the character's books ⊆ the session's books. Ineligible
  characters are greyed with a plain reason.
- **Every account starts empty**; characters move between accounts only by JSON export/import
  (no upload of browser-saved characters).
- **For now D&D 5e (2014) only** (PHB always on + Xanathar's + Tasha's). 2024 / 3.5 / PF2e stay
  in the code but are greyed "Coming soon" in pickers; importing them is refused. This is an
  agreed exception to the "no coming later lines" UI rule (noted in `CLAUDE.md`).
- **Login: email + password only** (no magic link, no Google), with a required **Verify** email
  whose button opens the app logged in; forgot-password email too.
- **Character portraits:** optional upload per character, replaces the class icon inside the
  level ring everywhere. **Keep the current library card design** (user likes it).
- **Feedback works in the published app** for everyone and records automatically: the last ~50
  actions in plain words (steps to get there), where they are, current state (open character
  data, session, skin), recent errors, device, app version. Never typed text or passwords.
  Admin flag on the user's account to read all; senders see their own items + "Fixed: …".
  `npm run feedback:pull` keeps the "fix the feedback" workflow (REQUIREMENTS 6.1).
- **Host tools = quick reference, not micromanaging:** session page opens on **Lookup** (one
  search for monsters, spells, conditions; favorites; recent). Party (table cards, read-only
  sheets, award a level → "Level up ready"), Encounters (builder, 2014 XP thresholds), Notes.
  **Combat tracker is optional**, last tab, last milestone. Monster pictures and cleaner search
  are "(later)".
- Private app for the user + a few friends: **non-SRD book content stays in**; don't raise
  licensing again.
- Backend: **Supabase** (login, database, row-level security, storage, auth emails via our own
  SMTP). Hosting: **Netlify**. Monster/SRD spell data: **Open5e**.

### Still open
- **D2–D4** in REQUIREMENTS (defaults fine): one session per character; host can't edit
  characters; players see each other's summary only.
- **Feedback backend for milestone 1:** the user asked "why do we need Supabase?". Options given:
  Supabase from the start (plan), or Netlify Forms for feedback only in milestone 1 and Supabase
  from milestone 2. **No answer yet — ask.**
- **Email sender** for milestone 2: a Gmail account for the app with an app password, or own
  domain + Resend.

### Draft screens (Design canvas artifact)
https://claude.ai/artifact/Fpag5ohAFURXdPpjmPLM5t — 10 artboards in the Hero look:
1 Create account + "Check your email" · 2 Home (approximation; the real library look stays) ·
3 Host a session (2014 only, others "Coming soon") · 4 Join a session (eligible / greyed with
reason) · 5 Session host: Party · 6 Combat · 7 Monsters & encounter · 8 Session player ·
9 New character rules step · 10 Feedback dialog with recorded details.
User feedback: 3, 4, 6, 7, 8 good; 5 good but less micromanaging (done in requirements: Lookup
first, no "Start combat" main action). The canvas still shows the old host tabs (Party / Combat /
Monsters / Notes) and "Start combat"; update it when that screen is built.

### Infrastructure
- **Live site (2026-11-17): https://character-forge-d8q.pages.dev** on Cloudflare Pages, deploys from GitHub
  `origin/main` (build `npm run build`, output `dist`, variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `NODE_VERSION=22`; the user set them, Claude has no Cloudflare access). Moved from Netlify because its
  free plan allows ~20 deploys a month; the old Netlify address forwards here (`netlify.toml`).
  Supabase Auth → URL Configuration has the new Site URL and Redirect URL.
- **Netlify site: https://character-forge-dnd.netlify.app/** — deploys from GitHub `origin/main`,
  which is still the old commit `5576f8c` (2 commits). The 7 newer local commits are **not
  pushed**. The user said **don't push yet; build some things first**. Ask before pushing.
  Netlify build: `npm run build`, publish `dist` (add a `netlify.toml` when building milestone 1).
  Supabase URL + anon key will go in Netlify → Project configuration → Environment variables
  (the user adds them; Claude has no Netlify access). The Verify-email redirect must point to
  this address.
- **Supabase project ref `jyjnarwlylmpsjdnanrx`**, connected through the Supabase MCP server in
  `.mcp.json` (project scope, features: docs, account, database, debugging, development,
  functions, branching, feedback, notebooks). **Start sessions in this folder** so it loads.
  First time: approve the server and sign in with `/mcp` inside an interactive `claude`
  session in this folder. The MCP can fetch the project URL and public key; the **service role
  key** (for `feedback:pull`) must come from the user and goes only in `.env.local`.
  Tell the user before creating tables or changing settings in Supabase.
- **Uncommitted:** `REQUIREMENTS.md`, `.mcp.json` (no secrets), `CLAUDE.md` and this file. Not
  committed yet; commit when the user asks.

### Next step: milestone 1 (see REQUIREMENTS §10–11)
1. Switch the UI to D&D 5e 2014 only: rule-set availability flag in `src/systems/registry.ts`,
   wizard and (later) host picker show the others greyed "Coming soon"; JSON import refuses them.
2. Online feedback: an action-trail recorder (ring buffer, survives reload via sessionStorage;
   screen/tab/step/dialog changes, labelled clicks, picks via `describeChange`, level changes,
   rests, import/export, errors), state + device capture, the "Also sends… / Show details" UI in
   `Feedback.tsx`, the Supabase table + storage + security rules (or Netlify Forms, see Still
   open), and `npm run feedback:pull` writing `./feedback/` in today's format. The dev-server
   plugin (`feedback-server.ts`) is replaced by the same online path.
3. `netlify.toml`, environment variables, then push (with the user's OK) and check the live site.

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
  `npx tsc --noEmit` · `npx vitest run` (222 tests on 2026-11-22) · `npx vite build`.
- Browser checks today: see section 00 (the user's dev server on 5173 + the test account). The
  older recipe below (second server on 5179) is from before accounts.
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

- 2014 data: short summaries plus the full book text for spells. Book text may go into the app
  (user, 2026-11-23: legally bought copies, private app, no money made).
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

- (2026-11-22: see section 00 for the current open items. Pushing `main` deploys to Cloudflare
  Pages; push only when the user says "commit and push".)
- **Feedback file**: 1 open item ("why do I get Sorcerous Origin at creation?"). Answered in chat:
  correct for 2014 rules (PHB p.100–101: chosen at level 1; the user's D&D Beyond character is 2024,
  where it's level 3). Ask the user whether to mark it fixed.
- **Progression tree** per class: built 2026-11-25 (the Progression tab; see the dev note in `CLAUDE.md`).
  Mockup canvas: https://claude.ai/artifact/EELKVpJ2uGxC75wo1evU4Z (page "Progression Tree").
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
- Commit/push only when asked ("commit and push"); commit messages are just the change, with
  **no** Claude co-author / session / "Generated with" lines (user, 2026-11-20).
- They want my assumptions listed in the end report, and questions asked instead of guesses.
- They prefer to run database SQL themselves: give them the script (idempotent) when a migration
  is needed, and tell them before changing Supabase.

## 8. Environment gotchas (Windows, Git Bash)

- Bash heredocs that contain apostrophes or backticks often fail (`unexpected EOF`). Write a Python
  script with the Write tool into the scratchpad and run it with `python -I`, or use Edit.
- `sed` in-place edits on files with non-ASCII text are fine; avoid sed for multi-line edits.
- No prettier in the project; keep formatting consistent by hand (2-space, double quotes).
- Python prints to a cp1252 console: set `PYTHONIOENCODING=utf-8` when printing book text.
- `pdftotext` is available (mingw); `pdfinfo`/`pdftoppm` are not; pypdf 6 is installed.
