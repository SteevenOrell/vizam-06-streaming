"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CardGrid } from "@/components/browse/browse-view";
import type { CardData } from "@/lib/content/card";
import { SORT_LABELS, sortItems, type SortKey } from "@/lib/content/browse";
import { plural } from "@/lib/format";

const SORTS: SortKey[] = ["newest", "oldest", "az", "shortest", "longest"];
const TYPES = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
] as const;
type TypeFilter = (typeof TYPES)[number]["value"];

const chip = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors";
const chipOff = "bg-white/6 text-bone-200 ring-white/10 hover:bg-white/12 hover:text-bone-50";
const chipOn = "bg-ember-400 text-ink-950 ring-ember-400";
const select = "min-h-11 rounded-full bg-ink-850 px-4 text-sm font-semibold text-bone-50 ring-1 ring-inset ring-white/15 hover:ring-white/30";

/** One genre's titles with a movies/series toggle and sort, both kept in the URL (?type=, ?sort=). */
export function GenreTitles({ cards, genreName }: { cards: CardData[]; genreName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const typeRaw = params.get("type");
  const sortRaw = params.get("sort") as SortKey | null;
  const type: TypeFilter = typeRaw === "movie" || typeRaw === "series" ? typeRaw : "all";
  const sort: SortKey = sortRaw && SORTS.includes(sortRaw) ? sortRaw : "newest";

  const results = useMemo(() => {
    const filtered = type === "all" ? cards : cards.filter((c) => c.type === type);
    const sorted = sortItems(filtered.map((c) => ({ ...c, genres: c.genres, card: c })), sort);
    return sorted.map((s) => s.card);
  }, [cards, type, sort]);

  const push = (next: { type?: TypeFilter; sort?: SortKey }) => {
    const q = new URLSearchParams();
    const t = next.type ?? type;
    const s = next.sort ?? sort;
    if (t !== "all") q.set("type", t);
    if (s !== "newest") q.set("sort", s);
    const qs = q.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div>
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-3 pb-2">
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => push({ type: t.value })} className={`${chip} ${type === t.value ? chipOn : chipOff}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-bone-200">
          <span>Sort by</span>
          <select className={select} value={sort} onChange={(e) => push({ sort: e.target.value as SortKey })}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <p role="status" aria-live="polite" className="text-sm text-bone-400" data-testid="result-count">
          {plural(results.length, "title")}
        </p>
      </div>
      {results.length === 0 ? (
        <div className="wrap py-12" data-testid="no-results">
          <div className="rounded-panel bg-ink-900 p-10 text-center ring-1 ring-inset ring-white/8">
            <p className="display text-4xl text-bone-50">No {type === "series" ? "series" : "movies"} in {genreName} yet</p>
            <button type="button" onClick={() => push({ type: "all" })} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ember-400 px-6 text-sm font-bold text-ink-950 hover:bg-ember-300">
              Show everything in {genreName}
            </button>
          </div>
        </div>
      ) : (
        <CardGrid cards={results} label={`${genreName} titles`} />
      )}
    </div>
  );
}
