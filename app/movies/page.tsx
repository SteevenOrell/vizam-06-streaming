import type { Metadata } from "next";
import { Suspense } from "react";
import { BrowseView, CardGrid } from "@/components/browse/browse-view";
import { PageIntro } from "@/components/layout/page-intro";
import { getTitles, toCards } from "@/lib/content/catalog";
import type { SortKey } from "@/lib/content/browse";

export const metadata: Metadata = {
  title: "Movies",
  description: "Open-licence feature films and shorts on AFTERLIGHT, a VIZAM concept streaming site.",
};

const SORTS: SortKey[] = ["newest", "oldest", "az", "shortest", "longest"];

export default function MoviesPage() {
  const movies = toCards(getTitles({ type: "movie" }));
  return (
    <>
      <PageIntro eyebrow="Browse" title="Movies">
        Feature films and shorts released under Creative Commons or in the public domain.
      </PageIntro>
      <Suspense fallback={<CardGrid cards={movies} label="Movies" />}>
        <BrowseView items={movies} noun={["film", "films"]} sorts={SORTS} empty={null} />
      </Suspense>
    </>
  );
}
