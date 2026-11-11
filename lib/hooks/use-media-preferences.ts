"use client";

import { useSyncExternalStore } from "react";

type NetworkInformationLike = { saveData?: boolean; addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void };

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = subscribeMedia(REDUCED_MOTION);

/**
 * True when the visitor asked for reduced motion. Server snapshot is `true` so nothing animates or autoplays before
 * hydration confirms otherwise (safe default).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

function subscribeSaveData(cb: () => void) {
  const c = getConnection();
  c?.addEventListener?.("change", cb);
  return () => c?.removeEventListener?.("change", cb);
}

/** True when the browser signals Save-Data (Network Information API). Server snapshot `true` (safe default). */
export function useSaveData(): boolean {
  return useSyncExternalStore(
    subscribeSaveData,
    () => Boolean(getConnection()?.saveData),
    () => true,
  );
}

/**
 * Hero video gate: autoplaying muted loops are allowed only when the visitor has not asked for reduced motion and
 * has not enabled Save-Data. Otherwise show the poster.
 */
export function useCanAutoplayVideo(): boolean {
  const reduced = usePrefersReducedMotion();
  const saveData = useSaveData();
  return !reduced && !saveData;
}
