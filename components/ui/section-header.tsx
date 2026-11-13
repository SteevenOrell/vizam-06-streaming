import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  eyebrow?: string;
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Slot on the right, e.g. rail pagination dots or prev/next buttons */
  actions?: ReactNode;
  as?: "h1" | "h2" | "h3";
};

/** Eyebrow with ember tick + title + optional "See all" (ref 2). `id` labels the section via aria-labelledby. */
export function SectionHeader({ id, eyebrow, title, seeAllHref, seeAllLabel = "See all", actions, as: Heading = "h2" }: Props) {
  return (
    <div className="wrap flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Heading id={id} className="text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
            {title}
          </Heading>
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-ember-300 transition-colors hover:text-ember-200"
            >
              {seeAllLabel}
              <span className="sr-only"> {title}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
