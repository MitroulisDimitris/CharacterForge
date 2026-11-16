# Character Forge — browser test cases (for Claude in Chrome)

Paste everything below the line into Claude in Chrome, together with the two test logins
(they are in `.env.local` on Dimitris's PC: `CF_TEST_EMAIL` / `CF_TEST_PASSWORD`, and a second
account if you have one). Don't paste real players' passwords.

---

You are testing the web app **Character Forge** at https://character-forge-dnd.netlify.app — a
D&D character builder with online sessions for a DM and players. Work through the test cases
below in order, in a new tab. Don't change or delete anything that isn't yours (only touch
characters and sessions you create during the test; their names start with **"QA "**).

**Accounts**
- Account A (player / host): `<email A>` / `<password A>`
- Account B (second player, optional): `<email B>` / `<password B>`
  If you only have account A, skip the steps marked **[B]**.

**Notes**
- Only one login per account stays active: logging in to the same account elsewhere logs the
  other place out. That's expected, not a bug.
- Some cases ask for a **phone-sized window**: resize the browser window to about **400 px wide**
  (or use the browser's device toolbar). Check there's no sideways scrolling.
- The app has a **Feedback** button (bottom right; a small round ✎ icon on phones). For every
  failed check, file one feedback note with it: start the note with **"QA:"**, say the test ID,
  what you did, what you expected and what happened. It records your steps automatically.

**Report at the end**: a table with *Test ID · Pass / Fail / Skipped · one line of notes*, then a
short list of anything confusing even if it technically passed.

---

## A. Login

**A1 · Wrong password**
1. Open the site. You see the login page ("Character Forge", Email, Password, Log in).
2. Log in with account A's email and a wrong password.
- ✅ A plain message: "That email and password don't match…". No technical error text.

**A2 · Log in**
1. Log in with account A.
- ✅ "My characters" opens. The account's name is at the bottom of the left sidebar (or in
  "Menu" on a phone).

