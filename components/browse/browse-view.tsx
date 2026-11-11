"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { TitleCard } from "@/components/ui/title-card";
import type { CardData } from "@/lib/content/card";
import {
  SORT_LABELS,
  applyBrowse,
  facets,
  parseBrowseParams,
  toQueryString,
  type BrowseParams,
  type SortKey,
} from "@/lib/content/browse";
import { plural } from "@/lib/format";

type Props = {
  items: CardData[];
  /** Singular/plural noun for the count: "film", "series" */
  noun: [string, string];
  /** First entry is the default sort */
  sorts: SortKey[];
  /** Rendered when the catalog has none of this type */
  empty: React.ReactNode;
};

const chip =
  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors";
const chipOff = "bg-white/6 text-bone-200 ring-white/10 hover:bg-white/12 hover:text-bone-50";
const chipOn = "bg-ember-400 text-ink-950 ring-ember-400";
const select =
  "min-h-11 rounded-full bg-ink-850 px-4 text-sm font-semibold text-bone-50 ring-1 ring-inset ring-white/15 hover:ring-white/30";

/** Filter chips + decade + sort, all driven by the URL (shareable, back-button friendly). */
export function BrowseView({ items, noun, sorts, empty }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const defaultSort = sorts[0];
  const params = useMemo(() => parseBrowseParams(search, sorts), [search, sorts]);
  const { genres, decades } = useMemo(() => facets(items.map(toBrowse)), [items]);
  const results = useMemo(() => applyBrowse(items.map(toBrowse), params).map((b) => b.card), [items, params]);

  if (items.length === 0) return <>{empty}</>;

  const push = (next: Partial<BrowseParams>) => {
    const merged = { ...params, ...next };
    router.push(`${pathname}${toQueryString(merged, defaultSort)}`, { scroll: false });
  };
  const filtered = params.genre !== undefined || params.decade !== undefined;
  const clear = () => router.push(pathname, { scroll: false });

  return (
    <div>
      <div className="wrap flex flex-col gap-4 pb-2">
        <div role="group" aria-label="Filter by genre" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!params.genre}
            onClick={() => push({ genre: undefined })}
            className={`${chip} ${!params.genre ? chipOn : chipOff}`}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g.slug}
              type="button"
              aria-pressed={params.genre === g.slug}
              onClick={() => push({ genre: params.genre === g.slug ? undefined : g.slug })}
              className={`${chip} ${params.genre === g.slug ? chipOn : chipOff}`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-bone-200">
            <span>Decade</span>
            <select
              className={select}
              value={params.decade ?? ""}
              onChange={(e) => push({ decade: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">All decades</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-bone-200">
            <span>Sort by</span>
            <select className={select} value={params.sort} onChange={(e) => push({ sort: e.target.value as SortKey })}>
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <p role="status" aria-live="polite" className="text-sm text-bone-400" data-testid="result-count">
            {plural(results.length, noun[0], noun[1])}
          </p>
          {filtered ? (
            <button type="button" onClick={clear} className="min-h-11 text-sm font-semibold text-ember-300 hover:text-ember-200">
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="wrap py-16" data-testid="no-results">
          <div className="rounded-panel bg-ink-900 p-10 text-center ring-1 ring-inset ring-white/8">
            <p className="display text-4xl text-bone-50">Nothing matches</p>
            <p className="mx-auto mt-3 max-w-md text-bone-200">
              No {noun[1]} fit that combination. Try another genre or decade, or clear the filters.
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ember-400 px-6 text-sm font-bold text-ink-950 hover:bg-ember-300"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <CardGrid cards={results} label={`${noun[1]} results`} />
      )}
    </div>
  );
}

function toBrowse(c: CardData) {
  return { slug: c.slug, title: c.title, year: c.year, runtimeMinutes: c.runtimeMinutes, episodes: c.episodes, genres: c.genres, card: c };
}

/** Equal-size poster grid; also used as the static (pre-hydration / no-JS) fallback. */
export function CardGrid({ cards, label }: { cards: CardData[]; label: string }) {
  return (
    <ul aria-label={label} className="wrap grid grid-cols-2 gap-x-4 gap-y-8 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((c) => (
        <li key={c.slug}>
          <TitleCard title={c} />
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap py-12" data-testid="empty-state">
      <div className="relative overflow-hidden rounded-panel bg-ink-900 px-6 py-16 text-center ring-1 ring-inset ring-white/8 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[image:var(--glow-ember)]" />
        <div className="relative mx-auto max-w-lg">
          <p className="eyebrow">Coming to AFTERLIGHT</p>
          <p className="display mt-3 text-5xl text-bone-50 sm:text-6xl">{title}</p>
          <p className="mt-4 text-bone-200">{children}</p>
          <Link
            href="/movies"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ember-400 px-7 text-base font-bold text-ink-950 hover:bg-ember-300"
          >
            Browse movies
          </Link>
        </div>
      </div>
    </div>
  );
}
