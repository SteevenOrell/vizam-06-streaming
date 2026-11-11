import type { Title, VideoSource } from "./types";

/** Serialisable video payload for the client player (no catalog import in the browser). */
export type PlayerVideo = {
  src: { url: string; type: string }[];
  poster?: string;
  durationSeconds?: number;
  captions: { src: string; lang: string; label: string; kind: "subtitles" | "captions"; default?: boolean }[];
  thumbnails?: string;
  startSeconds?: number;
  host: string;
};

export type WatchEpisode = {
  season: number;
  number: number;
  title: string;
  synopsis?: string;
  runtimeMinutes?: number;
  still?: string;
  video?: PlayerVideo;
};

export type WatchData = {
  slug: string;
  type: Title["type"];
  title: string;
  year: number;
  backdrop: string;
  detailsHref: string;
  sourceUrl: string;
  video?: PlayerVideo;
  trailer?: PlayerVideo;
  seasons: { number: number; title?: string; episodes: WatchEpisode[] }[];
};

export function toPlayerVideo(v: VideoSource | undefined): PlayerVideo | undefined {
  if (!v) return undefined;
  return {
    src: v.src.map((s) => ({ url: s.url, type: s.type })),
    poster: v.poster,
    durationSeconds: v.durationSeconds,
    captions: v.captions.map((c) => ({ src: c.src, lang: c.lang, label: c.label, kind: c.kind, default: c.default })),
    thumbnails: v.thumbnails,
    startSeconds: v.startSeconds,
    host: v.host,
  };
}

/** The full-length video of an episode: an `episode` (or feature/short) video, never a hero loop, preview or trailer. */
export function pickEpisodeVideo(videos: VideoSource[]): VideoSource | undefined {
  return (
    videos.find((v) => v.kind === "episode") ?? videos.find((v) => v.kind === "feature" || v.kind === "short")
  );
}

export function buildWatchData(t: Title, detailsHref: string): WatchData {
  return {
    slug: t.slug,
    type: t.type,
    title: t.title,
    year: t.year,
    backdrop: t.images.backdrop,
    detailsHref,
    sourceUrl: t.licence.sourceUrl,
    video: toPlayerVideo(t.type === "movie" ? t.playable : undefined),
    trailer: toPlayerVideo(t.trailer),
    seasons: (t.seasons ?? []).map((s) => ({
      number: s.number,
      title: s.title,
      episodes: s.episodes.map((e) => ({
        season: s.number,
        number: e.number,
        title: e.title,
        synopsis: e.synopsis,
        runtimeMinutes: e.runtimeMinutes,
        still: e.still,
        video: toPlayerVideo(pickEpisodeVideo(e.videos)),
      })),
    })),
  };
}

export type WatchSelection =
  | { kind: "movie"; video: PlayerVideo | undefined; resumeKey: string }
  | { kind: "trailer"; video: PlayerVideo; resumeKey: string }
  | { kind: "episode"; episode: WatchEpisode; next?: WatchEpisode; resumeKey: string }
  | { kind: "missing" };

function toInt(v: string | null | undefined): number | undefined {
  return v && /^\d{1,4}$/.test(v) ? Number(v) : undefined;
}

/**
 * Decides what the watch page plays from the URL: `?v=trailer`, or `?s=1&e=2` for series (defaults to the first
 * playable episode). Unknown episodes give `missing` so the page can show a friendly message.
 */
export function resolveWatch(data: WatchData, params: { s?: string | null; e?: string | null; v?: string | null }): WatchSelection {
  if (params.v === "trailer") {
    return data.trailer ? { kind: "trailer", video: data.trailer, resumeKey: `${data.slug}:trailer` } : { kind: "missing" };
  }
  if (data.type === "movie") return { kind: "movie", video: data.video, resumeKey: data.slug };

  const flat = data.seasons.flatMap((s) => s.episodes);
  const sNum = toInt(params.s);
  const eNum = toInt(params.e);
  const episode =
    sNum !== undefined && eNum !== undefined
      ? flat.find((e) => e.season === sNum && e.number === eNum)
      : flat.find((e) => e.video) ?? flat[0];
  if (!episode) return { kind: "missing" };
  const idx = flat.indexOf(episode);
  const next = flat.slice(idx + 1).find((e) => e.video);
  return { kind: "episode", episode, next, resumeKey: `${data.slug}:s${episode.season}e${episode.number}` };
}

/** Light episode rows for the season/episode browser (no video sources, so the payload stays small). */
export type EpisodeRow = {
  season: number;
  number: number;
  title: string;
  synopsis?: string;
  runtimeMinutes?: number;
  still?: string;
  playable: boolean;
};
export type SeasonRows = { number: number; title?: string; year?: number; synopsis?: string; episodes: EpisodeRow[] };

export function seasonRowsFromTitle(t: Title): SeasonRows[] {
  return (t.seasons ?? []).map((s) => ({
    number: s.number,
    title: s.title,
    year: s.year,
    synopsis: s.synopsis,
    episodes: s.episodes.map((e) => ({
      season: s.number,
      number: e.number,
      title: e.title,
      synopsis: e.synopsis,
      runtimeMinutes: e.runtimeMinutes,
      still: e.still,
      playable: Boolean(pickEpisodeVideo(e.videos)),
    })),
  }));
}

export function seasonRowsFromWatch(data: WatchData): SeasonRows[] {
  return data.seasons.map((s) => ({
    number: s.number,
    title: s.title,
    episodes: s.episodes.map(({ video, ...rest }) => ({ ...rest, playable: Boolean(video) })),
  }));
}
