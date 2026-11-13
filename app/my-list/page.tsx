import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { MyListView } from "@/components/my-list/my-list-view";
import { getTitles, toCards } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "My List",
  description: "Titles you saved on this device. Stored only in your browser.",
  robots: { index: false },
};

export default function MyListPage() {
  return (
    <>
      <PageIntro eyebrow="Saved on this device" title="My List">
        Your list lives only in this browser. There is no account and nothing is sent anywhere.
      </PageIntro>
      <MyListView cards={toCards(getTitles())} />
    </>
  );
}