**A3 · Forgot password screen** (don't send the email)
1. Log out (sidebar name → ⋯ → Log out). On the login page click "Forgot your password?".
- ✅ A screen asks for the email with "Send reset link". Click "Back to log in" without sending.
2. Log in with account A again.

## B. Creating a character (the bug friends hit on phones)

**B1 · Rules are pre-picked**
1. Click "+ New character".
- ✅ "D&D 5e — 2014 rules" is first and already selected. The other rule sets are greyed with
  "Coming soon" and can't be clicked.
- ✅ "Build my character →" is visible without choosing anything else.

**B2 · Progress survives a reload**
1. Click "Build my character →". In the left sidebar (on a phone: tap "Details"), type the name
   **QA Reload Test**.
2. On the Class step pick any class (e.g. Fighter). Go to the next step.
3. **Reload the page** (F5).
- ✅ You come back to New character with a box "Continue your character? QA Reload Test · step N
  of 9". Click **Continue**.
- ✅ The name and the class are still there, on the same step.

**B3 · Finish the character**
1. Go through the steps (pick anything; "Beginner-friendly" picks are fine) until **Review**, then
   click **Create character**.
- ✅ The character sheet opens on the **Sheet** tab.
2. Go back to "My characters" and reload.
- ✅ "QA Reload Test" is in the list (saved to the account).
- ✅ Opening "+ New character" again shows **no** "Continue your character?" box.

**B4 · Start over**
1. "+ New character" → Build → type a name → go to step 2 → reload.
2. In "Continue your character?" click **Start over**.
- ✅ The box disappears; nothing is created.

## C. The character sheet

**C1 · Sheet tab first**
1. Open "QA Reload Test".
- ✅ The first tab is **Sheet** and it's selected: numbers (AC, HP…), abilities, skills.

**C2 · Tap to use, saved online**
1. If the character has spell slots or other pips under "In play", click one filled pip.
- ✅ It empties; "Saving…" then "Saved to your account".
2. Reload the page.
- ✅ The pip is still used. Click **Long rest** — all pips refill.
(Skip if the class has no pips, e.g. Fighter; note "skipped".)

**C3 · Phone layout** (phone-sized window)
1. Open the character.
- ✅ A compact bar at the top (back arrow, small crest, name, "Details"). The Sheet tab is right
  under it — no long scroll first.
- ✅ "Details" opens the rest (To do, Level, ⋯ menu). No sideways scrolling.

## D. Sessions

**D1 · Host a session**
1. "My characters" → Sessions → **Host a session**. Name: **QA Session**. Keep D&D 2014 and all
   books. Click **Create session**.
- ✅ "Your session is ready" with an invite code like `K7P-2QX`, Copy code / Copy link.
2. Click **Open the session**.
- ✅ The session page opens on the **Lookup** tab, with tabs Lookup · Party · Encounters · Notes,
  and the invite code in the sidebar.

**D2 · Join from another account [B]**
1. In a **different browser profile or an incognito window**, open the invite link from D1, log in
   with account B.
- ✅ After login a join screen shows "QA Session", hosted by account A, with B's characters. Ones
  that don't fit are greyed with a reason.
2. Pick a character (or "Create a new character for this session") and **Join**.
- ✅ The session page shows "Who's playing" with B's character.
- ✅ B does **not** see Lookup / Encounters / Notes tabs.

## E. DM tools (as account A, in QA Session)

**E1 · Lookup**
1. Lookup tab: type **owlbear**.
- ✅ An Owlbear card: CR 3, AC 13, HP 59, speed. "Full stat block" opens the rest.
2. Type **red dragon**.
- ✅ Dragon cards show "Immune to: Fire" and key traits like "Flies 80 ft · Legendary actions".
3. Type **prone**.
- ✅ The **Prone** condition card shows first, with a plain explanation.
4. Clear the search box.
- Note what you see (favorites / recently viewed / a hint). Friends asked to be able to **browse a
  list** without typing — note whether that's possible.

**E2 · Suggest an encounter**
1. Encounters tab → **Suggest one**. Pick **Hard**, Place **Forest**. Click **Suggest**.
- ✅ The builder opens: "Suggested: …", a monster list with counts, and the difficulty panel says
  **Hard**.
2. Click **Try another** 3 times.
- ✅ Each time different monsters, still **Hard**.
3. Change a count with − / +.
- ✅ The difficulty and XP update right away.
4. Rename it **QA Ambush** and **Save encounter**.
- ✅ It appears in the Encounters list with its difficulty.

**E3 · Build an encounter by hand**
1. **+ New encounter**, name **QA Goblins**. Search "goblin", **+ Add**, set the count to 4.
- ✅ With "players at level 1" and 4 players (if nobody joined), it says **Deadly**; with level 3,
  **Easy**. Save it.

**E4 · Party tools [B]**
1. Party tab.
- ✅ B's character card: HP bar, AC, passive Perception, initiative, speed (spell DC if a caster).
2. **HP & conditions**: amount 5, type Fire, **Damage**; tick **Poisoned**.
- ✅ The HP bar drops by 5 (or 2 if the character resists fire, with a "halve" box); "What
  happened" lists both.
3. Back to Party → ⋯ → **Award a level**.
- ✅ "Level N awarded · waiting for the player".
4. As account B: open the character → Version: "QA Session …" (in Details on a phone).
- ✅ An "In QA Session · set by your DM" box shows the HP and "Poisoned" (may take up to 20 s or
  a reload). A gold "Level up ready" to-do is in To do.

**E5 · Notes**
1. Notes tab: type a line.
- ✅ "Saved" shows; after a reload the text is still there.

## F. Feedback

**F1 · Send feedback**
1. Click the Feedback button. Type "QA: feedback test, please ignore".
- ✅ Under the note: "Also sends: the steps you took, the screen you're on…" and **Show details**
  shows the recorded steps (no passwords, no typed text).
2. Send it.
- ✅ "Sent. Thank you!" and it appears under **Saved**.

**F2 · Phone** (phone-sized window)
- ✅ The Feedback button is a small round icon and doesn't cover buttons you need (scroll to the
  bottom of a long page to check).

## G. Clean up

1. As account A: open **QA Session** → ⋯ → **Delete session…** (confirm).
2. "My characters" → "QA Reload Test" → ⋯ → **Delete…** (confirm).
3. Log out.
- ✅ Nothing named "QA …" is left.
