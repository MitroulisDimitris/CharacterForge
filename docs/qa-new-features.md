# QA script: new features (for Claude in Chrome), 2026-11-22

Paste everything below the line into Claude in Chrome.

---

You are testing new features in **Character Forge**, a web app for D&D 5e (2014 rules) characters
and game sessions. Test the local copy: **http://localhost:5173**. The live site doesn't have these
changes yet.

**Your goal:** check that each new feature works, find bugs, and note anything confusing or awkward
for a real player or DM. Be concrete.

## Ground rules
1. **Accounts.** The user gives you two accounts:
   - **Account A** plays the DM.
   - **Account B** plays the player.
   Log in only with these two, one at a time: log out of one before logging into the other. A login
   signs that account out on its other devices. Never log in with any other account.
2. Use one fresh tab and don't touch other tabs or sites.
3. Name everything you create with "QA" at the start ("QA Mira", "QA Crypt"). Clean up at the end
   (part 9).
4. Don't use the app's Feedback button. Put your findings in the report.
5. If a browser popup ("Are you sure?") appears, accept it if it's part of the test step. If you
   get stuck, stop and ask the user.
6. Take a screenshot for every finding.
7. Do each part at normal PC width. Where it says **(phone)**, also check at a narrow window
   (about 400 px wide) if you can. Look for anything cut off, overlapping, too small to tap, or
   scrolling sideways.

## Part 1 · Character portrait (Account B)
- Log in as **Account B**. Create **QA Mira**: a Hill Dwarf Cleric (Life domain), level 1. Use any
  background.
- On the Equipment step, pick the equipment options but **press Next without pressing "Use this
  equipment"**. On the character's page, check the Equipment tab: the kit should be in the
  inventory and AC should not be 10/11.
