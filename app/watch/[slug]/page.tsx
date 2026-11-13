import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InfoPanel } from "@/components/watch/info-panel";
import { WatchClient } from "@/components/watch/watch-client";
import { getTitleBySlug, getTitles } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import { buildWatchData } from "@/lib/content/watch";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTitles().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/watch/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title) return {};
  return { title: `Watch ${title.title}`, description: title.synopsis.slice(0, 155), robots: { index: false } };
}

/** Watch page: custom player (client, URL-driven for episodes and trailers) plus a server-rendered details panel. */
export default async function WatchPage({ params }: PageProps<"/watch/[slug]">) {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title) notFound();
  const data = buildWatchData(title, routes.title(title));
  return (
    <div className="wrap grid gap-8 py-6 sm:py-8">
      <h1 className="sr-only">Watch {title.title}</h1>
      <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-player bg-ink-900 motion-reduce:animate-none" aria-hidden="true" />}>
        <WatchClient data={data} />
      </Suspense>
      <InfoPanel title={title} />
    </div>
  );
}
