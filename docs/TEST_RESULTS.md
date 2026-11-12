# Test results: AFTERLIGHT (Phase 6, 2026-11-12)

Branch `vizam/initial-build`. All runs on Windows 11, Node 22, headless Chromium (Playwright 1.65), production build
(`next build` + `next start`). Only results from runs seen in this phase are listed.

## Quality gate (`vizam-quality-gate`, final run after all fixes)

Command: `node ~/.claude/skills/vizam-quality-gate/scripts/gate.mjs --start "npx next start -p 3063" --url http://127.0.0.1:3063 --routes home,movies,tv,genres,genres/drama,trending,search?q=moon,my-list,about,movies/sintel,tv/caminandes,watch/sintel,watch/caminandes?s=1&e=1,no-such-page --out docs/qa`
Report: `docs/qa/gate-report.md`.

| Check | Result |
|---|---|
| lint (`eslint .`) | PASS (0 errors) |
| typecheck (`next typegen && tsc --noEmit`) | PASS |
| unit (`vitest run`) | PASS, 9 files, 74 tests |
| build | PASS (66 static pages) |
| e2e (`playwright test`, projects chromium + sample) | PASS, 120 tests in 7 files (1 skipped: real catalog has no multi-season series; season tabs by keyboard are covered by `tv.sample.spec.ts`) |
| `npm audit` | PASS, 0 vulnerabilities (production and all) |
| tracked private files | PASS |
| secret scan, tree and full Git history | PASS |
| layout at 240/300/390/768/1440 on 14 route types: no horizontal scroll from 300 px, 250 px lock, broken images/links | PASS |
| browser: console errors, failed requests, status | 1 FAIL kept: `/no-such-page` returns 404 on purpose (the 404 route is in the list to check its layout) |
| cards: equal height (WARN) | 1 WARN kept: `/watch/*` at 768 px `div.relative` 156/166 px: the watch info panel (poster column next to text), not a card grid |

First gate run (before fixes) found: `/my-list` at 240 px, undo toast was a fixed element not locked to 500 px. Fixed
(`fixed-lock`), rerun PASS.

## Tracked-file and history scan (manual, in addition to the gate)

- `git ls-files`: no `.env`, keys, design-reference images, `media-work/`, or non-WebP raster images (SVG only in
  `public/placeholders`). Videos only in `public/media/hero` and `public/media/previews`; largest 2,682,541 bytes
  (`sintel-hero.webm`), all < 4 MB.
- Full history (`git log --all --name-only`, `git rev-list --objects --all`): no jpg/png/gif/avif/mov/env/pem files ever
  committed, no blob > 4.2 MB.
- Client bundle: 0 files in `.next/static` contain `TMDB_API_KEY` or `api.themoviedb.org`.

## Phase 6 e2e (`tests/e2e/phase6.spec.ts`)

Command: `npx playwright test tests/e2e/phase6.spec.ts` (chromium project). Result: 38 passed, 1 skipped (see above).

