# Security review: AFTERLIGHT (vizam-06-streaming)

Phase 6, 2026-11-12, branch `vizam/initial-build`. Scope: the static Next.js site (no backend, no auth, no forms, no
user accounts, no payments). Method: code review, production response headers from `next start`, Playwright checks
(`tests/e2e/phase6.spec.ts`), unit tests (`tests/unit/csp.test.ts`), `npm audit`, secret and tracked-file scans of the
tree and the full Git history (`vizam-quality-gate`). Automated checks do not prove the site is secure; before a public
launch an independent review is still recommended (the site handles no personal data, so no compliance assessment is
needed).

## Summary

| Area | Result |
|---|---|
| Response headers (CSP, XFO, nosniff, Referrer-Policy, Permissions-Policy, HSTS, no `X-Powered-By`) | PASS (asserted in e2e) |
| CSP violations in the console on 14 route types at 390 and 1440 px | PASS, 0 (was: Zod `new Function` probe, fixed) |
| `dangerouslySetInnerHTML` | only JSON-LD, escaped (`lib/seo/jsonld.ts`), e2e asserts valid JSON and no `</script` |
| External links | all `target="_blank"` carry `rel="noopener noreferrer"`; no `javascript:` or `http:` hrefs (e2e) |
| localStorage (watchlist, resume, player prefs) | Zod-validated on every read, tamper tolerant, access never throws |
| Search query | Zod: control characters stripped, whitespace collapsed, max 80 chars; rendered as text only |
| TMDB key | server-only (`server-only` import, no `NEXT_PUBLIC_`); 0 hits for `TMDB_API_KEY` or `api.themoviedb.org` in `.next/static` |
| Download / rehosting of unlicensed media | none; no download buttons; full films stream from Wikimedia Commons; only licensed hero loops/previews are committed |
| `npm audit` | 0 vulnerabilities (production and all dependencies) |
| Secrets in tree and Git history | none found (gate scan, full history) |
| Tracked files | no `.env`, keys, design-reference images, `media-work/`, or non-WebP raster images; videos only in `public/media/hero` and `public/media/previews`, largest 2.68 MB (< 4 MB) |

## Findings and fixes (this phase)

1. **Medium (fixed): CSP `media-src` broader than needed.** It allowed `commons.wikimedia.org`, `archive.org`,
   `*.archive.org`, `download.blender.org`, `video.blender.org` and `blob:`, although the catalog only streams from
   `upload.wikimedia.org`. Now `media-src 'self' https://upload.wikimedia.org`. `tests/unit/csp.test.ts` fails if a
   catalog video, caption or thumbnail URL is not covered by `MEDIA_HOSTS`, if any is plain `http:`, or if a listed
   host is unused.
2. **Low (fixed): `img-src` allowed `blob:`** with no use in the code. Now `img-src 'self' data:` (data: is needed for
   the blur placeholders).
3. **Low (fixed): CSP violation on every page that parses with Zod in the browser.** Zod 4 probes `new Function("")`
   once to decide whether to JIT; under our no-`unsafe-eval` CSP that is blocked (harmless, caught) but reported as a
   violation and clutters monitoring. `z.config({ jitless: true })` in the client-reachable modules.
4. **Low (fixed): storage access could throw.** `window.localStorage` itself throws when site data is blocked; the
   player and watchlist now go through `safeLocalStorage()` (no-op store fallback). `getResume` also ignores inherited
   keys (`__proto__`, `toString`) and wrong-typed values; unit-tested.
5. **Info (fixed): `Permissions-Policy` listed `interest-cohort`**, an unrecognised feature that makes Chrome log a
   warning. Removed.
6. **Info (fixed): canonical/sitemap/robots base URL** fell back to `http://localhost:3061` when `SITE_URL` is unset.
   It now falls back to `VERCEL_PROJECT_PRODUCTION_URL` on Vercel. Set `SITE_URL` for any other host.

## Accepted risks / notes

- **`script-src 'unsafe-inline'`** (and `style-src 'unsafe-inline'`): Next.js inline bootstrap without a nonce. A nonce
  CSP needs middleware and dynamic rendering for every page, which would give up static generation. Risk is low: no
  user-generated HTML is rendered, content JSON is rendered as React text, and the only raw HTML is escaped JSON-LD.
  Revisit if the site gains user content.
- **HSTS `preload`** is sent; only submit the domain to the preload list once the final domain is decided.
- **Install scripts:** `ffmpeg-static` (dev) runs a postinstall that downloads an ffmpeg binary; `fsevents` (dev,
  macOS only). No production dependency has an install script. `sharp` ships prebuilt binaries via optional
  dependencies, no install script. Both `ffmpeg-static` and `sharp` are devDependencies used only by `scripts/media/*`;
  next/image on Vercel uses the platform optimizer. If the team adopts npm's `allowScripts` / `--ignore-scripts` policy,
  allow only `ffmpeg-static` (needed only for media work).
- **minimatch override** (dev-only, typescript-eslint chain) stays until typescript-eslint updates; `npm audit` is 0.
- **Captions** are local `.vtt` files (same origin). Remote captions would need the host in `media-src` (the unit test
  enforces it).
- **robots.txt** disallows `/my-list` (also `noindex`); the sitemap lists 40 public URLs (no watch or my-list pages).

## Threat model (brief)

| Threat | Exposure | Controls |
|---|---|---|
| XSS via content JSON (`media-library.json`, `editorial.json`) | Content is committed by the team, not by visitors | Zod schemas at build (`npm run catalog` fails loudly), local image paths regex without `..`, http(s)-only URLs, React escaping, JSON-LD escaping of `<`, `>`, `&`, U+2028/2029 |
| XSS via URL params (`?q=`, `?genre=`, `?s=&e=`, `?v=`) | Any visitor link | Zod / whitelist parsing, invalid values fall back to defaults, rendered as text; e2e covers hostile queries |
| Tampered localStorage | Same-origin only | Zod validation, slug regex, caps (500 slugs, 60 resume entries), never rendered as HTML |
| Open redirect | None: no redirect endpoints or `?next=` parameters; all internal links are built from `routes.*` | n/a |
| Clickjacking | Player and pages could be framed | `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| Mixed content | Remote media | All remote URLs are `https:` (unit test), HSTS |
| Supply chain | npm packages | Pinned versions, lockfile, `npm audit` 0, no prod install scripts |
| Secret leakage | TMDB key | Server-only module, `.env*` ignored, client bundle grep 0 hits, history scan clean |
