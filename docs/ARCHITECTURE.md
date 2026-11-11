# AFTERLIGHT: architecture

_Phase 0, 2026-11-11._ Fictional streaming and film-discovery site (VIZAM concept project). No backend, no auth.

## Stack

Next.js 16.4 (App Router, Turbopack, React 19.3), TypeScript 5, Tailwind CSS 4 (tokens in `app/globals.css` `@theme`),
Motion 14 (`motion/react`), Lucide React, Zod 4. Tests: Vitest 5 (unit), Playwright 1.65 + `@axe-core/playwright` (e2e).
Media tooling (media pipeline only): `sharp`, `ffmpeg-static`. Node >= 22.18 (developed on Node 24): the catalog script
uses Node's built-in TypeScript type stripping. `package.json` has `"type": "module"`.

Ports: dev 3060, production/e2e 3061 (3000/3001 are reserved).

## Routes (11 pages)

| Route | Page | Rendering | Notes |
|---|---|---|---|
| `/` | Home | static | Hero (editorial picks), rails |
| `/movies` | Movies | static | Grid / rails of `type: movie` |
| `/tv` | TV Shows | static | `type: series` |
| `/genres` | Genres | static | One rail per genre, anchors `#<genre-slug>` |
| `/trending` | Trending | static | Editorial order, labelled "curated" (no audience data) |
| `/movies/[slug]` | Movie details | SSG (`generateStaticParams`, `dynamicParams = false`) | |
| `/tv/[slug]` | TV show details | SSG | Seasons/episodes in Phase 3 |
| `/watch/[slug]` | Watch (player) | SSG, `noindex` | Episodes: Phase 3 decides `?ep=s1e2` (client) vs `/watch/[slug]/[episode]` (SSG) |
| `/search` | Search | static shell + client filter | `?q=` synced; small serialisable index only |
| `/my-list` | My List | static shell + client | localStorage key `afterlight:my-list` (array of slugs) |
| `/about` | About | static | Concept notice; `#licences` lists every licence |

Plus `not-found.tsx` (404) and `error.tsx` (no error details shown to visitors).

## Folder layout

```
app/                 routes, layout, providers (MotionConfig), globals.css (tokens + 250 px lock)
components/brand     wordmark + mark (SVG)
components/layout    header (mobile menu), footer, skip link, page intro
components/ui        Button/ButtonLink, Badge, Rail, TitleCard, TitleGrid, SectionHeader
components/title     details layout (Phase 3 grows this)
components/search    client search
lib/content          schema.ts (Zod), normalise.ts, types.ts, catalog.ts (loaders), routes.ts (URL helpers)
lib/hooks            usePrefersReducedMotion, useSaveData, useCanAutoplayVideo
lib/tmdb.ts          server-only TMDB client stub
lib/site.ts          name, nav
content/             media-library.json (media pipeline), catalog.sample.json, editorial.json, catalog.json (generated)
scripts/build-catalog.ts  validates and builds content/catalog.json
scripts/media/       media pipeline scripts (owned by the media agent)
public/media/        posters, backdrops, stills, hero loops (WebP/MP4/WebM only)
public/placeholders/ original SVG placeholders for the sample catalog
tests/unit, tests/e2e
```

## Content pipeline and data flow

```
media pipeline ──> content/media-library.json ─┐
                   content/catalog.sample.json ─┼─ scripts/build-catalog.ts (Zod) ─> content/catalog.json (git-ignored)
                   content/editorial.json ──────┘                                          │
                                                       lib/content/catalog.ts (Zod again, normalise, memoise)
                                                                                           │
                                     Server Components / generateStaticParams / generateMetadata ─> static HTML
```

- `npm run catalog` runs automatically before `dev`, `build`, `typecheck` and `test`.
- Source selection: `media-library.json` when it exists and has items; otherwise the sample. `CATALOG_SOURCE=sample`
  forces the sample. An **invalid** media library fails with a list of Zod issues (never a silent fallback).
- `editorial.json` (owned by the web build) holds hero picks, curated trending order, collections and genre blurbs.
  Unknown slugs are dropped, so it can reference titles before they land.
- Normalisation: genre names to `{slug, name}`, credits to `{name, slug, role?}`, licence gets `id`/`titleSlug`,
  plus `heroLoop`, `trailer`, `playable` and `episodeCount` shortcuts.
- Loaders: `getTitles({type})`, `getTitleBySlug`, `getGenres`, `getGenre`, `getByGenre`, `getTrending`,
  `getHeroTitles`, `getCollections`, `search` (accent-insensitive, ranked), `related` (shared genres), `getLicences`.
- The full catalog is never shipped to the browser: client components (search, my list) receive small serialisable
  props, and `routes.ts` is import-safe for client code.

