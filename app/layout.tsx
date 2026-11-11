import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchShortcut } from "@/components/layout/search-shortcut";
import { SkipLink } from "@/components/layout/skip-link";
import { Providers } from "./providers";
import { site } from "@/lib/site";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  // next/font has no metric overrides for Big Shoulders; the CSS stack in globals.css supplies condensed fallbacks.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Roboto Condensed", "sans-serif"],
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    siteName: site.name,
    type: "website",
    locale: "en_CA",
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { email: false, telephone: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div id="root" className="flex min-h-dvh flex-col">
          <SkipLink />
          <Providers>
            <SearchShortcut />
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </div>
      </body>
    </html>
  );
}
