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
  character. **Changed 2026-11-22 (user):** the version dropdown is gone for now (to be reworked
  later); a session's copy **follows "My character"**: every change to the sheet is sent to its
  sessions, the DM's in-play state there (HP, conditions) stays the session's own, and a DM's
  level award becomes a "Level up" to-do on the character. See 4.2a.
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
- **Remove:** the same dialog has **Remove the portrait**; the class icon comes back.
- Built 2026-11-20: the crop is saved at 256 × 256 px as a JPEG (~15–30 KB), sharp at the
  largest crest on a 2× screen. Drag to move, pinch / wheel / slider to zoom, arrow keys and + / −.
- Stored inside the character's data (no separate upload), so session copies carry it and the
  roster passes it to the other players.
- **JSON export** includes the portrait (embedded), so import brings it back.

### 3.2b The player's own tracker (2026-11-22)
- **Private** to the player and **independent of sessions** (the DM keeps each session's state,
  D3; the player sees it read-only on the session page). Stored in the character as `play`, never
  copied into sessions.
- **HP** in the hero sidebar (every tab; on phones a row in the top bar; in the classic layouts at
  the top of the Sheet): current / max / temp, an amount, an optional damage type (resistances
  halve it, immunities stop it), Damage / Heal / Temp HP.
- **In play panel** at the top of the Sheet: death saves at 0 HP (Roll a death save with the 3D
  die marks itself; 1 = two failures, 20 = 1 HP back), conditions, exhaustion, concentration (pick
  from your concentration spells or type one; damage reminds you of the CON save DC), limited-use
  features, Hit Dice, Short rest (spend Hit Dice: roll or type what you rolled) and Long rest.
- Rules from the Player's Handbook: dropping to 0 (unconscious, concentration ends), instant death
  from massive damage, damage at 0 HP = failed death saves, long rest = all HP, half the Hit Dice
  (at least one; user 2026-11-22). Exhaustion is never lowered for you: the long rest only
  suggests one level less if you ate and drank (user 2026-11-22).
- **Trackers** (class + subclass + race, levels 1–5) come from the features' uses in the rules
  data: Channel Divinity, Rage, Ki, Action Surge, Second Wind, Bardic Inspiration (short rest from
  5th), Wild Shape, Lay on Hands (a − / + pool), Divine Sense, Arcane Recovery, Superiority and
  Psionic dice, subclass uses, Breath Weapon, Relentless Endurance, once-a-day racial and feat
  spells, the Lucky feat.

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
- (Removed 2026-11-22, rework later) A version dropdown to open each session's copy. Now the copy
  follows the character; the player's session page shows the DM's state for it, read-only.
- **Joining asks how** (user, 2026-11-22): **Use the same character** (every session it's in
  follows it) or **Join with a copy** (a separate character "Name (Session)" in the library that
  levels on its own). A copy is picked first when the character already plays elsewhere.
- **The session's level:** the DM sets the characters' level when creating the session (and changes it
  under the session name in the side panel). Joining with another level leaves a suggestion on the character: "Level up to
  N" (a to-do) or "Lower to level N?" (Lower / Keep). Nothing changes the character by itself.
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
- Rename the session: click its name in the side panel (user, 2026-11-22)
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
- Items (mundane and magic): see 4.5. Rules and conditions, classes, races, backgrounds, feats: Lookup
  uses the same pages as the Wiki (4.7).
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
- Private notes for the session (plot threads, NPC names, what happened last time), in
  **several tabs** the host can name and colour: see **4.8**.
- (later) A shared note players can read (recap, handouts): see 4.8, "Later".

**Nice-to-haves (later)**
- NPC list, locations / quest tracker
- Loot tracker (who got what)
- Dice roller: now planned, see 4.6
- Export a whole session to JSON as a backup

### 4.5 Items (browse, like monsters and spells)

Asked for 2026-11-18. Mockups: "Dice and Items" canvas, https://claude.ai/artifact/RbGiywvgd9SviZzzZ1xURb (row C).

**Every item described in the books** the app knows, mundane and magic: weapons, armour, adventuring
gear, tools, packs, mounts and vehicles, trade goods, and magic items (wondrous items such as cloaks,
capes, boots; rings, rods, staffs, wands, potions, scrolls, magic weapons and armour).
- **Where the items come from:** PHB 2014 equipment and the DMG magic items in the free SRD 5.1
  (saved in the app), Xanathar's (common magic items) and Tasha's (magic items), written in our own words.
  Open: DMG items that are not in the SRD need the user's own DMG copy (not in `reference/books/` yet).
