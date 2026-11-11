# Agent handoff: AFTERLIGHT (vizam-06-streaming)

_Last updated: 2026-11-11 by the Phase 3 agent_

## Objective
Build AFTERLIGHT, a fictional premium streaming and film-discovery site (VIZAM portfolio concept) around Creative
Commons and public-domain films. 11 pages, no backend, no auth, optional TMDB metadata.

## Repository
- Path: `C:\Users\SteevenWemin\Documents\Projects\vizam-06-streaming`   Remote: none yet (will be public `vizam-06-streaming`)
- Branch: `vizam/initial-build` (never `main`; no push/merge/deploy without Steeven)
- Commit: see `git log --oneline -n 5` (Phase 0 ends with "docs: architecture, design direction, handoff")

## Approved decisions
- Plan and phases: `docs/PROJECT_PLAN.md`. Architecture: `docs/ARCHITECTURE.md`. Design: `docs/design-direction.md`.
- Stack: Next.js 16.4.6 App Router, React 19.3, TS 5, Tailwind 4 (`@theme` tokens in `app/globals.css`), Motion 14,
  Lucide, Zod 4, Vitest 5, Playwright 1.65 + axe. `"type": "module"`, Node >= 22.18.
- Identity: ember/amber accent `#F2A33A` on warm near-black `#0B0A09`, bone text greys; Big Shoulders (display,
  `opsz`) + Manrope (text) via `next/font`; original sunset-horizon mark + "AFTERLIGHT" wordmark.
- Content: `content/media-library.json` (media agent) -> `scripts/build-catalog.ts` (Zod) -> `content/catalog.json`
  (git-ignored) -> `lib/content/catalog.ts` loaders. Sample fallback `content/catalog.sample.json` (3 fake titles,
  SVG placeholders in `public/placeholders/`). Editorial picks in `content/editorial.json` (web-owned).
- TMDB: metadata only, no TMDB images rendered; attribution in footer when the key is set.

## media-library.json contract (agreed with the media agent)
File: `{ "version": 1, "items": [Item] }` or `[Item]`. Authoritative: `lib/content/schema.ts`.
```
Item {
  id: string; slug: kebab-case (unique); type: "movie" | "series"; title: string; originalTitle?: string
  year: int 1880-2100; runtimeMinutes?: int > 0; genres: string[] (>= 1, display names; slugs derived)
  synopsis: string; tagline?: string; advisory?: string; language?: string; country?: string
  rating?: { source: "editorial", score: 0-10, label?: string } | { source: "none" }   (default none)
  credits?: { directors?: Credit[], cast?: Credit[], writers?: Credit[] }   Credit = string | { name, role? }
  licence: { id?: slug, name, url: http(s) URL, attribution, sourceUrl: http(s) URL, author, modifications? }
  images: { poster: "/media/posters/<slug>.webp", backdrop: "/media/backdrops/<slug>.webp",
            posterBlur?: base64 data URI <= 4 KB, backdropBlur?: same, stills?: local image paths[] }
            (local paths only: ^/[A-Za-z0-9_\-/.]+\.(webp|avif|svg|jpg|jpeg|png)$, no "..")
  videos?: Video[]   (at most one hero-loop per title)
  seasons?: [{ number: int >= 0, title?, year?, synopsis?, episodes: [{ number: int >= 1, title, synopsis?,
              runtimeMinutes?, still?: local image, videos?: Video[] }] (>= 1) }]   (series only)
}
Video {
  id?: string; kind: "hero-loop" | "trailer" | "feature" | "short" | "preview" | "episode"; label?: string
  src: [{ url: "/media/..." or "https://...", type: "video/mp4" | "video/webm" | "video/ogg" | HLS (codecs suffix ok) }] (>= 1)
  poster?: local path or https URL; durationSeconds?: number > 0
  captions?: [{ src: local or https .vtt, lang: "en", label: "English", kind?: "subtitles" | "captions", default?: bool }]
  host: string ("local", "wikimedia", "archive.org", "blender", ...); licenceId?: slug
  thumbnails?: WebVTT thumbnail track (scrub preview); startSeconds?: number >= 0
}
```
Validate with `npm run catalog`. An invalid library fails loudly; `CATALOG_SOURCE=sample npm run build` builds with
placeholders.

