import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { footerNav, mainNav, site } from "@/lib/site";
import { tmdbAttributionEnabled } from "@/lib/tmdb";

export function SiteFooter() {
  const showTmdb = tmdbAttributionEnabled();
  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-900/60">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-bone-400">
            {site.name} is a fictional streaming brand: a {site.studio} concept project for our portfolio, not a real
            service. It sells nothing and has no subscriptions. Every film shown is Creative Commons, public domain or
            explicitly licensed, and credited on the About page.
          </p>
        </div>
        <nav aria-label="Browse">
          <h2 className="eyebrow">Browse</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-bone-200 transition-colors hover:text-ember-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About">
          <h2 className="eyebrow">About</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-bone-200 transition-colors hover:text-ember-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="wrap flex flex-col gap-3 border-t border-white/5 py-6 text-xs text-bone-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          A {site.studio} concept project. {site.name} and its mark are original artwork; film titles belong to their
          creators.
        </p>
        {showTmdb ? (
          <p data-testid="tmdb-attribution">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