- On the Race step, check that:
  - a **Tool proficiency** choice (smith's, brewer's or mason's) is asked;
  - the warhammer can be picked on the Equipment step.
- On the Skills & languages step, check the "Tools & other proficiencies" card shows real armor
  (light, medium, heavy, shields) and weapons. It must not say "None".
- On the character page, **click the round crest** (or ⋯ → Add a portrait):
  - choose any image, drag it, zoom it (slider, and the mouse wheel), then save;
  - check the portrait shows on the character page, on the card in My characters, and stays after
    a page reload;
  - change it, then remove it, then add one again.
- **(phone)** Open the portrait dialog: can you drag and zoom? Does it fit the screen?

## Part 2 · Your own tracker (Account B, QA Mira)
- **HP box in the left sidebar:**
  - Damage 5. Then Damage 4 with the type set to Poison: it should be halved (dwarves resist
    poison).
  - Temp HP 3, then Heal 2.
- **Sheet tab → In play panel:**
  - Add a condition (Poisoned), then remove it.
  - Set exhaustion to 2.
  - Concentrating: pick Bless, then take damage: a Constitution save DC should be shown.
  - Damage the character down to 0 HP:
    - "Unconscious" is added and concentration ends;
    - Death saving throws appear. "Roll a death save" throws a 3D die and marks the result.
  - Heal 3: death saves disappear.
- **Short rest:** spend a Hit Die. Try "Roll a Hit Die" (3D die) and also typing a number. HP
  should go up by the roll + CON, and the Hit Dice count should drop. Then press Finish short rest.
- **Long rest:**
  - HP, slots and features come back.
  - Exhaustion must **not** drop by itself; you should only see a suggestion to lower it.
- Level the cleric to 2 (Level up). Check **Channel Divinity** now has a tracker, a short rest
  brings it back, and the In play numbers survive a reload.
- **(phone)** The HP row should sit in the top bar, usable without opening "Details".
- Try the Dark or Parchment skin (Skin menu). There the HP box should be at the top of the In play
  panel.

## Part 3 · Greek (Account B)
- In My characters, ⋯ → Duplicate QA Mira, and rename the duplicate to **QA Άρης ο Μάγος**. Keep
  QA Mira as it is, for part 7. Write a Greek backstory under Details.
- Check:
  - the name looks good in the sidebar, in the library card, and in the heading font;
  - **Download PDF**: Greek should show in the PDF, not "????";
  - **Export as file**: the file name should keep the Greek name.
- (Later, as the DM in part 5) In session Notes, write "Ο Άρης" and search for "αρης". It should
  be found even without the accent or capital letter.

## Part 4 · Race cards and drop-downs (Account B)
- Start + New character just to look (cancel afterwards). On the Race step:
  - the Dragonborn card's "Good for …" tag must stay inside its card;
  - no text should be cut off.
- Create or open a Ranger at level 1. On the Class tab, check that the **Favored enemy** and
  **Favored terrain** drop-downs line up.

## Part 5 · Session level (Account A, the DM)
- Log out. Log in as **Account A**. **Host a session** "QA Crypt", with **Characters' level: 3**.
- Open it:
  - "Level 3" should show on the session;
  - ⋯ → **Name and level** should let you change it (set it back to 3).
- Note the **invite code**.

## Part 6 · Monster spells and builds (Account A, in QA Crypt)
- **Lookup:** find the **Lich** and open its page.
  - Spells should be their own blue section, with one line per spell level.
  - Tap **Fireball**: its card shows the facts, the dice and "DEX save · DC 20". The dice chip
    throws 3D dice.
- **Change spells:**
  - Tap Fireball. Only 3rd-level wizard spells should be offered; swap it for Lightning Bolt. No
    warning should appear.
  - "+ Add" on 9th level → "Show all spells" → pick Wish. A **⚠ ↑ Stronger than the books** mark
    should appear. Tap it: it says what was added and removed.
- **Build:** Build ▾ → "Save as a new build", named "QA Wish Lich".
  - In the Build list, the current build should be **highlighted** (no check mark), with ⚠ ↑.
  - Rename it, then switch back to Original and back again.
- **+ Add QA Wish Lich to an encounter** → new encounter. In **Encounters**:
  - the line shows the build name and ⚠ ↑;
  - there must be **no** "Add to another encounter" link.
- Run the fight:
  - Expand the lich. Its **Spells** box starts closed, with "Slots left …".
  - Open it and tap one slot dot: exactly one slot is used.
  - Close the monster and reopen it: the Spells box should still be open.
  - Roll "+12 to hit" and a spell's damage.
- **(phone)** Repeat a little of the fight. Check nothing is cut off and the spell cards fit.

## Part 7 · Joining: same character or a copy (Account B, the player)
- Log out. Log in as **Account B**. Join with the invite code.
  - Pick **QA Mira**, which is level 2. The dialog should offer **Use the same character** and
    **Join with a copy**.
  - It should say the session plays at level 3 and you'll get a "Level up to 3" to-do.
  - Choose **Join with a copy**.
- Check the copy:
  - a new character "QA Mira (QA Crypt)" is in My characters;
  - the original is unchanged;
  - the copy has a **"Level up ready … Level up to 3"** to-do. Level it up.
- On the player's session page:
  - you see what the DM set for your character (HP and conditions), read-only;
  - you don't see your private tracker from part 2 there.
- Optional: make a level-5 character (or use Level ▾) and use **Swap character** with it. You
  should get a **"Lower to level 3?"** suggestion with **Lower** and **Keep level 5**, and nothing
  should change by itself.

## Part 8 · The DM's view of the player (Account A)
- Log out. Log in as **Account A** and open QA Crypt → **Party**.
  - Check the player's card shows the copy's name, level 3, and its **portrait** (if the copy has
    one).
  - Damage the player in the Party view. Then log back in as B and check the player's session
    page shows it, while QA Mira's own private HP box is unaffected.

## Part 9 · Clean up
- As **Account A**: delete the session QA Crypt and the build.
- As **Account B**: delete every character whose name starts with "QA".
- Log out.

## Report
End with one report:

**Summary.** 3–5 sentences: what works well, what's broken, what's confusing.

**Findings.** One entry per finding:

```
[#] Title
Part: 1–8 · Type: Bug | Confusing | Missing | Layout/phone | Rules/numbers
Severity: High (blocks or wrong numbers) | Medium | Low
Steps: what you did
Saw: what happened
Expected: what should happen, in plain words
Screenshot: (attached)
```

**Worked as expected.** A short list of the checks that passed.

**Couldn't test.** Anything you skipped, and why.

Keep it concrete. Ten real findings beat thirty vague ones.
