/**
 * Estado externo del cliente (progreso guardado y preferencia de movimiento).
 * Se expone como store para `useSyncExternalStore`: React se sincroniza con el
 * navegador sin renders en cascada ni desajustes de hidratación.
 */

import { LEVELS, MAX_CHARGES, START_CHARGES, STARTING_ACTIVE } from "./cv-data.ts";

export const SAVE_KEY = "marcelo-route-save-v2";
export const LEGACY_KEY = "marcelo-route-save-v1";

export type SaveShape = {
  version: number;
  completed: number[];
  collected: Record<string, string[]>;
  powers: string[];
  charges: number;
  equipped: string;
};

export const EMPTY_SAVE: SaveShape = {
  version: 2,
  completed: [],
  collected: {},
  powers: [],
  charges: START_CHARGES,
  equipped: STARTING_ACTIVE,
};

function parseSave(): SaveShape {
  if (typeof localStorage === "undefined") return { ...EMPTY_SAVE };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveShape>;
      return {
        version: 2,
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        collected:
          parsed.collected && typeof parsed.collected === "object"
            ? (parsed.collected as Record<string, string[]>)
            : {},
        powers: Array.isArray(parsed.powers) ? parsed.powers : [],
        charges:
          typeof parsed.charges === "number"
            ? Math.max(0, Math.min(MAX_CHARGES, parsed.charges))
            : START_CHARGES,
        equipped:
          typeof parsed.equipped === "string" ? parsed.equipped : STARTING_ACTIVE,
      };
    }
    // Migración desde la partida anterior, que guardaba índices numéricos.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as {
        completed?: number[];
        collected?: Record<string, number[]>;
      };
      const collected: Record<string, string[]> = {};
      for (const level of LEVELS) {
        const indexes = parsed.collected?.[level.id];
        if (!Array.isArray(indexes)) continue;
        collected[level.id] = indexes
          .map((index) => level.documents[index]?.id)
          .filter((id): id is string => Boolean(id));
      }
      return {
        ...EMPTY_SAVE,
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        collected,
      };
    }
  } catch {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // El progreso es opcional si el navegador bloquea el almacenamiento.
    }
  }
  return { ...EMPTY_SAVE };
}

const saveListeners = new Set<() => void>();
const serverSave: SaveShape = { ...EMPTY_SAVE };
let currentSave: SaveShape = serverSave;
let hydrated = false;

export function subscribeSave(listener: () => void) {
  saveListeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    currentSave = parseSave();
    for (const notify of saveListeners) notify();
  }
  return () => {
    saveListeners.delete(listener);
  };
}

export const getSaveSnapshot = () => currentSave;
export const getServerSaveSnapshot = () => serverSave;

export function writeSave(next: SaveShape) {
  currentSave = next;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento el juego sigue siendo jugable en la sesión actual.
  }
  for (const notify of saveListeners) notify();
}

/** Poderes en propiedad: documentos recogidos + recompensas de jefe. */
export function derivePowers(save: SaveShape): string[] {
  const owned = new Set(save.powers);
  for (const level of LEVELS) {
    for (const document of level.documents) {
      if (document.power && (save.collected[level.id] ?? []).includes(document.id)) {
        owned.add(document.power);
      }
    }
  }
  for (const index of save.completed) {
    const level = LEVELS[index];
    if (level?.reward) owned.add(level.reward);
  }
  return [...owned];
}

const motionListeners = new Set<() => void>();
let motionQuery: MediaQueryList | null = null;
let motionValue = false;

function motionChanged() {
  motionValue = motionQuery?.matches ?? false;
  for (const notify of motionListeners) notify();
}

export function subscribeMotion(listener: () => void) {
  motionListeners.add(listener);
  if (!motionQuery && typeof window !== "undefined" && window.matchMedia) {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", motionChanged);
    motionChanged();
  }
  return () => {
    motionListeners.delete(listener);
  };
}

export const getMotionSnapshot = () => motionValue;
export const getServerMotionSnapshot = () => false;
