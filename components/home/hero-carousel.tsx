"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { WatchlistButton } from "@/components/ui/watchlist-button";
import { formatRuntime } from "@/lib/format";
import { useCanAutoplayVideo } from "@/lib/hooks/use-media-preferences";

export type HeroSlide = {
  slug: string;
  type: "movie" | "series";
  title: string;
  year: number;
  runtimeMinutes?: number;
  genres: string[];
  synopsis: string;
  backdrop: string;
  backdropBlur?: string;
  detailsHref: string;
  watchHref: string;
  loop?: { src: { url: string; type: string }[]; poster?: string };
};

const navBtn =
  "grid h-11 w-11 place-items-center rounded-full bg-ink-950/55 text-bone-50 ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:bg-ink-950/80";

/**
 * Hero carousel. Poster image is always rendered first (first slide `priority`, fixed height, no layout shift).
 * A muted looping video mounts only for the active slide and only while the visitor allows motion, the hero is on
 * screen and the tab is visible. Visitors can pause it (WCAG 2.2.2). Auto-advance is off by default.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const canAutoplay = useCanAutoplayVideo();
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const count = slides.length;
  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const current = slides[active];
  const hasLoop = Boolean(current?.loop) && !failed[current?.slug ?? ""];
  const shouldPlay = canAutoplay && !userPaused && inView && tabVisible && hasLoop;

  // Drive play/pause imperatively so offscreen, hidden and paused states stop decoding.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldPlay) {
      const slug = current.slug;
      v.play().catch((err: unknown) => {
        // AbortError = we paused while play() was pending (normal); only an unsupported source is a real failure.
        if (err instanceof DOMException && err.name === "NotSupportedError") setFailed((f) => ({ ...f, [slug]: true }));
      });
    } else v.pause();
  }, [shouldPlay, active, current?.slug]);

  if (count === 0) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(active + 1);
    else if (e.key === "ArrowLeft") go(active - 1);
  };

  const showPauseControl = canAutoplay && hasLoop;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured films"
      onKeyDown={onKeyDown}
      className="relative -mt-[var(--header-h)] h-[min(92svh,54rem)] min-h-[34rem] overflow-hidden bg-ink-900"
    >
      <h1 className="sr-only">AFTERLIGHT: open cinema, Creative Commons and public-domain films</h1>
      {slides.map((s, i) => {
        const isActive = i === active;
        return (
          <div
            key={s.slug}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-cinema ${isActive ? "z-10 opacity-100" : "z-0 opacity-0"}`}
          >
            <Image
              src={s.backdrop}
              alt=""
              fill
              priority={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              sizes="100vw"
              placeholder={s.backdropBlur ? "blur" : "empty"}
              blurDataURL={s.backdropBlur}
              className="object-cover"
            />
            {isActive && s.loop && !failed[s.slug] && canAutoplay ? (
              <video
                ref={videoRef}
                key={s.slug}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                poster={s.loop.poster ?? s.backdrop}
                onPlaying={() => setPlaying((p) => ({ ...p, [s.slug]: true }))}
                onError={() => setFailed((f) => ({ ...f, [s.slug]: true }))}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing[s.slug] ? "opacity-100" : "opacity-0"}`}
              >
                {s.loop.src.map((f, n, all) => (
                  <source key={f.url} src={f.url} type={f.type} onError={n === all.length - 1 ? () => setFailed((x) => ({ ...x, [s.slug]: true })) : undefined} />
                ))}
              </video>
            ) : null}
            <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-hero-side)]" />
            <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-hero-bottom)]" />

            <div className="wrap relative flex h-full flex-col justify-end pb-24 pt-32 sm:pb-28">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-bone-200">
                <Badge tone="outline">{s.type === "movie" ? "Film" : "Series"}</Badge>
                <span>{s.year}</span>
                {formatRuntime(s.runtimeMinutes) ? <span>{formatRuntime(s.runtimeMinutes)}</span> : null}
                {s.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-bone-400">
                    {g}
                  </span>
                ))}
              </div>
              <h2 className="display mt-4 max-w-4xl text-[3.25rem] leading-[0.9] text-bone-50 sm:text-8xl lg:text-9xl">
                {s.title}
              </h2>
              <p className="mt-4 line-clamp-3 max-w-xl text-base leading-relaxed text-bone-200 sm:text-lg">{s.synopsis}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href={s.watchHref} size="lg" icon={<Play aria-hidden="true" fill="currentColor" />}>
                  Watch Preview
                  <span className="sr-only">: {s.title}</span>
                </ButtonLink>
                <ButtonLink href={s.detailsHref} size="lg" variant="secondary" icon={<Info aria-hidden="true" />}>
                  View Details
                  <span className="sr-only">: {s.title}</span>
                </ButtonLink>
                <WatchlistButton slug={s.slug} title={s.title} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Controls sit above the slides */}
      <div className="wrap absolute inset-x-0 bottom-6 z-20 flex items-center justify-between gap-4 sm:bottom-8">
        <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show ${s.title}`}
              aria-current={i === active ? "true" : undefined}
              className="group grid h-11 place-items-center px-1"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ease-cinema ${i === active ? "w-9 bg-ember-400" : "w-2.5 bg-white/35 group-hover:bg-white/60"}`}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {showPauseControl ? (
            <button
              type="button"
              className={navBtn}
              aria-pressed={userPaused}
              aria-label={userPaused ? "Play background video" : "Pause background video"}
              onClick={() => setUserPaused((p) => !p)}
            >
              {userPaused ? <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" /> : <Pause className="h-5 w-5" aria-hidden="true" fill="currentColor" />}
            </button>
          ) : null}
          {count > 1 ? (
            <>
              <button type="button" className={navBtn} aria-label="Previous slide" onClick={() => go(active - 1)}>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" className={navBtn} aria-label="Next slide" onClick={() => go(active + 1)}>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Slide ${active + 1} of ${count}: ${current.title}`}
      </p>
    </section>
  );
}
