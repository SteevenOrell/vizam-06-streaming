# Case study: AFTERLIGHT

**A VIZAM concept project (fictional brand, not a client commission, not a real service).**

## Brief
Design and build a premium streaming and film-discovery site that feels like a cinema lobby at dusk, without
pretending to be a real service or using any copyrighted film material. 11 pages, no backend, no accounts.

## Approach
- Identity: warm near-black with an ember accent (`#F2A33A`), Big Shoulders display type over Manrope, an original
  sunset-horizon mark. Design references were used for layout and mood only and are not published.
- Content: a curated library of open-licence films (16 movies, 4 series): Blender Foundation CC BY productions and
  public-domain classics. A Zod-validated pipeline turns `media-library.json` into the catalog; every title carries its
  licence, author, source and modifications, shown on details pages and `/about#licences`.
- Stack: Next.js 16 App Router (66 static pages), TypeScript, Tailwind 4, Motion, a custom video player, localStorage
  watchlist, optional server-only TMDB metadata.

## Challenges
- **Licensing:** only open-licence and public-domain works, with each credit tracked and unit-tested against
  `docs/CONTENT_LICENSES.md`. Ranking is labelled editorial because a concept site has no real audience data.
- **Player:** a custom player with a full keyboard map, captions drawn in our own overlay, resume and volume memory,
  scrub-preview support and Save-Data and reduced-motion handling (poster instead of autoplaying hero video).
- **Rate-limited media host:** full films stream from Wikimedia Commons, which throttles hotlinking. Heavy loops are
  committed as compressed files under 4 MB; trailers and features stream from the host, with a CSP that allows only
  `upload.wikimedia.org`. Tests mock the host so they stay deterministic; one `@network` test checks the real one.
- **Parallel agents:** several agents built pages and media at once, so builds used separate `NEXT_DIST_DIR` folders and
  ports, and a fixed content contract kept the media and web work independent.

## Results (from `docs/TEST_RESULTS.md`, Phase 6 runs)
- Lint, typecheck and build pass; 74 unit tests; 120 Playwright tests (1 skipped, reason documented); `npm audit`: 0
  vulnerabilities.
- axe (WCAG 2.0 to 2.2 A/AA) on 14 route types at 390 and 1440 px: 0 serious or critical issues; 0 console errors and
  0 CSP violations on 28 runs.
- No horizontal scroll from 300 px up; the 250 px lock was verified at 240 px.
- Mobile performance (390 px, DPR 3, 4x CPU throttle, slow network, Playwright approximation, Lighthouse not run): LCP
  1.2 to 2.1 s on the routes measured, CLS 0 to 0.001. Desktop LCP 0.27 to 0.58 s.
- Security review: see `docs/SECURITY_REVIEW.md`. An independent review would still be needed before any real use.

## Not verified
Lighthouse scores, real-device testing and a live deployment (not deployed yet). Some archival posters are SD-resolution
(300 to 400 px) and look soft on retina screens.

## Screenshots
`docs/portfolio/` (1440 and 390 px): home hero, movies browse, movie details, series details, watch with controls,
search, trending, my list. Captured by `scripts/screenshots-phase7.mjs` from a production build.
Portfolio screenshots were refreshed on 2026-11-13 from the live site (https://vizam-06-streaming.vercel.app); the
watch screenshot plays the real Elephants Dream stream (3:57 of 10:58).
