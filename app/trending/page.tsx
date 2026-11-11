import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { TitleGrid } from "@/components/ui/title-grid";
import { getTrending } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Trending",
  description: "AFTERLIGHT's curated trending picks from the open-licence library.",
};

export default function TrendingPage() {
  return (
    <>
      <PageIntro eyebrow="Curated by the AFTERLIGHT editors" title="Trending">
        AFTERLIGHT is a concept site with no viewer data, so this list is an editorial ranking, not a popularity chart.
      </PageIntro>
      <TitleGrid titles={getTrending(48)} label="Trending titles" />
      <StubNotice phase="Phase 4" />
    </>
  );
}