### media-library.json contract

`{ "version": 1, "items": [MediaItem] }` or a bare `[MediaItem]`. See `lib/content/schema.ts` (`MediaItemSchema`) for
the authoritative definition; summary in `docs/AGENT_HANDOFF.md`. Images must be local WebP paths under `/media/`;
video `src` entries are local `/media/...` paths (hero loops) or `https://` URLs on an allowed open host.

## Player plan (Phase 3)

- Custom HTML5 `<video>` player (client component) with `<source>` per encoding (WebM first, then MP4) and `<track>`
  per caption (WebVTT).
- Controls (ref 3): floating pill bar, play/pause, ember seek bar (`input type="range"` for keyboard + screen readers,
  `aria-valuetext` "12:04 of 25:10"), buffered range, thumbnail preview while scrubbing (WebVTT thumbnail track when
  `thumbnails` is provided, else a time bubble), volume/mute, captions menu, playback speed, fullscreen, PiP where
  supported. Keyboard: Space/K, J/L ±10 s, arrows ±5 s, M, F, C. Controls auto-hide only while playing and never while
  focused.
- Details panel under the player: poster, title + year, synopsis, genre pills, Starring/Director, licence + source link.
- States: loading/buffering spinner, error (source failed: try next source, then show "Open on <host>" link), ended
  (next episode / related).
- Hosting: hero loops (10-20 s, muted, MP4 + WebM + WebP poster, < ~4 MB) live in `public/media/hero/`. Trailers and
  full shorts stream from official open hosts. CSP `media-src` allows: `upload.wikimedia.org`, `commons.wikimedia.org`,
  `archive.org`, `*.archive.org`, `download.blender.org`, `video.blender.org` (`next.config.ts`, keep in sync).
- Hero video gating: `useCanAutoplayVideo()` is false for reduced motion or Save-Data (and before hydration), so the
  WebP poster shows instead.

## TMDB plan (Phase 4, optional)

- `lib/tmdb.ts` is `server-only`, reads `TMDB_API_KEY` (v3 key or v4 token; never `NEXT_PUBLIC_`), validates every
  response with Zod, uses `fetch` revalidation (24 h, tag `tmdb`) and a 5 s timeout, and returns `null` on any failure.
  With no key, no request is made.
- Use: **metadata only** (e.g. a clearly labelled "Elsewhere this week, via TMDB" text list, or enrichment of matched
  public-domain titles). TMDB posters and backdrops are commercial artwork and are **not** rendered, so no remote image
  hosts are configured.
- When TMDB data is shown, the footer shows "This product uses the TMDB API but is not endorsed or certified by TMDB."
  (`tmdbAttributionEnabled()`), plus the TMDB logo per their terms if Phase 4 adds the feed.
- Pages that use TMDB become ISR; the rest of the site stays fully static and works without the key.

## Security notes

- No secrets in the client; only `TMDB_API_KEY` (server). `.env*` is git-ignored except `.env.example`.
- Security headers on every route (`next.config.ts`): CSP (`default-src 'self'`, `frame-ancestors 'none'`,
  `object-src 'none'`, `media-src` restricted to the open hosts), HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY`, `Permissions-Policy`. `script-src` needs `'unsafe-inline'` for Next's inline bootstrap
  (no nonce setup since the site is static); `'unsafe-eval'` only in dev.
- Content is validated twice (build script and loader). Asset paths reject traversal and non-https schemes, so
  `javascript:` or `data:` URLs cannot reach `src`/`href`. Blur data URIs are limited to base64 images under 4 KB.
- External licence/source links open with `rel="noopener noreferrer"`.
- No user input reaches a server: search is client-side over static data; My List is localStorage only (validate the
  stored array against known slugs when reading).
- Licensing is a hard rule (project `CLAUDE.md`): every title, image and video needs a licence entry; design references
  are git-ignored and never published.
- `npm audit`: 0 vulnerabilities, with a scoped override (`@typescript-eslint/typescript-estree` -> `minimatch ^11.0.1`)
  for a dev-only lint advisory (GHSA-g3hv-75wg-m249). Remove the override once `typescript-eslint` ships a fixed range.

## Layout rules

- `<div id="root">` wraps the app. Below 250 px: `#root` and every element with `.fixed-lock` get `width: 500px`
  (fixed ones also `right: auto`), `html { overflow-x: auto }`. Every `position: fixed` element must carry `.fixed-lock`.
- `#root { overflow-x: clip }` so full-bleed rails never cause page-level horizontal scroll (sticky still works).
- The header is sticky; full-bleed heroes use `-mt-[var(--header-h)]` to sit under it. Header blur sits on a child
  layer because `backdrop-filter` on the header would trap the fixed mobile menu.