## Done (Phase 0)
- Scaffold, scripts (dev 3060, start/e2e 3061), security headers + CSP (`next.config.ts`), `.gitignore`, `.env.example`.
- Content model: `lib/content/{schema,normalise,types,catalog,routes}.ts`, `scripts/build-catalog.ts`, sample data.
- Shell: `app/layout.tsx` (`#root`, skip link, providers), `components/layout/*` (sticky header, mobile menu with focus
  trap/Escape, footer with concept notice + TMDB slot), 250 px lock in `app/globals.css`.
- Primitives: `components/ui/{button,badge,rail,title-card,title-grid,section-header}.tsx`, `components/brand/wordmark.tsx`.
- All 11 routes as stubs with metadata; details/watch use `generateStaticParams` + `dynamicParams = false`; 404 and error pages.
- `lib/hooks/use-media-preferences.ts` (reduced motion, Save-Data, `useCanAutoplayVideo`), `lib/motion.ts`.
- `lib/tmdb.ts` server-only stub. Tests: `tests/unit/catalog.test.ts`, `tests/e2e/smoke.spec.ts`.

## Done (Phase 2: Home, Movies, TV)
- Home: `components/home/hero-carousel.tsx` (poster first, gated muted loop via useCanAutoplayVideo + in-view + tab-visible + user pause, dots, prev/next, no auto-advance, My List button), rails: Trending (curated), Recently added, Popular genres tiles (-> /genres#slug), editorial collections, Series (hidden when none).
- Movies/TV: `components/browse/browse-view.tsx` + pure `lib/content/browse.ts` (genre chips aria-pressed, decade, sort, count live region, URL params genre/decade/sort, empty states). TV shows designed empty state when no series.
- TitleCard is now a client component taking `CardData` (`lib/content/card.ts`, `toCard/toCards`): hover/focus reveal, hover preview only with a `preview` video + fine pointer + motion allowed, "New" badge from editorial.json `recentlyAdded` + `newBadgeCount` (an ordering, not dates).
- `lib/watchlist.ts` (useWatchlist, key afterlight:my-list, Zod validated, storage-event sync) + `components/ui/watchlist-button.tsx`. Phase 4 builds the My List page on it.
- editorial.json now uses the real slugs (hero sintel, tears-of-steel, elephants-dream; collections). New fields in schema: recentlyAdded, newBadgeCount.
- Tests: tests/unit/{browse,watchlist}.test.ts, tests/e2e/phase2.spec.ts. Screenshots: docs/screenshots/phase2/ (scripts/screenshots.mjs).

## Done (Phase 3: details, watch, player)
- Details: `components/title/{title-details,credits,licence-panel,episode-browser}.tsx` (movie + series share it), JSON-LD in `lib/seo/jsonld.ts` (escaped), CSS backdrop fade/scale (`.backdrop-in`, reduced-motion safe). Rating only shown when `source: editorial`.
- Watch: `/watch/<slug>` (static) + `components/watch/{watch-client,info-panel}.tsx`; URL `?s=1&e=2` episode, `?v=trailer`; `routes.watch(t, {season, episode, trailer})`. Client part reads search params under Suspense.
- Player: `components/player/{player,seek-bar,player-menu}.tsx`; pure logic in `lib/player/*` (time, keyboard, sources, storage = resume+prefs, thumbnails VTT). Poster always `backdrop`/episode still (not `video.poster`: media agent removed `-sm` files once -> 404).
- Keyboard: Space/K play, Left/Right 5 s, J/L 10 s, Up/Down volume, M mute, F fullscreen, C captions, Home/End, 0-9 = 0-90 %.
- localStorage: `afterlight:resume` (per title/episode), `afterlight:player` (volume, muted, dataSaver).
- Tests: `tests/unit/player.test.ts`; e2e `tests/e2e/phase3.spec.ts` (Wikimedia mocked with a local clip via `helpers.ts`; `@network` test needs `E2E_NETWORK=1`) and `tv.sample.spec.ts` (project `sample`, port 3062, built from the sample catalog by `scripts/e2e-sample-server.mjs`; sample series now has 2 seasons + local video). `NEXT_DIST_DIR` (e.g. .next-p3) keeps a build out of the shared .next. Screenshots: `docs/screenshots/phase3/` (`scripts/screenshots-phase3.mjs`).

## Done (Phase 4: Genres, Trending, Search, My List, About)
- /genres: designed tiles (varied backdrops, counts), /genres/[slug] (SSG) with movies/series toggle + sort in URL (?type=, ?sort=). routes.genre is now /genres/<slug>; /genres#slug anchors still land on the tile.
- /trending: editorial note, numbered Top 10 (components/trending/ranked-card.tsx, outlined numerals), Rising rail (recently added not in top 10), optional TMDB text-only rail (lib/tmdb.ts getWiderFilmFeed; hidden without key or on any failure).
- /search: lib/content/search.ts (pure ranking, Zod query limit 80), components/search/search-client.tsx (debounced URL sync via history.replaceState, Top result, type filter, empty and no-results states); global "/" shortcut (components/layout/search-shortcut.tsx in layout, lib/search-focus.ts), Escape clears.
- /my-list: components/my-list/my-list-view.tsx (skeleton until mounted, sort, remove + undo toast, clear all with confirm + undo); watchlist hook gained restore/clear.
- /about: concept, how it is built, what we do not do, #licences from catalog (matches CONTENT_LICENSES.md, unit-tested), TMDB block only when key set. app/sitemap.ts, app/robots.ts added.
- TMDB_API_KEY: MISSING in this environment, so the feed is covered by mocked-fetch unit tests only (tests/unit/tmdb.test.ts).
- Tests: unit 68 pass; tests/e2e/phase4.spec.ts. Screenshots: docs/screenshots/phase4/.
- Run your own build with NEXT_DIST_DIR=.next-pN and E2E_PORT to avoid clashing with other agents.

## Pending
1. Phase 4: see below. Series from the media agent are untested on real data (only the sample series); check `/tv/<slug>` and `/watch/<slug>?s=&e=` once they land.
3. Phase 5-7 per PROJECT_PLAN.md. UI/UX review gate before any push.
4. Hero loop fix for the media agent: tears-of-steel loop has burned-in subtitle text around 2.5-5 s; re-cut to the sunset/rooftop shots (loop time ~7-13 s) or another segment without subtitles.

## Last verified checks
See the Phase 0 report in this file's git history; rerun before trusting. All of lint (0 errors), typecheck, unit
tests, build, e2e smoke (5 tests incl. axe, 390 px no overflow, 240 px lock) and `npm audit` (0) passed on 2026-11-11.

## Known issues and risks
- Lint warning (not an error) in `scripts/media/frames.mjs` (media agent's file): unused `e`.
- Stub pages show a "scaffolded" notice (`StubNotice`); remove it as each page is built.
- Home "Trending" is editorial; keep the "curated" wording (no fabricated popularity).
- `npm audit` override for minimatch (dev-only); remove when typescript-eslint updates.

## Setup
- `npm install`, `npm run dev` (3060), `npm run build && npm run e2e` (3061). First e2e on a machine: `npx playwright install chromium`.
- Env var names: `TMDB_API_KEY` (optional, server-only, `.env.local`), `SITE_URL` (optional, metadata base),
  `CATALOG_SOURCE=sample` (optional).

## Next step
Phase 4 (Sonnet). Known: `tests/unit/tmdb.test.ts` 'no key' test failed in my last run (Phase 4 work in progress by another agent, not Phase 3).

## Waiting for approval
- None for Phase 2. Video/voice generation and pushes still need Steeven's yes.
