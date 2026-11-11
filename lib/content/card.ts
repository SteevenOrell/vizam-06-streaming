import type { Title } from "./types";

/** Small, serialisable card payload for client components (the full catalog never ships to the browser). */
export type CardData = {
  slug: string;
  type: Title["type"];
  title: string;
  year: number;
  runtimeMinutes?: number;
  genres: { slug: string; name: string }[];
  poster: string;
  posterBlur?: string;
  backdrop: string;
  backdropBlur?: string;
  seasons: number;
  episodes: number;
  isNew: boolean;
  /** Short muted preview clip for hover (only when the title has a `preview` video). */
  preview?: { url: string; type: string }[];
  previewPoster?: string;
};

export function toCard(t: Title, isNew = false): CardData {
  const preview = t.videos.find((v) => v.kind === "preview");
  return {
    slug: t.slug,
    type: t.type,
    title: t.title,
    year: t.year,
    runtimeMinutes: t.runtimeMinutes,
    genres: t.genres,
    poster: t.images.poster,
    posterBlur: t.images.posterBlur,
    backdrop: t.images.backdrop,
    backdropBlur: t.images.backdropBlur,
    seasons: t.seasons?.length ?? 0,
    episodes: t.episodeCount,
    isNew,
    preview: preview?.src.map((s) => ({ url: s.url, type: s.type })),
    previewPoster: preview?.poster,
  };
}
