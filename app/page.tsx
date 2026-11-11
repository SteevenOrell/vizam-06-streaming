import Image from "next/image";
import { Info, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Rail } from "@/components/ui/rail";
import { TitleCard } from "@/components/ui/title-card";
import { getCollections, getHeroTitles, getTrending } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";

/** Home (Phase 0 skeleton): static hero from the first editorial pick + rails. Phase 2 adds the rotating hero/video. */
export default function HomePage() {
  const [hero] = getHeroTitles(1);
  const trending = getTrending(12);
  const collections = getCollections();

  return (
    <>
      {hero ? (
        <section aria-labelledby="hero-title" className="relative -mt-[var(--header-h)] min-h-[min(88svh,52rem)]">
          <Image
            src={hero.images.backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-hero-side)]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-hero-bottom)]" />
          <div className="wrap relative flex min-h-[min(88svh,52rem)] flex-col justify-end pb-16 pt-32">
            <div className="flex flex-wrap items-center gap-3 text-sm text-bone-200">
              <Badge tone="outline">{hero.type === "movie" ? "Film" : "Series"}</Badge>
              <span>{hero.year}</span>
              {hero.genres.slice(0, 2).map((g) => (
                <span key={g.slug}>{g.name}</span>
              ))}
            </div>
            <h1 id="hero-title" className="display mt-4 max-w-3xl text-6xl text-bone-50 sm:text-8xl">
              {hero.title}
            </h1>
            <p className="mt-4 line-clamp-3 max-w-xl text-base leading-relaxed text-bone-200 sm:text-lg">{hero.synopsis}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={routes.watch(hero)} size="lg" icon={<Play aria-hidden="true" fill="currentColor" />}>
                Play
              </ButtonLink>
              <ButtonLink href={routes.title(hero)} size="lg" variant="secondary" icon={<Info aria-hidden="true" />}>
                More info
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      <Rail id="rail-trending" eyebrow="Trending" title="Curated trending picks" seeAllHref="/trending">
        {trending.map((t, i) => (
          <TitleCard key={t.slug} title={t} priority={i < 2} />
        ))}
      </Rail>

      {collections.map((c) => (
        <Rail key={c.slug} id={`rail-${c.slug}`} eyebrow={c.eyebrow} title={c.title} variant={c.layout}>
          {c.titles.map((t) => (
            <TitleCard key={t.slug} title={t} variant={c.layout} badge={c.slug === "new-on-afterlight" ? "New" : undefined} />
          ))}
        </Rail>
      ))}
    </>
  );
}
