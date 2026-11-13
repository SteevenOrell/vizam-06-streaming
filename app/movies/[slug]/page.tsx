import { metaDescription } from "@/lib/format";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetails } from "@/components/title/title-details";
import { getTitleBySlug, getTitles } from "@/lib/content/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTitles({ type: "movie" }).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/movies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title || title.type !== "movie") return {};
  return {
    title: `${title.title} (${title.year})`,
    description: metaDescription(title),
    openGraph: { images: [{ url: title.images.backdrop }] },
  };
}

export default async function MovieDetailsPage({ params }: PageProps<"/movies/[slug]">) {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title || title.type !== "movie") notFound();
  return <TitleDetails title={title} />;
}
