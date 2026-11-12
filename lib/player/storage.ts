import { z } from "zod";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const NO_STORAGE: StorageLike = { getItem: () => null, setItem: () => {} };

/** window.localStorage, or a no-op store when it is unavailable (SSR, blocked site data: accessing it can throw). */
export function safeLocalStorage(): StorageLike {
  try {
    return typeof window === "undefined" ? NO_STORAGE : window.localStorage;
  } catch {
    return NO_STORAGE;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Resume positions: one entry per title (or per episode), newest kept, capped.
// ---------------------------------------------------------------------------------------------------------------
export const RESUME_KEY = "afterlight:resume";
export const RESUME_MAX_ENTRIES = 60;
export const RESUME_MIN_SECONDS = 5;
export const RESUME_END_MARGIN = 10;

const ResumeSchema = z.record(z.string(), z.object({ t: z.number().min(0), d: z.number().positive(), at: z.number() }));
export type ResumeMap = z.infer<typeof ResumeSchema>;

export function resumeKeyFor(slug: string, season?: number, episode?: number): string {
  return season !== undefined && episode !== undefined ? `${slug}:s${season}e${episode}` : slug;
}

export function parseResume(raw: string | null | undefined): ResumeMap {
  if (!raw) return {};
  try {
    const parsed = ResumeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Saved position in seconds, or undefined when there is nothing worth resuming. */
export function getResume(storage: StorageLike, key: string): number | undefined {
  let entry: ResumeMap[string] | undefined;
  try {
    const map = parseResume(storage.getItem(RESUME_KEY));
    entry = Object.hasOwn(map, key) ? map[key] : undefined;
  } catch {
    return undefined;
  }
  if (!entry) return undefined;
  if (entry.t < RESUME_MIN_SECONDS || entry.t > entry.d - RESUME_END_MARGIN) return undefined;
  return entry.t;
}

/** Saves progress; clears the entry when the viewer is at the very start or has (nearly) finished. */
export function saveResume(storage: StorageLike, key: string, time: number, duration: number, now = Date.now()): void {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  try {
    const map = parseResume(storage.getItem(RESUME_KEY));
    if (time < RESUME_MIN_SECONDS || time > duration - RESUME_END_MARGIN) {
      delete map[key];
    } else {
      map[key] = { t: Math.round(time * 10) / 10, d: duration, at: now };
    }
    const entries = Object.entries(map)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, RESUME_MAX_ENTRIES);
    storage.setItem(RESUME_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage full or blocked: resume is a nicety */
  }
}

export function clearResume(storage: StorageLike, key: string): void {
  saveResume(storage, key, 0, 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Player preferences: volume, mute, data saver (undefined = automatic).
// ---------------------------------------------------------------------------------------------------------------
export const PLAYER_PREFS_KEY = "afterlight:player";

const PrefsSchema = z.object({
  volume: z.number().min(0).max(1).default(1),
  muted: z.boolean().default(false),
  dataSaver: z.boolean().optional(),
});
export type PlayerPrefs = z.infer<typeof PrefsSchema>;

export const DEFAULT_PREFS: PlayerPrefs = { volume: 1, muted: false };

export function readPrefs(storage: StorageLike): PlayerPrefs {
  try {
    const raw = storage.getItem(PLAYER_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = PrefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(storage: StorageLike, patch: Partial<PlayerPrefs>): void {
  try {
    storage.setItem(PLAYER_PREFS_KEY, JSON.stringify({ ...readPrefs(storage), ...patch }));
  } catch {
    /* ignore */
  }
}
