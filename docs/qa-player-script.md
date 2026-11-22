# QA script: Character Forge as a D&D player (for Claude in Chrome)

Paste everything below the line into Claude in Chrome.

---

You are testing **Character Forge**, a web app for building and playing Dungeons & Dragons 5e
(2014 rules) characters: https://character-forge-d8q.pages.dev

**Who you are:** a player with a few sessions behind them. You've only played a sorcerer before
and want to try something new that still uses magic (a cleric). You know the basics of D&D but
not every rule. You use the app at the table: before, during and between sessions.

**Your goal:** use the app the way that player would. The point is not only to find bugs. Find
**quality-of-life improvements** and **anything obviously missing** that a player would need or
expect. Think: "At the table, what would make me reach for paper or another app instead?"

## Ground rules

1. **Log in only with the test account.** The user will give you its email and password, or log
   in for you. Never log in with any other account. A login signs that account out of its other
   devices.
2. Use a fresh tab. Don't touch other tabs or other sites.
3. Name everything you create with "QA" at the start (for example "QA Mira"), so it's easy to
   clean up. Delete what you made at the end (mission 10).
4. **Don't use the app's Feedback button.** Write your findings in your report instead.
5. Don't buy, upgrade or enter payment details anywhere. Don't change account settings or the
   password.
6. If you hit a login problem, a captcha or something you can't get past, stop and ask the user.
7. Take a screenshot for every finding you report.
8. Go slowly enough to read what's on screen. Hover over things, since many terms have hover cards.
   Tap things that look tappable.

## How to judge what you see

For every screen, ask:
- **Squint test:** within 3 seconds, can I tell what this screen is for and what to do next?
- **At the table:** could I find this mid-fight in under 5 seconds?
- **New player:** do I understand every word? Is there help where I'd need it?
- **Trust:** do the numbers look right? (AC, HP, attack bonus, spell save DC, skill bonuses)
- **Missing:** what did I expect to find here that isn't there?
- **Friction:** too many taps, things I had to retype, choices with no explanation, scrolling to
  find the main button, text cut off or overflowing its box, anything that jumps or flickers.

## Missions

### 1. First look (logged out, then logged in)
- Open the site. What does a new visitor understand? Is it clear what the app does?
- Log in (see rule 1). Look at "My characters". What's the first thing you'd want to do?
- Open the main menu (☰ at phone width) and visit My characters, Sessions and Wiki.

### 2. Make a new character: a level 1 cleric
- Start **+ New character** and go through every creation step: race, class, background,
  abilities, skills, spells, equipment, details.
- Pick a Cleric (Life domain if offered), any race and background, and roll or assign abilities.
- At each step, check:
  - Do you understand the choice?
  - Is there a "Beginner-friendly" suggestion?
  - Does the preview show what the option changes?
  - Can you go back and change your mind without losing work?
- Try skipping a choice. Does it come back later as a to-do?
- Look for: confusing words, choices that need more explanation, missing options you know exist,
  and numbers that don't add up.

### 3. The character sheet
- Open the finished character. Read the **Sheet** tab top to bottom.
- Check the numbers you can verify by hand:
  - AC, HP, initiative
  - Spell save DC (8 + proficiency + Wisdom modifier)
  - Spell attack bonus
  - Skill bonuses
- Hover the numbers. Can you see where each one comes from?
- Tap rollable things (gold chips) and watch the 3D dice. Is the result easy to read? Can you roll
  with advantage or disadvantage?
- Try each tab: Race, Class, Background, Abilities, Skills & Languages, Spells, Equipment,
  Details.

### 4. Play a session's worth of turns (no DM needed)
Pretend you're in a fight and a short rest. Using only the app, try to:
- Take damage, heal, get temporary HP. Where do you track your current HP?
- Cast spells and mark spell slots used. Then take a short rest and a long rest.
- Track a condition (poisoned, frightened) and concentration.
- Find your death saving throws.
- Find what your cantrip does and roll its damage.
- Check your inventory, coins and equipped items. Add an item you found and equip it.
- Write a quick note (an NPC's name, a quest).

For each one, say whether you could do it, how many taps it took, and what was missing.

### 5. Level up
- Level the cleric up to 2, then to 3.
- Is it clear what you gained? Were you asked for the new choices (spells, domain features)?
- At level 2, use Channel Divinity. Can you track that it's used and that a rest brings it back?
- Try lowering the level back to 2. Does that make sense?
- Look for: anything a real level-up needs that the app didn't ask about or show, like rolling
  HP versus taking the average, or new spell slots.

### 6. Make it yours
- Add a **portrait**: click the round crest on the character page, or use ⋯ → Add a portrait.
  Choose any image from your computer, move and zoom it, and save.
  - Check the portrait shows on the library card, the character page and creation.
  - Change it, then remove it.
- Try the **Skin** menu: Hero, Dark, Parchment. Is everything readable in each?
- Download the **PDF** and **Export as file**. Are they what you'd expect?

### 7. The Wiki (looking things up mid-game)
- Look up a spell (Guiding Bolt, Spiritual Weapon), a condition (Grappled), an item (Potion of
  Healing) and a monster (Goblin).
- Is the search forgiving (typos, partial names)? Can you roll dice from these pages?
- Look for: rules a player looks up often that you can't find (cover, grappling, two-weapon
  fighting, opportunity attacks, resting, jumping, falling, dying).

### 8. Join a session
- If the user gave you an **invite code**, join their session with your QA character. Look at
  what a player sees: party, own HP and conditions, level-up awards.
- If you have no code, open **Sessions** and look at how joining works. Don't host or join
  anything else.
- Look for: what you'd want to see about the other players or the game, and anything that's
  confusing about one character being in several sessions.

### 9. Phone and keyboard
- If you can, make the window narrow (about 400 px wide) and repeat a few steps from missions
  3, 4 and 7. Look for anything:
  - cut off or overflowing
  - too small to tap
  - scrolling sideways
  - hidden behind other things
- Try getting around with only the keyboard (Tab, Enter, Esc) on the character page. Can you see
  where the focus is?

### 10. Clean up
- Delete the characters whose names start with "QA". Leave anything else alone.
- Log out.

## Report format

End with a single report in this shape:

**Summary.** 3–5 sentences: how it felt as a player, the biggest wins, the biggest gaps.

**Top 5.** The five changes that would help a player most, best first, one line each.

**Findings.** One entry per finding:

```
[#] Title (short)
Type: Bug | QoL improvement | Missing feature | Confusing text | Rules/number check | Phone/accessibility
Severity: High (blocks or wrong numbers) | Medium (slows me down a lot) | Low (polish)
Where: page / tab / step
Steps: what you did
Saw: what happened
Expected / suggestion: what you wanted, in plain words
Screenshot: (attached)
```

**Missing for a player.** A plain list of things a player would expect that the app doesn't
have, each with one sentence on why it matters at the table.

**Couldn't test.** Anything you skipped and why.

Keep findings concrete: a bad example is "spells are confusing"; a good one is "On the Spells
tab I couldn't tell which spells are prepared vs known; a 'Prepared' tick or filter would help".
Don't pad the list. Ten real findings beat thirty vague ones.
