# AFTERLIGHT

AFTERLIGHT is a **fictional** premium streaming and film-discovery site, built by VIZAM as a portfolio concept. It is not
a real client commission, not a subscription service, and it sells nothing. Everything playable is an open-licence or
public-domain film.

## Features

- 11 pages: Home, Movies, TV Shows, Genres (+ genre pages), Trending, Search, My List, About, movie and series details,
  Watch, plus 404 and error pages.
- Custom HTML5 video player with a keyboard map: Space/K play-pause, Left/Right 5 s, J/L 10 s, Up/Down volume, M mute,
  F fullscreen, C captions, Home/End, 0-9 jump to 0-90 %. Resume position, volume and data-saver stored locally.
- Watchlist (My List) kept in localStorage, with undo.
- Search with ranking, type filter and the `/` shortcut; browse filters (genre, decade, sort) kept in the URL.
- Curated library of open-licence films and series with per-title licence panels.
- Respects reduced motion and Save-Data (poster instead of autoplaying hero video). Accessible (axe-checked), no backend.

## Stack

Next.js 16 (App Router, mostly static), React 19, TypeScript, Tailwind CSS 4, Motion, Lucide, Zod, Vitest, Playwright
(+ axe). Fonts: Big Shoulders and Manrope via `next/font`.

## Getting started

Requires Node >= 22.18.

```
npm ci
npm run dev        # http://localhost:3060
```

For a production check: `npm run build && npm run start` (port 3061).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 3060 (builds the catalog first) |
| `npm run build` | Builds the catalog, then `next build` |
| `npm run start` | Serves the production build on port 3061 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright (projects `chromium` and `sample`) |
| `npm run catalog` | Validates `content/media-library.json` and writes `content/catalog.json` |

## Environment variables

| Name | Required | Notes |
|---|---|---|
| `TMDB_API_KEY` | No | Server-only. Enables optional text-only TMDB metadata; hidden without it. Never `NEXT_PUBLIC_`. |
| `SITE_URL` | No | Public base URL for metadata, sitemap and robots. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`. |
| `CATALOG_SOURCE=sample` | No | Builds from three placeholder titles instead of the real library. |

Copy `.env.example` to `.env.local` for local values.

## Content pipeline

`content/media-library.json` (authoritative library) is validated by Zod in `scripts/build-catalog.ts` and written to
`content/catalog.json` (git-ignored), which `lib/content/catalog.ts` loads. Editorial picks (hero, collections, "New"
ordering) live in `content/editorial.json`. The tools that find, cut, encode and describe media are in `scripts/media/`.
An invalid library fails the build loudly.

## Testing

- Unit: `npm test` (catalog, browse, search, player, watchlist, TMDB with mocked fetch, CSP).
- E2E: `npm run build && npm run e2e`. The `chromium` project runs against the real catalog with Wikimedia mocked; the
  `sample` project (port 3062) runs against the sample catalog. A `@network` test that streams from the real host runs
  only with `E2E_NETWORK=1`. First run on a machine: `npx playwright install chromium`.
- Results and commands: [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Test results](docs/TEST_RESULTS.md)
- [Content licences](docs/CONTENT_LICENSES.md)
- [Design direction](docs/design-direction.md)
- [Deployment](docs/DEPLOYMENT.md) and [case study](docs/CASE_STUDY.md)

## Credits and licences

Films are Blender Foundation / Blender Studio productions released under Creative Commons Attribution (CC BY), plus
public-domain classics. Per-title author, licence, source and any modifications are listed on `/about#licences` and in
[docs/CONTENT_LICENSES.md](docs/CONTENT_LICENSES.md). Optional TMDB metadata shows its attribution when the key is set.
