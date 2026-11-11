import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "My List",
  description: "Titles you saved on this device. Stored only in your browser.",
  robots: { index: false },
};

/** Phase 4: client watchlist from localStorage (key "afterlight:my-list", array of slugs), no account needed. */
export default function MyListPage() {
  return (
    <>
      <PageIntro eyebrow="Saved on this device" title="My List">
        Your list lives only in this browser. There is no account and nothing is sent anywhere.
      </PageIntro>
      <StubNotice phase="Phase 4" />
    </>
  );
}
