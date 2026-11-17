# Character Forge — Requirements (accounts + sessions)

Character Forge grows from a character builder into **one app for the whole table**. There are
no separate player or DM accounts. **One account can do everything:**

- have **many characters** (build, level, export/import, PDF: everything the app does today),
- **host** sessions (as the DM),
- **join** other people's sessions with one of its characters.

A **session** is a game someone hosts. It has one invite code and stays open across as many
game nights as the group plays, until the host ends it.

> **How to use this doc:** edit anything you like. **[DECIDE]** marks a question that needs your
> answer before building. **(later)** marks a nice-to-have, not part of the first version.
> What already exists is described in `README.md` and `HANDOFF.md`; the UI rules in `CLAUDE.md`
> apply to every new screen. Draft screens: https://claude.ai/artifact/Fpag5ohAFURXdPpjmPLM5t

---

## 1. Goals

- A public website behind a login, with the link shared only with me and a few friends. No App
  Store, no scaling concerns. Because it's private, content from books beyond the free SRD (PHB,
  Xanathar's, Tasha's, 2024 PHB) stays in the app as it is now.
- One link, one login, works on iPhone, Android, and desktop browsers. **Every screen must render
  correctly on any screen size** (phone, tablet, laptop, large monitor): checked at 375 px,
  768 px, 1280 px and 1920 px wide before a screen is called done.
- Characters are saved online and available on any device.
- **Simple:** host a session, share a code, friends join with a character, the host manages it.
  No scheduling, no RSVPs, no campaign bookkeeping.
- Keep the product direction: the app follows the player through the campaign and teaches the
  rules as they go.
- **Feedback works in the published app** for everyone, and each report carries enough detail
  (the steps that led there, the current state) to reproduce the problem without asking (see 6.1).

### For now: D&D 5e (2014) only

- Characters and sessions can only be created with **D&D 5e (2014)**, using the
  **Player's Handbook** (always on), **Xanathar's Guide to Everything**, and **Tasha's Cauldron of
  Everything** (each optional, as now).
- Everywhere the rules are picked (new character, host a session), the other rule sets
  (D&D 5e 2024, D&D 3.5, Pathfinder 2e) are still listed but **greyed out with "Coming soon"**
  and can't be selected. This is a deliberate exception to the UI rule "no coming later lines"
  in `CLAUDE.md`.
- **Import:** a JSON file made with other rules is refused with a plain message
  ("This character uses D&D 5e (2024), which is coming soon.").
- The other rule sets stay in the code (tests keep passing); they're only switched off in the UI,
  with one setting to turn each back on later.

## Non-goals (for now)

- Scheduling game nights, attendance, or reminders
- Maps, battle grids, or a virtual tabletop
- Real-time chat
- Publishing to the App Store or Google Play
- Automating every rule in combat (the host still runs the game; the app keeps track)

---

## 2. Open decisions

| # | Question | Options | Proposed default |
|---|----------|---------|------------------|
| D5 | (later, when other rule sets open) Host tools for D&D 3.5 / Pathfinder 2e sessions | (a) 5e only (b) all rule sets | (a) Hosting, joining, and managing for every rule set; monster browser and encounter difficulty 5e only |
| D6 | Monster data source | Open5e API, D&D 5e API (dnd5eapi.co) | Open5e: more content and better search |

Decided (2026-11-16):
- **Login: email + password only**, no sign-in links, no Google. A new account must verify its
  email before it can be used (see 3.1).
- **One app, one kind of account** that can host and join. No player/DM split.
- **Every account starts empty.** No upload of characters from the browser; moving a character
  between accounts or devices uses the existing JSON export/import.
- **Join rule:** same rules, and the character's books are a subset of the session's books (see 4.2).
- **D&D 5e (2014) only for now** (PHB + Xanathar's + Tasha's); other rule sets greyed out as
  "Coming soon" (see 1).
- **Encounter difficulty** uses the 2014 XP thresholds (Easy / Medium / Hard / Deadly). The 2024
  XP budget (Low / Moderate / High) comes with the 2024 rules.
- **Feedback works online**, with the steps taken and the current state recorded (see 6.1).
- **D2: a character can be in any number of sessions.** Joining makes a **session copy** of the
  character, which levels and changes inside that session only. On the character's sheet a
  **version dropdown** lists "My character" (the original) plus one entry per session it's in;
  picking one shows and edits that version. See 4.2a.
