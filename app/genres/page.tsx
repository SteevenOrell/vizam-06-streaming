import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { Rail } from "@/components/ui/rail";
import { TitleCard } from "@/components/ui/title-card";
import { toCard } from "@/lib/content/card";
import { getByGenre, getGenres } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Genres",
  description: "Browse AFTERLIGHT's open-licence films and series by genre.",
};

export default function GenresPage() {
  const genres = getGenres();
  return (
    <>
      <PageIntro eyebrow="Browse" title="Genres">
        Every genre in the library, with a rail of its titles.
      </PageIntro>
      {genres.map((g) => (
        <div key={g.slug} id={g.slug} className="scroll-mt-24">
          <Rail id={`genre-${g.slug}`} eyebrow={`${g.count} ${g.count === 1 ? "title" : "titles"}`} title={g.name}>
            {getByGenre(g.slug).map((t) => (
              <TitleCard key={t.slug} title={toCard(t)} />
            ))}
          </Rail>
        </div>
      ))}
      <StubNotice phase="Phase 4" />
    </>
  );
}
