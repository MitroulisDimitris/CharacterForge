// Parry Hotter's story and look, shared by every system's Parry template.
export const PARRY = {
  name: "Parry Hotter",
  playerName: "FartEnjoyer66",
  alignment: "Chaotic Good",
  gender: "Male",
  age: "",
  height: "180",
  weight: "70",
  eyes: "Blue",
  hair: "Blonde",
  skin: "white",
  faith: "Giaourti me meli",
  personality: "I blow up at the slightest insult.\nI don't pay attention to the risks in a situation. Never tell me the odds.",
  ideals: "Freedom. Chains are meant to be broken, as are those who would forge them. (Chaotic)",
  bonds: "I will become the greatest thief that ever lived.",
  flaws: "If there's a plan, I'll forget it. If I don't forget it, I'll ignore it.\nWhen I see something valuable, I can't think about anything but how to steal it.",
  appearance: "",
  backstory:
    "I escaped from my family of 2 fathers and 2 mothers that wanted to marry me with Voldemort, who was a kid with a huge nose. I am now hiding from them and trying to get to the love of my life, ron weasley <3.",
  allies: "Allies: Noone\nOrganizations: Anarchy",
  notes: "mitsos+vaggos = L.F.E",
};

/** Clamp a level from an untrusted save. */
export const clampLevel = (v: unknown, max: number, fallback: number) => Math.min(max, Math.max(1, Math.round(Number(v)) || fallback));
