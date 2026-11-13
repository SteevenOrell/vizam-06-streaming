/** Pure filter/sort/URL logic for the Movies and TV pages. No catalog import: safe for client components. */

export type SortKey = "newest" | "oldest" | "az" | "shortest" | "longest" | "episodes";

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  az: "Title A-Z",
  shortest: "Shortest first",
  longest: "Longest first",
  episodes: "Most episodes",
};

export type BrowseItem = {
  slug: string;
  title: string;
  year: number;
  runtimeMinutes?: number;
  episodes?: number;
  genres: { slug: string; name: string }[];
};

export type BrowseParams = { genre?: string; decade?: number; sort: SortKey };

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Parse untrusted URL params; anything invalid falls back to defaults. The first allowed sort is the default. */
export function parseBrowseParams(params: { get(name: string): string | null }, allowedSorts: readonly SortKey[]): BrowseParams {
  const genre = params.get("genre");
  const decadeRaw = params.get("decade");
  const sortRaw = params.get("sort") as SortKey | null;
  const decade = decadeRaw && /^\d{4}$/.test(decadeRaw) ? Number(decadeRaw) : undefined;
  return {
    genre: genre && /^[a-z0-9-]{1,60}$/.test(genre) ? genre : undefined,
    decade: decade !== undefined && decade % 10 === 0 ? decade : undefined,
    sort: sortRaw && allowedSorts.includes(sortRaw) ? sortRaw : allowedSorts[0],
  };
}

/** Serialise to a query string, omitting defaults so shared URLs stay short. */
export function toQueryString(p: BrowseParams, defaultSort: SortKey): string {
  const q = new URLSearchParams();
  if (p.genre) q.set("genre", p.genre);
  if (p.decade !== undefined) q.set("decade", String(p.decade));
  if (p.sort !== defaultSort) q.set("sort", p.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function filterItems<T extends BrowseItem>(items: T[], p: BrowseParams): T[] {
  return items.filter(
    (t) => (!p.genre || t.genres.some((g) => g.slug === p.genre)) && (p.decade === undefined || decadeOf(t.year) === p.decade),
  );
}

export function sortItems<T extends BrowseItem>(items: T[], sort: SortKey): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  // Missing values sort last in both directions.
  const num = (v: number | undefined, dir: 1 | -1) => (v === undefined ? Number.POSITIVE_INFINITY : v * dir);
  const copy = [...items];
  switch (sort) {
    case "az":
      return copy.sort(byTitle);
    case "oldest":
      return copy.sort((a, b) => a.year - b.year || byTitle(a, b));
    case "shortest":
      return copy.sort((a, b) => num(a.runtimeMinutes, 1) - num(b.runtimeMinutes, 1) || byTitle(a, b));
    case "longest":
      return copy.sort((a, b) => num(a.runtimeMinutes, -1) - num(b.runtimeMinutes, -1) || byTitle(a, b));
    case "episodes":
      return copy.sort((a, b) => num(a.episodes, -1) - num(b.episodes, -1) || byTitle(a, b));
    case "newest":
    default:
      return copy.sort((a, b) => b.year - a.year || byTitle(a, b));
  }
}

export function applyBrowse<T extends BrowseItem>(items: T[], p: BrowseParams): T[] {
  return sortItems(filterItems(items, p), p.sort);
}

/** Genres (most used first) and decades (ascending) present in the items, for the filter controls. */
export function facets(items: BrowseItem[]) {
  const genreMap = new Map<string, { slug: string; name: string; count: number }>();
  const decades = new Set<number>();
  for (const t of items) {
    decades.add(decadeOf(t.year));
    for (const g of t.genres) {
      const e = genreMap.get(g.slug);
      if (e) e.count += 1;
      else genreMap.set(g.slug, { ...g, count: 1 });
    }
  }
  return {
    genres: [...genreMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    decades: [...decades].sort((a, b) => a - b),
  };
}
