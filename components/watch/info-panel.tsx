import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Title } from "@/lib/content/types";
import { routes } from "@/lib/content/routes";
import { formatRuntime } from "@/lib/format";

const names = (list: { name: string }[], max = 6) => list.slice(0, max).map((p) => p.name).join(", ");

/** Details panel under the player (ref 3): poster, title + year, synopsis, genre pills, Starring/Director, licence line. */
export function InfoPanel({ title }: { title: Title }) {
  const directors = names(title.credits.directors);
  const cast = names(title.credits.cast);
  const runtime = formatRuntime(title.runtimeMinutes);
  return (
    <section aria-labelledby="watch-info-heading" className="relative overflow-hidden rounded-player bg-ink-900 p-5 ring-1 ring-white/8 sm:p-8" data-testid="watch-info">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60%_80%_at_20%_0%,rgb(242_163_58/0.18),transparent_70%)]" />
      <div className="relative grid gap-6 sm:grid-cols-[6.5rem_1fr] lg:grid-cols-[8rem_minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <div className="relative hidden aspect-[2/3] w-full overflow-hidden rounded-card shadow-lift ring-1 ring-white/10 sm:block">
          <FadeImage src={title.images.poster} alt={`${title.title} poster`} fill sizes="8rem" className="object-cover" />
        </div>
        <div className="min-w-0">
          <h2 id="watch-info-heading" className="display text-4xl text-bone-50 sm:text-5xl">
            {title.title} <span className="align-super text-lg font-semibold text-bone-400">{title.year}</span>
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-bone-200">{title.synopsis}</p>
          {runtime ? <p className="mt-2 text-sm font-semibold text-bone-400">{runtime}</p> : null}
        </div>
        <div className="min-w-0 lg:col-start-3">
          <ul className="flex flex-wrap gap-2" aria-label="Genres">
            {title.genres.map((g, i) => (
              <li key={g.slug}>
                <Link href={routes.genre(g.slug)} className={`inline-flex min-h-8 items-center rounded-full! px-3 text-xs font-bold uppercase tracking-[0.1em] ${i === 0 ? "bg-ember-400 text-ink-950 hover:bg-ember-300" : "bg-white/10 text-bone-200 hover:bg-white/20"}`}>
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 text-sm leading-relaxed">
            {cast ? (
              <div>
                <dt className="inline font-bold text-bone-50">Starring: </dt>
                <dd className="inline text-bone-200">{cast}</dd>
              </div>
            ) : null}
            {directors ? (
              <div>
                <dt className="inline font-bold text-bone-50">Director: </dt>
                <dd className="inline text-bone-200">{directors}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <p className="relative mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-bone-400" data-testid="watch-attribution">
        {title.licence.attribution}{" "}
        <a href={title.licence.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ember-300 hover:text-ember-200">
          {title.licence.name}
          <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        {" · "}
        <Link href={routes.title(title)} className="font-semibold text-ember-300 hover:text-ember-200">
          Full details and licence
        </Link>
      </p>
    </section>
  );
}
