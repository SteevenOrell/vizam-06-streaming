"use client";

import { useEffect, useState } from "react";
import { clamp, formatTime, seekValueText } from "@/lib/player/time";
import { findThumb, parseThumbnailVtt, type ThumbCue } from "@/lib/player/thumbnails";

type Props = {
  current: number;
  duration: number;
  /** End of the buffered range that contains `current`, in seconds. */
  buffered: number;
  /** Local WebVTT thumbnail track; without it the hover bubble shows the time only. */
  thumbnailsUrl?: string;
  onSeek: (seconds: number) => void;
};

/**
 * Seek bar. A transparent native `<input type="range">` sits on top of the painted track, so pointer, touch, screen
 * readers and keyboard all work natively. The painted track shows progress, buffered range and a hover time bubble
 * (or thumbnail preview, ref 3).
 */
export function SeekBar({ current, duration, buffered, thumbnailsUrl, onSeek }: Props) {
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [cues, setCues] = useState<ThumbCue[]>([]);
  const safeDuration = duration > 0 ? duration : 0;
  const pct = safeDuration ? clamp((current / safeDuration) * 100, 0, 100) : 0;
  const bufPct = safeDuration ? clamp((buffered / safeDuration) * 100, 0, 100) : 0;

  useEffect(() => {
    // Only local VTT files: the CSP allows connect-src 'self' only.
    if (!thumbnailsUrl || !thumbnailsUrl.startsWith("/")) return;
    const ctrl = new AbortController();
    fetch(thumbnailsUrl, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => setCues(parseThumbnailVtt(text, new URL(thumbnailsUrl, window.location.href).href)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [thumbnailsUrl]);

  const thumb = hover ? findThumb(cues, hover.t) : undefined;

  return (
    <div
      className="group/seek relative flex h-11 w-full items-center has-[:focus-visible]:[&_.seek-thumb]:ring-2 has-[:focus-visible]:[&_.seek-thumb]:ring-ember-300"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = clamp(e.clientX - r.left, 0, r.width);
        setHover({ x, t: r.width ? (x / r.width) * safeDuration : 0 });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <div aria-hidden="true" className="relative h-1 w-full rounded-full bg-white/20 transition-[height] duration-150 group-hover/seek:h-1.5 motion-reduce:transition-none">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${bufPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-ember-400" style={{ width: `${pct}%` }} />
        <div
          className="seek-thumb absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-50 shadow-card"
          style={{ left: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={safeDuration || 1}
        step={0.1}
        value={clamp(current, 0, safeDuration || 1)}
        aria-valuetext={seekValueText(current, safeDuration)}
        onChange={(e) => onSeek(Number(e.currentTarget.value))}
        data-testid="seek"
        className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
      />
      {hover && safeDuration ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full mb-2 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{ left: `${hover.x}px` }}
        >
          {thumb ? (
            <div
              className="rounded-sm border-2 border-bone-50 bg-ink-900 shadow-lift"
              style={{
                width: thumb.w,
                height: thumb.h,
                backgroundImage: `url(${thumb.url})`,
                backgroundPosition: `-${thumb.x}px -${thumb.y}px`,
              }}
            />
          ) : null}
          <span className="rounded-sm bg-ink-950/90 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-bone-50">{formatTime(hover.t)}</span>
        </div>
      ) : null}
    </div>
  );
}
