/** "11 min", "1h 36m". Returns undefined for missing runtimes so callers can skip the field. */
export function formatRuntime(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Licence "modifications" text for public pages: drops internal repo references such as "(see docs/CONTENT_LICENSES.md)". */
export function publicModifications(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/\s*\([^)]*\b(?:docs|content|public|scripts)\/[^)]*\)/gi, "")
    .replace(/\s*\b(?:see\s+)?(?:docs|content|public|scripts)\/\S+/gi, "")
    .replace(/\s+([,;.])/g, "$1")
    .trim();
  return cleaned || undefined;
}
