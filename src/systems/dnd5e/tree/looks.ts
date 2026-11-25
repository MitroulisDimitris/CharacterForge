// Each class's look on the progression tree (approved on the mockup canvas "Progression Tree",
// boards 4 and 5: "Class trees, all 13 classes"): node shape, colours, the flowing light, the
// background, and a one-line promise. Plus the line icons the tree draws.

export type Shape = "jag" | "drop" | "halo" | "leaf" | "shield" | "enso" | "kite" | "gemUp" | "oct" | "diamond" | "gemDown" | "circle" | "hex";

export interface Look {
  label: string;
  shape: Shape;
  icon: IconId;
  accent: string;
  /** Lines between steps you have. */
  line: string;
  /** "r,g,b" of the glow. */
  glowRgb: string;
  /** The light that flows along the lines, and its dash pattern (pathLength 1). */
  flow: string;
  flowDash: string;
  /** What the subclass is called on the tree ("Origin", "Oath"…). */
  subLane: string;
  tagline: string;
  bg: string;
}

export const LOOKS: Record<string, Look> = {
  barbarian: { label: "Barbarian", shape: "jag", icon: "axe", accent: "#d1492e", line: "#c2462b", glowRgb: "235,90,55", flow: "#ffb08a", flowDash: ".1 .9", subLane: "Path",
    tagline: "Fury in your blood. Each level, the rage burns hotter.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(220,60,30,0.24), transparent 55%), radial-gradient(circle at 80% 20%, rgba(150,40,20,0.12), transparent 40%), linear-gradient(180deg, #1b0f0c, #201310)" },
  bard: { label: "Bard", shape: "drop", icon: "music", accent: "#d65db1", line: "#c66bd0", glowRgb: "230,120,220", flow: "#ffd2f4", flowDash: ".03 .05", subLane: "College",
    tagline: "Music is magic. Each level, your song carries further.",
    bg: "radial-gradient(ellipse at 50% 112%, rgba(214,93,177,0.22), transparent 55%), radial-gradient(circle at 20% 25%, rgba(90,200,210,0.08), transparent 40%), linear-gradient(180deg, #170f1c, #1d1222)" },
  cleric: { label: "Cleric", shape: "halo", icon: "sun", accent: "#f2d27a", line: "#e8c867", glowRgb: "255,225,140", flow: "#fff6d8", flowDash: ".2 .8", subLane: "Domain",
    tagline: "Your god answers. Each level, the light shines stronger.",
    bg: "radial-gradient(ellipse at 50% -10%, rgba(255,225,140,0.22), transparent 55%), radial-gradient(ellipse at 50% 115%, rgba(255,200,120,0.1), transparent 50%), linear-gradient(180deg, #1c1810, #17130f)" },
  druid: { label: "Druid", shape: "leaf", icon: "leaf", accent: "#6fbf73", line: "#5aa860", glowRgb: "140,220,120", flow: "#d8ffc8", flowDash: ".06 .94", subLane: "Circle",
    tagline: "The wild speaks through you. Each level, it grows deeper roots.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(90,170,90,0.24), transparent 55%), radial-gradient(circle at 25% 20%, rgba(200,230,120,0.07), transparent 40%), linear-gradient(180deg, #0d1510, #121a13)" },
  fighter: { label: "Fighter", shape: "shield", icon: "sword", accent: "#c9a45a", line: "#c2a66e", glowRgb: "240,215,150", flow: "#fff3d0", flowDash: ".14 .86", subLane: "Archetype",
    tagline: "Steel and grit. Every level makes you harder to stop.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(212,166,74,0.18), transparent 55%), repeating-linear-gradient(45deg, rgba(170,190,210,0.035) 0 2px, transparent 2px 18px), repeating-linear-gradient(-45deg, rgba(170,190,210,0.035) 0 2px, transparent 2px 18px), linear-gradient(180deg, #15171b, #1c1a18)" },
  monk: { label: "Monk", shape: "enso", icon: "fist", accent: "#e3a03c", line: "#d89536", glowRgb: "245,175,85", flow: "#ffe6b8", flowDash: ".02 .98", subLane: "Tradition",
    tagline: "Body and spirit as one. Each level, your ki flows faster.",
    bg: "radial-gradient(ellipse at 50% 112%, rgba(227,160,60,0.16), transparent 55%), radial-gradient(circle at 70% 25%, rgba(200,200,210,0.06), transparent 45%), linear-gradient(180deg, #151413, #1b1916)" },
  paladin: { label: "Paladin", shape: "kite", icon: "cross", accent: "#7aa7ff", line: "#e6c35c", glowRgb: "255,220,140", flow: "#fff2c8", flowDash: ".18 .82", subLane: "Oath",
    tagline: "Bound by an oath. Each level, your vow shines brighter.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(230,195,92,0.2), transparent 55%), radial-gradient(circle at 50% 0%, rgba(122,167,255,0.12), transparent 50%), linear-gradient(180deg, #11141e, #171a22)" },
  ranger: { label: "Ranger", shape: "gemUp", icon: "bow", accent: "#9bc46b", line: "#b89a5a", glowRgb: "200,225,130", flow: "#eef7d0", flowDash: ".08 .92", subLane: "Archetype",
    tagline: "At home in the wild. Each level, your aim gets truer.",
    bg: "radial-gradient(circle at 82% 12%, rgba(220,230,200,0.12), transparent 30%), radial-gradient(ellipse at 50% 115%, rgba(120,160,80,0.2), transparent 55%), linear-gradient(180deg, #0e1412, #141a14)" },
  rogue: { label: "Rogue", shape: "oct", icon: "dagger", accent: "#9a7fd1", line: "#8a74b8", glowRgb: "170,140,235", flow: "#e4dcff", flowDash: ".04 .96", subLane: "Archetype",
    tagline: "Unseen until it matters. Each level, the shadows hide you better.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(120,90,180,0.16), transparent 55%), radial-gradient(circle at 15% 20%, rgba(0,0,0,0.4), transparent 50%), linear-gradient(180deg, #0f0e14, #141219)" },
  sorcerer: { label: "Sorcerer", shape: "diamond", icon: "wing", accent: "#e0485e", line: "#d9773a", glowRgb: "255,140,60", flow: "#ffd29a", flowDash: ".07 .93", subLane: "Origin",
    tagline: "Magic in your blood. Each level, the dragon in you wakes a little more.",
    bg: "radial-gradient(ellipse at 50% 112%, rgba(255,110,40,0.26), transparent 55%), radial-gradient(circle at 18% 30%, rgba(224,72,94,0.09), transparent 40%), repeating-radial-gradient(circle at 50% 130%, rgba(255,180,120,0.025) 0 2px, transparent 2px 24px), linear-gradient(180deg, #1a100e, #1e1411)" },
  warlock: { label: "Warlock", shape: "gemDown", icon: "eye", accent: "#9b5de5", line: "#57c48a", glowRgb: "120,230,150", flow: "#d6ffe2", flowDash: ".05 .95", subLane: "Patron",
    tagline: "A pact with something vast. Each level, it gives you more.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(87,196,138,0.16), transparent 55%), radial-gradient(circle at 50% 10%, rgba(155,93,229,0.16), transparent 50%), linear-gradient(180deg, #100c18, #140f1c)" },
  wizard: { label: "Wizard", shape: "circle", icon: "book", accent: "#8fb6e3", line: "#6f9fe8", glowRgb: "120,170,255", flow: "#e2ecff", flowDash: ".012 .045", subLane: "Tradition",
    tagline: "Knowledge is power. Each level fills your spellbook further.",
    bg: "radial-gradient(ellipse at 50% 112%, rgba(110,150,255,0.22), transparent 55%), radial-gradient(circle at 78% 18%, rgba(185,163,232,0.12), transparent 35%), radial-gradient(circle at 15% 60%, rgba(120,170,255,0.06), transparent 30%), linear-gradient(180deg, #0f1220, #171527)" },
  artificer: { label: "Artificer", shape: "hex", icon: "gear", accent: "#d98a4e", line: "#4fc3d9", glowRgb: "90,210,230", flow: "#d8f7ff", flowDash: ".03 .03", subLane: "Specialist",
    tagline: "Magic you build with your hands. Each level, a better invention.",
    bg: "radial-gradient(ellipse at 50% 115%, rgba(79,195,217,0.16), transparent 55%), linear-gradient(rgba(79,195,217,0.05) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(79,195,217,0.05) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(180deg, #0e1418, #12181c)" },
};

