import type { AnySystem, SystemId } from "./types";
import { dnd2014, dnd2024 } from "./dnd5e";
import { dnd35 } from "./dnd35";
import { pf2e } from "./pf2e";

export const SYSTEMS: AnySystem[] = [dnd2024, dnd2014, dnd35, pf2e];

export const getSystem = (id: string): AnySystem | undefined => SYSTEMS.find((s) => s.id === id);
export const isSystemId = (id: unknown): id is SystemId => typeof id === "string" && SYSTEMS.some((s) => s.id === id);
