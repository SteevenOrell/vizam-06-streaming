import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { TitleGrid } from "@/components/ui/title-grid";
import { getTitles } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Open-licence and public-domain series on AFTERLIGHT, a VIZAM concept streaming site.",
};

export default function TvShowsPage() {
  const series = getTitles({ type: "series" });
  return (
    <>
      <PageIntro eyebrow="Browse" title="TV Shows">
        Series and episodic shorts, season by season.
      </PageIntro>
      <TitleGrid titles={series} label="TV shows" />
      <StubNotice phase="Phase 2" />
    </>
  );
}
