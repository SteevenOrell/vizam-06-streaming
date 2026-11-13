import { ExternalLink } from "lucide-react";
import type { Title } from "@/lib/content/types";
import { publicModifications } from "@/lib/format";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkCls = "inline-flex items-center gap-1 font-semibold text-ember-300 underline decoration-ember-300/40 underline-offset-4 hover:text-ember-200";

/** "About this film": licence, author, attribution text and a link to where the work was obtained. */
export function LicencePanel({ title }: { title: Title }) {
  const l = title.licence;
  const noun = title.type === "movie" ? "film" : "series";
  return (
    <section id="about-this-title" aria-labelledby="licence-heading" data-testid="licence-panel" className="rounded-panel bg-ink-900 p-6 ring-1 ring-white/8 sm:p-8">
      <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">Licence and credit</p>
      <h2 id="licence-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
        About this {noun}
      </h2>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">Licence</dt>
          <dd className="mt-1">
            <a href={l.url} {...ext} className={linkCls}>
              {l.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">Author</dt>
          <dd className="mt-1 text-bone-50">{l.author}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">Attribution</dt>
          <dd className="mt-1 leading-relaxed text-bone-200">{l.attribution}</dd>
        </div>
        {publicModifications(l.modifications) ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">Changes made</dt>
            <dd className="mt-1 leading-relaxed text-bone-400">{publicModifications(l.modifications)}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">Source</dt>
          <dd className="mt-1">
            <a href={l.sourceUrl} {...ext} className={linkCls}>
              View the original work <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
