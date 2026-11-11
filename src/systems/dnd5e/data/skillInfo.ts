// What each skill is for, in plain words (shown when hovering a skill choice).
import type { SkillId } from "./core";

export const SKILL_INFO: Record<SkillId, string> = {
  acrobatics: "Keep your balance, tumble, and slip out of grapples.",
  animalHandling: "Calm, train and read animals; ride a skittish horse.",
  arcana: "Recall lore about spells, magic items, planes and magical creatures.",
  athletics: "Climb, jump, swim, and grapple or shove.",
  deception: "Lie convincingly, bluff, and wear a disguise well.",
  history: "Recall events, kingdoms, wars and famous people.",
  insight: "Tell when someone is lying or what they really want.",
  intimidation: "Get your way through threats and a scary presence.",
  investigation: "Search for clues, find traps and work out how things fit together.",
  medicine: "Stabilize the dying and diagnose illness.",
  nature: "Recall lore about plants, animals, terrain and weather.",
  perception: "Notice things: hidden enemies, sounds, details. One of the most used skills.",
  performance: "Entertain with music, dance, acting or storytelling.",
  persuasion: "Convince people with charm, tact and good arguments.",
  religion: "Recall lore about gods, rites, holy symbols and undead.",
  sleightOfHand: "Pick pockets, palm objects and do quick hand tricks.",
  stealth: "Sneak and hide without being seen or heard.",
  survival: "Track, hunt, find your way and survive in the wild.",
};
