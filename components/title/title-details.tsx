import { FadeImage } from "@/components/ui/fade-image";
import { ViewTransition } from "react";
import Link from "next/link";
import { Clapperboard, Play, ShieldCheck } from "lucide-react";
import { Credits } from "./credits";
import { EpisodeBrowser } from "./episode-browser";
import { LicencePanel } from "./licence-panel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Rail } from "@/components/ui/rail";
import { TitleCard } from "@/components/ui/title-card";
import { WatchlistButton } from "@/components/ui/watchlist-button";
import { toCard } from "@/lib/content/card";
import { related } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import type { Title } from "@/lib/content/types";
import { seasonRowsFromTitle, pickEpisodeVideo } from "@/lib/content/watch";
import { formatRuntime, plural } from "@/lib/format";
import { movieJsonLd, serializeJsonLd, tvSeriesJsonLd } from "@/lib/seo/jsonld";
import { site } from "@/lib/site";

/** Shared details page for movies and series: backdrop header, actions, credits, licence, episodes, related. */
export function TitleDetails({ title }: { title: Title }) {
  const more = related(title.slug, 10);
  const isSeries = title.type === "series";
  const path = routes.title(title);
  const ld = isSeries ? tvSeriesJsonLd(title, site.url, path) : movieJsonLd(title, site.url, path);
  const seasons = isSeries ? seasonRowsFromTitle(title) : [];
  const firstEpisode = title.seasons?.flatMap((s) => s.episodes.map((e) => ({ s: s.number, e, v: pickEpisodeVideo(e.videos) }))).find((x) => x.v);
  const playHref = isSeries ? (firstEpisode ? routes.watch(title, { season: firstEpisode.s, episode: firstEpisode.e.number }) : undefined) : title.playable ? routes.watch(title) : undefined;
  const runtime = isSeries ? undefined : formatRuntime(title.runtimeMinutes);
  const meta = [
    String(title.year),
    isSeries ? `${plural(title.seasons?.length ?? 0, "season")} · ${plural(title.episodeCount, "episode")}` : runtime,
    title.advisory,
    title.language,
  ].filter(Boolean) as string[];
  const rating = title.rating.source === "editorial" ? title.rating : undefined;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }} />
      <section aria-labelledby="title-heading" className="relative -mt-[var(--header-h)] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0">
          {/* Fade/scale-in on navigation (CSS only; instant under prefers-reduced-motion). */}
          <div className="backdrop-in absolute inset-0">
            <FadeImage src={title.images.backdrop} alt="" fill priority sizes="100vw" blur={title.images.backdropBlur} className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-[image:var(--scrim-hero-side)]" />
          <div className="absolute inset-0 bg-[image:var(--scrim-hero-bottom)]" />
        </div>
        <div className="wrap relative grid gap-8 pb-12 pt-44 sm:pt-56 md:grid-cols-[minmax(0,14rem)_1fr] md:items-end lg:pt-64">
          <ViewTransition name={`poster-${title.slug}`} share="morph" default="none">
            <div className="relative hidden aspect-[2/3] overflow-hidden rounded-card shadow-lift ring-1 ring-white/10 md:block">
              <FadeImage src={title.images.poster} alt={`${title.title} poster`} fill priority sizes="14rem" blur={title.images.posterBlur} className="object-cover" />
            </div>
          </ViewTransition>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline">{isSeries ? "Series" : "Movie"}</Badge>
              <a
                href="#about-this-title"
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-bone-50 hover:bg-white/20"
                data-testid="licence-badge"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-ember-300" aria-hidden="true" />
                {title.licence.name}
                <span className="sr-only"> licence details</span>
              </a>
              {rating ? (
                <span className="text-xs font-bold text-bone-200" data-testid="editorial-rating">
                  {rating.label ?? "Editorial score"} {rating.score.toFixed(1)}/10
                </span>
              ) : null}
            </div>
            <h1 id="title-heading" className="display mt-4 text-5xl text-bone-50 sm:text-7xl lg:text-8xl">
              {title.title}
            </h1>
            {title.tagline ? <p className="mt-3 text-lg font-semibold italic text-ember-200">{title.tagline}</p> : null}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-bone-200" data-testid="meta">
              {meta.map((m, i) => (
                <span key={m} className={i ? "before:mr-3 before:text-bone-500 before:content-['·']" : undefined}>
                  {m}
                </span>
              ))}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Genres">
              {title.genres.map((g, i) => (
                <li key={g.slug}>
                  <Link href={routes.genre(g.slug)} className={`inline-flex min-h-8 items-center rounded-full! px-3 text-xs font-bold uppercase tracking-[0.1em] ${i === 0 ? "bg-ember-400 text-ink-950 hover:bg-ember-300" : "bg-white/10 text-bone-200 hover:bg-white/20"}`}>
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-bone-200 sm:text-lg">{title.synopsis}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {playHref ? (
                <ButtonLink href={playHref} size="lg" icon={<Play aria-hidden="true" fill="currentColor" />} data-testid="play-link">
                  {isSeries && firstEpisode ? `Play S${firstEpisode.s} E${firstEpisode.e.number}` : "Play"}
                </ButtonLink>
              ) : (
                <p className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-bone-200">Not available to stream yet</p>
              )}
              {title.trailer ? (
                <ButtonLink href={routes.watch(title, { trailer: true })} variant="secondary" size="lg" icon={<Clapperboard aria-hidden="true" />} data-testid="trailer-link">
                  Watch trailer
                </ButtonLink>
              ) : null}
              <WatchlistButton slug={title.slug} title={title.title} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-14 pb-16 pt-6 sm:gap-16">
        {isSeries && seasons.length ? <EpisodeBrowser slug={title.slug} fallbackImage={title.images.backdrop} seasons={seasons} /> : null}

        <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
          <Credits title={title} />
          <LicencePanel title={title} />
        </div>

        {more.length ? (
          <Rail id="rail-related" eyebrow="More like this" title="You might also like">
            {more.map((t) => (
              <TitleCard key={t.slug} title={toCard(t)} />
            ))}
          </Rail>
        ) : null}
      </div>
    </>
  );
}
