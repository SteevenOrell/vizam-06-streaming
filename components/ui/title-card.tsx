"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { CardData } from "@/lib/content/card";
import { routes } from "@/lib/content/routes";
import { formatRuntime, plural } from "@/lib/format";
import { useCanAutoplayVideo, useFinePointer } from "@/lib/hooks/use-media-preferences";
import { Badge } from "./badge";

type Props = {
  title: CardData;
  variant?: "poster" | "landscape";
  /** Overrides the automatic "New" badge text */
  badge?: string;
  /** Set on the first visible cards of the first rail only */
  priority?: boolean;
  className?: string;
};

const SIZES = {
  poster: "(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 42vw",
  landscape: "(min-width: 1280px) 24vw, (min-width: 768px) 36vw, 78vw",
};

const PREVIEW_DELAY_MS = 450;

/**
 * Poster (2:3, ref 2) or landscape (16:9, ref 1) card. Fixed aspect ratio + clamped title keeps every card in a rail
 * the same size (no layout shift). The whole card is one link; the visible title is its accessible name.
 * Hover/focus reveals a play icon and runtime. A muted preview clip plays on hover only for fine pointers, only when
 * the title has one, and never with reduced motion or Save-Data.
 */
export function TitleCard({ title, variant = "poster", badge, priority = false, className = "" }: Props) {
  const isPoster = variant === "poster";
  const src = isPoster ? title.poster : title.backdrop;
  const blur = isPoster ? title.posterBlur : title.backdropBlur;
  const badgeText = badge ?? (title.isNew ? "New" : undefined);
  const runtime = formatRuntime(title.runtimeMinutes);

  const canMotion = useCanAutoplayVideo();
  const finePointer = useFinePointer();
  const canPreview = Boolean(title.preview?.length) && canMotion && finePointer;
  const [showPreview, setShowPreview] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => {
    if (!canPreview || previewFailed) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowPreview(true), PREVIEW_DELAY_MS);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setShowPreview(false);
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
      <div
        className={`relative overflow-hidden rounded-card bg-ink-850 shadow-card ring-1 ring-inset ring-white/5 transition-transform duration-300 ease-cinema group-hover/card:scale-[1.02] group-focus-visible/card:scale-[1.02] ${isPoster ? "aspect-[2/3]" : "aspect-video"}`}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={SIZES[variant]}
          priority={priority}
          placeholder={blur ? "blur" : "empty"}
          blurDataURL={blur}
          className="card-img-in object-cover transition-transform duration-500 ease-cinema group-hover/card:scale-[1.05]"
        />
        {showPreview && title.preview ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
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
              setShowPreview(false);
            }}
          >
            {title.preview.map((s) => (
              <source key={s.url} src={s.url} type={s.type} />
            ))}
          </video>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[image:var(--scrim-card)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-ember-400 text-ink-950 opacity-0 shadow-ember transition-[opacity,transform] duration-300 ease-cinema group-hover/card:scale-100 group-hover/card:opacity-100 group-focus-visible/card:scale-100 group-focus-visible/card:opacity-100"
        >
          <Play className="h-5 w-5" fill="currentColor" />
        </span>
        {runtime && title.type === "movie" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-2 rounded-full bg-ink-950/75 px-2 py-0.5 text-[0.6875rem] font-semibold text-bone-100 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100"
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
