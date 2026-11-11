import Image from "next/image";
import { Play } from "lucide-react";
import { StubNotice } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Rail } from "@/components/ui/rail";
import { TitleCard } from "@/components/ui/title-card";
import { toCard } from "@/lib/content/card";
import { related } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import type { Title } from "@/lib/content/types";

/** Phase 0 details layout (poster + meta + genre pills + credits, ref 3). Phase 3 builds the full page. */
export function TitleDetailStub({ title }: { title: Title }) {
  const more = related(title.slug, 10);
  const directors = title.credits.directors.map((p) => p.name).join(", ");
  const cast = title.credits.cast.map((p) => p.name).join(", ");
  return (
    <>
      <section aria-labelledby="title-heading" className="relative -mt-[var(--header-h)]">
        <div className="absolute inset-0">
          <Image src={title.images.backdrop} alt="" fill priority sizes="100vw" className="object-cover opacity-60" />
          <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--scrim-hero-bottom)]" />
        </div>
        <div className="wrap relative grid gap-8 pb-12 pt-40 md:grid-cols-[minmax(0,14rem)_1fr]">
          <div className="relative hidden aspect-[2/3] overflow-hidden rounded-card shadow-lift md:block">
            <Image src={title.images.poster} alt={`${title.title} poster`} fill sizes="14rem" className="object-cover" />
          </div>
          <div className="self-end">
            <div className="flex flex-wrap items-center gap-2">
              {title.genres.map((g, i) => (
                <Badge key={g.slug} tone={i === 0 ? "ember" : "muted"}>
                  {g.name}
                </Badge>
              ))}
            </div>
            <h1 id="title-heading" className="display mt-4 text-5xl text-bone-50 sm:text-7xl">
              {title.title} <span className="align-super text-xl text-bone-400">{title.year}</span>
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-bone-200">{title.synopsis}</p>
            <dl className="mt-5 grid gap-1 text-sm">
              {directors ? (
                <div>
                  <dt className="inline font-bold text-bone-50">Director: </dt>
                  <dd className="inline text-bone-200">{directors}</dd>
                </div>
              ) : null}
              {cast ? (
                <div>
                  <dt className="inline font-bold text-bone-50">Starring: </dt>
                  <dd className="inline text-bone-200">{cast}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-7">
              <ButtonLink href={routes.watch(title)} size="lg" icon={<Play aria-hidden="true" fill="currentColor" />}>
                Play
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
      {more.length ? (
        <Rail id="rail-related" eyebrow="More like this" title="You might also like">
          {more.map((t) => (
            <TitleCard key={t.slug} title={toCard(t)} />
          ))}
        </Rail>
      ) : null}
      <StubNotice phase="Phase 3" />
    </>
  );
}
