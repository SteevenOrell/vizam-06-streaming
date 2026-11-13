import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenreTitles } from "@/components/genres/genre-titles";
import { PageIntro } from "@/components/layout/page-intro";
import { getByGenre, getCatalog, getGenre, toCards } from "@/lib/content/catalog";
import { plural } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCatalog().genres.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/genres/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenre(slug);
  if (!genre) return {};
  return {
    title: `${genre.name} films and series`,
    description: `${plural(genre.count, "open-licence title")} filed under ${genre.name} on AFTERLIGHT.`,
    alternates: { canonical: `/genres/${slug}` },
  };
}

export default async function GenrePage({ params }: PageProps<"/genres/[slug]">) {
  const { slug } = await params;
  const genre = getGenre(slug);
  if (!genre) notFound();
  const cards = toCards(getByGenre(slug));
  return (
    <>
      <PageIntro eyebrow="Genre" title={genre.name}>
        {genre.blurb ?? `${plural(genre.count, "title")} in the library.`}
        <span className="mt-3 block">
          <Link href="/genres" className="text-sm font-semibold text-ember-300 hover:text-ember-200">
            &larr; All genres
          </Link>
        </span>
      </PageIntro>
      <Suspense fallback={<p className="wrap text-bone-400">Loading titles...</p>}>
        <GenreTitles cards={cards} genreName={genre.name} />
      </Suspense>
    </>
  );
}
