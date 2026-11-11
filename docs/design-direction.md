# AFTERLIGHT: design direction

_Phase 0, 2026-11-11. Produced with `vizam-design-intake`. Tokens live in `app/globals.css` (`@theme`)._

## Brief

- **Audience:** portfolio visitors and prospective VIZAM clients judging craft; film lovers browsing open cinema.
- **Tone:** nocturnal, warm, editorial. The last light after sunset, not neon. Calm confidence over hype.
- **Three adjectives:** cinematic, warm, precise.
- **Positioning:** a fictional premium streaming brand (VIZAM concept). Not a service, sells nothing.

## References and what we take from each

The references (`docs/design-references/`, git-ignored, third-party film art) are used for **layout and mood only**.
No artwork, logos, brand names, colours-as-identity or copy are taken from them.

| Ref | What we adopt | Where it lands | What we deliberately avoid |
|---|---|---|---|
| **1** `ref-1-hero-carousels` | Full-bleed hero with large title art over the image; short synopsis; one strong primary pill button with a secondary text action; hero pagination dots; carousel rails below with small centred badges ("New") sitting on the card's lower edge; landscape 16:9 cards with title under the image | Home hero, landscape rails (`TitleCard variant="landscape"`, `Badge tone="ember"`) | Red brand colour, neon device frame, genre-only top nav, film-logo title art (we set titles in our display face; per-title art only if the licence allows) |
| **2** `ref-2-hero-trending-rail` | Left-aligned hero meta row: type pill (outline), year, rating; condensed uppercase display title; Play (solid) + More Info (translucent) buttons side by side; section **eyebrow with an accent tick**, title + "All/See all" link, pagination dots on the right of the rail header; tall **2:3 poster cards** with title below; rail bleeding off the right edge | Home hero meta and buttons, `SectionHeader`, `Rail`, poster `TitleCard`, Movies/TV grids | Red accent, notification bell and account avatar (no accounts here), star "8.2" style audience scores (we have none; only an optional labelled editorial score) |
| **3** `ref-3-player-details` | Custom player: thin **accent-coloured seek bar** with a round thumb, **thumbnail preview bubble while scrubbing**, compact pill control bar (play/pause, volume, fullscreen) floating over the video; large rounded player frame; details panel under the player with **poster, big title + year superscript, synopsis, genre pills (first one filled with accent), "Starring" / "Director" lines** | Watch page (Phase 3 player), details pages (`TitleDetailStub` already follows the panel layout) | Yellow (we use ember amber), light page background, any franchise artwork |

Deliberately different everywhere: our own wordmark and mark, ember/amber accent on warm near-black (not Netflix red,
not the yellow of ref 3), a distinctive condensed face (Big Shoulders) instead of Bebas-style clones, honest labels
("curated", "editorial") instead of popularity claims.

## Identity

- **Wordmark:** "AFTER**LIGHT**" set in Big Shoulders 800, uppercase, +0.06em tracking; "LIGHT" in ember-400.
- **Mark:** a sun just below the horizon whose last light breaks into three fading bands (`components/brand/wordmark.tsx`,
  inline SVG, ember gradient). Works at 24 px; also usable as favicon in Phase 5.

## Colour

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0B0A09` | Page background (warm near-black) |
| `ink-900` / `850` / `800` | `#13110F` / `#1A1714` / `#231F1B` | Raised surfaces, cards, hover |
| `ink-700` / `600` | `#322C26` / `#4A423A` | Strong borders, rail tracks |
| `bone-50` | `#F6F1EA` | Primary text (17.6:1) |
| `bone-200` | `#DCD3C7` | Secondary text |
| `bone-400` | `#AA9F92` | Muted text (7.6:1) |
| `bone-500` | `#8C8175` | Meta / placeholders only (about 5:1) |
| `ember-400` | `#F2A33A` | Primary accent: primary button, seek bar, active nav underline, badges |
| `ember-300` / `200` | `#F7C27A` / `#FBD9A8` | Focus ring, links, hover |
| `ember-500` / `600` | `#E08A1E` / `#B86A12` | Pressed, gradients |
| `ember-900` | `#3A220A` | Tinted surfaces |
| `signal-red` | `#E5484D` | Errors only, never brand |

Primary button: ember-400 background with ink-950 text (about 9:1). Never white text on ember.

## Type

- **Display:** Big Shoulders (variable, `opsz` axis, weight 800), uppercase, line-height 0.92. Hero titles, page titles,
  mobile menu. Utility: `.display` / `font-display`.
- **Text/UI:** Manrope (variable). Body 16-18 px, UI 14 px semibold, meta 12 px.
- **Eyebrow:** 12 px, 700, +0.18em tracking, uppercase, ember-300, with a 4 px ember tick (ref 2).
- Both self-hosted through `next/font/google` (no runtime Google requests; CSP `font-src 'self'`).

## Shape, depth, overlays

- Radii: `xs 4`, `sm 6`, `card 10`, `panel 20`, `player 28`, pills `9999`.
- Shadows: `shadow-card` (rails), `shadow-lift` (posters, player), `shadow-ember` (primary hover glow).
- Overlays (CSS variables): `--scrim-hero-bottom` (fade to page), `--scrim-hero-side` (left-side legibility for hero
  text), `--scrim-card` (card hover), `--glow-ember` (soft ember glow behind page intros).

## Motion

- Easing `ease-cinema` `cubic-bezier(.16,1,.3,1)`, `ease-swift`. Durations 160 / 260 / 480 ms.
- Card hover: 4% image scale + scrim. Hero (Phase 2/5): slow cross-fade between picks, muted loop only when allowed.
- `prefers-reduced-motion` and Save-Data: no autoplay video, no parallax, instant transitions
  (`useCanAutoplayVideo()`, `MotionConfig reducedMotion="user"`, global CSS guard).

## Accessibility baseline

Visible ember focus ring on everything, skip link, 44 px minimum tap targets in the header, AA contrast for all text
tokens used on ink surfaces, rails operable by keyboard (cards stay in tab order, prev/next buttons labelled).

## Checkpoints

- After the Home page (Phase 2): screenshots at 390 and 1440 px next to refs 1 and 2; list matches and gaps.
- Before any push: UI/UX review gate at 240/390/768/1440 px with this table marked implemented / not implemented.
