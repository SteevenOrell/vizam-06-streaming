import type { Metadata } from "next";
import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { getByGenre, getGenres, getTrending } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Genres",
  description: "Browse AFTERLIGHT's open-licence films and series by genre.",
  alternates: { canonical: "/genres" },
};

export default function GenresPage() {
  const genres = getGenres();
  // Representative backdrop: the genre's highest editorial-ranked title.
  const rank = new Map(getTrending(100).map((t, i) => [t.slug, i]));
  // Greedy so neighbouring tiles rarely repeat a backdrop: smallest genres pick first, each takes its best unused title.
  const used = new Set<string>();
  const picks = new Map<string, ReturnType<typeof getByGenre>[number] | undefined>();
  for (const g of [...genres].sort((a, b) => a.count - b.count)) {
    const titles = [...getByGenre(g.slug)].sort((a, b) => (rank.get(a.slug) ?? 999) - (rank.get(b.slug) ?? 999));
    const pick = titles.find((t) => !used.has(t.slug)) ?? titles[0];
    if (pick) used.add(pick.slug);
    picks.set(g.slug, pick);
  }
  const tiles = genres.map((g) => {
    const titles = getByGenre(g.slug);
    const hasMovies = titles.some((t) => t.type === "movie");
    const hasSeries = titles.some((t) => t.type === "series");
    return { genre: g, front: picks.get(g.slug), kinds: [hasMovies ? "Movies" : null, hasSeries ? "Series" : null].filter(Boolean).join(" + ") };
  });
  return (
    <>
      <PageIntro eyebrow="Browse" title="Genres">
        Pick a mood. Every genre in the library, with every film and series filed under it.
      </PageIntro>
      <ul aria-label="Genres" className="wrap grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ genre, front, kinds }) => (
          <li key={genre.slug} id={genre.slug} className="scroll-mt-24">
            <Link
              href={routes.genre(genre.slug)}
              className="group/tile relative block aspect-[16/9] overflow-hidden rounded-panel bg-ink-850 ring-1 ring-inset ring-white/8 outline-offset-4"
            >
              {front ? (
                <FadeImage
                  src={front.images.backdrop}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
                  blur={front.images.backdropBlur}
                  className="object-cover opacity-75 m-zoom group-hover/tile:scale-105 group-hover/tile:opacity-95"
                />
              ) : null}
              <span aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-card)]" />
              <span className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="display block truncate text-5xl text-bone-50 sm:text-6xl">{genre.name}</span>
                  <span className="mt-1 block text-sm font-semibold text-bone-200">
                    {plural(genre.count, "title")} · {kinds}
                  </span>
                </span>
                <span aria-hidden="true" className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember-400 text-ink-950 transition-transform group-hover/tile:translate-x-1">
                  &rarr;
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
