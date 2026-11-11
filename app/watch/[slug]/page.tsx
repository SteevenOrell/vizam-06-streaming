import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StubNotice } from "@/components/layout/page-intro";
import { getTitleBySlug, getTitles } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";

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

/** Watch page skeleton. Phase 3 replaces the poster frame with the custom HTML5 player (see ARCHITECTURE.md). */
export default async function WatchPage({ params }: PageProps<"/watch/[slug]">) {
  const { slug } = await params;
  const title = getTitleBySlug(slug);
  if (!title) notFound();
  return (
    <div className="wrap py-8">
      <Link href={routes.title(title)} className="inline-flex items-center gap-2 text-sm font-semibold text-bone-200 hover:text-ember-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {title.title}
      </Link>
      <h1 className="display mt-4 text-4xl text-bone-50 sm:text-5xl">{title.title}</h1>
      <div className="relative mt-6 aspect-video overflow-hidden rounded-player bg-ink-900 shadow-lift">
        <Image src={title.images.backdrop} alt="" fill sizes="(min-width: 1536px) 92rem, 100vw" className="object-cover opacity-50" />
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-bone-200">
          {title.playable ? "Player coming in Phase 3." : "No playable source for this title yet."}
        </p>
      </div>
      <StubNotice phase="Phase 3" />
    </div>
  );
}
