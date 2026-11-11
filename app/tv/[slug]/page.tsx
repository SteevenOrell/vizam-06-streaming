import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetailStub } from "@/components/title/title-detail-stub";
import { getTitleBySlug, getTitles } from "@/lib/content/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTitles({ type: "series" }).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tv/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title || title.type !== "series") return {};
  return {
    title: `${title.title} (${title.year})`,
    description: title.tagline ?? title.synopsis.slice(0, 155),
    openGraph: { images: [{ url: title.images.backdrop }] },
  };
}

export default async function TvShowDetailsPage({ params }: PageProps<"/tv/[slug]">) {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title || title.type !== "series") notFound();
  return <TitleDetailStub title={title} />;
}