- **D3: the host can't edit a player's sheet** (choices, spells, equipment: read-only), **but can
  change its in-play state** in that session: current HP, temporary HP, damage taken (with its
  type), conditions (poisoned, prone, …), exhaustion. The player sees those changes live on that
  session's version.
- **D4: other players see a summary only** (name, class, level).
- **Character sheet layout (2026-11-16):** the stats that used to fill the sidebar (numbers,
  "In play" pips and rests, full summary) are their own first tab, **Sheet**, next to Class,
  Species… It opens first, because it's what a player looks at most during a game. The sidebar
  keeps the character's identity, the To do box and Level up.
- **The user's own characters** were moved into their account once, by Claude (2026-11-16).
  For everyone else: every account starts empty, as decided.

---

## 3. Account & characters

### 3.1 Account
- **Sign up** with display name, email, and password (at least 8 characters).
- **Verify the email:**
  1. After **Create account**, the app shows "Check your email: we sent a link to
     you@example.com", with **Resend email** (wait 60 seconds between resends) and
     **Use a different email**.
  2. The email (Character Forge name and look, short) has one button: **Verify**.
  3. Tapping **Verify** opens the app, marks the email as verified, logs the new account in, and
     lands on *My characters* with a short welcome ("Your account is ready").
  4. If the link is expired or already used, the app says so in plain words and offers
     **Send a new link**.
  5. Logging in with an unverified email shows the "Check your email" screen again, with
     **Resend email**.
- **Log in** with email and password; **log out**; stay logged in on the device.
- **Forgot password:** an email with a **Reset password** button that opens the app to choose a
  new one.
- A **display name** chosen at sign-up (shown to hosts and other players). Editable later.
- Every account starts empty.

### 3.2 Characters (the library you already have)
- Characters are saved to the account online instead of only in the browser (today:
  `src/storage.ts`, `localStorage`). Library, creation, editor, level up/down, books, skins,
  PDF all keep working as now.
- **JSON export / import stays** as today: the way to move a character between accounts, or to
  keep a backup.
- **Flaky connection:** keep a local copy; edits made offline sync when back online. If the same
  character was changed on two devices, keep the newest and save the other as a copy (never
  silently lose a change).
- A character in a session shows a small session badge in the hero sidebar
  (e.g. "In: Curse of the Ashen King").
- **Keep the current library look** (the hero cards with the class icon inside the level ring,
  rules badge, "N to fix", "Edited N days ago"). New things are added to it, not redesigned.

### 3.2a Character portrait
- Each character can have a **portrait**. When set, it replaces the class icon (leaf, flame, …)
  inside the level ring, everywhere the crest appears: library cards, the hero sidebar, the
  creation sidebar, session party cards, the join list, the combat tracker.
- **Add / change:** from the character's "⋯" menu (**Add portrait** / **Change portrait**) or
  by tapping the crest on the sheet. Choose an image (JPG, PNG, WebP; or take a photo on a phone),
  then move and zoom it inside a circle preview, then **Save**.
- **Remove:** "⋯" → **Remove portrait** brings the class icon back.
- The app shrinks the image before uploading (about 512 × 512, under ~200 KB), so it's quick to
  load and stays within free storage.
- Stored online with the character; anyone who can see the character sees its portrait.
- **JSON export** includes the portrait (embedded), so import brings it back.

### 3.3 Table card
Every rule set provides a short **table card**, so the host never needs to know how each system
calculates things:
- Name, player's display name, identity line (e.g. "Half-Elf · Sorcerer (Draconic)"), level
- AC, max HP, speed, initiative bonus
- Passive Perception (and Insight / Investigation where the system has them)
- Spell save DC (if a caster)

Implementation note: a new optional `tableCard(c, d)` on `GameSystem`
(`src/systems/types.ts`), implemented for D&D 5e (2014) now and each other system when it opens, saved alongside the character so
session screens read it without loading the rules engine.

---

## 4. Sessions

The sidebar of the library gets a **Sessions** section with three things:
**Host a session**, **Join a session**, and the list of **active sessions** (the ones you host
and the ones you play in).

