import Link from "next/link";
import { Play } from "lucide-react";
import { FadeImage } from "@/components/ui/fade-image";
import { SectionHeader } from "@/components/ui/section-header";
import type { CardData } from "@/lib/content/card";
import { routes } from "@/lib/content/routes";

type Props = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  titles: CardData[];
  /** Upper bound of the runtime scale, in minutes. */
  scaleMinutes?: number;
};

const TICKS = [0, 5, 10, 15];

/**
 * "How much time do you have?" A runtime-ranked list, shortest first. Each row shows a bar on a shared 0-15 minute
 * scale, so visitors pick by time rather than scrolling a carousel.
 */
export function RuntimeList({ id, eyebrow, title, description, titles, scaleMinutes = 15 }: Props) {
  const items = titles
    .filter((t) => typeof t.runtimeMinutes === "number")
    .sort((a, b) => (a.runtimeMinutes ?? 0) - (b.runtimeMinutes ?? 0) || a.title.localeCompare(b.title));
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={id} className="py-6">
      <SectionHeader id={id} eyebrow={eyebrow} title={title} />
      <div className="wrap mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        {description ? <p className="max-w-prose text-sm text-bone-400">{description}</p> : null}
        <div aria-hidden="true" className="hidden w-64 md:block">
          <div className="flex justify-between text-[11px] font-semibold tabular-nums text-bone-500">
            {TICKS.map((m) => (
              <span key={m}>{m === scaleMinutes ? `${m} min` : m}</span>
            ))}
          </div>
          <div className="mt-1 h-px bg-white/15" />
        </div>
      </div>

      <ol className="wrap mt-5 grid gap-3 md:grid-cols-2">
        {items.map((t, i) => {
          const minutes = t.runtimeMinutes ?? 0;
          const pct = Math.max(4, Math.min(100, (minutes / scaleMinutes) * 100));
          const genre = t.genres[0]?.name;
          return (
            <li key={t.slug}>
              <Link
                href={routes.watch(t)}
                className="group/row grid h-full grid-cols-[7rem_1fr] items-center gap-4 rounded-card bg-ink-900 p-2 pr-4 ring-1 ring-inset ring-white/8 outline-offset-4 m-lift hover:bg-ink-850 hover:ring-white/15 sm:grid-cols-[10rem_1fr]"
              >
                <span className="relative block aspect-video overflow-hidden rounded-[8px] bg-ink-850">
                  <FadeImage
                    src={t.backdrop}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 160px, 112px"
                    blur={t.backdropBlur}
                    className="object-cover m-zoom group-hover/row:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 grid place-items-center bg-ink-950/40 opacity-0 m-reveal group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-ember-400 text-ink-950">
                      <Play className="h-4 w-4 translate-x-px fill-current" />
                    </span>
                  </span>
                </span>

                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="line-clamp-2 block font-bold leading-snug text-bone-50">
                        <span className="sr-only">{i + 1}. </span>
                        {t.title}
                      </span>
                      <span className="block truncate text-xs text-bone-500">
                        {t.year}
                        {genre ? ` · ${genre}` : ""}
                      </span>
                    </span>
                    <span className="display shrink-0 text-3xl leading-none text-ember-300 tabular-nums">
                      {minutes}
                      <span className="ml-1 text-sm text-bone-400">min</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-300"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="sr-only">Watch {t.title}, {minutes} minutes</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
