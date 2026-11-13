import { describe, expect, it } from "vitest";
import { mapKey } from "@/lib/player/keyboard";
import { defaultDataSaver, orderSources } from "@/lib/player/sources";
import {
  getResume,
  parseResume,
  readPrefs,
  resumeKeyFor,
  saveResume,
  writePrefs,
  RESUME_KEY,
  PLAYER_PREFS_KEY,
} from "@/lib/player/storage";
import { findThumb, parseThumbnailVtt } from "@/lib/player/thumbnails";
import { clamp, formatTime, seekValueText } from "@/lib/player/time";
import { resolveWatch, type PlayerVideo, type WatchData } from "@/lib/content/watch";
import { isoDuration, serializeJsonLd } from "@/lib/seo/jsonld";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("time formatting", () => {
  it("formats minutes and hours", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(83.9)).toBe("1:23");
    expect(formatTime(888)).toBe("14:48");
    expect(formatTime(3723)).toBe("1:02:03");
  });
  it("is safe for invalid input", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
  it("builds aria-valuetext", () => {
    expect(seekValueText(83, 888)).toBe("1:23 of 14:48");
  });
  it("clamps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});

describe("keyboard map", () => {
  it("maps play/pause", () => {
    expect(mapKey({ key: " " })).toEqual({ type: "toggle-play" });
    expect(mapKey({ key: "k" })).toEqual({ type: "toggle-play" });
    expect(mapKey({ key: "K" })).toEqual({ type: "toggle-play" });
  });
  it("maps seeking: arrows 5 s, J/L 10 s", () => {
    expect(mapKey({ key: "ArrowLeft" })).toEqual({ type: "seek-by", seconds: -5 });
    expect(mapKey({ key: "ArrowRight" })).toEqual({ type: "seek-by", seconds: 5 });
    expect(mapKey({ key: "j" })).toEqual({ type: "seek-by", seconds: -10 });
    expect(mapKey({ key: "l" })).toEqual({ type: "seek-by", seconds: 10 });
  });
  it("maps volume, mute, fullscreen, captions", () => {
    expect(mapKey({ key: "ArrowUp" })).toEqual({ type: "volume-by", delta: 0.05 });
    expect(mapKey({ key: "ArrowDown" })).toEqual({ type: "volume-by", delta: -0.05 });
    expect(mapKey({ key: "m" })).toEqual({ type: "toggle-mute" });
    expect(mapKey({ key: "f" })).toEqual({ type: "toggle-fullscreen" });
    expect(mapKey({ key: "c" })).toEqual({ type: "toggle-captions" });
  });
  it("maps Home/End and digits to percentages", () => {
    expect(mapKey({ key: "Home" })).toEqual({ type: "seek-start" });
    expect(mapKey({ key: "End" })).toEqual({ type: "seek-end" });
    expect(mapKey({ key: "0" })).toEqual({ type: "seek-percent", percent: 0 });
    expect(mapKey({ key: "7" })).toEqual({ type: "seek-percent", percent: 70 });
  });
  it("ignores unknown keys and modifier combinations", () => {
    expect(mapKey({ key: "x" })).toBeNull();
    expect(mapKey({ key: "Enter" })).toBeNull();
    expect(mapKey({ key: "f", ctrlKey: true })).toBeNull();
    expect(mapKey({ key: "l", metaKey: true })).toBeNull();
    expect(mapKey({ key: "ArrowLeft", altKey: true })).toBeNull();
  });
});

describe("source selection", () => {
  const list = [
    { url: "a-1080.webm", type: 'video/webm; codecs="vp9, opus"' },
    { url: "a-480.webm", type: 'video/webm; codecs="vp9, opus"' },
    { url: "a.mp4", type: "video/mp4" },
  ];
  it("keeps authored order and drops unplayable types", () => {
    const urls = orderSources(list, (t) => t.includes("webm"), false).map((s) => s.url);
    expect(urls).toEqual(["a-1080.webm", "a-480.webm"]);
  });
  it("data saver puts the smallest playable source first, keeping the rest as fallbacks", () => {
    const urls = orderSources(list, (t) => t.includes("webm"), true).map((s) => s.url);
    expect(urls).toEqual(["a-480.webm", "a-1080.webm"]);
  });
  it("returns an empty list when nothing is playable", () => {
    expect(orderSources(list, () => false, false)).toEqual([]);
  });
  it("single source is unchanged by data saver", () => {
    expect(orderSources([list[0]], () => true, true)).toEqual([list[0]]);
  });
  it("default data saver: Save-Data or narrow viewport", () => {
    expect(defaultDataSaver({ saveData: true, viewportWidth: 1440 })).toBe(true);
    expect(defaultDataSaver({ saveData: false, viewportWidth: 390 })).toBe(true);
    expect(defaultDataSaver({ saveData: false, viewportWidth: 1440 })).toBe(false);
  });
});

describe("resume store", () => {
  it("keys episodes separately", () => {
    expect(resumeKeyFor("show")).toBe("show");
    expect(resumeKeyFor("show", 1, 2)).toBe("show:s1e2");
  });
  it("saves and reads a position", () => {
    const s = memoryStorage();
    saveResume(s, "sintel", 192, 888);
    expect(getResume(s, "sintel")).toBe(192);
  });
  it("ignores the first seconds and clears near the end", () => {
    const s = memoryStorage();
    saveResume(s, "x", 3, 600);
    expect(getResume(s, "x")).toBeUndefined();
    saveResume(s, "x", 200, 600);
    expect(getResume(s, "x")).toBe(200);
    saveResume(s, "x", 595, 600);
    expect(getResume(s, "x")).toBeUndefined();
  });
  it("survives corrupt storage", () => {
    expect(parseResume("{not json")).toEqual({});
    expect(parseResume(JSON.stringify({ a: { t: "x" } }))).toEqual({});
    const s = memoryStorage({ [RESUME_KEY]: "garbage" });
    expect(getResume(s, "a")).toBeUndefined();
    saveResume(s, "a", 50, 500);
    expect(getResume(s, "a")).toBe(50);
  });
  it("caps the number of stored titles, keeping the newest", () => {
    const s = memoryStorage();
    for (let i = 0; i < 70; i++) saveResume(s, `t${i}`, 100, 1000, i);
    const keys = Object.keys(parseResume(s.getItem(RESUME_KEY)));
    expect(keys.length).toBe(60);
    expect(keys).toContain("t69");
    expect(keys).not.toContain("t0");
  });
});

describe("player preferences", () => {
  it("defaults, then persists volume and mute", () => {
    const s = memoryStorage();
    expect(readPrefs(s)).toEqual({ volume: 1, muted: false });
    writePrefs(s, { volume: 0.4 });
    writePrefs(s, { muted: true });
    expect(readPrefs(s)).toEqual({ volume: 0.4, muted: true });
  });
  it("rejects out-of-range or corrupt values", () => {
    expect(readPrefs(memoryStorage({ [PLAYER_PREFS_KEY]: JSON.stringify({ volume: 4 }) }))).toEqual({ volume: 1, muted: false });
    expect(readPrefs(memoryStorage({ [PLAYER_PREFS_KEY]: "nope" }))).toEqual({ volume: 1, muted: false });
  });
});

describe("thumbnail VTT", () => {
  const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite.jpg#xywh=160,0,160,90

bad cue
no timing
`;
  const cues = parseThumbnailVtt(vtt, "https://example.test/media/thumbs/a.vtt");
  it("parses cues and resolves the sprite path", () => {
    expect(cues).toHaveLength(2);
    expect(cues[1]).toMatchObject({ start: 5, end: 10, url: "/media/thumbs/sprite.jpg", x: 160, y: 0, w: 160, h: 90 });
  });
  it("finds the cue for a time, clamping past the end", () => {
    expect(findThumb(cues, 2)?.x).toBe(0);
    expect(findThumb(cues, 7)?.x).toBe(160);
    expect(findThumb(cues, 99)?.x).toBe(160);
    expect(findThumb([], 1)).toBeUndefined();
  });
});

describe("watch resolution", () => {
  const vid = (u: string): PlayerVideo => ({ src: [{ url: u, type: "video/webm" }], captions: [], host: "local" });
  const series: WatchData = {
    slug: "show",
    type: "series",
    title: "Show",
    year: 1950,
    backdrop: "/b.webp",
    detailsHref: "/tv/show",
    sourceUrl: "https://example.test",
    seasons: [
      {
        number: 1,
        episodes: [
          { season: 1, number: 1, title: "One", video: vid("1") },
          { season: 1, number: 2, title: "Two" },
          { season: 1, number: 3, title: "Three", video: vid("3") },
        ],
      },
    ],
  };
  it("defaults to the first playable episode and finds the next playable one", () => {
    const r = resolveWatch(series, {});
    expect(r.kind === "episode" && r.episode.number).toBe(1);
    expect(r.kind === "episode" && r.next?.number).toBe(3);
  });
  it("selects ?s&e and builds a per-episode resume key", () => {
    const r = resolveWatch(series, { s: "1", e: "3" });
    expect(r).toMatchObject({ kind: "episode", resumeKey: "show:s1e3" });
    expect(r.kind === "episode" && r.next).toBeUndefined();
  });
  it("unknown or malformed episodes are reported as missing", () => {
    expect(resolveWatch(series, { s: "9", e: "9" }).kind).toBe("missing");
    expect(resolveWatch(series, { s: "1", e: "x" }).kind).toBe("episode"); // malformed falls back to the default
  });
  it("movies and trailers", () => {
    const movie: WatchData = { ...series, type: "movie", seasons: [], video: vid("m"), trailer: vid("t") };
    expect(resolveWatch(movie, {})).toMatchObject({ kind: "movie", resumeKey: "show" });
    expect(resolveWatch(movie, { v: "trailer" })).toMatchObject({ kind: "trailer", resumeKey: "show:trailer" });
    expect(resolveWatch({ ...movie, trailer: undefined }, { v: "trailer" }).kind).toBe("missing");
  });
});

describe("JSON-LD", () => {
  it("escapes characters that could close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script> & <b>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script> & <b>");
  });
  it("formats ISO durations", () => {
    expect(isoDuration(15)).toBe("PT15M");
    expect(isoDuration(96)).toBe("PT1H36M");
    expect(isoDuration(120)).toBe("PT2H");
    expect(isoDuration(undefined)).toBeUndefined();
  });
});
