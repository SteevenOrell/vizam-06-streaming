import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEDIA_HOSTS } from "../../next.config";
import { getResume, RESUME_KEY } from "@/lib/player/storage";

const library = JSON.parse(readFileSync(join(process.cwd(), "content/media-library.json"), "utf8"));
const items: unknown[] = Array.isArray(library) ? library : library.items;

/** Every URL a <video>/<track> element may load: video sources, video posters, captions, thumbnail tracks. */
function mediaUrls(node: unknown, inVideo = false, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => mediaUrls(n, inVideo, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const nowVideo = inVideo || k === "videos";
      if (nowVideo && typeof v === "string" && /^https?:\/\//.test(v) && ["url", "src", "thumbnails"].includes(k)) out.push(v);
      else mediaUrls(v, nowVideo, out);
    }
  }
  return out;
}

describe("CSP media-src", () => {
  it("covers every remote video and caption URL in the catalog, and nothing is http", () => {
    const urls = mediaUrls(items);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.startsWith("https://"), u).toBe(true);
      expect(MEDIA_HOSTS.includes(new URL(u).origin), u).toBe(true);
    }
  });

  it("lists only hosts the catalog uses", () => {
    const origins = new Set(mediaUrls(items).map((u) => new URL(u).origin));
    for (const h of MEDIA_HOSTS) expect(origins.has(h), h).toBe(true);
  });
});

describe("storage tampering", () => {
  it("ignores prototype keys and throwing storage", () => {
    const proto = { getItem: () => JSON.stringify({ x: { t: 30, d: 100, at: 1 } }), setItem: () => {} };
    expect(getResume(proto, "__proto__")).toBeUndefined();
    expect(getResume(proto, "toString")).toBeUndefined();
    const throwing = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => {} };
    expect(getResume(throwing, "x")).toBeUndefined();
    const tampered = { getItem: (k: string) => (k === RESUME_KEY ? '{"x":{"t":"<img onerror>","d":-1}}' : null), setItem: () => {} };
    expect(getResume(tampered, "x")).toBeUndefined();
  });
});
