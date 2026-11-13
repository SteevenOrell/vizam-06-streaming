/**
 * AFTERLIGHT content schemas (Zod 4).
 *
 * Two layers:
 * 1. Input: `MediaLibrarySchema` validates `content/media-library.json` (written by the media pipeline) and
 *    `content/catalog.sample.json` (placeholder data). `scripts/build-catalog.ts` validates the chosen source with
 *    these schemas and writes `content/catalog.json`.
 * 2. App: `CatalogFileSchema` re-validates `content/catalog.json` when the loaders first read it, so a bad file
 *    fails `next build` instead of rendering broken pages.
 *
 * Keep this file free of path-alias imports: the build script imports it directly with Node type stripping.
 */
import { z } from "zod";

// No JIT: Zod probes `new Function` once, which our CSP (no unsafe-eval) reports as a violation.
z.config({ jitless: true });

// ---------------------------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------------------------

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase kebab-case slug");

/** Local public path ("/media/...") or an https URL. No traversal, no other schemes. */
export const AssetUrlSchema = z
  .string()
  .min(2)
  .refine((v) => (v.startsWith("/") ? !v.includes("..") && !v.startsWith("//") : /^https:\/\/[^\s]+$/.test(v)), {
    message: "must be a local /path or an https:// URL",
  });

/** Local image in /public (WebP preferred; SVG allowed for placeholders). */
export const LocalImageSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9_\-/.]+\.(webp|avif|svg|jpg|jpeg|png)$/, "must be a local image path like /media/posters/x.webp")
  .refine((v) => !v.includes(".."), { message: "path traversal is not allowed" });

export const BlurDataUriSchema = z
  .string()
  .regex(/^data:image\/(webp|png|jpeg|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/, "must be a base64 image data URI")
  .max(4096, "blur placeholders must stay under 4 KB");

export const WebUrlSchema = z.url({ protocol: /^https?$/ });

// ---------------------------------------------------------------------------------------------------------------
// Licence, rating, credits
// ---------------------------------------------------------------------------------------------------------------

export const LicenceSchema = z.object({
  /** Optional stable id; defaults to the title slug when normalised. */
  id: SlugSchema.optional(),
  /** e.g. "CC BY 4.0", "Public domain" */
  name: z.string().min(1),
  /** Licence deed URL */
  url: WebUrlSchema,
  /** Exact attribution text to display */
  attribution: z.string().min(1),
  /** Where the work was obtained */
  sourceUrl: WebUrlSchema,
  author: z.string().min(1),
  /** Any modifications made (trimmed, transcoded, cropped...) */
  modifications: z.string().optional(),
});

export const RatingSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("editorial"),
    /** AFTERLIGHT editorial score, 0-10. Never a fabricated audience or critic score. */
    score: z.number().min(0).max(10),
    label: z.string().optional(),
  }),
  z.object({ source: z.literal("none") }),
]);

/** A credit can be a plain name or `{ name, role }` (role = character for cast, job for crew). */
export const CreditInputSchema = z.union([
  z.string().min(1),
  z.object({ name: z.string().min(1), role: z.string().min(1).optional() }),
]);

export const CreditsInputSchema = z.object({
  directors: z.array(CreditInputSchema).default([]),
  cast: z.array(CreditInputSchema).default([]),
  writers: z.array(CreditInputSchema).default([]),
});

// ---------------------------------------------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------------------------------------------

export const VIDEO_KINDS = ["hero-loop", "trailer", "feature", "short", "preview", "episode"] as const;
export const VideoKindSchema = z.enum(VIDEO_KINDS);

export const VideoFileSchema = z.object({
  url: AssetUrlSchema,
  /** MIME type, optionally with codecs: "video/mp4", "video/webm; codecs=vp9", "application/x-mpegURL" */
  type: z
    .string()
    .regex(
      /^(video\/(mp4|webm|ogg)|application\/(x-mpegURL|vnd\.apple\.mpegurl))(\s*;.*)?$/i,
      "must be a video MIME type (mp4, webm, ogg or HLS)",
    ),
});

export const CaptionTrackSchema = z.object({
  /** WebVTT file */
  src: AssetUrlSchema,
  /** BCP 47 language tag, e.g. "en" */
  lang: z.string().min(2).max(16),
  label: z.string().min(1),
  kind: z.enum(["subtitles", "captions"]).default("subtitles"),
  default: z.boolean().optional(),
});

export const VideoSourceSchema = z.object({
  id: z.string().min(1).optional(),
  kind: VideoKindSchema,
  label: z.string().optional(),
  /** One or more encodings, best first (e.g. WebM then MP4). */
  src: z.array(VideoFileSchema).min(1),
  poster: AssetUrlSchema.optional(),
  durationSeconds: z.number().positive().optional(),
  captions: z.array(CaptionTrackSchema).default([]),
  /** "local" for /public/media, or the open host: "wikimedia", "archive.org", "blender", ... */
  host: z.string().min(1),
  /** Points at a licence id when this video's licence differs from the title's licence. */
  licenceId: SlugSchema.optional(),
  /** Optional WebVTT thumbnail track for the scrub preview (sprite + #xywh). */
  thumbnails: AssetUrlSchema.optional(),
  /** Optional start offset for clips cut from a longer work. */
  startSeconds: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------------------------------------------
// Seasons and episodes
// ---------------------------------------------------------------------------------------------------------------

export const EpisodeSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1),
  synopsis: z.string().optional(),
  runtimeMinutes: z.number().int().positive().optional(),
  still: LocalImageSchema.optional(),
  videos: z.array(VideoSourceSchema).default([]),
});