- axe (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on 14 route types at 390 and 1440 px: 0 serious/critical.
- Console and CSP: 0 errors and 0 CSP violations on all 28 runs (first run: 12 routes reported `script-src eval`
  from Zod's JIT probe; fixed with `z.config({ jitless: true })`).
- Response headers asserted (CSP directives, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS, no
  `X-Powered-By`). JSON-LD parses and contains no `</script`. Every `target="_blank"` has `noopener noreferrer`; no
  `javascript:`/`http:` links.
- Hero gating: no request for `/media/hero/*` or `/media/previews/*` video under reduced motion or Save-Data; the poster
  image is loaded. Without restrictions the backdrop image is requested before the hero video.
- Keyboard only: skip link first, visible focus ring on the next controls; mobile menu opens with Enter, focus stays in
  the header/menu, Escape closes and returns focus; search `/` focus, type, Tab to a result, Enter navigates; player:
  Space/K play-pause, 0-9 jump, Right/J seek, Home/End, Up/Down volume, M mute, C captions, F fullscreen, and every
  player control shows a focus ring.

## Contrast (ember on dark, computed WCAG ratios)

ember-400 `#F2A33A` on ink-950 9.49:1, on ink-850 8.56:1; ember-300 12.20 / 11.01; ember-200 14.69 / 13.25;
ink-950 on ember-400 (button text) 9.49; bone-500 on ink-850 4.68 (lowest text pair, AA for normal text). All pass AA
at every size.

## Content QA (`vizam-content-qa`, final run)

Command: `node ~/.claude/skills/vizam-content-qa/scripts/content-qa.mjs --start "npx next start -p 3064" --url http://127.0.0.1:3064 --routes <14 routes> --out docs/qa/content`
Report: `docs/qa/content/content-report.md`. Runs: 55 FAIL / 66 WARN, then 21 / 134, final 15 FAIL / 103 WARN.
Contact sheets looked at (home, genres, The General details, others): The General shows the new frame, Science and
Documentary tiles are bright, no layout defects found.

Fixed: hero and details backdrops reported as upscaled (hero `sizes` now matches the cover crop, image candidates
capped at 1920 so the browser no longer requests widths no source has); short meta descriptions on details pages
(`metaDescription()`); The General lettering; dark Science/Documentary tiles; a duplicate Hubblecast frame.

FAILs kept (each with reason):
- `/`, `/watch/*`: "no visible h1". Both pages have an `sr-only` h1 by design (home: the hero slides carry h2 titles;
  watch: the player comes first). axe `page-has-heading-one` passes.
- 12 "soft image (upscaled)": poster cards for Night of the Living Dead, Nosferatu, A Trip to the Moon, Felix the Cat,
  Fleischer Superman (400 px native) and The Cabinet of Dr. Caligari (300 px), plus the Trip to the Moon search banner
  (1280 px native). These are cut from SD archival transfers; no higher-resolution open source was found in Phase 1.
  At 2x DPR a 400 px poster fills a ~414 px slot (0.97x); Caligari is genuinely soft (0.72x). Listed in the handoff.

WARNs kept: same poster on several pages (a catalogue shows each title in several rails by nature); "slightly soft on
retina" for 600 px posters in 156 px trending slots (1.1x at the tool's DPR); one sub-12 px text element on details pages
(licence badge micro-label); "placeholder" wording on `/about` (it explains the sample catalogue); the same synopsis on
home hero, details and watch (same title).

## Image audit (`site-media` `image-audit.mjs validate --images public/media`)

Final: 0 FAIL, 1 WARN (no `docs/image-manifest.json`; imagery is film frames, not stock, so photographer variety does
not apply). First run flagged the new Andromeda tile as a near-duplicate of the ep. 85 still; the still was re-cut.

## Performance (Playwright PerformanceObserver; Lighthouse not run)

Mobile: 390 px, DPR 3, 4x CPU throttle, ~1.6 Mbps / 150 ms latency. Desktop: 1440 px, no throttling. TBT is the sum of
long-task time over 50 ms (an approximation). Next 16 no longer prints per-route sizes; JS is the transferred size.

| Route | Mobile LCP | CLS | TBT~ | JS | Desktop LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 2076 ms | 0.001 | 1845 ms | 183 KB | 576 ms | 0.000 |
| `/movies` | 1652 ms | 0.000 | 723 ms | 205 KB | 424 ms | 0.000 |
| `/genres` | 1640 ms (was 4428) | 0.000 | 961 ms | 145 KB | 488 ms | 0.000 |
| `/search?q=moon` | 1856 ms | 0.000 (was 0.417) | 599 ms | 195 KB | 272 ms | 0.020 |
| `/movies/sintel` | 1180 ms | 0.000 | 843 ms | 223 KB | 344 ms | 0.000 |
| `/watch/sintel` | 960 ms | 0.046 | 1014 ms | 187 KB | 332 ms | 0.001 |

WARN kept: mobile TBT under 4x CPU throttling is high on home (hydration of the hero, rails and Motion). LCP and CLS are
within "good" on every route. A Lighthouse run (`vizam-lighthouse-run`) is a Phase 7 option.

## Not covered

Screen readers, real devices, Safari/Firefox, Lighthouse scores, real network playback from Wikimedia (mocked in e2e;
`@network` test needs `E2E_NETWORK=1`).
