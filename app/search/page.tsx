import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { SearchClient } from "@/components/search/search-client";
import { getGenres, getTitles, getTrending, toCards } from "@/lib/content/catalog";
import type { SearchEntry } from "@/lib/content/search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search AFTERLIGHT's open-licence films and series by title, genre, cast or director.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  const titles = getTitles();
  const cards = new Map(toCards(titles).map((c) => [c.slug, c]));
  // Small, serialisable index: only the fields search and the result cards need.
  const entries: SearchEntry[] = titles.map((t) => ({
    card: cards.get(t.slug)!,
    originalTitle: t.originalTitle,
    synopsis: t.synopsis,
    people: [...t.credits.directors, ...t.credits.cast, ...t.credits.writers].map((p) => p.name),
  }));
  const trending = toCards(getTrending(6));
  const genres = getGenres().map((g) => ({ slug: g.slug, name: g.name }));
  return (
    <>
      <PageIntro eyebrow="Find something to watch" title="Search" />
      <Suspense fallback={<p className="wrap text-bone-400">Loading search...</p>}>
        <SearchClient entries={entries} genres={genres} trending={trending} />
      </Suspense>
    </>
  );
}
