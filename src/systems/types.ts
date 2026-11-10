// The contract every game system plugin implements. The app shell (library,
// wizard, editor, storage, export) only talks to systems through this.
import type { FC } from "react";

export type SystemId = "dnd2024" | "dnd2014" | "dnd35" | "pf2e";

export interface Book {
  id: string;
  name: string;
  abbr: string;
  /** Core books are always on. */
  core?: boolean;
  note?: string;
}

export interface Warning {
  level: "error" | "warn" | "info";
  text: string;
  /** Tab id to jump to. */
  tab?: string;
}

/** Fields every system's character has, so the shell can show and edit them. */
export interface BaseCharacter {
  name: string;
  playerName: string;
  level: number;
}

export interface DerivedBase {
  warnings: Warning[];
  /** e.g. "Half-Elf · Sorcerer (Draconic Sorcery)" */
  identity: string;
}

export interface TabProps<C, D> {
  c: C;
  d: D;
  set: (patch: Partial<C>) => void;
  /** Book ids allowed for this character (fixed at creation). */
  books: string[];
}

export interface Template<C> {
  id: string;
  name: string;
  description: string;
  /** Books this template needs; the wizard pre-ticks them. */
  books: string[];
  make(): C;
}

/** A headline number compared before/after a level change. */
export interface StatLine {
  label: string;
  value: string | number;
}

/** Something you get automatically at a level (shown, nothing to choose). */
export interface Gain {
  name: string;
  text: string;
  /** Short plain-words tip for players learning the rules. */
  tip?: string;
}

/** A choice a level unlocks. Ids are stable ("5:cantrips") so skipped ones can be resurfaced later. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Unlock<D = any> {
  id: string;
  level: number;
  title: string;
  /** What this is, in plain words. */
  detail: string;
  /** Tab whose controls make the choice. */
  tab: string;
  /** Lets the app tell when the choice has been made; without it the player marks it done. */
  isDone?: (d: D) => boolean;
  /** Nice-to-know, not required (e.g. "you may swap a spell"). */
  optional?: boolean;
}

export interface Progression<C, D> {
  /** Headline numbers to compare across a level change. */
  snapshot(d: D): StatLine[];
  /** Automatic gains at exactly `level` (d is derived at that level). */
  gainsAt(c: C, d: D, level: number): Gain[];
  /** Choices granted at exactly `level` (d is derived at that level). */
  unlocksAt(c: C, d: D, level: number): Unlock<D>[];
  /** Lower the level and drop choices that no longer fit; lists what was removed. */
  demote(c: C, level: number, books: string[]): { c: C; removed: string[] };
}

/** One step of a guided, from-scratch character creation. */
export interface CreationStep<C, D> {
  id: string;
  title: string;
  /** Plain-words explanation shown above the step. */
  intro: (c: C, d: D) => string;
  Component: FC<TabProps<C, D>>;
  /** Warning tabs this step covers (its open warnings are listed under it). */
  tabs: string[];
  /** If set, the step can't be skipped until this returns null. */
  blocker?: (c: C, d: D) => string | null;
}

export interface GameSystem<C extends BaseCharacter = BaseCharacter, D extends DerivedBase = DerivedBase> {
  progression: Progression<C, D>;
  id: SystemId;
  name: string;
  short: string;
  tagline: string;
  books: Book[];
  maxLevel: number;
  /** Highest level for this particular character (e.g. a class without level-up support yet). */
  maxLevelFor?: (c: C) => number;
  /** Starting points offered by the wizard (empty when the system uses guided creation). */
  templates: Template<C>[];
  /** Guided creation from scratch, replacing templates in the wizard. */
  creation?: { fresh: () => C; steps: CreationStep<C, D>[] };
  normalize(raw: unknown): C;
  derive(c: C, books: string[]): D;
  tabs: { id: string; label: string; Component: FC<TabProps<C, D>> }[];
  Summary: FC<{ c: C; d: D }>;
  buildPdf(c: C, d: D, books: string[]): Promise<Uint8Array>;
  /** Licensing/credits line shown in the app and on the PDF. */
  credits: string;
  /** Notes about data confidence, shown in the wizard. */
  dataNote?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySystem = GameSystem<any, any>;

export const bookName = (system: AnySystem, id: string) => system.books.find((b) => b.id === id)?.name ?? id;
export const bookAbbr = (system: AnySystem, id: string) => system.books.find((b) => b.id === id)?.abbr ?? id;
