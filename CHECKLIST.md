# Character Forge — progress checklist

What's built and what's next, in order. `[x]` = done and checked, `[ ]` = not done yet.
Details for each item are in `REQUIREMENTS.md` (section numbers in brackets).
Last updated: 2026-11-16 (sessions).

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
- [ ] New-character picker: only D&D 5e 2014, others "Coming soon"
- [ ] Import of other rule sets refused with a plain message
- [ ] One setting per rule set to switch it back on later
- [x] Feedback saved online (database + screenshot storage)
- [ ] Feedback records the last ~50 steps, the screen, the open character, errors, device
- [ ] "Also sends: … / Show details" under the note
- [x] Feedback works on the login page too (with an optional name)
- [x] Admin list of all feedback with open / fixed; senders see "Fixed: …"
- [x] `npm run feedback:pull` + `npm run feedback:fix` for the "fix the feedback" workflow
- [x] Feedback records page, window size, browser, skin
- [x] `netlify.toml`
- [x] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` added in Netlify
- [x] Pushed to GitHub (2026-11-16); live at https://character-forge-dnd.netlify.app (login checked)
- [ ] Check the live site on a real phone and desktop

## 5. Table card
- [ ] `tableCard` for D&D 5e 2014 (name, player, identity, level, AC, HP, speed, init, passives, spell DC)
- [ ] Saved with the character so session screens can read it

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
- [ ] Party tab: every member's table card
- [ ] Open a member's full sheet, read-only (D3)
- [ ] Host changes in-play state: HP, temp HP, damage + type, healing, conditions, exhaustion (D3)
- [ ] Player sees those changes on their session version
- [ ] Award a level → gold "Level up ready" to-do on the character
- [ ] Private host notes

## 8. Lookup (host)
- [ ] One search box for monsters, spells, conditions
- [ ] Monster card: CR, AC, HP, speed, then Weak to / Resists / Immune to chips, then 1–2 key traits
- [ ] "Full stat block" one tap away; spell names inside open the spell
- [ ] Monster filters: CR, type, size, environment
- [ ] Spells of every level (app text + Open5e SRD spells)
- [ ] Conditions + exhaustion in plain words
- [ ] Favorites and Recently viewed

## 9. Encounters
- [ ] Encounter builder: monsters + counts, difficulty for this party (2014 XP thresholds)
- [ ] Total XP and XP per player
- [ ] Saved encounters per session (players never see them)

## 10. Polish (every screen, every size)
- [ ] Phone: sidebar becomes a compact top bar so the Sheet tab is reachable right away
- [ ] Screen-size check at 375 / 768 / 1280 / 1920 px in Hero, Dark, Parchment
- [ ] Check on a real phone (iPhone Safari, Android Chrome)
- [ ] Hover cards and previews open by tap
- [ ] Touch targets ≥ 44 px everywhere
- [ ] Install to home screen (PWA), app icon, opens full screen

## 11. Combat tracker (optional)
- [ ] Start from a saved encounter or from scratch
- [ ] Initiative (bonuses pre-filled), turn order, Next turn, round counter
- [ ] Damage / healing, HP bars, down / dead
- [ ] Numbered monster copies with separate HP
- [ ] Conditions per creature, optional duration
- [ ] Survives a page refresh / phone lock

## Later
- [ ] Monster pictures, typo-tolerant search, search inside abilities
- [ ] Magic items, rules quick reference
- [ ] Custom monsters
- [ ] Ask before joining, hand hosting to another member, guest party members
- [ ] Shared notes for players, live turn order on players' phones
- [ ] Other rule sets (D&D 2024, 3.5, Pathfinder 2e)
- [ ] Levels 6–20, higher-level spells, multiclassing
