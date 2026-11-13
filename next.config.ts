import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Open video hosts the player may stream from (trailers and full shorts are never committed to git).
 * Only hosts the catalog actually uses; tests/unit/csp.test.ts fails when a video or caption URL is not covered.
 * Keep in sync with docs/ARCHITECTURE.md "Player plan".
 */
export const MEDIA_HOSTS = ["https://upload.wikimedia.org"];

// Content-Security-Policy: fonts are self-hosted by next/font, images are local, TMDB is called server-side only.
// Scripts need 'unsafe-inline' for Next's inline bootstrap without a nonce setup (documented in ARCHITECTURE.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `media-src 'self' ${MEDIA_HOSTS.join(" ")}`,
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Optional separate build folder so parallel agents never share .next (e.g. NEXT_DIST_DIR=.next-p3).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    // 600 = native width of most posters: lets the browser pick the file at its real size instead of asking for 640
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 600],
    // No source image is wider than 1920 px; larger candidates would only make the browser assume detail that is not there.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
