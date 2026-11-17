# Character Forge — progress checklist

What's built and what's next, in order. `[x]` = done and checked, `[ ]` = not done yet.
Details for each item are in `REQUIREMENTS.md` (section numbers in brackets).
Last updated: 2026-11-17 (combat tracker, "Only you see this", Browse lists mockup).

---

## Before accounts (already in the app)
- [x] Character library, guided creation, editor, level up / down with "skip for later"
- [x] D&D 5e 2014: all 12 classes + Artificer, levels 1–5, PHB + Xanathar's + Tasha's
- [x] Rules data cross-checked against the SRD and the books
- [x] Skins: Hero, Dark, Parchment
- [x] Tap-to-use spell slots / sorcery points, Short / Long rest
- [x] Live previews while choosing, "Just changed" notes, new-player help
- [x] JSON export / import, PDF download
- [x] Feedback button (saved on this computer only, for now)

## 1. Sheet tab
- [x] Stats, "In play" pips and full summary moved out of the sidebar into a first **Sheet** tab
- [x] Sheet tab opens first when a character opens
- [x] Sidebar keeps portrait, name, To do, Level up, ⋯ menu
- [x] Works in Hero, Dark and Parchment
- [x] One column on narrow screens (slots and points on top)

## 2. Accounts, part 1 (login + characters online)
- [x] Supabase tables: `profiles`, `characters`, with security rules (each account sees only its own)
- [x] Login page (email + password, show password, plain-word errors)
- [x] *My characters* loads from the account
- [x] Changes save to the account automatically (retries if offline, warns before closing)
- [x] "Saved to your account" status on the sheet
- [x] Account name + Log out in the library sidebar
- [x] Your account created (admin)
- [x] Your 2 local characters moved into the account (efiah, Parry Hotter)
- [x] Supabase security check: open warning fixed (one dashboard setting left, see below)
- [ ] Turn on "leaked password protection" in the Supabase dashboard (optional, your choice)

## 3. Accounts, part 2
- [x] One active login per account: a new login logs out the other devices (with a message)
- [x] Activity log in the database (who changed what, deleted characters kept) + `npm run audit`
- [x] Email sender: Brevo account, connected to Supabase (SMTP)
- [x] Verify / Reset password email designs written (`supabase/templates/`)
- [x] Email designs pasted and link addresses set in Supabase
- [x] End-to-end test: sign up → Verify email arrived (inbox) → logged in
- [ ] End-to-end test: reset password by email
- [ ] Verify email subject: set to "Verify your email for Character Forge" in Supabase
- [x] Sign-up page (display name, email, password ≥ 8 characters)
- [x] "Check your email" screen with Resend (60 s wait) and "Use a different email"
- [x] Verify link logs in and lands on *My characters* with a welcome
- [x] Expired / used link: plain message + "Send a new link"
- [x] Forgot password → email → choose a new password
- [x] Change password while logged in (⋯ → Name and password)
- [x] Edit display name
- [ ] Offline copy + sync when back online (keep both if changed on two devices)
- [ ] Character portraits: add / change / remove, crop in a circle, shrink before upload
- [ ] Portrait shown everywhere the crest appears; included in JSON export

