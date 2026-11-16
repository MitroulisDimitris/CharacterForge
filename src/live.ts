// In-play state the host keeps for each player in a session (D3): current / temporary HP, damage
// taken, conditions, exhaustion. Stored in session_members.live; the player sees it read-only.

export interface LiveLog {
  t: number;
  text: string;
}

export interface Live {
  /** Current HP; undefined = full. */
  hp?: number;
  temp?: number;
  conditions?: string[];
  exhaustion?: number;
  log?: LiveLog[];
}

export const DAMAGE_TYPES = ["Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"];

/** The 15 conditions, in our own plain words (one line each, for chips and hover cards). */
export const CONDITIONS: { id: string; name: string; text: string }[] = [
  { id: "blinded", name: "Blinded", text: "Can't see. Fails checks that need sight. Attacks against it have advantage; its attacks have disadvantage." },
  { id: "charmed", name: "Charmed", text: "Can't attack the charmer or target it with harmful effects. The charmer has advantage on social checks with it." },
  { id: "deafened", name: "Deafened", text: "Can't hear. Fails checks that need hearing." },
  { id: "frightened", name: "Frightened", text: "Disadvantage on checks and attacks while it can see the source of its fear. Can't move closer to it." },
  { id: "grappled", name: "Grappled", text: "Speed is 0. Ends if the grappler is incapacitated or it's moved out of reach." },
  { id: "incapacitated", name: "Incapacitated", text: "Can't take actions or reactions." },
  { id: "invisible", name: "Invisible", text: "Can't be seen without magic. Its attacks have advantage; attacks against it have disadvantage." },
  { id: "paralyzed", name: "Paralyzed", text: "Incapacitated, can't move or speak. Fails Strength and Dexterity saves. Hits from within 5 ft are critical hits." },
  { id: "petrified", name: "Petrified", text: "Turned to stone: incapacitated, unaware, resists all damage, immune to poison and disease." },
  { id: "poisoned", name: "Poisoned", text: "Disadvantage on attack rolls and ability checks." },
  { id: "prone", name: "Prone", text: "Can only crawl; standing up costs half its speed. Disadvantage on attacks. Melee attacks against it have advantage, ranged ones disadvantage." },
  { id: "restrained", name: "Restrained", text: "Speed is 0. Disadvantage on attacks and Dexterity saves. Attacks against it have advantage." },
  { id: "stunned", name: "Stunned", text: "Incapacitated, can't move, speaks only falteringly. Fails Strength and Dexterity saves. Attacks against it have advantage." },
  { id: "unconscious", name: "Unconscious", text: "Incapacitated, can't move or speak, drops what it holds and falls prone. Fails Str/Dex saves. Hits from within 5 ft are critical." },
  { id: "concentrating", name: "Concentrating", text: "Keeping a spell going. Taking damage means a Constitution save (DC 10 or half the damage, whichever is higher) or the spell ends." },
];
export const conditionOf = (id: string) => CONDITIONS.find((c) => c.id === id);

export const EXHAUSTION = [
  "",
  "Disadvantage on ability checks",
  "Speed halved",
  "Disadvantage on attacks and saves",
  "Hit point maximum halved",
  "Speed 0",
  "Death",
];

const log = (l: Live, text: string): LiveLog[] => [{ t: Date.now(), text }, ...(l.log ?? [])].slice(0, 12);
export const currentHp = (l: Live, max: number) => Math.max(0, Math.min(max, l.hp ?? max));

/** Damage: temporary HP first, then HP (never below 0). `halve` for resistance. */
export function applyDamage(l: Live, max: number, amount: number, type: string, halve: boolean): Live {
  const dmg = Math.max(0, Math.floor(halve ? amount / 2 : amount));
  const temp = l.temp ?? 0;
  const fromTemp = Math.min(temp, dmg);
  const hp = Math.max(0, currentHp(l, max) - (dmg - fromTemp));
  const what = `${dmg} ${type.toLowerCase()} damage${halve ? " (halved: resistant)" : ""}`;
  return { ...l, temp: temp - fromTemp || undefined, hp, log: log(l, `Took ${what}${hp === 0 ? " · down to 0 HP" : ""}`) };
}

export function applyHealing(l: Live, max: number, amount: number): Live {
  const hp = Math.min(max, currentHp(l, max) + Math.max(0, Math.floor(amount)));
  return { ...l, hp: hp === max ? undefined : hp, log: log(l, `Healed ${Math.floor(amount)}`) };
}

export const setTemp = (l: Live, temp: number): Live => ({ ...l, temp: temp > 0 ? Math.floor(temp) : undefined, log: log(l, temp > 0 ? `Temporary HP set to ${temp}` : "Temporary HP removed") });

export function toggleCondition(l: Live, id: string): Live {
  const has = l.conditions?.includes(id);
  const conditions = has ? l.conditions!.filter((x) => x !== id) : [...(l.conditions ?? []), id];
  return { ...l, conditions: conditions.length ? conditions : undefined, log: log(l, `${has ? "No longer" : "Now"} ${conditionOf(id)?.name.toLowerCase() ?? id}`) };
}

export const setExhaustion = (l: Live, n: number): Live => {
  const v = Math.max(0, Math.min(6, n));
  return { ...l, exhaustion: v || undefined, log: log(l, `Exhaustion level ${v}`) };
};

/** Full HP, no temp HP, no conditions (e.g. after a long rest). Keeps the log. */
export const resetLive = (l: Live): Live => ({ log: log(l, "Reset: full HP, no conditions") });

/** One line for chips: "HP 20/32 (+5) · Poisoned · Exhaustion 1". */
export function liveLine(l: Live | undefined, max: number): string {
  const parts = [`HP ${currentHp(l ?? {}, max)}/${max}${l?.temp ? ` (+${l.temp})` : ""}`];
  for (const c of l?.conditions ?? []) parts.push(conditionOf(c)?.name ?? c);
  if (l?.exhaustion) parts.push(`Exhaustion ${l.exhaustion}`);
  return parts.join(" · ");
}
