import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { RankedCard } from "@/components/trending/ranked-card";
import { Rail } from "@/components/ui/rail";
import { TitleCard } from "@/components/ui/title-card";
import { getRecentlyAdded, getTrending, toCards } from "@/lib/content/catalog";
import { getWiderFilmFeed } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Trending",
  description: "AFTERLIGHT's editorial top 10 from the open-licence library. A curated ranking, not audience data.",
  alternates: { canonical: "/trending" },
};

export default async function TrendingPage() {
  const top = toCards(getTrending(10));
  const topSlugs = new Set(top.map((t) => t.slug));
  // "Rising": the newest additions that are not already in the top 10. An editorial ordering, not a growth statistic.
  const rising = toCards(getRecentlyAdded(20).filter((t) => !topSlugs.has(t.slug)).slice(0, 10));
  const wider = await getWiderFilmFeed(6);

  return (
    <>
      <PageIntro eyebrow="Curated by the AFTERLIGHT editors" title="Trending">
        The ten titles our editors would put in front of you tonight.
      </PageIntro>

      <div className="wrap">
        <p className="flex max-w-3xl items-start gap-3 rounded-card bg-ink-900 p-4 text-sm leading-relaxed text-bone-200 ring-1 ring-inset ring-white/8" data-testid="editorial-note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-ember-300" aria-hidden="true" />
          <span>
            <strong className="text-bone-50">This ranking is editorial, not audience data.</strong> AFTERLIGHT is a concept site with no
            viewers to count, so nothing here is a view count or a popularity score. The order is picked by hand.
          </span>
        </p>
      </div>

      <section aria-labelledby="top10" className="py-8">
        <div className="wrap">
          <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">Editors&rsquo; ranking</p>
          <h2 id="top10" className="mt-1.5 text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
            Top {top.length} on AFTERLIGHT
          </h2>
        </div>
        <ol aria-labelledby="top10" className="wrap mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {top.map((t, i) => (
            <li key={t.slug} className="min-w-0">
              <RankedCard rank={i + 1} title={t} priority={i < 2} />
            </li>
          ))}
        </ol>
      </section>

      {rising.length > 0 ? (
        <Rail id="rail-rising" eyebrow="Rising" title="Rising: fresh to the library" variant="landscape">
          {rising.map((t) => (
            <TitleCard key={t.slug} title={t} variant="landscape" />
          ))}
        </Rail>
      ) : null}

      {wider.length > 0 ? (
        <section aria-labelledby="wider" className="py-8" data-testid="tmdb-rail">
          <div className="wrap">
            <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">Metadata only</p>
            <h2 id="wider" className="mt-1.5 text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
              From the wider world of film
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-bone-200">
              Films making headlines this week elsewhere. These are not on AFTERLIGHT and cannot be played here; details are from TMDB.
            </p>
          </div>
          <ul className="wrap mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wider.map((f) => (
              <li key={f.id} className="flex flex-col rounded-card bg-ink-900 p-5 ring-1 ring-inset ring-white/8">
                <p className="display text-3xl text-bone-50">{f.title}</p>
                {f.year ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ember-300">{f.year}</p> : null}
                <p className="mt-3 text-sm leading-relaxed text-bone-200">{f.overview}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
