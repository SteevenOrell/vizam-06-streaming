"use client";

import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

/** My List: an array of title slugs in localStorage. Validated on every read; garbage is ignored, never trusted. */
export const WATCHLIST_KEY = "afterlight:my-list";

const ListSchema = z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)).max(500);

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function parseWatchlist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = ListSchema.safeParse(JSON.parse(raw));
    return parsed.success ? [...new Set(parsed.data)] : [];
  } catch {
    return [];
  }
}

export function readWatchlist(storage: StorageLike): string[] {
  try {
    return parseWatchlist(storage.getItem(WATCHLIST_KEY));
  } catch {
    return [];
  }
}

export function writeWatchlist(storage: StorageLike, slugs: string[]): void {
  try {
    storage.setItem(WATCHLIST_KEY, JSON.stringify(slugs));
  } catch {
    /* storage full or blocked: the in-memory snapshot still updates for this session */
  }
}

/** Pure toggle, newest additions first. */
export function toggleSlug(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list];
}

// External store: SSR-safe, synced across tabs via the storage event and within the page via a listener set.

const EMPTY: string[] = [];
let snapshot: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  snapshot = readWatchlist(window.localStorage);
  loaded = true;
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== WATCHLIST_KEY) return;
  load();
  emit();
}

function subscribe(cb: () => void) {
  if (!loaded) load();
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (!loaded) load();
  return snapshot;
}

function setList(next: string[]) {
  snapshot = next;
  writeWatchlist(window.localStorage, next);
  emit();
}

export function useWatchlist() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const has = useCallback((slug: string) => list.includes(slug), [list]);
  const toggle = useCallback((slug: string) => setList(toggleSlug(getSnapshot(), slug)), []);
  const remove = useCallback((slug: string) => setList(getSnapshot().filter((s) => s !== slug)), []);
  return { list, has, toggle, remove };
}
