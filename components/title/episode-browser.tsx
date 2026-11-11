"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { Play } from "lucide-react";
import { routes } from "@/lib/content/routes";
import type { SeasonRows } from "@/lib/content/watch";
import { formatRuntime, plural } from "@/lib/format";

type Props = {
  slug: string;
  /** Used when an episode has no still of its own. */
  fallbackImage: string;
  seasons: SeasonRows[];
  /** Highlights the episode being watched (watch page). */
  current?: { season: number; episode: number };
  /** Called when the visitor picks an episode, so the watch page can start the next one straight away. */
  onPick?: () => void;
  headingLevel?: "h2" | "h3";
  /** Wrap in the page gutter container (turn off when already inside one). */
  wrap?: boolean;
};

const INITIAL_VISIBLE = 12;

/** Season tabs (ARIA tabs with arrow keys) and an episode list with stills, numbers, runtimes and play links. */
export function EpisodeBrowser({ slug, fallbackImage, seasons, current, onPick, headingLevel: Heading = "h2", wrap = true }: Props) {
  const baseId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const initial = Math.max(0, current ? seasons.findIndex((s) => s.number === current.season) : 0);
  const [index, setIndex] = useState(initial);
  const season = seasons[index] ?? seasons[0];
  const currentPos = current && season ? season.episodes.findIndex((e) => e.number === current.episode && e.season === current.season) : -1;
  const [showAll, setShowAll] = useState(false);
  if (!season) return null;
  const expanded = showAll || currentPos >= INITIAL_VISIBLE;
  const visible = expanded ? season.episodes : season.episodes.slice(0, INITIAL_VISIBLE);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const last = seasons.length - 1;
    const next = e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" ? (index + 1) % seasons.length : (index - 1 + seasons.length) % seasons.length;
    setIndex(next);
    setShowAll(false);
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const seasonLabel = (s: SeasonRows) => (s.title ? `Season ${s.number}: ${s.title}` : `Season ${s.number}`);

  return (
    <section aria-labelledby={`${baseId}-h`} data-testid="episodes" className={wrap ? "wrap" : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">Episodes</p>
          <Heading id={`${baseId}-h`} className="mt-1.5 text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
            {seasonLabel(season)}
            <span className="ml-3 text-sm font-semibold text-bone-400">{plural(season.episodes.length, "episode")}</span>
          </Heading>
        </div>
        {seasons.length > 1 ? (
          <div ref={tabsRef} role="tablist" aria-label="Seasons" onKeyDown={onTabKey} className="flex flex-wrap gap-2">
            {seasons.map((s, i) => (
              <button
                key={s.number}
                type="button"
                role="tab"
                id={`${baseId}-tab-${s.number}`}
                aria-selected={i === index}
                aria-controls={`${baseId}-panel`}
                tabIndex={i === index ? 0 : -1}
                onClick={() => {
                  setIndex(i);
                  setShowAll(false);
                }}
                className={`min-h-11 rounded-full! px-4 text-sm font-bold transition-colors ${i === index ? "bg-ember-400 text-ink-950" : "bg-white/10 text-bone-200 hover:bg-white/18"}`}
              >
                Season {s.number}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {season.synopsis ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-bone-400">{season.synopsis}</p> : null}

      <div id={`${baseId}-panel`} role={seasons.length > 1 ? "tabpanel" : undefined} aria-labelledby={seasons.length > 1 ? `${baseId}-tab-${season.number}` : undefined} className="mt-5">
        <ol className="grid gap-3">
          {visible.map((ep) => {
            const isCurrent = current?.season === ep.season && current.episode === ep.number;
            const runtime = formatRuntime(ep.runtimeMinutes);
            const label = `S${ep.season} E${ep.number}`;
            return (
              <li
                key={`${ep.season}-${ep.number}`}
                aria-current={isCurrent ? "true" : undefined}
                data-testid="episode"
                className={`group relative flex gap-4 rounded-card p-2.5 transition-colors sm:p-3 ${isCurrent ? "bg-ember-900/60 ring-1 ring-ember-400/50" : "bg-ink-850 hover:bg-ink-800"}`}
              >
                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-sm bg-ink-800 sm:w-52">
                  <FadeImage src={ep.still ?? fallbackImage} alt="" fill sizes="(min-width: 640px) 13rem, 8rem" className="object-cover" />
                  {ep.playable ? (
                    <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-[opacity,background-color] group-hover:bg-black/40 group-hover:opacity-100 group-focus-within:opacity-100">
                      <Play className="h-8 w-8 text-bone-50" fill="currentColor" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ember-300">
                    {label}
                    {runtime ? <span className="ml-2 font-semibold normal-case tracking-normal text-bone-400">{runtime}</span> : null}
                  </p>
                  <h3 className="mt-0.5 text-base font-extrabold leading-snug text-bone-50">
                    {ep.playable ? (
                      <Link
                        href={routes.watch({ slug }, { season: ep.season, episode: ep.number })}
                        onClick={onPick}
                        aria-label={`Play ${label}: ${ep.title}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {ep.title}
                      </Link>
                    ) : (
                      <>
                        {ep.title} <span className="text-sm font-semibold text-bone-400">(not available yet)</span>
                      </>
                    )}
                  </h3>
                  {ep.synopsis ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-bone-400">{ep.synopsis}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
        {!expanded && season.episodes.length > INITIAL_VISIBLE ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-4 min-h-11 rounded-full bg-white/10 px-5 text-sm font-bold text-bone-50 hover:bg-white/18"
          >
            Show all {season.episodes.length} episodes
          </button>
        ) : null}
      </div>
    </section>
  );
}
