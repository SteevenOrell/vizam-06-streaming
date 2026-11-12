import type { CatalogFile, MediaItem, VideoSource } from "./schema";
import type { Catalog, Genre, LicenceEntry, Person, ResolvedCollection, Title } from "./types";

/** Lowercase, strip accents, collapse non-alphanumerics: used for search matching. */
export function foldText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

export function slugify(value: string): string {
  return foldText(value).trim().replace(/\s+/g, "-");
}

function toPeople(list: MediaItem["credits"]["cast"]): Person[] {
  return list.map((c) => {
    const name = typeof c === "string" ? c : c.name;
    const role = typeof c === "string" ? undefined : c.role;
    return { name, slug: slugify(name), ...(role ? { role } : {}) };
  });
}

function pickPlayable(item: MediaItem): VideoSource | undefined {
  const own = item.videos.find((v) => v.kind === "feature" || v.kind === "short" || v.kind === "episode");
  if (own) return own;
  for (const season of item.seasons ?? []) {
    for (const ep of season.episodes) {
      const v = ep.videos.find((x) => x.kind === "episode" || x.kind === "feature" || x.kind === "short");
      if (v) return v;
    }
  }
  return undefined;
}

export function normaliseTitle(item: MediaItem): Title {
  const licence: LicenceEntry = {
    ...item.licence,
    id: item.licence.id ?? item.slug,
    titleSlug: item.slug,
    titleName: item.title,
  };
  return {
    ...item,
    genres: item.genres.map((name) => ({ name, slug: slugify(name) })),
    credits: {
      directors: toPeople(item.credits.directors),
      cast: toPeople(item.credits.cast),
      writers: toPeople(item.credits.writers),
    },
    licence,
    heroLoop: item.videos.find((v) => v.kind === "hero-loop"),
    trailer: item.videos.find((v) => v.kind === "trailer"),
    playable: pickPlayable(item),
    episodeCount: (item.seasons ?? []).reduce((n, s) => n + s.episodes.length, 0),
  };
}

export function normaliseCatalog(file: CatalogFile): Catalog {
  const titles = file.items.map(normaliseTitle);

  const genreMap = new Map<string, Genre>();
  for (const t of titles) {
    for (const g of t.genres) {
      const existing = genreMap.get(g.slug);
      if (existing) existing.count += 1;
      else genreMap.set(g.slug, { ...g, count: 1, blurb: file.editorial.genreBlurbs[g.slug], image: file.editorial.genreImages[g.slug] });
    }
  }
  const genres = [...genreMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  const collections: ResolvedCollection[] = file.editorial.collections
    .map((c) => ({ ...c, titles: c.titles.map((s) => bySlug.get(s)).filter((t): t is Title => Boolean(t)) }))
    .filter((c) => c.titles.length > 0);

  const licences = titles.map((t) => t.licence);

  return { source: file.source, titles, genres, collections, licences, editorial: file.editorial };
}
