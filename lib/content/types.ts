import type { Collection, Editorial, Licence, MediaItem, Rating, Season, VideoKind, VideoSource } from "./schema";

export type TitleType = MediaItem["type"];

export type Person = { name: string; slug: string; role?: string };

export type GenreRef = { slug: string; name: string };

export type Genre = GenreRef & { count: number; blurb?: string; image?: { src: string; blur?: string } };

/** A licence entry as listed on /about#licences. */
export type LicenceEntry = Licence & { id: string; titleSlug: string; titleName: string };

/** Normalised title used by every page and component. */
export type Title = Omit<MediaItem, "genres" | "credits" | "licence"> & {
  genres: GenreRef[];
  credits: { directors: Person[]; cast: Person[]; writers: Person[] };
  licence: LicenceEntry;
  /** Convenience lookups */
  heroLoop?: VideoSource;
  trailer?: VideoSource;
  /** Main playable video (feature, short or first episode) */
  playable?: VideoSource;
  episodeCount: number;
};

export type ResolvedCollection = Omit<Collection, "titles"> & { titles: Title[] };

export type Catalog = {
  source: "media-library" | "sample";
  titles: Title[];
  genres: Genre[];
  collections: ResolvedCollection[];
  licences: LicenceEntry[];
  editorial: Editorial;
};

export type { Collection, Licence, MediaItem, Rating, Season, VideoKind, VideoSource };
