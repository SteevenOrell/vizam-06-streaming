# AFTERLIGHT (vizam-06-streaming): project plan

Approved by Steeven on 2026-11-11 (kickoff estimate ~1.2-1.7M tokens). Branch: `vizam/initial-build`.

Approved decisions:
- Brand: **AFTERLIGHT**, a fictional streaming platform and VIZAM portfolio concept. Dark with a warm ember/amber
  accent and condensed editorial display type. Original identity; don't copy Netflix or the references.
- Content: a curated library of Creative Commons open films (Blender Studio etc.) and public-domain films/series, plus
  licensed clips. Every item is documented in `docs/CONTENT_LICENSES.md`.
- TMDB: optional server-side enrichment only, with attribution; the site works fully without a key.
- Video hosting: short hero loops are compressed and kept in `public/media/`; trailers and full shorts stream from
  their official open hosts.
- Design references: `docs/design-references/` (layout and mood only, git-ignored).

## Phases

- [ ] 0. Setup and architecture (Opus): Next.js scaffold, tokens, brand, sitemap, Zod content schema, layout shell,
      nav, footer, 250 px lock, test tooling, `docs/ARCHITECTURE.md`, `docs/design-direction.md`
- [ ] 1. Media library (Sonnet, runs in parallel with 0): curated titles, posters/stills, hero loops, licences,
      `content/media-library.json`
- [ ] 2. Home, Movies, TV Shows (Sonnet)
- [ ] Checkpoint: homepage screenshots at 390 and 1440 px for Steeven
- [ ] 3. Movie details, TV show details, Watch / player (Sonnet)
- [ ] 4. Genres, Trending, Search, My List, About; TMDB feed if a key is present (Sonnet)
- [ ] 5. Motion and polish (Sonnet)
- [ ] 6. QA and security: Vitest, Playwright + axe, quality gate, content QA, audit, security review (Opus)
- [ ] 7. Delivery: README, deployment instructions, portfolio screenshots, handoff, retro (Sonnet + main)
- [ ] UI/UX review gate: screenshots at 240/390/768/1440 px to Steeven before any push

## Blocked / open
- Pixabay and Unsplash keys are unavailable (`.secrets/media.env` missing). Envato search works, but Envato files can't be
  committed to a public repo. Imagery therefore comes from the open/public-domain films themselves (stills and
  frames). Steeven to restore `media.env` if stock photos are wanted later. Not blocking.
- `TMDB_API_KEY` (optional, in `.env.local`).
