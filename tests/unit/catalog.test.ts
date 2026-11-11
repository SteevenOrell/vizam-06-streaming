import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getNewSlugs, getRecentlyAdded, getByGenre, getHeroTitles, getTitleBySlug, getTitles, getTrending, loadCatalog, related, search } from "@/lib/content/catalog";
import { MediaItemSchema, MediaLibrarySchema } from "@/lib/content/schema";

const sample = JSON.parse(readFileSync(join(process.cwd(), "content/catalog.sample.json"), "utf8"));
const editorial = {
  hero: ["ember-line", "the-quiet-hours", "saltglass", "missing-slug"],
  trending: ["saltglass", "ember-line", "the-quiet-hours"],
  recentlyAdded: ["the-quiet-hours", "missing-slug", "saltglass"],
  newBadgeCount: 2,
  collections: [{ slug: "new", title: "New", titles: ["ember-line", "saltglass", "missing-slug"], layout: "landscape" }],
  genreBlurbs: {},
};
const catalog = loadCatalog({ source: "sample", generatedAt: "2026-11-11T00:00:00Z", items: sample, editorial });

const validItem = sample.items[0];

describe("content schemas", () => {
  it("accepts the sample library in both file shapes", () => {
    expect(MediaLibrarySchema.parse(sample)).toHaveLength(3);
    expect(MediaLibrarySchema.parse(sample.items)).toHaveLength(3);
  });

  it("rejects unsafe or malformed fields", () => {
    const bad = (patch: object) => MediaItemSchema.safeParse({ ...validItem, ...patch }).success;
    expect(bad({ slug: "Bad Slug" })).toBe(false);
    expect(bad({ images: { ...validItem.images, poster: "/media/../secret.webp" } })).toBe(false);
    expect(bad({ images: { ...validItem.images, poster: "https://example.com/p.webp" } })).toBe(false);
    expect(bad({ videos: [{ kind: "trailer", host: "x", src: [{ url: "javascript:alert(1)", type: "video/mp4" }] }] })).toBe(false);
    expect(bad({ videos: [{ kind: "trailer", host: "x", src: [{ url: "https://upload.wikimedia.org/a.webm", type: "text/html" }] }] })).toBe(false);
    expect(bad({ rating: { source: "editorial", score: 11 } })).toBe(false);
    expect(bad({ seasons: [{ number: 1, episodes: [{ number: 1, title: "x" }] }] })).toBe(false); // movie with seasons
  });

  it("accepts a full media-library item with videos, captions and seasons", () => {
    const item = {
      ...validItem,
      type: "series",
      videos: [
        {
          kind: "hero-loop",
          host: "local",
          src: [
            { url: "/media/hero/x.webm", type: "video/webm" },
            { url: "/media/hero/x.mp4", type: "video/mp4" },
          ],
          poster: "/media/hero/x.webp",
          durationSeconds: 14,
        },
      ],
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 1,
              title: "Pilot",
              videos: [
                {
                  kind: "episode",
                  host: "archive.org",
                  src: [{ url: "https://archive.org/download/x/x.mp4", type: "video/mp4" }],
                  captions: [{ src: "/media/captions/x.en.vtt", lang: "en", label: "English" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const parsed = MediaItemSchema.parse(item);
    expect(parsed.seasons?.[0].episodes[0].videos[0].captions[0].kind).toBe("subtitles");
  });
});

describe("catalog loaders", () => {
  it("normalises titles, genres and licences", () => {
    expect(catalog.titles).toHaveLength(3);
    expect(catalog.genres.map((g) => g.slug)).toContain("sci-fi");
    expect(catalog.licences.every((l) => l.id && l.titleSlug)).toBe(true);
    const series = getTitleBySlug("the-quiet-hours", catalog);
    expect(series?.episodeCount).toBe(5);
    expect(series?.credits.directors[0]).toEqual({ name: "Sample Director", slug: "sample-director" });
  });

  it("filters, ranks and relates", () => {
    expect(getTitles({ type: "movie" }, catalog).map((t) => t.slug)).toEqual(["ember-line", "saltglass"]);
    expect(getByGenre("drama", catalog)).toHaveLength(2);
    expect(getTrending(2, catalog).map((t) => t.slug)).toEqual(["saltglass", "ember-line"]);
    expect(getHeroTitles(1, catalog)[0].slug).toBe("ember-line");
    expect(search("QUIET", catalog)[0].slug).toBe("the-quiet-hours");
    expect(search("sample actor one", catalog)[0].slug).toBe("ember-line");
    expect(getRecentlyAdded(3, catalog).map((t) => t.slug)).toEqual(["the-quiet-hours", "saltglass", "ember-line"]);
    expect([...getNewSlugs(catalog)]).toEqual(["the-quiet-hours", "saltglass"]);
    expect(search("", catalog)).toEqual([]);
    expect(related("ember-line", 8, catalog).map((t) => t.slug)).toEqual(["the-quiet-hours"]);
  });

  it("throws a readable error for an invalid catalog file", () => {
    expect(() => loadCatalog({ source: "sample", generatedAt: "x", items: [{ slug: "x" }], editorial: {} })).toThrow(
      /failed validation/,
    );
  });
});
