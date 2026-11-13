"use client";

import Link from "next/link";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { Play } from "lucide-react";
import type { CardData } from "@/lib/content/card";
import { routes } from "@/lib/content/routes";
import { formatRuntime, plural } from "@/lib/format";
import { useCanAutoplayVideo, useFinePointer } from "@/lib/hooks/use-media-preferences";
import { Badge } from "./badge";
import { FadeImage } from "./fade-image";

type Props = {
  title: CardData;
  variant?: "poster" | "landscape";
  /** Overrides the automatic "New" badge text */
  badge?: string;
  /** Set on the first visible cards of the first rail only */
  priority?: boolean;
  className?: string;
  /** Poster grids only (each title appears once on the page): morph the poster into the details poster. */
  morph?: boolean;
};

const SIZES = {
  poster: "(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 42vw",
  landscape: "(min-width: 1280px) 24vw, (min-width: 768px) 36vw, 78vw",
};

const PREVIEW_DELAY_MS = 400; // hover intent before the preview is requested
const PREVIEW_FADE_MS = 340; // keep in step with --dur-hover

/**
 * Poster (2:3, ref 2) or landscape (16:9, ref 1) card. Fixed aspect ratio + clamped title keeps every card in a rail
 * the same size (no layout shift). The whole card is one link; the visible title is its accessible name.
 * Hover/focus reveals a play icon and runtime. A muted preview clip plays on hover only for fine pointers, only when
 * the title has one, and never with reduced motion or Save-Data.
 */
export function TitleCard({ title, variant = "poster", badge, priority = false, className = "", morph = false }: Props) {
  const isPoster = variant === "poster";
  const src = isPoster ? title.poster : title.backdrop;
  const blur = isPoster ? title.posterBlur : title.backdropBlur;
  const badgeText = badge ?? (title.isNew ? "New" : undefined);
  const runtime = formatRuntime(title.runtimeMinutes);

  const canMotion = useCanAutoplayVideo();
  const finePointer = useFinePointer();
  const canPreview = Boolean(title.preview?.length) && canMotion && finePointer;
  const [intent, setIntent] = useState(false); // pointer is dwelling on the card
  const [mounted, setMounted] = useState(false); // <video> exists (kept briefly after leaving so it can fade out)
  const [ready, setReady] = useState(false); // canplay fired
  const [previewFailed, setPreviewFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(leaveTimer.current);
    },
    [],
  );

  const start = () => {
    if (!canPreview || previewFailed) return;
    clearTimeout(timer.current);
    clearTimeout(leaveTimer.current);
    timer.current = setTimeout(() => {
      setMounted(true);
      setIntent(true);
    }, PREVIEW_DELAY_MS);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setIntent(false);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setMounted(false);
      setReady(false);
    }, PREVIEW_FADE_MS);
  };

  const meta =
    title.type === "series"
      ? [title.seasons ? plural(title.seasons, "season") : null, title.episodes ? plural(title.episodes, "episode") : null]
          .filter(Boolean)
          .join(" · ")
      : runtime;

  return (
    <Link
      href={routes.title(title)}
      onPointerEnter={(e) => e.pointerType === "mouse" && start()}
      onPointerLeave={stop}
      onBlur={stop}
      className={`group/card flex flex-col gap-2.5 rounded-card outline-offset-4 ${className}`}
    >
      <Frame name={morph && isPoster ? `poster-${title.slug}` : undefined}>
      <div
        className={`m-lift relative overflow-hidden rounded-card bg-ink-850 shadow-card ring-1 ring-inset ring-white/5 group-hover/card:scale-[1.02] group-focus-visible/card:scale-[1.02] ${isPoster ? "aspect-[2/3]" : "aspect-video"}`}
      >
        <FadeImage
          src={src}
          alt=""
          fill
          sizes={SIZES[variant]}
          priority={priority}
          blur={blur}
          className="m-zoom object-cover group-hover/card:scale-[1.05]"
        />
        {mounted && title.preview ? (
          <video
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[var(--dur-hover)] ease-[var(--ease-swift)] ${intent && ready ? "opacity-100" : "opacity-0"}`}
            onCanPlay={() => setReady(true)}
            muted
            loop
            autoPlay
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            poster={title.previewPoster}
            onError={() => {
              setPreviewFailed(true);
              setMounted(false);
              setIntent(false);
            }}
          >
            {title.preview.map((s) => (
              <source key={s.url} src={s.url} type={s.type} />
            ))}
          </video>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[image:var(--scrim-card)] m-reveal opacity-0 group-hover/card:opacity-100 group-focus-visible/card:opacity-100" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full m-reveal bg-ember-400 text-ink-950 opacity-0 shadow-ember group-hover/card:scale-100 group-hover/card:opacity-100 group-focus-visible/card:scale-100 group-focus-visible/card:opacity-100"
        >
          <Play className="h-5 w-5" fill="currentColor" />
        </span>
        {runtime && title.type === "movie" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-2 rounded-full bg-ink-950/75 px-2 py-0.5 text-[0.6875rem] font-semibold text-bone-100 opacity-0 backdrop-blur-sm m-reveal group-hover/card:opacity-100 group-focus-visible/card:opacity-100"
          >
            {runtime}
          </span>
        ) : null}
        {badgeText ? (
          <Badge tone="ember" className="absolute bottom-2 left-1/2 -translate-x-1/2">
            {badgeText}
          </Badge>
        ) : null}
      </div>
      </Frame>
      <div className="min-h-[2.75rem]">
        <p className="line-clamp-1 text-sm font-semibold text-bone-50 group-hover/card:text-ember-200">{title.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-bone-400">
          {title.year} · {title.type === "movie" ? "Film" : "Series"}
          {meta && title.type === "series" ? ` · ${meta}` : title.genres[0] ? ` · ${title.genres[0].name}` : ""}
        </p>
      </div>
    </Link>
  );
}

/** Optional named view transition around the poster frame (see globals.css .morph). */
function Frame({ name, children }: { name?: string; children: React.ReactNode }) {
  if (!name) return <>{children}</>;
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
