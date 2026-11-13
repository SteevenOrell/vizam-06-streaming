# Agent handoff: AFTERLIGHT (vizam-06-streaming)

_Last updated: 2026-11-12 by the Phase 7 agent (delivery)_

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

## Done (Phase 5: motion and polish)
- Motion tokens in app/globals.css (:root --dur-fast/base/hover/slow/hero, --ease-cinema/swift; classes .m-lift .m-zoom .m-reveal). Tailwind 4 scale/translate are individual CSS properties, so the shared transitions list them.
- Hero: .hero-live on the active slide (backdrop settle 1.04->1, .hero-rise stagger via --i); slide crossfade --dur-hero. Pure CSS.
- Rail: eased scroll tween (lib/scroll.ts, snaps to card edges, snap disabled during tween), edge arrows fade out when disabled.
- FadeImage (components/ui/fade-image.tsx): every next/image now goes through it; a veil with the blur placeholder fades out on load (.img-veil; hidden without JS).
- TitleCard preview: 400 ms hover intent, video fades in after canplay, fades out on leave.
- View transitions: React <ViewTransition name="poster-<slug>" share="morph"> on poster cards in grids only (TitleGrid, browse, search results, my list) and the details poster. Rails are excluded on purpose (a title can appear in two rails; duplicate names break the morph). No next.config change needed; pages stay SSG. Reduced motion disables the VT animations.
- Captions: tracks stay "hidden"; cues drawn in our own overlay above the control bar (data-testid caption-overlay), height tracked with ResizeObserver.
- publicModifications() in lib/format.ts strips repo paths from licence "Changes" text (details + About); media-library.json untouched.
- Search top result: banner-style backdrop on phones. Trending: "10" uses a smaller, tighter numeral.
- Real series: tests/e2e/series.real.spec.ts covers all 4 (details, stills load, play link, playback with mocked Wikimedia). All pass.
- Screenshots: docs/screenshots/phase5/ (scripts/screenshots-phase5.mjs; adds a synthetic long cue because the mocked clip is shorter than the film).

## Done (Phase 6: QA and security, 2026-11-12)
- Results: docs/TEST_RESULTS.md. Security: docs/SECURITY_REVIEW.md. Gate report docs/qa/gate-report.md, content report docs/qa/content/content-report.md (sheets/shots git-ignored).
- CSP: media-src only https://upload.wikimedia.org (MEDIA_HOSTS exported from next.config.ts, enforced by tests/unit/csp.test.ts; add a host there when the catalog streams from a new one); img-src 'self' data:; Zod jitless (z.config in schema/search/storage/watchlist) so no eval probe violates CSP.
- safeLocalStorage() in lib/player/storage.ts: use it instead of window.localStorage.
- lib/site.ts falls back to VERCEL_PROJECT_PRODUCTION_URL when SITE_URL is unset.
- next.config images: imageSizes adds 600, deviceSizes capped at 1920 (no source is larger). Hero sizes "(max-width: 1472px) 1472px, 100vw" (cover crop on tall boxes).
- editorial.json genreImages (slug -> {src, blur}) overrides a genre tile image; Science/Documentary use Hubblecast ep. 85 frames. The General poster/backdrop re-picked at 16:00 (media-work/picks.json t=960). Ep. 85 still re-cut at 2:30.
- tests/e2e/phase6.spec.ts: axe (wcag2a/aa/21aa/22aa) + CSP/console on 14 route types at 390 and 1440, headers, JSON-LD, external links, hero gating under reduced motion and Save-Data, keyboard (skip link, mobile menu, search, player shortcuts).
- metaDescription() in lib/format.ts for details pages; search Suspense fallback reserves space (CLS); first /genres tile priority.

## Pending
0. Phase 7 is done (see below). Optional: higher-resolution posters for the SD archival films (Caligari 300 px, Nosferatu/NOTLD/Trip to the Moon/Felix/Superman 400 px).
1. Phase 4: see below. Series from the media agent are untested on real data (only the sample series); check `/tv/<slug>` and `/watch/<slug>?s=&e=` once they land.
3. Phase 5-7 per PROJECT_PLAN.md. UI/UX review gate before any push.

## Last verified checks
2026-11-12 (Phase 6): see docs/TEST_RESULTS.md for every command, count and kept WARN.

## Known issues and risks
- Lint warning (not an error) in `scripts/media/frames.mjs` (media agent's file): unused `e`.
- Stub pages show a "scaffolded" notice (`StubNotice`); remove it as each page is built.
- Home "Trending" is editorial; keep the "curated" wording (no fabricated popularity).
- `npm audit` override for minimatch (dev-only); remove when typescript-eslint updates.

## Setup
- `npm install`, `npm run dev` (3060), `npm run build && npm run e2e` (3061). First e2e on a machine: `npx playwright install chromium`.
- Env var names: `TMDB_API_KEY` (optional, server-only, `.env.local`), `SITE_URL` (optional, metadata base),
  `CATALOG_SOURCE=sample` (optional).

## Done (Phase 7: delivery, 2026-11-12)
- README.md, docs/DEPLOYMENT.md, docs/CASE_STUDY.md. Portfolio screenshots (1440 and 390, 8 screens each) in docs/portfolio/; review-gate screenshots (home and Sintel details at 240/390/768/1440) in docs/screenshots/review-gate/. Script: scripts/screenshots-phase7.mjs (needs a production server, E2E_PORT).
- Seen in screenshots, minor: at 390 px the home hero meta row wraps ("Animation Fantasy Adventure" on a second line); the watch screenshot uses the mocked short clip.
- Not deployed, nothing pushed. Retro (vizam-project-retro) not yet run.

## Next steps
1. Steeven: UI/UX review of docs/screenshots/review-gate/ and the live app (review gate, unticked in PROJECT_PLAN.md).
2. On approval: create public GitHub repo vizam-06-streaming, push vizam/initial-build, open a Vercel preview (docs/DEPLOYMENT.md), send the phone checklist.
3. Run vizam-project-retro; optionally refresh SD poster sources.

## Waiting for approval
- Push, repo creation and deploy need Steeven. Video/voice generation not requested.
