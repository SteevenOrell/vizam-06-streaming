import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { SearchClient, type SearchEntry } from "@/components/search/search-client";
import { getTitles } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search AFTERLIGHT's open-licence films and series by title, genre or person.",
};

export default function SearchPage() {
  // Small, serialisable index: the full catalog never ships to the browser.
  const index: SearchEntry[] = getTitles().map((t) => ({
    slug: t.slug,
    type: t.type,
    title: t.title,
    year: t.year,
    poster: t.images.poster,
    keywords: [
      t.title,
      t.tagline ?? "",
      ...t.genres.map((g) => g.name),
      ...t.credits.directors.map((p) => p.name),
      ...t.credits.cast.map((p) => p.name),
    ].join(" "),
  }));
  return (
    <>
      <PageIntro eyebrow="Find something to watch" title="Search" />
      <Suspense fallback={<p className="wrap text-bone-400">Loading search...</p>}>
        <SearchClient index={index} />
      </Suspense>
      <StubNotice phase="Phase 4" />
    </>
  );
}
