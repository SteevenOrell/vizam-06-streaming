import type { Person, Title } from "@/lib/content/types";

type Json = Record<string, unknown>;

/**
 * Serialises structured data for an inline `<script type="application/ld+json">`.
 * `<`, `>` and `&` become unicode escapes so a title like `</script><script>` cannot break out of the tag,
 * and U+2028/2029 are escaped for older parsers.
 */
export function serializeJsonLd(data: Json): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

const person = (p: Person): Json => ({ "@type": "Person", name: p.name });
const abs = (base: string, path: string) => new URL(path, base).href;

/** ISO 8601 duration, e.g. 96 -> "PT1H36M". */
export function isoDuration(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ""}${m || !h ? `${m}M` : ""}`;
}

function common(t: Title, base: string, path: string): Json {
  return {
    "@context": "https://schema.org",
    name: t.title,
    ...(t.originalTitle && t.originalTitle !== t.title ? { alternateName: t.originalTitle } : {}),
    description: t.synopsis,
    url: abs(base, path),
    image: abs(base, t.images.backdrop),
    datePublished: String(t.year),
    genre: t.genres.map((g) => g.name),
    ...(t.language ? { inLanguage: t.language } : {}),
    ...(t.credits.directors.length ? { director: t.credits.directors.map(person) } : {}),
    ...(t.credits.cast.length ? { actor: t.credits.cast.map(person) } : {}),
    ...(t.credits.writers.length ? { author: t.credits.writers.map(person) } : {}),
    license: t.licence.url,
    creditText: t.licence.attribution,
    isAccessibleForFree: true,
    // Only an editorial score from AFTERLIGHT's own curation is ever published; never an invented audience rating.
  };
}

export function movieJsonLd(t: Title, base: string, path: string): Json {
  const duration = isoDuration(t.runtimeMinutes);
  return { ...common(t, base, path), "@type": "Movie", ...(duration ? { duration } : {}) };
}

export function tvSeriesJsonLd(t: Title, base: string, path: string): Json {
  const seasons = t.seasons ?? [];
  return {
    ...common(t, base, path),
    "@type": "TVSeries",
    numberOfSeasons: seasons.length,
    numberOfEpisodes: t.episodeCount,
    containsSeason: seasons.map((s) => ({
      "@type": "TVSeason",
      seasonNumber: s.number,
      numberOfEpisodes: s.episodes.length,
      ...(s.title ? { name: s.title } : {}),
      episode: s.episodes.slice(0, 50).map((e) => ({
        "@type": "TVEpisode",
        episodeNumber: e.number,
        name: e.title,
        ...(e.synopsis ? { description: e.synopsis } : {}),
        ...(isoDuration(e.runtimeMinutes) ? { duration: isoDuration(e.runtimeMinutes) } : {}),
      })),
    })),
  };
}
