import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { Rail } from "@/components/ui/rail";
import { SectionHeader } from "@/components/ui/section-header";
import { TitleCard } from "@/components/ui/title-card";
import {
  getByGenre,
  getCollections,
  getGenres,
  getHeroTitles,
  getRecentlyAdded,
  getTitles,
  getTrending,
  toCards,
} from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import type { Title } from "@/lib/content/types";
import { plural } from "@/lib/format";

function toSlide(t: Title): HeroSlide {
  return {
    slug: t.slug,
    type: t.type,
    title: t.title,
    year: t.year,
    runtimeMinutes: t.runtimeMinutes,
    genres: t.genres.map((g) => g.name),
    synopsis: t.synopsis,
    backdrop: t.images.backdrop,
    backdropBlur: t.images.backdropBlur,
    detailsHref: routes.title(t),
    watchHref: routes.watch(t),
    loop: t.heroLoop ? { src: t.heroLoop.src.map((s) => ({ url: s.url, type: s.type })), poster: t.heroLoop.poster } : undefined,
  };
}

export default function HomePage() {
  const slides = getHeroTitles(5).map(toSlide);
  const trending = toCards(getTrending(12));
  const recent = toCards(getRecentlyAdded(12));
  const series = toCards(getTitles({ type: "series" }));
  const collections = getCollections();

  // Genre tiles: most-used genres, each fronted by a different title's backdrop.
  const used = new Set<string>();
  const genreTiles = getGenres()
    .slice(0, 6)
    .map((g) => {
      const titles = getByGenre(g.slug);
      const front = titles.find((t) => !used.has(t.slug)) ?? titles[0];
      used.add(front.slug);
      return { genre: g, front };
    });

  return (
    <>
      <HeroCarousel slides={slides} />

      <Rail id="rail-trending" eyebrow="Trending" title="Trending (curated by our editors)" seeAllHref="/trending">
        {trending.map((t, i) => (
          <TitleCard key={t.slug} title={t} priority={i < 2} />
        ))}
      </Rail>

      <Rail id="rail-recent" eyebrow="Just added" title="Recently added" variant="landscape">
        {recent.map((t) => (
          <TitleCard key={t.slug} title={t} variant="landscape" />
        ))}
      </Rail>

      {genreTiles.length > 0 ? (
        <section aria-labelledby="genres-title" className="py-6">
          <SectionHeader id="genres-title" eyebrow="Browse" title="Popular genres" seeAllHref="/genres" />
          <ul className="wrap mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {genreTiles.map(({ genre, front }) => (
              <li key={genre.slug}>
                <Link
                  href={routes.genre(genre.slug)}
                  className="group/tile relative block aspect-[16/10] overflow-hidden rounded-card bg-ink-850 ring-1 ring-inset ring-white/8 outline-offset-4"
                >
                  <FadeImage
                    src={genre.image?.src ?? front.images.backdrop}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 46vw"
                    blur={genre.image ? genre.image.blur : front.images.backdropBlur}
                    className="object-cover opacity-70 m-zoom group-hover/tile:scale-105 group-hover/tile:opacity-90"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-card)]" />
                  <span className="absolute inset-x-3 bottom-3">
                    <span className="display block text-3xl text-bone-50">{genre.name}</span>
                    <span className="mt-1 block text-xs font-semibold text-bone-200">{plural(genre.count, "title")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {collections.map((c) => (
        <Rail key={c.slug} id={`rail-${c.slug}`} eyebrow={c.eyebrow} title={c.title} variant={c.layout}>
          {toCards(c.titles).map((t) => (
            <TitleCard key={t.slug} title={t} variant={c.layout} />
          ))}
        </Rail>
      ))}

      {series.length > 0 ? (
        <Rail id="rail-series" eyebrow="Episodic" title="Series" seeAllHref="/tv" variant="landscape">
          {series.map((t) => (
            <TitleCard key={t.slug} title={t} variant="landscape" />
          ))}
        </Rail>
      ) : null}
    </>
  );
}
