// What each class is best at, for the class chart while choosing a class.
// A rough guide written for this app (0–10), not rules data; tune freely.

export const STRENGTH_AXES = ["Damage", "Magic", "Support", "Skills", "Mobility", "Toughness"] as const;

export interface ClassProfile {
  /** Damage, Magic, Support, Skills, Mobility, Toughness (0–10). */
  strengths: [number, number, number, number, number, number];
  color: string;
  beginner: "Easy" | "Medium" | "Advanced";
  /** How it plays, one sentence. */
  plays: string;
}

export const CLASS_PROFILES: Record<string, ClassProfile> = {
  barbarian: { strengths: [8, 0, 1, 3, 6, 10], color: "#e0485e", beginner: "Easy", plays: "Charge in, rage, and soak up hits nobody else could survive." },
  bard: { strengths: [4, 7, 9, 9, 4, 4], color: "#d98ad0", beginner: "Medium", plays: "Talk your way through anything, then keep the party going with inspiration and healing." },
  cleric: { strengths: [5, 8, 10, 4, 3, 8], color: "#ecc46e", beginner: "Easy", plays: "Heal and shield your friends, and still hit hard with holy magic." },
  druid: { strengths: [5, 8, 7, 6, 6, 6], color: "#6fbf73", beginner: "Medium", plays: "Turn into animals, call storms, and bend the battlefield with plants." },
  fighter: { strengths: [9, 1, 2, 4, 5, 9], color: "#e8d3a6", beginner: "Easy", plays: "The most reliable damage and defence, with simple turns that hit hard." },
  monk: { strengths: [7, 1, 2, 6, 10, 6], color: "#5fc4c4", beginner: "Medium", plays: "Dart around the battlefield, strike many times and stun your enemies." },
  paladin: { strengths: [8, 4, 7, 3, 4, 9], color: "#f0c060", beginner: "Easy", plays: "Heavy armor, healing hands and huge burst damage with divine smites." },
  ranger: { strengths: [7, 4, 3, 8, 7, 6], color: "#8fbf6f", beginner: "Medium", plays: "Shoot from afar, track anything, and thrive in the wilds." },
  rogue: { strengths: [8, 1, 2, 10, 8, 4], color: "#b9a3e8", beginner: "Easy", plays: "Strike from the shadows, pick locks, and be the expert at almost any skill." },
  sorcerer: { strengths: [8, 10, 4, 4, 5, 3], color: "#e0485e", beginner: "Medium", plays: "Few spells, but you bend them: cast twice a turn, hit two targets, cast silently." },
  warlock: { strengths: [7, 8, 4, 5, 5, 5], color: "#9a7bd8", beginner: "Medium", plays: "Eldritch Blast every turn, plus strange powers granted by your patron." },
  wizard: { strengths: [7, 10, 5, 7, 4, 2], color: "#8fb6e3", beginner: "Advanced", plays: "The biggest spell list in the game: a solution for every problem, but fragile." },
  artificer: { strengths: [5, 6, 8, 7, 4, 7], color: "#d4a64a", beginner: "Advanced", plays: "Build magic items for the whole party and support them with gadgets and spells." },
};
