export const site = {
  name: "AFTERLIGHT",
  tagline: "Open cinema after dark",
  description:
    "AFTERLIGHT is a fictional streaming and film-discovery concept by VIZAM, built around Creative Commons and public-domain films.",
  // SITE_URL wins; on Vercel fall back to the production domain so sitemap/robots/canonical never point at localhost.
  url: (process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3061")).replace(/\/$/, ""),
  studio: "VIZAM",
} as const;

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/genres", label: "Genres" },
  { href: "/trending", label: "Trending" },
  { href: "/my-list", label: "My List" },
] as const;

export const footerNav = [
  { href: "/about", label: "About AFTERLIGHT" },
  { href: "/about#licences", label: "Film licences and credits" },
  { href: "/search", label: "Search" },
] as const;
