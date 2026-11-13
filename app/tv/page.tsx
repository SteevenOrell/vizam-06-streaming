import type { Metadata } from "next";
import { Suspense } from "react";
import { BrowseView, CardGrid, EmptyState } from "@/components/browse/browse-view";
import { PageIntro } from "@/components/layout/page-intro";
import { getTitles, toCards } from "@/lib/content/catalog";
import type { SortKey } from "@/lib/content/browse";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Open-licence and public-domain series on AFTERLIGHT, a VIZAM concept streaming site.",
};

const SORTS: SortKey[] = ["newest", "oldest", "az", "episodes"];

export default function TvShowsPage() {
  const series = toCards(getTitles({ type: "series" }));
  return (
    <>
      <PageIntro eyebrow="Browse" title="TV Shows">
        Series and episodic shorts, season by season.
      </PageIntro>
      {series.length === 0 ? (
        <EmptyState title="No series yet">
          The library is still growing. Series and episodic shorts will appear here as they are added. In the meantime,
          the films are all ready to watch.
        </EmptyState>
      ) : (
        <Suspense fallback={<CardGrid cards={series} label="TV shows" />}>
          <BrowseView items={series} noun={["series", "series"]} sorts={SORTS} empty={null} />
        </Suspense>
      )}
    </>
  );
}