- **Search** by name (forgiving of typos, like the other searches) and inside the text ("fire", "invisible").
- **Filters**, each a row of chips, the same look as monster browse:
  - **Kind:** Weapon, Armour, Gear, Tool, Mount / vehicle, Wondrous item, Ring, Rod, Staff, Wand,
    Potion, Scroll
  - **Magic:** Any / Magic only / Not magic
  - **Rarity** (magic items): Common, Uncommon, Rare, Very rare, Legendary, Artifact. Each rarity has
    its own colour (and a letter, so it isn't colour alone)
  - **Attunement:** Needs attunement / Doesn't
  - **Book:** PHB, SRD / DMG, Xanathar's, Tasha's (only the books the character or session allows)
  - Sort: name, rarity, cost, weight
- **List row:** an icon per kind, the name, one short line (kind · rarity · attunement, or cost · weight).
- **Item page** (beside the list on PC, a full page on a phone): name, kind and rarity line,
  "Requires attunement (by a wizard)" when it applies, cost and weight for mundane items, weapon /
  armour numbers (damage and type, properties, AC, Strength, Stealth), the description in plain words
  (1–3 short paragraphs), charges if any, book and page.
  Damage and other dice in the text are tappable rolls (4.6).
- **Main action:** "+ Add to a character" (pick which one; it goes into that character's inventory with
  its weight, and respects the carrying limit). Secondary in "⋯": copy a link, report a mistake.
- It lives in the **Wiki** (4.7) on the main page and in a session's Lookup (the same list and pages),
  and the Equipment tab's "Add an item" opens it too.

### 4.5a Equipped items change the numbers

Asked for 2026-11-19. Many items change rolls: +1 / +2 / +3 weapons (to hit and damage), Flame Tongue
(+2d6 fire), Bracers of Archery (+2 damage with bows), Cloak / Ring of Protection (+1 AC and saves),
Stone of Good Luck (+1 checks and saves), Gauntlets of Ogre Power / Headband of Intellect / Amulet of
Health (the score becomes 19). The app adds these **automatically**.
- **Equipped** switch on each inventory item (worn or held). Only equipped items count. Armour and
  shields count for AC only when equipped (today any owned armour counts: existing characters get
  their current armour, shield and weapons marked equipped, so no number changes).
- **Attuned** switch on items that need attunement; at most **3** at a time (a 4th asks which one to
  drop). Requirements are checked ("by a wizard"). Such an item counts only when equipped and attuned.
- What counts: bonuses to attack and damage of that weapon, extra damage dice (as their own chip, in
  the damage type's colour), AC, saving throws, ability checks, an ability score set to a value (only
  when that's higher), speed, resistances (shown on the Sheet).
- Effects that apply only sometimes ("while lit", "against undead", charges, once a day) are **not**
  added on their own: they show as an extra chip or a "Tip ·" line on that attack, for the player to use.
- Every number that an item changes names it in its hover card ("Saving throws +1 from Cloak of
  Protection") and in the dice result window.
- Data: each item gets a list of effects in our own words; the item page shows them ("While attuned:
  +1 to AC and saving throws").

### 4.6 Dice: 3D dice rolled on the screen

Asked for 2026-11-18. Mockups: "Dice and Items" canvas (rows A and B). Rolls show on your own screen
only for now (not shared with the session).

**How a roll looks**
- Every roll in the app is a **highlighted, tappable gold chip** with a small die icon: `4d8`, `+7 to hit`,
  `2d10 + 6`. Things that aren't rolls (`DC 15 Dexterity save`) stay plain text.
- Tapping it throws **real 3D dice** on the screen: the right number and kind of dice (four d8s for 4d8),
  each die the real shape with numbers on its faces (d4, d6, d8, d10, d12, d20; d100 = two d10s, tens + units).
- **Physics dice only** (user, 2026-11-19; the "Spin" style was dropped): the dice are thrown in from
  the edge (the right on PC, the bottom on a phone), tumble, bounce off each other and the screen
  edges, and settle. The face that ends up on top is the result.
- When the dice settle, a **small result window** appears: the **total in big numbers**, and below it,
  smaller, how it was worked out: each die, the bonus, the damage type
  (e.g. "2d10: 7 + 4 · + 6 = **17** piercing"). The dice that make up the total stay lit.
- **Timing:** the dice fade away **2 seconds after they land**. The window stays about **8 seconds**,
  then fades; it stays while the mouse is over it, a finger is on it, or it has keyboard focus
  (and gets 3 more seconds after). ✕ or Esc closes it sooner; rolling something else replaces it.
- A natural 20 on a d20 says **"Critical!"** (gold); a natural 1 says "Miss" plainly.
- The window has **Roll again**.
- Attacks also say what they hit ("Hits armour class 17 or lower"); a Champion's 19 counts as a critical.
- Bonuses from equipped magic items are added and named in the window ("+ 1 Cloak of Protection"), see 4.5a.
- **Reduced motion:** no throwing; the dice appear already landed, then the window.
- Dice are drawn by the app itself (no big 3D library), so they load instantly and work on phones.

**Monster rolls** (monster page, combat tracker, encounter)
- In the stat block, attack bonuses (`+10 to hit`) and damage (`2d10 + 6`, `plus 1d6 fire`) are chips.
- Each damage part is its own chip (`2d10 + 6` piercing, `1d6` fire, in fire colours).
  (later) One tap for the whole hit ("17 piercing + 4 fire = **21**").
- Saving throws, skills, ability checks and hit points (`17d10 + 85`) are chips too.
- A recharge (`Recharge 5–6`) rolls a d6 and says "Recharged" or "Not yet".
- Big rolls are fine: Fire Breath `16d6` throws sixteen d6s.
- (later) "Attack + damage" in one tap; damage that goes straight onto a combat tracker target.

**Player rolls** (the Sheet tab)
- Tap an **ability** (STR … CHA) for a check, a **saving throw**, a **skill**, **initiative**, or a
  **weapon / spell attack** (to hit, then its damage chip). The result already adds the right modifier
  ("Dexterity check: d20 14 + 3 = **17**").
- **Advantage / disadvantage:** a small "Next roll: Normal · Advantage · Disadvantage" switch near the dice
  button; it throws two d20s, keeps one, and greys out the other. It goes back to Normal after the roll.
- **Free roller:** a dice button opens a panel with only real dice (d4, d6, d8, d10, d12, d20, d100), a
  − / + counter on each, and **Throw**. Nothing else in the panel.
- (later) Hit points on level up with the 3D dice; rolls shared with the session; a short roll history.

### 4.7 Wiki (main page)

Asked for 2026-11-19. One place to read the rules content, outside any session: the same lists and
pages a host has in a session's Lookup, so there is one browse to build and keep up to date.
- **Where:** "Wiki" in the app's main menu, next to My characters and Sessions (left menu on PC, with
  the sections listed under it; top bar in the classic skins). Needs a login, because it holds book
  text that isn't in the free SRD. Mockups: "Dice and Items" canvas, rows C and D.
- **Phone menu (every page, user 2026-11-19):** a ☰ button at the left of the phone top bar opens a
  menu that slides in from the left over a dimmed page: My characters, Sessions, Wiki (with its
  sections), and quieter Feedback / Sign out at the bottom. It closes with ✕, a tap on the dimmed
  page, Esc, or picking a page. **Not inside a character** (user, 2026-11-19): character pages
  (sheet, creation, level up) keep their own top bar with the way back, and no ☰.
- **Sections:** Spells, Monsters, Items (4.5), Classes and subclasses, Races, Backgrounds, Feats,
  Rules and conditions (the 15 conditions and exhaustion, actions in combat, cover, grappling,
  resting, concentration; short plain-words pages). One search box finds all of them, grouped by kind;
  each section has its own filters (the ones Lookup already has).
- **Books:** every book the app knows, with a Book filter.
- **What you can do from the Wiki:**
  - Items: "+ Add to a character" (as in 4.5).
  - Spells: "+ Add to a character", listing only characters whose class can take that spell now;
    a character that can't (no free spell known, wrong class, level too high) isn't listed, and a short line says why.
  - Monsters, classes, races, backgrounds, feats, rules: read only. Choices for a character still
    happen in creation and level up.
- **In a session**, Lookup shows the same pages plus the session actions (add a monster to an
  encounter; (later) give an item to a player). None of those appear in the Wiki.
- Game terms anywhere in the app keep their hover cards; the card gets an "Open in Wiki" link.
- Favorites and Recently viewed are shared between the Wiki and Lookup.

### 4.8 Session notes in tabs (host)

Asked for 2026-11-20. Today the host's **Notes** tab is one text box. It becomes a set of notes
pages, each in its own tab, that the host names, colours and orders. Still private: only the
host sees them (section 5). Mockup: https://claude.ai/artifact/66jejAjRdg6i2Ly4ES8FBi

**Existing notes move to the first tab: nothing is deleted**
- Every session's current notes become its **first tab**, named "Notes 1", with the same text,
  character for character (each line a paragraph; `<`, `>` and `&` kept as typed).
- How (built 2026-11-20, `supabase/migrations/20261120_session_notes.sql`): the first time a
  session's Notes tab opens, `ensure_session_notes` makes "Notes 1" from the old notes, in the
  database, under a lock so it can't happen twice. Sessions nobody opens keep their old notes until
  they're opened. The old `sessions.notes` column **stays as it is**, as a backup; the app only
  stops writing to it. It's removed later, and only after the user OKs it.
- Check after going live: for every session with tabs, "Notes 1" holds the old notes (compare
  query), and the numbers go to the user.
- A session without notes gets one empty "Notes 1" tab the first time its Notes tab opens.
- No size limit cuts old notes: if one is longer than the tab limit below, that tab gets a higher
  limit. Its text is never shortened.

**The tab row**
- The tabs sit in a row above the note. Each shows its colour (a dot) and its name; the open tab
  has the crimson underline like the app's other tabs. A tab's own colour never stands in for "this
  is open".
- **+** at the end of the row adds a tab straight away (see "New tab").
- The row scrolls sideways inside itself when the tabs don't fit (the page never does, UI rule 10),
  the open tab is scrolled into view, and then an **All tabs ▾** button lists every tab (with
  "Edited …") to jump to.
- Up to 30 tabs per session, each up to 50,000 characters. Near the limit, a quiet counter shows.
- The app remembers the last open tab per session on that device.

**Rename**
- Double-click the name (PC), tap the open tab's name again (phone), or ⋯ → **Rename**: the name
  becomes a text box. Enter or tapping away saves; Esc cancels.
- 1–40 characters. An empty name goes back to the old one.

**Colour**
- ⋯ → **Colour**: 8 swatches from the app's palette: Parchment, Crimson, Gold, Green, Blue, Violet,
  Teal, Stone. Each has its name on hover and for screen readers. The picked one also gets a
  check mark, so it isn't marked by colour alone (UI rule 17).
- Colours are the host's own labels. They don't glow and carry no app meaning (gold still means
  "act" elsewhere).
- A new tab gets the **least-used colour** in that session; on a tie, a random one of those.
  Colours can repeat once all 8 are in use.

**The tab menu (⋯ on the open tab)**
- Rename · Colour · Duplicate · Export as text · Delete.
- **Reorder by dragging** (user, 2026-11-20: no Move left/right buttons): click and drag a tab to
  where you want it (PC); on touch, press and hold, then drag. A gold line shows where it will
  land; the tabs glide to their new places (UI rule 18). A quick swipe still just scrolls the row.
  Quiet keyboard fallback, nothing on screen: with a tab focused,
  Alt + ← / → moves it.

**New tab** (user, 2026-11-20: no list of starters)
- **+** just makes the tab, named **"Notes N+1"**: N is the highest number among tabs called
  "Notes N" (so with "Notes 1" there, the next is "Notes 2"; renamed tabs don't count).
- The new tab opens with its name selected in a text box, focused, so typing renames it. Enter
  saves the name and moves into the note.

**Delete: asks first** (user, 2026-11-20: no restore, no Deleted tabs)
- Delete always asks: "Delete 'NPCs'? 1,240 characters. This can't be undone." with Cancel /
  Delete. An empty tab is deleted without asking (there's nothing to lose).
- A deleted tab is gone for good.
- The last tab can't be deleted, so there's always one.

**Toolbar** (user, 2026-11-20, like Gmail's, without the font picker)
- Undo · Redo | Text size (Small, Normal, Large, Huge: only these four) | **Bold** · *Italic* ·
  Underline | Highlight (one click, gold) · Colour (text colour and background colour, 8 each
  plus Default/None) | Bullet list · Tick list.
- Colours are saved as skin tokens (`var(--nt-gold)`, `var(--nb-gold)`), so they stay readable in
  every skin (lighter on Hero/Dark, darker on Parchment).
- Menus close after a pick. The toolbar wraps onto two rows on a phone and stays at the top of the
  note while scrolling. The editor (TipTap) loads only when Notes first opens.

**Writing and saving**
- As today: a tab saves itself 0.8 s after typing stops. "Saving…" or "Saved" shows by the
  note's title. Switching tabs saves the tab you leave straight away.
- Each tab shows when it was last changed ("Edited 2 hours ago").
- If a save fails (no internet), the text stays on the device and saving retries. One line
  says: "Not saved yet: no connection. It saves when you're back online." Typing is never lost.
- Switching tabs doesn't make the page jump: the note area keeps its height (UI rule 18).

**Search**
- **Search notes** above the tabs finds text in every tab. Tabs with matches show how many, and
  picking a tab opens it on the first match, highlighted.
- **Export all notes** (⋯ next to the Notes title) saves every tab as one text file: a backup the
  host keeps.

**Every platform (UI rule 17a)**
- Tabs follow the standard tabs pattern: arrow keys move between tabs, and the menus are real
  buttons. Touch targets are 44 px or more.
- iPhone: the note's text is at least 16 px, so Safari doesn't zoom in when you type, and the
  note stays above the on-screen keyboard. Press-and-hold drag is tested with real taps on
  iPhone and Android (it mustn't fight page scrolling or the text selection menu).

**Later**
- **Shared tabs:** the host marks a tab "Players can read", and it shows read-only on the players'
  session page (a recap, handouts). This replaces 4.4's "(later) shared note". **[DECIDE]** now or
  later?
- Other kinds of tab (ideas given 2026-11-20): Trackers (countdown circles, counters), Picture
  with pins, Board of cards, Sketch, Timeline, Random list, Table.
- Monster, spell and item names in notes get their hover cards and "Open in Wiki".

Decided 2026-11-20: drag to reorder, least-used colour (random on a tie), delete just asks, +
makes "Notes N+1" with no starters, the toolbar above. Still open: shared tabs (above).

### 4.9 Monster spells and builds (host)

Decided with the user 2026-11-21 (mockup: "Monster Spellcasting Mockup" canvas).

- **Spells get their own section** (blue edge, the spell colour) instead of a long paragraph in
  Traits: one line per spell level ("1st level · 4 slots") or per innate line ("At will",
  "3/day each"). Each spell is a pill; tapping it opens its card under the line: casting time,
  range, components, duration, what it does with its dice as gold chips (3D dice), the save and
  DC, the spell attack, cantrip damage at the monster's level, higher-slot text. A small **C**
  marks concentration. Same everywhere a stat block shows (Wiki, Lookup, encounters, fight).
- **In the fight** (inside an expanded monster): a **Spells** box that starts closed with a
  one-line summary ("Slots left 4 · 3 · 3…"). It opens on its own; closing and reopening the
  monster keeps it as it was left. Slots are gold dots to tick off, kept **per monster** (two
  liches each have their own) and saved with the fight. **Cast** uses a slot of that level.
  Innate spells: dots per spell per day ("Darkness 1/1").
- **Changing spells only before the fight**, on the session Lookup's monster page (host). Rule
  (Monster Manual, page 10): a spell can be swapped for another of the **same level from the same
  class list**. The picker offers exactly those first; **Show all spells** allows any level or
  class (kept loose on purpose).
- **Outside the rule** the build gets a **warning triangle** with **↑** (stronger: more or
  higher spells), **↓** (weaker) or **≈** (different class, same weight). Hover / tap shows:
  "Stronger than the books allow. Monster Manual, page 10: … Added: … Removed: …".
- **Builds:** "Build" picker on the monster page: Original (Monster Manual) plus saved builds
  (the current one highlighted, ⚠ ↑/↓ on each). Save as a new build, rename, delete (asks).
  No versions: an encounter keeps the spells it was given; changing or deleting a build later
  doesn't touch encounters that already have it.
- **+ Add to an encounter** adds the chosen build (or the unsaved changes as "Lich (changed)").
  To use a build in more encounters, add it again from the monster page (user, 2026-11-21: no
  "Add to another encounter" on the encounter line).
- Only the monster's own "Spellcasting" (with a class list) can be changed. Innate and coven
  (shared) spellcasting show the same way but aren't changed.

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
- **Greek** (user, 2026-11-21): every field people type in takes Greek and shows it in the app's
  look (Inter has Greek; EB Garamond's Greek stands in for Cinzel and Crimson Pro), in PDFs (Noto
  fonts, only when a sheet needs them), in file names, and in searches of people's own text (case
  and accents don't matter: "αρης" finds "Άρης"). Invite codes typed on a Greek keyboard work.
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
                 status (active / ended), notes (old single note: kept as a backup, 4.8), created_at
session_notes    id, session_id (deleted with the session), title, color, body, position,
                 created_at, updated_at; host only (RLS)
session_members  session_id, user_id, character_id, joined_at,
                 data (JSON: the session copy, D2), pending, spent,
                 live (JSON: current/temp HP, damage log, conditions, exhaustion; host-editable, D3)
encounters       id, session_id, name, monsters (JSON: ref + count, build + spells), difficulty, total_xp
monster_builds   id, session_id, slug, name, spells (JSON: level → spell names)  (host only, 4.9)
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
