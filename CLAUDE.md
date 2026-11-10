# Character Forge — notes for future work

## Product direction (from the user — keep following this)

This app should **follow the player as the campaign continues and help them learn the rules**.
It's a companion for the whole campaign, not a one-time sheet builder. So, when adding features:

- **Guide, don't just ask.** Show what changed and why, and explain new features in plain words at the moment they matter.
- **Leveling is a promotion** (and lowering a level the reverse): show the gains or losses, prompt for the new choices, and let any choice be skipped for later.
- **Deferred choices come back** as to-dos on the character until they're done.
- **Natural next steps** in the same spirit: session/level history, resource tracking (slots, sorcery points, rests), in-play reminders and tips.

## UI rule (from the user, 2026-11-11 — keep following this)

**Don't overwhelm the user when we don't need to.** Show what matters now; put detail one step
away (hover, expand, "more"). Keep the current dark/gold/crimson look, but avoid plain, bland
screens. A full UI rulebook will be written here once the user picks from the style mockups.

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

The app has a Feedback button on every page (`src/components/Feedback.tsx`). The dev server plugin
(`feedback-server.ts`) saves each note to `feedback/feedback.json` (newest first) with pasted
screenshots in `feedback/images/` (open them with Read). Each item has `note`, `context` (screen,
tab, open dialog), optional `target` (the element the user pointed at: label, text, CSS-like `path`,
rect) and `status`. When asked to fix the feedback: work through every `status: "open"` item, then
set its `status` to `"fixed"` and add a short `fixNote` saying what changed. The folder is git-ignored.

## Dev notes

- D&D 5e classes share one shape (`data/classes.ts` → `ClassDef`); the engine (`derive.ts`,
  `progression.ts`) works from it, so a new class is data plus its level-1 choices.
- Each rule set is a plugin under `src/systems/<id>/` implementing `GameSystem` (`src/systems/types.ts`), registered in `src/systems/registry.ts`.
- Level-up/down flows use each system's `progression` (snapshot, featuresAt, unlocksAt, demote).
- `npm test` runs golden tests for every system; keep them passing and add cases when rules change.
- Rules data provenance:
  - Pathfinder 2e: checked against Archives of Nethys.
  - D&D 3.5: written from memory of the SRD (unverified; SRD sites blocked automated reads).
  - D&D 5e: summaries in our own words. 2014 data checked against the SRD 5.1 (CC-BY-4.0) on
    2026-11-10: `npx vite-node scripts/dump2014.ts > app.json`, then
    `python scripts/srdcheck.py srd_raw.txt app.json` (srd_raw.txt = `pdftotext SRD_CC_v5.1.pdf`).
    Spells, spell lists, classes (levels 1-5), races, weapons and armor matched after fixes.
    Shillelagh / Plant Growth flags are known false positives. Xanathar's/Tasha's content is unverified.
    Watch out: 2014 spells built with `from()` inherit 2024 values; override where 2014 differs.
  - The user's own copies of PHB 2014, Xanathar's and Tasha's are in `reference/books/` (PDF + text,
    git-ignored; never copy their text into the app). They're scans: the text has OCR typos
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
