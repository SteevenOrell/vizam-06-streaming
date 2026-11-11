import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { TitleGrid } from "@/components/ui/title-grid";
import { getTitles } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Movies",
  description: "Open-licence feature films and shorts on AFTERLIGHT, a VIZAM concept streaming site.",
};

export default function MoviesPage() {
  const movies = getTitles({ type: "movie" });
  return (
    <>
      <PageIntro eyebrow="Browse" title="Movies">
        Feature films and shorts released under Creative Commons or in the public domain.
      </PageIntro>
      <TitleGrid titles={movies} label="Movies" />
      <StubNotice phase="Phase 2" />
    </>
  );
}