## 4. Publish + online feedback
- [x] Host-a-session picker: only D&D 5e 2014, others "Coming soon"
- [x] New-character picker: only D&D 5e 2014, others "Coming soon"
- [x] Import of other rule sets refused with a plain message
- [ ] One setting per rule set to switch it back on later
- [x] Feedback saved online (database + screenshot storage)
- [x] Feedback records the last ~50 steps, the screen, the open character, errors, device
- [x] "Also sends: … / Show details" under the note
- [x] Feedback works on the login page too (with an optional name)
- [x] Admin list of all feedback with open / fixed; senders see "Fixed: …"
- [x] `npm run feedback:pull` + `npm run feedback:fix` for the "fix the feedback" workflow
- [x] Feedback records page, window size, browser, skin
- [x] `netlify.toml`
- [x] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` added in Netlify
- [x] Pushed to GitHub (2026-11-16); live at https://character-forge-dnd.netlify.app (login checked)
- [ ] Check the live site on a real phone and desktop

## 5. Table card
- [x] `tableCard` for D&D 5e 2014 (AC, HP, speed, initiative, passives, spell DC, resistances)
- [x] Shown on the host's party cards (worked out from the session copy, so it's always current)

## 6. Host / join / manage sessions
- [x] Database: `sessions` + `session_members` tables, security rules, join/swap/roster functions
- [x] Sessions section in the library sidebar (Host, Join, active sessions, Past sessions)
- [x] Host a session: name, rules (others "Coming soon"), allowed books → invite code + link (copy / share)
- [x] Join with a code or link (the link is remembered through login, with a hint on the login page)
- [x] Character picker: eligible vs greyed with the reason (rules / books) + Books tip
- [x] Session copy of the character on join (D2)
- [x] Version dropdown on the sheet: "My character" + one per session (D2)
- [x] Session note on the sheet ("Playing in …") and "In <session>" tag on library cards
- [x] Player session page: name, rules, who's playing (summary only, D4), Open sheet
- [x] Host session page: invite code, who's playing (name + player)
- [x] Host menu: new code, lock / unlock joining, rename, add books, end / reopen, delete
- [x] Host removes a player; player leaves
- [x] Tested with two accounts: join by link, session copy separate, host sees player, lock, players can't read the code, leave, delete
- [ ] Try in the browser: create a new character for a session (built, not yet clicked through)
- [ ] Try in the browser: swap character, rename, add books, end session, new code (built, not yet clicked through)
- [ ] Check the session page in Dark / Parchment and on a real phone

## 7. Party tools (host)
- [x] Party tab: every member's table card, HP bar, conditions
- [x] Open a member's full sheet, read-only (D3)
- [x] Host changes in-play state: damage + type (halved when resistant, blocked when immune), healing, temp HP, conditions, exhaustion, reset; "What happened" log (D3)
- [x] Player sees those changes on their session version ("In <session> · set by your DM"), refreshed every 20 s
- [x] Award a level (one player or everyone) → gold "Level up ready" to-do; clears once the player levels up
- [x] Private host notes (autosave)
- [x] Tested: host test account + your account in the background (you weren't logged out); players can't change HP

## 8. Lookup (host)
- [x] One search box for monsters, spells, conditions (Lookup tab opens first for the host)
- [x] Monster card: CR, AC, HP, speed, then Weak to / Resists / Immune to chips, then 1–4 key traits
- [x] "Full stat block" one tap away
- [x] Monster filters: CR range, creature type
- [x] Spells (SRD, every level) with "What it does"; conditions + exhaustion in plain words
- [x] Favorites and Recently viewed (saved in this browser for now)
- [x] "Only you see this" (lock line) on every host tab: Lookup, Party, Encounters, Notes, and the fight
- [x] Browse monsters without typing (challenge / type / place / sort), an icon per monster (game-icons.net), monster page beside the list on PC (full page on phone): numbers, At the table, stat block with Roll buttons, Monster Manual page, + Add to an encounter, your own picture (⋯ → Add a picture)
- [x] Session side panel folds to a thin strip on PC
- [ ] Browse spells by level / class
- [ ] Spell names inside a stat block open that spell
- [ ] Environment filter; favorites saved to the account (any device)

## 9. Encounters
- [x] Encounters tab for the host (players never see it; enforced in the database)
- [x] Builder: search monsters, add, set counts, stat block on tap, notes
- [x] Difficulty for this party, live (2014 XP thresholds: Easy / Medium / Hard / Deadly), with a meter
- [x] Total XP, XP per player, adjusted XP with the group multiplier (shifted for small / big parties)
- [x] Plan for a party before anyone joins (players × level)
- [x] Saved encounters per session: list with difficulty, open to edit, delete
- [x] Tests for the maths (DMG examples) · browser test on desktop and phone
- [ ] "Add to encounter" straight from a Lookup monster card
- [x] Suggest an encounter: pick Easy / Medium / Hard / Deadly + optional creature type and place; lands exactly on that difficulty for this party; "Try another"; opens in the builder to change and save
- [x] Suggestions keep groups to one creature type most of the time; tests for every difficulty

## 10. Polish (every screen, every size)
- [x] Phone: sidebar becomes a compact top bar (sheet, library, session page) so the Sheet tab is reachable right away
- [ ] Screen-size check at 375 / 768 / 1280 / 1920 px in Hero, Dark, Parchment
- [ ] Check on a real phone (iPhone Safari, Android Chrome)
- [ ] Hover cards and previews open by tap
- [ ] Touch targets ≥ 44 px everywhere
- [ ] Install to home screen (PWA), app icon, opens full screen

## 11. Combat tracker
- [x] Start from a saved encounter ("Run this fight"); a fight in progress shows "Continue the fight" on the Encounters tab
- [ ] Start from scratch (no saved encounter)
- [x] Initiative: monsters rolled (one roll per kind), players type their roll (bonus shown), or "Roll for the players"; reroll; leave someone out
- [x] Turn order, "Now" marker, Next turn, round counter, Back one turn; ties: higher bonus, then players first
- [x] Damage / healing / temp HP, HP bars; monsters at 0 HP are "Down" and skipped; players at 0 HP get a death-save tip
- [x] Monster resistances / immunities / vulnerabilities from the stat block (asks when it says "nonmagical")
- [x] Concentration tip after damage (Con save DC)
- [x] Players' HP and conditions go to their sheet (they see their own); monsters' stay with the host
- [x] Numbered monster copies with separate HP
- [x] Conditions per creature
- [ ] Condition durations ("until the end of its next turn")
- [x] Add someone mid-fight (NPC, reinforcements, a player who joined late); change initiative mid-fight
- [x] End fight: rounds, defeated monsters, XP total and per player
- [x] Survives a page refresh / another device (saved on the encounter, `encounters.combat`)
- [x] Tests (turn order, skipping, ties, XP, resistances) · browser test at 375 / 768 / 1280 / 1920

## Later
- [ ] Monster pictures, typo-tolerant search, search inside abilities
- [ ] Magic items, rules quick reference
- [ ] Custom monsters
- [ ] Ask before joining, hand hosting to another member, guest party members
- [ ] Shared notes for players, live turn order on players' phones
- [ ] Other rule sets (D&D 2024, 3.5, Pathfinder 2e)
- [ ] Levels 6–20, higher-level spells, multiclassing
