/** Pure search logic (no catalog import: safe for client components). Ranking is simple and explainable. */
import { z } from "zod";

// No JIT: Zod probes `new Function` once, which our CSP (no unsafe-eval) reports as a violation.
z.config({ jitless: true });
import type { CardData } from "./card";

export const MAX_QUERY_LENGTH = 80;

export type SearchTypeFilter = "all" | "movie" | "series";

/** Small serialisable record per title: the card payload plus only the extra fields search needs. */
export type SearchEntry = {
  card: CardData;
  originalTitle?: string;
  synopsis: string;
  people: string[];
};

/** Lowercase, strip accents, collapse non-alphanumerics to single spaces. */
export function normaliseText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const QuerySchema = z
  .string()
  .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
  .pipe(z.string().max(MAX_QUERY_LENGTH));

/** Validate an untrusted query (URL or input). Over-long queries are truncated, anything non-string becomes "". */
export function parseQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const r = QuerySchema.safeParse(raw);
  if (r.success) return r.data;
  return QuerySchema.parse(raw.slice(0, MAX_QUERY_LENGTH));
}

export function parseTypeFilter(raw: unknown): SearchTypeFilter {
  return raw === "movie" || raw === "series" ? raw : "all";
}

export const SCORES = { titlePrefix: 100, titleWord: 85, titleContains: 70, originalTitle: 62, genre: 50, people: 40, year: 30, synopsis: 10 } as const;

function scoreToken(q: string, e: SearchEntry): number {
  const title = normaliseText(e.card.title);
  if (title === q) return 120;
  if (title.startsWith(q)) return SCORES.titlePrefix;
  if (title.split(" ").some((w) => w.startsWith(q))) return SCORES.titleWord;
  if (title.includes(q)) return SCORES.titleContains;
  if (e.originalTitle && normaliseText(e.originalTitle).includes(q)) return SCORES.originalTitle;
  if (e.card.genres.some((g) => normaliseText(g.name).includes(q))) return SCORES.genre;
  if (e.people.some((p) => normaliseText(p).includes(q))) return SCORES.people;
  if (/^\d{3,4}$/.test(q) && String(e.card.year).startsWith(q)) return SCORES.year;
  if (normaliseText(e.synopsis).includes(q)) return SCORES.synopsis;
  return 0;
}

/**
 * Rank entries for a query. Whole-phrase match first; otherwise every word must match somewhere and the weakest word
 * decides the score. Ties: newest year, then title.
 */
export function searchEntries(entries: SearchEntry[], rawQuery: string, type: SearchTypeFilter = "all"): SearchEntry[] {
  const q = normaliseText(parseQuery(rawQuery));
  if (!q) return [];
  const tokens = q.split(" ");
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    if (type !== "all" && e.card.type !== type) continue;
    let score = scoreToken(q, e);
    if (!score && tokens.length > 1) {
      const per = tokens.map((t) => scoreToken(t, e));
      score = per.every(Boolean) ? Math.min(...per) - 5 : 0;
    }
    if (score > 0) scored.push({ e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.e.card.year - a.e.card.year || a.e.card.title.localeCompare(b.e.card.title))
    .map((s) => s.e);
}
