import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { getLicences } from "@/lib/content/catalog";
import { publicModifications } from "@/lib/format";
import { site } from "@/lib/site";
import { tmdbAttributionEnabled } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "About",
  description: "About AFTERLIGHT, a fictional VIZAM concept project, how it is built, and the licence and credit of every film it shows.",
  alternates: { canonical: "/about" },
};

const link = "underline decoration-ember-400/60 underline-offset-2 hover:text-ember-300";

const BUILD = [
  { title: "Stack", body: "Next.js App Router with React Server Components, TypeScript, Tailwind CSS 4, Motion for animation, Zod for every data boundary. No backend and no accounts." },
  { title: "Player", body: "A custom HTML5 video player: keyboard shortcuts, captions where the film has them, quality-aware source order, resume position, and picture-in-picture where the browser supports it." },
  { title: "Accessibility", body: "Semantic landmarks, visible focus, skip link, labelled controls and live regions. Reduced-motion and Save-Data visitors get posters instead of autoplaying video. Checked with axe and keyboard-only runs." },
  { title: "Performance", body: "Pages are prerendered from a validated catalog. Posters are WebP with blur placeholders, hero loops are short and muted, and full films stream from their open hosts instead of being bundled." },
];

const NOT = [
  "We sell nothing. There are no subscriptions, payments, plans or prices.",
  "We use no commercial content: no studio posters, trailers, stills or logos.",
  "We offer no downloads or rehosting of full films; they stream from their open hosts.",
  "We run no tracking, analytics, advertising or cookies. My List stays in your browser storage.",
  "We show no ratings, view counts or reviews, because there are no viewers to count.",
];

export default function AboutPage() {
  const licences = getLicences();
  const tmdb = tmdbAttributionEnabled();
  return (
    <>
      <PageIntro eyebrow="A VIZAM concept project" title="About AFTERLIGHT">
        {site.name} is a fictional streaming and film-discovery site designed and built by {site.studio} for its portfolio. It is not a
        real service and not a client commission. It shows only films released under Creative Commons licences, in the public domain,
        or explicitly licensed for this use.
      </PageIntro>

      <section aria-labelledby="what" className="wrap py-8">
        <h2 id="what" className="text-2xl font-extrabold text-bone-50">What AFTERLIGHT is</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-bone-200">
          Think of it as a premium film night built only from open cinema: Blender Foundation open movies, silent classics and
          public-domain features. It exists to show what a calm, fast, accessible streaming interface can feel like, and every title
          in it is free to watch because its makers released it that way.
        </p>
      </section>

      <section aria-labelledby="built" className="wrap py-8">
        <h2 id="built" className="text-2xl font-extrabold text-bone-50">How it is built</h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {BUILD.map((b) => (
            <div key={b.title} className="rounded-card bg-ink-900 p-5 ring-1 ring-inset ring-white/5">
              <dt className="font-bold text-bone-50">{b.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-bone-200">{b.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="not" className="wrap py-8">
        <h2 id="not" className="text-2xl font-extrabold text-bone-50">What we don&rsquo;t do</h2>
        <ul className="mt-6 grid max-w-3xl gap-3">
          {NOT.map((n) => (
            <li key={n} className="flex gap-3 text-bone-200">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-400" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="licences" className="wrap py-8">
        <h2 id="licences" className="scroll-mt-24 text-2xl font-extrabold text-bone-50">Film licences and credits</h2>
        <p className="mt-3 max-w-3xl text-bone-200">
          {licences.length} titles, each with its author, licence and source. Posters, backdrops and loops are frames or cuts from the
          films themselves, with the changes listed. Full details are kept in the project&rsquo;s content licence register.
        </p>
        <ul aria-label="Licences by title" className="mt-6 grid gap-4 md:grid-cols-2" data-testid="licence-list">
          {licences.map((l) => (
            <li key={l.titleSlug} className="rounded-card bg-ink-900 p-5 ring-1 ring-inset ring-white/5" data-testid="licence-item">
              <p className="font-bold text-bone-50">{l.titleName}</p>
              <p className="mt-1 text-sm text-bone-200">{l.attribution}</p>
              <p className="mt-2 text-xs leading-relaxed text-bone-400">
                By {l.author} &middot;{" "}
                <a href={l.url} className={link} rel="noopener noreferrer" target="_blank">
                  {l.name}
                  <span className="sr-only"> licence for {l.titleName} (opens in a new tab)</span>
                </a>{" "}
                &middot;{" "}
                <a href={l.sourceUrl} className={link} rel="noopener noreferrer" target="_blank">
                  Source
                  <span className="sr-only"> of {l.titleName} (opens in a new tab)</span>
                </a>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-bone-400">Changes: {publicModifications(l.modifications) ?? "None"}</p>
            </li>
          ))}
        </ul>
      </section>

      {tmdb ? (
        <section aria-labelledby="tmdb" className="wrap py-8" data-testid="tmdb-about">
          <h2 id="tmdb" className="text-2xl font-extrabold text-bone-50">Film data from TMDB</h2>
          <p className="mt-3 max-w-3xl text-bone-200">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Only text metadata (titles, years, overviews) is
            used, on the Trending page.
          </p>
        </section>
      ) : null}

      <section className="wrap pb-12 pt-4">
        <p className="text-sm text-bone-400">
          Questions about the project? It is a VIZAM concept: see the <Link href="/" className={link}>home page</Link> or browse{" "}
          <Link href="/movies" className={link}>movies</Link>.
        </p>
      </section>
    </>
  );
}
