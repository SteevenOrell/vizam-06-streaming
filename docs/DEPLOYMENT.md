# Deployment: AFTERLIGHT

**Status: not deployed.** Deploying needs Steeven's approval and the public GitHub repo `vizam-06-streaming`, which
does not exist yet. Nothing has been pushed.

## Vercel steps (after approval)

1. Create the public GitHub repo `vizam-06-streaming` and push `vizam/initial-build` (Steeven's go-ahead first).
2. Vercel: Add New Project, import the repo. Framework preset: Next.js. Root directory: repo root.
3. Node version: 22.x (package `engines` is `>=22.18`). Install: `npm ci`. Build: `npm run build` (runs the catalog
   step first). Output: default.
4. Environment variables (Production and Preview):

| Name | Visibility | Notes |
|---|---|---|
| `TMDB_API_KEY` | Secret (server variable) | Optional. Never exposed to the client. |
| `SITE_URL` | Config | Public value, e.g. the production domain. Public values use "config", not "secret". |

   If `SITE_URL` is unset on Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is used for canonical URLs, sitemap and robots.
5. Open the preview deployment and run the checklist below. Production only after Steeven approves.

## Headers and CSP

Security headers and the CSP are set in `next.config.ts`. `media-src` allows `https://upload.wikimedia.org` only
(`img-src 'self' data:`). If the catalog ever streams from another host, add it to `MEDIA_HOSTS` in `next.config.ts` and
update `tests/unit/csp.test.ts`. Add HSTS `preload` only once the final domain is known.

## Caching

`/media/*` (hero loops, previews, posters) are static files; give them long-lived cache headers on the final host
(files are content-addressed by slug, so change the filename when replacing one).

## Preview checklist (phone)

- Home hero shows the poster first; menu opens, closes with Escape or tap outside.
- Movies: genre chips and sort work; cards are equal size.
- Open a movie, tap Play: video starts, controls and captions work, fullscreen works.
- Add to My List, reload, it is still there; remove and undo.
- Search finds a title; no sideways scroll.
- Footer shows the concept-project notice; About shows licences.
