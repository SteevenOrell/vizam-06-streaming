"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, SkipForward } from "lucide-react";
import { Player } from "@/components/player/player";
import { EpisodeBrowser } from "@/components/title/episode-browser";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/lib/content/routes";
import { resolveWatch, seasonRowsFromWatch, type WatchData } from "@/lib/content/watch";
import { formatRuntime } from "@/lib/format";

/**
 * Chooses what to play from the URL (`?s=1&e=2`, `?v=trailer`) and renders the player. Client-side so the watch route
 * stays fully static. Nothing starts without a click, except right after the visitor chose "Next episode"/an episode.
 */
export function WatchClient({ data }: { data: WatchData }) {
  const params = useSearchParams();
  const sel = resolveWatch(data, { s: params.get("s"), e: params.get("e"), v: params.get("v") });
  const [chosenByVisitor, setChosenByVisitor] = useState(false);

  const back = (
    <Link href={data.detailsHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-bone-200 hover:text-ember-300">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {data.title}
    </Link>
  );

  const video = sel.kind === "episode" ? sel.episode.video : sel.kind === "missing" ? undefined : sel.video;
  const episode = sel.kind === "episode" ? sel.episode : undefined;
  const label = episode ? `${data.title}, S${episode.season} E${episode.number}: ${episode.title}` : sel.kind === "trailer" ? `${data.title} trailer` : data.title;
  const next = sel.kind === "episode" ? sel.next : undefined;
  const nextLink = next ? (
    <ButtonLink
      href={routes.watch({ slug: data.slug }, { season: next.season, episode: next.number })}
      onClick={() => setChosenByVisitor(true)}
      variant="secondary"
      size="lg"
      icon={<SkipForward aria-hidden="true" />}
      data-testid="next-episode"
    >
      Next: S{next.season} E{next.number}
    </ButtonLink>
  ) : null;

  return (
    <div className="grid gap-6">
      <div>{back}</div>

      {video && (sel.kind !== "missing") ? (
        <Player
          key={sel.resumeKey}
          video={video}
          label={label}
          poster={episode?.still ?? data.backdrop}
          resumeKey={sel.resumeKey}
          detailsHref={data.detailsHref}
          sourceUrl={data.sourceUrl}
          autoStart={chosenByVisitor}
          endActions={
            <>
              {nextLink}
              <ButtonLink href={data.detailsHref} variant="secondary" size="lg">
                Back to details
              </ButtonLink>
            </>
          }
        />
      ) : (
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-player bg-ink-900 shadow-lift" data-testid="no-video">
          <Image src={data.backdrop} alt="" fill sizes="(min-width: 1536px) 92rem, 100vw" className="object-cover opacity-30" />
          <div className="relative p-6 text-center">
            <p className="text-lg font-extrabold text-bone-50">
              {sel.kind === "missing" ? "That video is not available." : "No playable source for this title yet."}
            </p>
            <div className="mt-4 flex justify-center">
              <ButtonLink href={data.detailsHref} variant="secondary">
                Back to details
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {episode ? (
        <div className="flex flex-wrap items-start justify-between gap-4" data-testid="now-playing">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow">
              Season {episode.season} · Episode {episode.number}
              {formatRuntime(episode.runtimeMinutes) ? ` · ${formatRuntime(episode.runtimeMinutes)}` : ""}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-bone-50">{episode.title}</h2>
            {episode.synopsis ? <p className="mt-2 leading-relaxed text-bone-200">{episode.synopsis}</p> : null}
          </div>
          {nextLink}
        </div>
      ) : null}

      {data.type === "series" && sel.kind === "episode" ? (
        <div className="mt-4">
          <EpisodeBrowser
            wrap={false}
            key={sel.episode.season}
            slug={data.slug}
            fallbackImage={data.backdrop}
            seasons={seasonRowsFromWatch(data)}
            current={{ season: sel.episode.season, episode: sel.episode.number }}
            onPick={() => setChosenByVisitor(true)}
            headingLevel="h2"
          />
        </div>
      ) : null}
    </div>
  );
}
