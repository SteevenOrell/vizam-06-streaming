"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  Captions,
  ExternalLink,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Settings,
  TriangleAlert,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SeekBar } from "./seek-bar";
import { PlayerMenu } from "./player-menu";
import { mapKey, type PlayerAction } from "@/lib/player/keyboard";
import { browserCanPlay, defaultDataSaver, orderSources } from "@/lib/player/sources";
import { getResume, readPrefs, saveResume, writePrefs } from "@/lib/player/storage";
import { clamp, formatTime } from "@/lib/player/time";
import type { PlayerVideo } from "@/lib/content/watch";

type Props = {
  video: PlayerVideo;
  /** Accessible name, e.g. "Sintel" or "Superman, S1 E2". */
  label: string;
  poster: string;
  resumeKey: string;
  detailsHref: string;
  /** Where the work was obtained (shown in the error state). */
  sourceUrl: string;
  /** Start straight away. Only used after the visitor clicked something (next episode), never on first load. */
  autoStart?: boolean;
  /** Extra actions in the "ended" overlay (next episode, back to details). */
  endActions?: ReactNode;
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_AFTER_MS = 2800;
const SAVE_EVERY_MS = 5000;

type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function bufferedEnd(v: HTMLVideoElement): number {
  const t = v.currentTime;
  for (let i = 0; i < v.buffered.length; i++) {
    if (t >= v.buffered.start(i) - 0.25 && t <= v.buffered.end(i)) return v.buffered.end(i);
  }
  return 0;
}

const ctl =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full! text-bone-50 transition-colors hover:bg-white/15 motion-reduce:transition-none [&_svg]:h-5 [&_svg]:w-5";

export function Player({ video, label, poster, resumeKey, detailsHref, sourceUrl, autoStart = false, endActions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const flashTimer = useRef<number | undefined>(undefined);
  const lastSave = useRef(0);
  const startedRef = useRef(false);
  const playingRef = useRef(false);
  const menuRef = useRef<string | null>(null);
  /** Applied on the next `loadedmetadata`: restore the position (resume, quality switch, fallback source). */
  const afterLoad = useRef<{ time: number; play: boolean } | null>(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMutedState] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [active, setActive] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [resumeAt, setResumeAt] = useState<number | undefined>(undefined);
  const [dataSaver, setDataSaverState] = useState(false);
  const [cues, setCues] = useState<string[]>([]);
  const [ctlH, setCtlH] = useState(64);
  const [caption, setCaption] = useState(() => Math.max(-1, video.captions.findIndex((c) => c.default)));

  /** Candidates the browser can play, in the order they are tried. */
  const candidates = useMemo(() => {
    if (typeof document === "undefined") return video.src;
    return orderSources(video.src, browserCanPlay(document.createElement("video")), dataSaver);
  }, [video.src, dataSaver]);
  const src = candidates[attempt]?.url;

  // Mount: restore saved volume/mute, data-saver choice and resume position (client-only state).
  useEffect(() => {
    const prefs = readPrefs(window.localStorage);
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    /* eslint-disable react-hooks/set-state-in-effect */
    setVolumeState(prefs.volume);
    setMutedState(prefs.muted);
    setDataSaverState(prefs.dataSaver ?? defaultDataSaver({ saveData: Boolean(conn?.saveData), viewportWidth: window.innerWidth }));
    setResumeAt(getResume(window.localStorage, resumeKey));
    /* eslint-enable react-hooks/set-state-in-effect */
    const v = videoRef.current;
    if (v) {
      v.volume = prefs.volume;
      v.muted = prefs.muted;
    }
  }, [resumeKey]);

  // Persist progress when leaving the page or unmounting.
  useEffect(() => {
    const v = videoRef.current;
    const save = () => {
      if (v && startedRef.current) saveResume(window.localStorage, resumeKey, v.currentTime, v.duration || duration);
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [resumeKey, duration]);

  // A new source (fallback encoding, data saver, retry) resets the element. With preload="none" nothing loads until
  // play() is called again, so restore the position and resume playback here.
  useEffect(() => {
    const v = videoRef.current;
    const pending = afterLoad.current;
    if (!v || !pending || !startedRef.current || !src) return;
    if (pending.time > 0) v.currentTime = pending.time;
    if (pending.play) void v.play().catch(() => setWaiting(false));
  }, [src]);

  // Captions: exactly one text track is "hidden" (loaded and firing cues, but not drawn by the browser) or none.
  // The cues are drawn in our own overlay (below) so they can lift above the control bar on every screen size.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = i === caption ? "hidden" : "disabled";
    const track = caption >= 0 ? v.textTracks[caption] : undefined;
    if (!track) {
      setCues([]);
      return;
    }
    const read = () => setCues(Array.from(track.activeCues ?? []).map((c) => (c as VTTCue).text.replace(/<[^>]+>/g, "").trim()).filter(Boolean));
    read();
    track.addEventListener("cuechange", read);
    return () => track.removeEventListener("cuechange", read);
  }, [caption, video.captions]);

  // Track the control bar height so captions can sit just above it while it is visible.
  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCtlH(el.offsetHeight));
    ro.observe(el);
    setCtlH(el.offsetHeight);
    return () => ro.disconnect();
  }, [started, failed]);

  useEffect(() => {
    const onChange = () => {
      const d = document as FsDocument;
      setFullscreen(Boolean(d.fullscreenElement ?? d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // ---- controls visibility -------------------------------------------------------------------------------------
  const poke = useCallback(() => {
    setActive(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const focused = document.activeElement;
      const keyboardFocus = focused instanceof HTMLElement && containerRef.current?.contains(focused) && focused.matches(":focus-visible");
      if (playingRef.current && !keyboardFocus && !menuRef.current) setActive(false);
    }, HIDE_AFTER_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const say = useCallback((text: string) => {
    setFlash(text);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(""), 900);
  }, []);

  // ---- actions -------------------------------------------------------------------------------------------------
  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      const max = v.duration && Number.isFinite(v.duration) ? v.duration : duration || t;
      const next = clamp(t, 0, max);
      v.currentTime = next;
      setTime(next);
    },
    [duration],
  );

  const start = useCallback(
    (from?: number) => {
      const v = videoRef.current;
      if (!v) return;
      if (!src) {
        setFailed(true);
        return;
      }
      startedRef.current = true;
      setStarted(true);
      setEnded(false);
      setWaiting(true);
      const begin = from ?? video.startSeconds ?? 0;
      if (begin > 0) {
        afterLoad.current = { time: begin, play: false };
        setTime(begin);
      }
      v.play().catch(() => {
        // Autoplay refused or source failed: the error/idle states take over.
        setWaiting(false);
      });
    },
    [src, video.startSeconds],
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!startedRef.current) return start(resumeAt);
    if (v.ended) {
      v.currentTime = 0;
      setEnded(false);
    }
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, [resumeAt, start]);

  useEffect(() => {
    if (autoStart) {
      const id = window.setTimeout(() => start(), 0);
      return () => window.clearTimeout(id);
    }
  }, [autoStart, start]);

  const setVolume = useCallback(
    (value: number) => {
      const v = videoRef.current;
      if (!v) return;
      const next = clamp(value, 0, 1);
      v.volume = next;
      v.muted = next === 0;
      setVolumeState(next);
      setMutedState(next === 0);
      writePrefs(window.localStorage, { volume: next, muted: next === 0 });
      say(`Volume ${Math.round(next * 100)}%`);
    },
    [say],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
    setMutedState(v.muted);
    setVolumeState(v.volume);
    writePrefs(window.localStorage, { volume: v.volume, muted: v.muted });
    say(v.muted ? "Muted" : "Unmuted");
  }, [say]);

  const toggleFullscreen = useCallback(() => {
    const d = document as FsDocument;
    if (d.fullscreenElement ?? d.webkitFullscreenElement) {
      if (d.exitFullscreen) void Promise.resolve(d.exitFullscreen()).catch(() => {});
      else d.webkitExitFullscreen?.();
      return;
    }
    const el = containerRef.current as FsElement | null;
    if (!el) return;
    if (el.requestFullscreen) void Promise.resolve(el.requestFullscreen()).catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else (videoRef.current as IosVideo | null)?.webkitEnterFullscreen?.(); // iPhone: only the video element can go fullscreen
  }, []);

  const toggleCaptions = useCallback(() => {
    if (!video.captions.length) return;
    const next = caption >= 0 ? -1 : 0;
    setCaption(next);
    say(next >= 0 ? `Captions on (${video.captions[0].label})` : "Captions off");
  }, [caption, say, video.captions]);

  const changeRate = useCallback(
    (r: number) => {
      const v = videoRef.current;
      if (v) v.playbackRate = r;
      setRate(r);
      say(`Speed ${r}x`);
    },
    [say],
  );

  /** Switch encoding without losing the position or play state. */
  const switchSource = useCallback((apply: () => void) => {
    const v = videoRef.current;
    if (v && startedRef.current) afterLoad.current = { time: v.currentTime, play: !v.paused };
    apply();
  }, []);

  const toggleDataSaver = useCallback(() => {
    switchSource(() => {
      const next = !dataSaver;
      setDataSaverState(next);
      setAttempt(0);
      writePrefs(window.localStorage, { dataSaver: next });
      say(next ? "Data saver on" : "Data saver off");
    });
  }, [dataSaver, say, switchSource]);

  const retry = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    afterLoad.current = { time: v.currentTime, play: true };
    setFailed(false);
    setWaiting(true);
    if (attempt === 0) {
      v.load();
      void v.play().catch(() => setWaiting(false));
    } else setAttempt(0);
  }, [attempt]);

  const run = useCallback(
    (a: PlayerAction) => {
      const v = videoRef.current;
      if (!v) return;
      const dur = duration || v.duration || 0;
      switch (a.type) {
        case "toggle-play":
          return togglePlay();
        case "seek-by":
          if (!startedRef.current) return;
          seekTo(v.currentTime + a.seconds);
          return say(`${a.seconds > 0 ? "+" : "-"}${Math.abs(a.seconds)} s`);
        case "seek-percent":
          return startedRef.current ? seekTo((dur * a.percent) / 100) : undefined;
        case "seek-start":
          return startedRef.current ? seekTo(0) : undefined;
        case "seek-end":
          return startedRef.current ? seekTo(Math.max(0, dur - 0.5)) : undefined;
        case "volume-by":
          return setVolume((v.muted ? 0 : v.volume) + a.delta);
        case "toggle-mute":
          return toggleMute();
        case "toggle-fullscreen":
          return toggleFullscreen();
        case "toggle-captions":
          return toggleCaptions();
      }
    },
    [duration, say, seekTo, setVolume, toggleCaptions, toggleFullscreen, toggleMute, togglePlay],
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && menu) {
      setMenu(null);
      menuRef.current = null;
      return;
    }
    const target = e.target as HTMLElement;
    const action = mapKey(e);
    poke();
    if (!action) return;
    // Let focused buttons/links activate natively with Space, and the volume slider keep its own arrow keys.
    if (e.key === " " && (target.tagName === "BUTTON" || target.tagName === "A")) return;
    if (target.dataset.nativeKeys !== undefined && (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End")) return;
    if (target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
    e.preventDefault();
    run(action);
  };

  const openMenu = (id: string | null) => {
    setMenu(id);
    menuRef.current = id;
    poke();
  };

  // ---- media events --------------------------------------------------------------------------------------------
  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration)) setDuration(v.duration);
    v.playbackRate = rate;
    const pending = afterLoad.current;
    if (pending) {
      afterLoad.current = null;
      if (pending.time > 0) v.currentTime = pending.time;
      if (pending.play) void v.play().catch(() => {});
    }
  };

  const onError = () => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (attempt < candidates.length - 1) {
      // Try the next encoding at the same position.
      afterLoad.current = { time: v.currentTime || afterLoad.current?.time || 0, play: startedRef.current };
      setAttempt((a) => a + 1);
      return;
    }
    playingRef.current = false;
    setPlaying(false);
    setWaiting(false);
    setFailed(true);
    setActive(true);
  };

  const showControls = started && !failed && !ended && (!playing || active || menu !== null);
  const volumeIcon = muted || volume === 0 ? <VolumeX aria-hidden="true" /> : volume < 0.5 ? <Volume1 aria-hidden="true" /> : <Volume2 aria-hidden="true" />;
  const hasCaptions = video.captions.length > 0;
  const hideCursor = started && playing && !showControls;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={`Video player: ${label}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onPointerMove={poke}
      onFocus={poke}
      data-testid="player"
      data-state={failed ? "error" : ended ? "ended" : playing ? "playing" : started ? "paused" : "idle"}
      className={`relative aspect-video w-full overflow-hidden rounded-player bg-black shadow-lift outline-none! [&:fullscreen]:aspect-auto [&:fullscreen]:rounded-none ${hideCursor ? "cursor-none" : ""}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        playsInline
        controlsList="nodownload"
        aria-label={label}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onClick={(e) => {
          if (!started) return;
          containerRef.current?.focus({ preventScroll: true });
          // On touch, a first tap only reveals the controls.
          if (!showControls && (e.nativeEvent as PointerEvent).pointerType === "touch") return poke();
          togglePlay();
        }}
        onDoubleClick={() => started && toggleFullscreen()}
        onPlay={() => {
          playingRef.current = true;
          setPlaying(true);
          setEnded(false);
          poke();
        }}
        onPause={() => {
          playingRef.current = false;
          setPlaying(false);
          setActive(true);
          const v = videoRef.current;
          if (v && startedRef.current) saveResume(window.localStorage, resumeKey, v.currentTime, v.duration || duration);
        }}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onWaiting={() => setWaiting(true)}
        onEmptied={() => {
          playingRef.current = false;
          setPlaying(false);
        }}
        onSeeking={() => startedRef.current && setWaiting(true)}
        onSeeked={() => setWaiting(false)}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onProgress={(e) => setBuffered(bufferedEnd(e.currentTarget))}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          setBuffered(bufferedEnd(v));
          const now = Date.now();
          if (startedRef.current && now - lastSave.current > SAVE_EVERY_MS) {
            lastSave.current = now;
            saveResume(window.localStorage, resumeKey, v.currentTime, v.duration || duration);
          }
        }}
        onVolumeChange={(e) => {
          setVolumeState(e.currentTarget.volume);
          setMutedState(e.currentTarget.muted);
        }}
        onEnded={() => {
          playingRef.current = false;
          setPlaying(false);
          setEnded(true);
          setActive(true);
          saveResume(window.localStorage, resumeKey, duration, duration);
        }}
        onError={onError}
      >
        {video.captions.map((c) => (
          <track key={c.src} kind={c.kind} src={c.src} srcLang={c.lang} label={c.label} />
        ))}
      </video>

      {cues.length > 0 && !failed ? (
        <div
          aria-hidden="true"
          data-testid="caption-overlay"
          style={{ bottom: showControls || ended ? ctlH + 24 : 16 }}
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-4 text-center transition-[bottom] duration-[var(--dur-base)] ease-[var(--ease-cinema)] motion-reduce:transition-none"
        >
          {cues.map((t) => (
            <p key={t} className="max-w-[min(90%,48rem)] whitespace-pre-line rounded bg-ink-950/80 px-2.5 py-1 text-[clamp(0.8125rem,2.4vw,1.25rem)] font-semibold leading-snug text-bone-50">
              {t}
            </p>
          ))}
        </div>
      ) : null}

      {/* Idle: big play (and resume choice). Nothing plays until the visitor asks. */}
      {!started && !failed ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/60 via-black/10 to-black/30">
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <button
              type="button"
              onClick={() => start(resumeAt)}
              aria-label={resumeAt ? `Resume ${label} from ${formatTime(resumeAt)}` : `Play ${label}`}
              data-testid="big-play"
              className="grid h-20 w-20 place-items-center rounded-full! bg-ember-400 text-ink-950 shadow-ember transition-[transform,background-color] duration-200 ease-swift hover:scale-105 hover:bg-ember-300 motion-reduce:transition-none sm:h-24 sm:w-24 [&_svg]:h-9 [&_svg]:w-9"
            >
              <Play aria-hidden="true" fill="currentColor" />
            </button>
            {resumeAt ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => start(resumeAt)}
                  data-testid="resume"
                  className="min-h-11 rounded-full! bg-ember-400 px-5 text-sm font-bold text-ink-950 hover:bg-ember-300"
                >
                  Resume from {formatTime(resumeAt)}
                </button>
                <button
                  type="button"
                  onClick={() => start(0)}
                  data-testid="start-over"
                  className="min-h-11 rounded-full! bg-white/15 px-5 text-sm font-bold text-bone-50 ring-1 ring-inset ring-white/20 backdrop-blur-md hover:bg-white/25"
                >
                  Start over
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {waiting && started && !failed ? (
        <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center" data-testid="buffering">
          <span className="h-12 w-12 rounded-full border-4 border-white/25 border-t-ember-400 motion-safe:animate-spin" />
          <span className="sr-only">Buffering</span>
        </div>
      ) : null}

      {flash ? (
        <div role="status" className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink-950/80 px-4 py-1.5 text-sm font-semibold text-bone-50 backdrop-blur-md">
          {flash}
        </div>
      ) : null}

      {ended && !failed ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm" data-testid="ended">
          <div className="flex flex-wrap items-center justify-center gap-3 p-4">
            <button
              type="button"
              onClick={() => {
                seekTo(0);
                void videoRef.current?.play().catch(() => {});
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-full! bg-ember-400 px-6 font-bold text-ink-950 hover:bg-ember-300"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" /> Replay
            </button>
            {endActions}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-ink-950/90 p-4 text-center" data-testid="player-error">
          <div className="max-w-md">
            <TriangleAlert className="mx-auto h-9 w-9 text-signal-red" aria-hidden="true" />
            <p className="mt-3 text-lg font-extrabold text-bone-50">This video could not be loaded</p>
            <p className="mt-1 text-sm text-bone-400">
              The open host did not respond, or this browser cannot play any available format. Check your connection and try again.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-11 items-center gap-2 rounded-full! bg-ember-400 px-5 text-sm font-bold text-ink-950 hover:bg-ember-300"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
              </button>
              <Link href={detailsHref} className="inline-flex min-h-11 items-center rounded-full! bg-white/12 px-5 text-sm font-bold text-bone-50 ring-1 ring-inset ring-white/15 hover:bg-white/20">
                Back to details
              </Link>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full! px-4 text-sm font-bold text-ember-300 hover:text-ember-200"
              >
                Open source page <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating control bar (ref 3). Hidden visually while playing, but still focusable: focusing reveals it. */}
      {started && !failed ? (
        <div
          ref={controlsRef}
          className={`absolute inset-x-2 bottom-2 transition-opacity duration-300 motion-reduce:transition-none sm:inset-x-5 sm:bottom-5 ${showControls || ended ? "opacity-100" : "pointer-events-none opacity-0"}`}
          data-testid="controls"
        >
          <div className="flex flex-wrap items-center gap-x-1 rounded-3xl bg-ink-950/75 px-2 py-0.5 shadow-lift ring-1 ring-white/10 backdrop-blur-md sm:flex-nowrap sm:rounded-full sm:px-3 sm:py-0">
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className={ctl} data-testid="play-pause">
              {playing ? <Pause aria-hidden="true" fill="currentColor" /> : <Play aria-hidden="true" fill="currentColor" />}
            </button>
            <span className="min-w-[5.5rem] shrink-0 px-1 text-xs font-semibold tabular-nums text-bone-200 sm:text-sm" data-testid="time">
              {formatTime(time)} / {formatTime(duration)}
            </span>
            <div className="order-first basis-full px-2 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto">
              <SeekBar current={time} duration={duration} buffered={buffered} thumbnailsUrl={video.thumbnails} onSeek={seekTo} />
            </div>
            <div className="ml-auto flex items-center sm:ml-0">
              <button type="button" onClick={toggleMute} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} aria-pressed={muted || volume === 0} className={ctl} data-testid="mute">
                {volumeIcon}
              </button>
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.currentTarget.value))}
                aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
                data-native-keys=""
                data-testid="volume"
                className="mr-1 hidden h-11 w-20 cursor-pointer accent-ember-400 sm:block"
              />
              {hasCaptions ? (
                <PlayerMenu id="cc" label="Captions" icon={<Captions aria-hidden="true" />} open={menu === "cc"} onOpenChange={(o) => openMenu(o ? "cc" : null)} buttonClassName={ctl} pressed={caption >= 0} testId="cc">
                  <MenuItem pressed={caption < 0} onClick={() => setCaption(-1)}>
                    Off
                  </MenuItem>
                  {video.captions.map((c, i) => (
                    <MenuItem key={c.src} pressed={caption === i} onClick={() => setCaption(i)}>
                      {c.label}
                    </MenuItem>
                  ))}
                </PlayerMenu>
              ) : null}
              <PlayerMenu id="settings" label="Settings" icon={<Settings aria-hidden="true" />} open={menu === "settings"} onOpenChange={(o) => openMenu(o ? "settings" : null)} buttonClassName={ctl} testId="settings">
                <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-bone-400">Speed</p>
                {RATES.map((r) => (
                  <MenuItem key={r} pressed={rate === r} onClick={() => changeRate(r)}>
                    {r === 1 ? "Normal" : `${r}x`}
                  </MenuItem>
                ))}
                <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-bone-400">Quality</p>
                <MenuItem pressed={dataSaver} onClick={toggleDataSaver} testId="data-saver">
                  Data saver (smaller file)
                </MenuItem>
              </PlayerMenu>
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} className={ctl} data-testid="fullscreen">
                {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ pressed, onClick, children, testId }: { pressed: boolean; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      data-testid={testId}
      className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-sm! px-3 text-left text-sm font-semibold hover:bg-white/10 ${pressed ? "text-ember-300" : "text-bone-50"}`}
    >
      {children}
      {pressed ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember-400" /> : null}
    </button>
  );
}
