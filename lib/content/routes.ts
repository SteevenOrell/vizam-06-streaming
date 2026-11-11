import type { Title } from "./types";

/** Route helpers in one place. No catalog import, so client components can use them without bundling the catalog. */
export const routes = {
  title: (t: Pick<Title, "type" | "slug">) => (t.type === "movie" ? `/movies/${t.slug}` : `/tv/${t.slug}`),
  watch: (t: Pick<Title, "slug">) => `/watch/${t.slug}`,
  genre: (slug: string) => `/genres#${slug}`,
};