/** The shader's branch per class (TREE_FS checks `cls` against these indices). */
export const GL_INDEX = ["sorcerer", "fighter", "wizard", "barbarian", "bard", "cleric", "druid", "monk", "paladin", "ranger", "rogue", "warlock", "artificer"];

/** Classes with a big final-level story (STORY_FS). The others get the "Level up!" card. */
export const STORY_CLASSES = ["sorcerer", "fighter", "wizard"];

export const lookOf = (cls: string): Look => LOOKS[cls] ?? LOOKS.sorcerer;

export const ICONS = {
  wand: "M4 20L15 9 M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  wing: "M3 18c5 0 9-4 11-11 1 4 3 6 7 7-5 1-8 3-10 4H3z",
  shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z",
  twist: "M4 7h11a4 4 0 0 1 0 8H8 M8 11l-4 4 4 4",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21V5 M8 7h7",
  plus: "M12 5v14 M5 12h14",
  up: "M12 20V5 M5 12l7-7 7 7",
  flame: "M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  drop: "M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12z",
  sword: "M20 4l-9 9 M20 4h-4 M20 4v4 M11 13l-3 3 M6 14l4 4 M4 20l3-3",
  wind: "M3 8h11a3 3 0 1 0-3-3 M3 12h15a3 3 0 1 1-3 3 M3 16h7",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  crown: "M3 18h18 M4 18l-1-10 5 4 4-7 4 7 5-4-1 10",
  two: "M4 20L14 10 M10 20L20 10 M14 10h-3 M14 10v3 M20 10h-3 M20 10v3",
  glass: "M6 3h12 M6 21h12 M7 3c0 5 10 5 10 9s-10 4-10 9 M17 3c0 5-10 5-10 9s10 4 10 9",
  ask: "M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .8-1 1.5V14 M12 17.5v.5",
  axe: "M14 4l6 6 M7 21l9-9 M12 8c2-4 6-5 9-4-1 3-1 7-4 9z",
  fist: "M7 11V7a1.5 1.5 0 0 1 3 0v3 M10 10V6a1.5 1.5 0 0 1 3 0v4 M13 10V7a1.5 1.5 0 0 1 3 0v4 M16 11V9a1.5 1.5 0 0 1 3 0v4c0 4-3 7-7 7s-6-2-6-5v-2a1.5 1.5 0 0 1 3 0",
  music: "M9 17V5l10-2v12 M9 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0 M19 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0",
  sun: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  leaf: "M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z M5 19l8-8",
  paw: "M8 15c-2 2-1.5 5 1 5 1.5 0 2-1 3-1s1.5 1 3 1c2.5 0 3-3 1-5-1.5-1.5-2.5-2-4-2s-2.5.5-4 2z M6 11a1.5 2 0 1 0 .01 0 M10 7a1.5 2 0 1 0 .01 0 M14 7a1.5 2 0 1 0 .01 0 M18 11a1.5 2 0 1 0 .01 0",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6",
  mask: "M3 7c3-2 15-2 18 0 0 6-3 10-9 10S3 13 3 7z M7 10h3 M14 10h3",
  dagger: "M14 4h6v6l-8 8-6-6z M6 12l-3 3 6 6 3-3 M4 20l2-2",
  bow: "M6 3c9 2 13 6 15 15 M6 3l15 15 M4 12l8-8 M12 20l8-8",
  gear: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1 M12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2",
  hand: "M8 13V5a1.5 1.5 0 0 1 3 0v6 M11 11V4a1.5 1.5 0 0 1 3 0v7 M14 11V5a1.5 1.5 0 0 1 3 0v8 M17 11a1.5 1.5 0 0 1 3 0v3c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 13",
  skull: "M12 3a8 8 0 0 0-8 8c0 3 2 4 3 5v3h10v-3c1-1 3-2 3-5a8 8 0 0 0-8-8z M9 11a1.5 1.5 0 1 0 .01 0 M15 11a1.5 1.5 0 1 0 .01 0 M10 19v-2 M14 19v-2",
  cross: "M12 3v18 M6 9h12",
};
export type IconId = keyof typeof ICONS;
