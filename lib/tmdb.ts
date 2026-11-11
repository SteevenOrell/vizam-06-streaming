/**
 * TMDB client stub (optional enrichment). Server-only: the key never reaches the browser.
 *
 * Rules (see docs/ARCHITECTURE.md "TMDB plan"):
 * - Reads TMDB_API_KEY (v3 key or v4 read-access token). Never NEXT_PUBLIC_.
 * - No key: every function returns null and no request is made.
 * - Every response is Zod-validated; on any error (network, status, timeout, shape) it returns null. Never throws.
 * - Responses are cached with fetch revalidation (default 24 h).
 * - Metadata only: TMDB posters/backdrops are commercial artwork and are NOT rendered on AFTERLIGHT.
 * - When TMDB data is shown, the footer shows the TMDB attribution (tmdbAttributionEnabled()).
 */
import "server-only";
import { z } from "zod";

const API_BASE = "https://api.themoviedb.org/3";
const DEFAULT_REVALIDATE = 60 * 60 * 24;
const TIMEOUT_MS = 5000;

function getKey(): string | null {
  const key = process.env.TMDB_API_KEY?.trim();
  return key ? key : null;
}

export function isTmdbConfigured(): boolean {
  return getKey() !== null;
}

/** The footer attribution is shown whenever TMDB enrichment is active. */
export function tmdbAttributionEnabled(): boolean {
  return isTmdbConfigured();
}

type Params = Record<string, string | number | boolean | undefined>;

/**
 * Low-level GET. Returns parsed data or null. v4 tokens (JWT-like, long) go in the Authorization header; v3 keys go
 * in the api_key query parameter. The key is never logged.
 */
export async function tmdbGet<S extends z.ZodType>(
  path: string,
  schema: S,
  params: Params = {},
  revalidate = DEFAULT_REVALIDATE,
): Promise<z.infer<S> | null> {
  const key = getKey();
  if (!key) return null;
  if (!/^\/[a-z0-9/_-]+$/i.test(path)) return null;

  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const isV4Token = key.length > 40;
  if (!isV4Token) url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...(isV4Token ? { Authorization: `Bearer ${key}` } : {}) },
      next: { revalidate, tags: ["tmdb"] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[tmdb] ${path} responded ${res.status}`);
      return null;
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      console.warn(`[tmdb] ${path} returned an unexpected shape`);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.warn(`[tmdb] ${path} failed: ${(err as Error).name}`);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Schemas (only the fields we use)
// ---------------------------------------------------------------------------------------------------------------

export const TmdbMovieSummarySchema = z.object({
  id: z.number().int(),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().default(""),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  media_type: z.enum(["movie", "tv", "person"]).optional(),
  original_language: z.string().optional(),
});

export const TmdbPagedSchema = z.object({
  page: z.number().int(),
  results: z.array(TmdbMovieSummarySchema),
  total_results: z.number().int().optional(),
});

export type TmdbSummary = z.infer<typeof TmdbMovieSummarySchema>;

// ---------------------------------------------------------------------------------------------------------------
// High-level helpers (Phase 4 decides which ones are used)
// ---------------------------------------------------------------------------------------------------------------

/** TMDB weekly trending (metadata only). Null without a key or on error. */
export async function getTmdbTrending(kind: "movie" | "tv" = "movie"): Promise<TmdbSummary[] | null> {
  const data = await tmdbGet(`/trending/${kind}/week`, TmdbPagedSchema, { language: "en-US" });
  return data ? data.results.slice(0, 20) : null;
}

/** Find a TMDB match for a local title to enrich it (e.g. original release info). Null when unsure. */
export async function findTmdbMatch(
  title: string,
  year: number,
  kind: "movie" | "tv" = "movie",
): Promise<TmdbSummary | null> {
  const data = await tmdbGet(`/search/${kind}`, TmdbPagedSchema, {
    query: title,
    include_adult: false,
    ...(kind === "movie" ? { year } : { first_air_date_year: year }),
  });
  if (!data) return null;
  const wanted = title.trim().toLowerCase();
  return (
    data.results.find((r) => (r.title ?? r.name ?? "").trim().toLowerCase() === wanted) ?? null
  );
}