export const SeasonSchema = z.object({
  number: z.number().int().min(0),
  title: z.string().optional(),
  year: z.number().int().min(1880).max(2100).optional(),
  synopsis: z.string().optional(),
  episodes: z.array(EpisodeSchema).min(1),
});

// ---------------------------------------------------------------------------------------------------------------
// Media item (one title) and the media library file
// ---------------------------------------------------------------------------------------------------------------

export const ImagesSchema = z.object({
  /** 2:3 poster, e.g. /media/posters/<slug>.webp */
  poster: LocalImageSchema,
  /** 16:9 backdrop, e.g. /media/backdrops/<slug>.webp */
  backdrop: LocalImageSchema,
  posterBlur: BlurDataUriSchema.optional(),
  backdropBlur: BlurDataUriSchema.optional(),
  /** Extra 16:9 stills, e.g. /media/stills/<slug>-1.webp */
  stills: z.array(LocalImageSchema).optional(),
});

export const MediaItemSchema = z
  .object({
    id: z.string().min(1),
    slug: SlugSchema,
    type: z.enum(["movie", "series"]),
    title: z.string().min(1),
    originalTitle: z.string().optional(),
    year: z.number().int().min(1880).max(2100),
    runtimeMinutes: z.number().int().positive().optional(),
    /** Display names, e.g. ["Animation", "Sci-Fi"]; slugs are derived. */
    genres: z.array(z.string().min(1)).min(1),
    synopsis: z.string().min(1),
    tagline: z.string().optional(),
    rating: RatingSchema.default({ source: "none" }),
    /** Optional content advisory, e.g. "All ages", "Mild peril". Not an official certification. */
    advisory: z.string().optional(),
    language: z.string().optional(),
    country: z.string().optional(),
    credits: CreditsInputSchema.default({ directors: [], cast: [], writers: [] }),
    licence: LicenceSchema,
    images: ImagesSchema,
    videos: z.array(VideoSourceSchema).default([]),
    seasons: z.array(SeasonSchema).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.type === "movie" && item.seasons?.length) {
      ctx.addIssue({ code: "custom", path: ["seasons"], message: "movies cannot have seasons" });
    }
    if (item.videos.filter((v) => v.kind === "hero-loop").length > 1) {
      ctx.addIssue({ code: "custom", path: ["videos"], message: "at most one hero-loop per title" });
    }
  });

/** `content/media-library.json`: either `{ "version": 1, "items": [...] }` or a bare array of items. */
export const MediaLibrarySchema = z
  .union([
    z.object({ version: z.literal(1).optional(), items: z.array(MediaItemSchema) }),
    z.array(MediaItemSchema),
  ])
  .transform((v) => (Array.isArray(v) ? v : v.items))
  .superRefine((items, ctx) => {
    const seenSlugs = new Set<string>();
    const seenIds = new Set<string>();
    items.forEach((item, i) => {
      if (seenSlugs.has(item.slug)) ctx.addIssue({ code: "custom", path: [i, "slug"], message: `duplicate slug ${item.slug}` });
      if (seenIds.has(item.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate id ${item.id}` });
      seenSlugs.add(item.slug);
      seenIds.add(item.id);
    });
  });

// ---------------------------------------------------------------------------------------------------------------
// Editorial (owned by the web build, not the media pipeline)
// ---------------------------------------------------------------------------------------------------------------

export const CollectionSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1),
  eyebrow: z.string().optional(),
  description: z.string().optional(),
  /** Title slugs in display order; unknown slugs are dropped by the loader. */
  titles: z.array(SlugSchema),
  /** "runtime" renders a shortest-first list with runtime bars instead of a rail. */
  layout: z.enum(["poster", "landscape", "runtime"]).default("poster"),
});

export const EditorialSchema = z.object({
  /** Hero rotation on Home, in order. */
  hero: z.array(SlugSchema).default([]),
  /** Editorial "trending" order (AFTERLIGHT has no audience data; this is curated, and labelled as such). */
  trending: z.array(SlugSchema).default([]),
  /**
   * Editorial order in which titles joined the catalogue, newest first. AFTERLIGHT has no real release dates for its
   * own additions, so this is an ordering, not a timestamp. Titles not listed follow, in catalogue order.
   */
  recentlyAdded: z.array(SlugSchema).default([]),
  /** How many of the first `recentlyAdded` titles carry the "New" badge. */
  newBadgeCount: z.number().int().min(0).max(24).default(4),
  collections: z.array(CollectionSchema).default([]),
  genreBlurbs: z.record(z.string(), z.string()).default({}),
  /** Optional tile image per genre slug (overrides the representative title backdrop, e.g. when it is too dark). */
  genreImages: z.record(z.string(), z.object({ src: LocalImageSchema, blur: BlurDataUriSchema.optional() })).default({}),
});

// ---------------------------------------------------------------------------------------------------------------
// Generated catalog file
// ---------------------------------------------------------------------------------------------------------------

export const CatalogFileSchema = z.object({
  source: z.enum(["media-library", "sample"]),
  generatedAt: z.string(),
  items: MediaLibrarySchema,
  editorial: EditorialSchema,
});

// ---------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------

export type Licence = z.infer<typeof LicenceSchema>;
export type Rating = z.infer<typeof RatingSchema>;
export type VideoKind = z.infer<typeof VideoKindSchema>;
export type VideoFile = z.infer<typeof VideoFileSchema>;
export type CaptionTrack = z.infer<typeof CaptionTrackSchema>;
export type VideoSource = z.infer<typeof VideoSourceSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type MediaItem = z.infer<typeof MediaItemSchema>;
export type MediaItemInput = z.input<typeof MediaItemSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type Editorial = z.infer<typeof EditorialSchema>;
export type CatalogFile = z.infer<typeof CatalogFileSchema>;