### 4.1 Host a session
1. Tap **Host a session**.
2. Enter a **name** (e.g. "Curse of the Ashen King").
3. Pick the **rules** and the **allowed books** (same picker as character creation). For now
   only D&D 5e (2014) can be picked; the others show "Coming soon". Books: Player's Handbook
   (always on), Xanathar's, Tasha's.
4. **Create.** The session gets an **invite code** (e.g. `K7P-2QX`) and a link, with buttons
   to copy or share them.

### 4.2 Join a session
1. Tap **Join a session** and enter the code (or open the invite link; if not logged in, log
   in first and the app remembers the code).
2. See the session: name, host, rules, allowed books.
3. Pick one of your characters. A character **can join** when:
   - it uses the **same rules** as the session, and
   - **every book it uses is allowed** by the session (its books are the same as, or fewer than,
     the session's).
   Characters that can't join are shown greyed, with the reason in plain words:
   "Uses Tasha's, which this session doesn't allow" / "This session uses D&D 5e 2014".
   Tip under a book mismatch: you can remove a book from the character with the **Books** badge.
4. Or **create a new character** for it: creation opens with the session's rules and books
   already picked, and joins when finished.
5. **Join.** The session appears in your active sessions; the character gets the session badge.

### 4.2a One character, several sessions (D2)
- Joining stores a **session copy** of the character (taken at the moment of joining). Leveling,
  spending slots and rests in that session change only that copy.
- The sheet's sidebar shows a **version dropdown** when the character is in at least one session:
  "My character" + one line per session ("Curse of the Ashen King · level 4"). The dropdown
  remembers the last choice per device.
- "My character" is the original; it's what new sessions copy when the character joins them.
- (later) "Copy this version over My character" for players who want to carry progress over.

### 4.3 Being in a session (player)
The session page for a player is simple:
- Session name, host, rules and books
- Who's playing: each player's display name and character (summary per D4)
- Your character, with a button to open its sheet
- "⋯" menu: **Swap character** (same join rule), **Leave session**
- (later) The host's shared notes

### 4.4 What the host can do

**Focus: a quick reference at the table, not bookkeeping.** The host mostly needs to *look
things up*: monsters, enemies, spells, conditions. Tools that make the host track every number
stay optional and out of the way.

The session page for the host has tabs: **Lookup** (opens first), **Party**, **Encounters**,
**Notes**, and **Combat** (optional, last). The invite code is always visible at the top. The
sidebar's main action is the search ("Look up a monster, spell or condition"), not "Start combat".

**Manage the session**
- Copy / share the invite code and link
- **New code:** makes a fresh code; the old one stops working
- **Lock joining:** nobody new can join until unlocked
- Rename the session
- Add allowed books (removing a book flags members whose characters use it, without removing them)
- **End session:** moves it to "Past sessions"; players keep their characters; nothing is deleted
- Delete session (asks first)

**Manage people**
- See every member: display name, their character, joined date
- **Remove** a player from the session
- (later) **Ask before joining:** new joiners wait for the host's OK
- (later) Hand hosting to another member

**Party**
- Every member's **table card**, always up to date (AC, HP, passive Perception, speed, initiative, spell DC)
- Open any member's **full sheet**, read-only (D3), except the **in-play state**: the host can
  set current / temporary HP, apply damage (amount + damage type, e.g. 7 fire) or healing, and
  add / remove conditions and exhaustion. Changes show on the player's session version right away.
- **Award a level** to one character or to everyone: their character gets a gold
  **"Level up ready"** to-do, which opens the existing promotion screen (`LevelChange`),
  with the usual "choose now / skip for later"
- (later) **Guest party members:** add someone without an account by hand (name, level, AC, HP,
  passive Perception), or a host-run NPC companion

**Lookup (the main tool)**
- **One search box** for monsters, spells, and conditions together; results grouped by kind,
  each with its own filters.
- **Monsters: show what a host needs first, nothing else above the fold.** A result card and the top of
  every stat block show, in this order: name, CR, AC, HP, speed; then **Weak to** (vulnerabilities),
  **Resists**, **Immune to** (damage and conditions), each as short coloured chips; then the one or
  two things that matter most in a fight (legendary actions, spellcasting, flying, magic
  resistance, pack tactics…). The full stat block is one tap away ("Full stat block"), never
  shown all at once. No walls of text.
- **Monster search:** by name; filter by challenge rating (CR), creature type, size,
  environment. Full stat block: AC, HP, speed, ability scores, skills, senses, resistances,
  traits, actions, legendary actions. Spell names inside a stat block open that spell.
- **Spells:** every level. The app's own spell text (PHB, Xanathar's, Tasha's; levels 0–3 today)
  plus the free SRD spells (Open5e) for everything else. Shows level, school, casting time,
  range, components, duration, concentration / ritual, which classes get it, and the text.
- **Conditions:** the 15 conditions plus exhaustion levels, in plain words.
- **Favorites** (star anything) and **Recently viewed**, so the same goblin is one tap away.
- (later) **Monster pictures:** show an image with the stat block. The free monster data has no
  pictures, so the host can add their own image to any monster (saved to their account and
  reused in every session).
- (later) **Cleaner search:** forgiving of typos ("owlber" finds Owlbear), sort by CR or name,
  search inside abilities ("flying", "fire resistance", "spellcasting").
- (later) Magic items, and rules quick reference (cover, grappling, actions in combat).
- (later) **Custom monsters / enemies** (homebrew or book monsters, same stat-block format).

**Encounters (enemies for this session)**
- **Encounter builder:** pick monsters and counts; difficulty for this party (2014 XP
  thresholds); total XP and XP per player; save to the session (players never see it).
- Saved encounters are a list of the session's enemies, each opening its stat blocks.
- (later) "Suggest an encounter" by difficulty + creature type / environment.

**Combat (optional, kept simple)**

A light tracker for hosts who want it. Nothing else depends on it, and it never takes the main
action spot.
- Start combat from a saved encounter or from scratch
- Party members come in from their table cards; monsters from the encounter; enter or roll
  initiative (initiative bonuses pre-filled)
- Sorted turn order, **Next turn**, round counter
- Tap to apply damage or healing; HP bar; marks creatures down / dead
- Copies of a monster are numbered (Goblin 1, Goblin 2, ...) with separate HP
- Conditions per creature (poisoned, prone, stunned, concentrating, ...), optionally with a
  duration in rounds
- Open a monster's stat block or a character's sheet from the tracker
- Survives a page refresh or the phone screen locking mid-combat
- Combat HP is the host's copy; it never changes the player's character (D3)
- (later) Players see the turn order live on their phones

**Notes**
- One private notes page for the session (plot threads, NPC names, what happened last time)
- (later) A shared note players can read (recap, handouts)

**Nice-to-haves (later)**
- NPC list, locations / quest tracker
- Loot tracker (who got what)
- Dice roller
- Export a whole session to JSON as a backup

---

## 5. Who can see what

| Data | Character's owner | Session host | Other players in the session |
|------|-------------------|--------------|------------------------------|
| A character (original) | read + edit | — | — |
| Its session copy | read + edit | read (full sheet); edit in-play state only (HP, damage, conditions) | summary only (D4) |
| Session name, rules, books, members | read | read + edit | read |
| Invite code | — | read + edit | — |
| Host notes, encounters, combat, monsters | — | read + edit | nothing |
| Level awards for a character | read (as "Level up ready") | create | — |
| Feedback | sender: read (own items) · admin (me): read + edit all | — | — |

Enforced in the database (Supabase row-level security), not just hidden in the UI.

---

## 6. Feedback & publishing

### 6.1 Feedback (works in the published app)

Today the Feedback button (`src/components/Feedback.tsx`) saves to the local dev server
(`feedback-server.ts`) and records the note, the screen (page · tab · step · dialog), the element
pointed at, and screenshots. In the published app:

- **Everywhere, for everyone:** on every page, including the login page (there it asks for an
  optional name). Logged-in feedback records who sent it.
- **Same as today:** write a note, point at the part of the screen you mean, paste or drop
  screenshots.
- **Saved online:** the database, with screenshots in file storage. Dev and the published app use
  the same place.
- **Recorded automatically with every feedback:**
  - **Steps to get here:** the last ~50 actions, in order, in plain words, with time, e.g.
    1. Opened *My characters*
    2. Opened *Lyra Ashveil*
    3. Switched to the *Spells* tab
    4. Clicked *Learn or change spells*
    5. Picked *Magic Missile*
    6. Changed level 4 → 5 (opened *Level up* dialog)
    7. Clicked *Choose now* on *New spell*

    Covers screen changes, tabs, creation steps, dialogs opening/closing, clicks on buttons and
    links (by their label), picks made (what changed, from `describeChange`), level changes, rests,
    imports/exports, joining/leaving a session, and combat actions (next turn, damage). Typing is
    recorded only as "Typed in *Name*", never the text. Passwords are never recorded.
    The trail stays in memory (and survives a page reload) and is only sent with feedback.
  - **Where they are:** screen, tab, creation step, open dialog, page address.
  - **Current state:** the open character (full character data, the same as a JSON export, plus
    rules, books, level, skipped-for-later choices, warnings shown), the open session (name, host
    or player, number of members, the combat round if one is running), the skin.
  - **Errors:** recent app errors and failed requests since the page loaded.
  - **Device:** browser, operating system, window size, touch or mouse, app version (build date
    and commit).
  - **Pointed element** (as today): label, text, path, position.
- **The sender sees what's sent:** one line under the note, "Also sends: the steps you took, the
  screen you're on, and the open character", with **Show details** to see it all before sending.
- **Who can read it:** the sender (their own feedback, with its status) and the app owner
  (my account has an **admin** flag). Admin sees every item in an in-app list with
  open / fixed status.
- **Fix workflow (Claude):** a script (`npm run feedback:pull`) downloads open items into
  `./feedback/` in today's format (plus the new fields), so "fix the feedback" keeps working;
  fixing an item sets `status: "fixed"` and a short `fixNote` in the database. The sender sees
  "Fixed: <fixNote>" on their item.
- **Open the same state:** from a feedback item, the admin can load the recorded character (and
  the screen it was on) into a sandbox to reproduce the problem. (later)

### 6.2 Publishing fixes

- **Touch support:** previews and hover cards that need a mouse today must also work by tap
  (UI rule 16 already asks for this).
- **Installable:** add to home screen on iOS and Android, app icon, opens full screen.

## 7. Non-functional requirements

- **Platforms:** latest Safari (iOS), Chrome (Android), desktop Chrome / Edge / Firefox.
- **Mobile:** no horizontal scroll; at phone width the hero sidebar becomes a compact top bar
  (UI rule 10). Touch targets ≥ 44 px.
- **Skins:** Hero, Dark, and Parchment keep working on every new screen.
- **Speed:** common actions (change HP, next turn, tap a pip) feel instant.
- **Privacy:** only people with the code see a session; nothing public.
- **Cost:** stays within free tiers.
- **Checks before calling something done:** typecheck, tests, build, and a browser run (as today).

---

## 8. Tech

| Part | Choice | Notes |
|------|--------|-------|
| Frontend | React 19 + TypeScript + Vite (existing) | Plain CSS in `src/styles.css`, as now |
| PWA | `vite-plugin-pwa` | Home-screen install + offline caching |
| Backend | Supabase (free tier) | Login, Postgres database, row-level security, no server code |
| File storage | Supabase Storage | Character portraits, feedback screenshots |
| Email | Supabase Auth emails sent through our own sender (SMTP) | Verify email and reset password, with our own wording and button |
| Monster / spell data | Open5e API, cached in the browser | Monsters, SRD spells, conditions |
| Hosting | Cloudflare Pages (free; moved from Netlify 2026-11-17) | Deploys from the GitHub repo; gives the shareable link |

Notes:
- I create the Supabase and hosting accounts. The app needs the Supabase project URL + public
  (anon) key in a `.env.local` file (already git-ignored by `*.local`).
- Supabase's built-in email sender is only meant for testing (a very low hourly limit, and it
  may only deliver to the project's own team members), so verification emails to friends need
  our own sender. See 11.
- Supabase free tier pauses a project after ~1 week without activity; restore it from the dashboard.
- The rules data stays in the app bundle (as now); only accounts, characters, and sessions go to
  the database.
- `reference/books/` stays git-ignored and is never deployed.

## 9. Data model (draft)

```
users            (handled by Supabase Auth) + profiles: id, display_name, is_admin
characters       id, owner_id, system, books, data (JSON), pending, spent,
                 table_card (JSON), portrait_path?, created_at, updated_at
sessions         id, host_id, name, system, books, invite_code, joining_locked,
                 status (active / ended), notes, created_at
session_members  session_id, user_id, character_id, joined_at,
                 data (JSON: the session copy, D2), pending, spent,
                 live (JSON: current/temp HP, damage log, conditions, exhaustion; host-editable, D3)
encounters       id, session_id, name, monsters (JSON: ref + count), difficulty, total_xp
combats          id, session_id, encounter_id?, round, turn_index,
                 combatants (JSON: name, init, hp, max_hp, ac, conditions), active
favorites        user_id, kind (monster / spell / condition), ref (Open5e slug or app id)
recent_lookups   user_id, kind, ref, viewed_at
level_awards     id, session_id, character_id, new_level, seen
feedback         id, user_id?, sender_name?, note, context (JSON), target (JSON), images,
                 steps (JSON), state (JSON), errors (JSON), device (JSON), app_version,
                 status (open / fixed), fix_note, created_at
```

## 10. Milestones (order agreed 2026-11-16)

1. **Sheet tab:** the sidebar stats move to a first "Sheet" tab (done 2026-11-16).
2. **Accounts, part 1 (done 2026-11-16):** Supabase tables + security rules for profiles and
   characters; login page; *My characters* loads from and saves to the account; log out; the
   user's account created and their local characters moved into it.
3. **Accounts, part 2:** sign up + verify email + forgot password (needs an email sender, see
   11), display name editing, offline copy + sync, character portraits.
4. **Publish + online feedback:** D&D 5e (2014) only in pickers (others "Coming soon"), feedback
   saved online with the action trail and state (6.1), `netlify.toml`, push, check the live site
   on phone and desktop.
5. **Table card:** `tableCard` for D&D 5e (2014), saved with the character.
6. **Host / join / manage:** host a session, invite code, join with the book rule, session copies
   + the version dropdown (D2), active sessions list, session pages, remove / lock / new code / end.
7. **Party tools:** table cards, read-only sheets, host edits in-play state (D3), award a level
   → "Level up ready", host notes.
8. **Lookup:** monsters (host-first summary, see 4.4), spells, conditions; favorites; recent.
9. **Encounters:** encounter builder (2014 difficulty), saved enemies per session.
10. **Polish:** PWA install, icons, touch support for previews and hover cards, a screen-size pass
    (375 / 768 / 1280 / 1920 px) in all skins.
11. **Combat tracker** (optional, simple).
12. **(later)** Monster pictures, cleaner search, magic items and rules lookup, custom monsters,
    ask before joining, guest party members, shared notes, live turn order for players, other
    rule sets, extras from 4.4.

## 11. What's needed to publish

### For milestone 1 (the current app online + online feedback)
- [ ] **Supabase project** (free): create an account and a project at supabase.com, then give me
      the **Project URL** and the **anon public key** (Project Settings → API). Both are safe in
      the app. I set up the feedback table, screenshot storage, and the security rules.
- [ ] **Supabase service role key**, only for the `feedback:pull` script on this computer.
      It goes in `.env.local` (git-ignored), never into the app or GitHub.
- [ ] **Hosting account:** Netlify (or Vercel), signed in with GitHub, with access to the
      `CharacterForge` repository. It builds the site from GitHub on every push.
- [ ] **OK to push** to GitHub: the site deploys from it, and `main` has local commits not pushed yet.
- [ ] **Site address:** the free one (e.g. `character-forge.netlify.app`, if the name is free),
      or your own domain (about €10 a year).

### For milestone 2 (accounts)
- [ ] **An email sender** for the Verify / Reset password emails. Either:
  - **A Gmail account for the app** (e.g. a new one just for Character Forge) with 2-step
    verification and an **app password**. Free, no domain needed; emails come from that Gmail
    address. Fine for a few friends.
  - **Your own domain + an email service** (e.g. Resend, free for small volumes). Emails come
    from something like `hello@yourdomain`, look more trustworthy, and land in spam less.
- [ ] **Your account marked as admin:** sign up first, then I set the admin flag (for reading
      all feedback).

### Decisions still open
- None right now (D2–D4 decided 2026-11-16, see 2).
