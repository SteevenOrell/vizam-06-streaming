import type { Title } from "./types";

/** Route helpers in one place. No catalog import, so client components can use them without bundling the catalog. */
export const routes = {
  title: (t: Pick<Title, "type" | "slug">) => (t.type === "movie" ? `/movies/${t.slug}` : `/tv/${t.slug}`),
  /** `/watch/<slug>`, `/watch/<slug>?s=1&e=2` for an episode, or `?v=trailer`. */
  watch: (t: Pick<Title, "slug">, opts: { season?: number; episode?: number; trailer?: boolean } = {}) => {
    if (opts.trailer) return `/watch/${t.slug}?v=trailer`;
    if (opts.season !== undefined && opts.episode !== undefined) return `/watch/${t.slug}?s=${opts.season}&e=${opts.episode}`;
    return `/watch/${t.slug}`;
  },
  genre: (slug: string) => `/genres#${slug}`,
};
