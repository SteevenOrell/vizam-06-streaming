"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Trash2, X } from "lucide-react";
import { TitleCard } from "@/components/ui/title-card";
import { buttonClasses } from "@/components/ui/button";
import type { CardData } from "@/lib/content/card";
import { plural } from "@/lib/format";
import { useWatchlist } from "@/lib/watchlist";

type SortMode = "recent" | "az";
type Undo = { slug: string; title: string; index: number } | { cleared: string[] };

const select = "min-h-11 rounded-full bg-ink-850 px-4 text-sm font-semibold text-bone-50 ring-1 ring-inset ring-white/15 hover:ring-white/30";
const UNDO_MS = 8000;

const noopSubscribe = () => () => {};
/** false on the server and during hydration, true afterwards: avoids a hydration mismatch with localStorage data. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Saved titles: grid, sort, remove with undo toast, clear all with confirmation. Everything stays in this browser. */
export function MyListView({ cards }: { cards: CardData[] }) {
  const mounted = useMounted();
  const { list, remove, restore, clear } = useWatchlist();
  const [sort, setSort] = useState<SortMode>("recent");
  const [confirming, setConfirming] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const byslug = useMemo(() => new Map(cards.map((c) => [c.slug, c])), [cards]);
  // Unknown slugs (e.g. a title removed from the catalogue) are ignored, not shown.
  const saved = useMemo(() => list.map((s) => byslug.get(s)).filter((c): c is CardData => Boolean(c)), [list, byslug]);
  const shown = useMemo(() => (sort === "az" ? [...saved].sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" })) : saved), [saved, sort]);

  const showUndo = useCallback((u: Undo) => {
    clearTimeout(timer.current);
    setUndo(u);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!mounted) return <Skeleton />;

  const onRemove = (c: CardData) => {
    showUndo({ slug: c.slug, title: c.title, index: Math.max(0, list.indexOf(c.slug)) });
    remove(c.slug);
  };
  const onClear = () => {
    showUndo({ cleared: [...list] });
    clear();
    setConfirming(false);
  };
  const onUndo = () => {
    if (!undo) return;
    if ("cleared" in undo) undo.cleared.forEach((s, i) => restore(s, i));
    else restore(undo.slug, undo.index);
    clearTimeout(timer.current);
    setUndo(null);
  };

  return (
    <div className="wrap">
      {saved.length === 0 ? (
        <div data-testid="my-list-empty" className="relative overflow-hidden rounded-panel bg-ink-900 px-6 py-16 text-center ring-1 ring-inset ring-white/8 sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[image:var(--glow-ember)]" />
          <div className="relative mx-auto max-w-lg">
            <p className="display text-5xl text-bone-50 sm:text-6xl">Your list is empty</p>
            <p className="mt-4 text-bone-200">
              Use the &ldquo;My List&rdquo; button on any film or series to save it here for later. It is stored in this browser only.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/movies" className={buttonClasses({ size: "lg" })}>
                Browse movies
              </Link>
              <Link href="/trending" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                See what is trending
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm text-bone-200">
              <span>Sort by</span>
              <select className={select} value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                <option value="recent">Recently added</option>
                <option value="az">Title A-Z</option>
              </select>
            </label>
            <p role="status" aria-live="polite" className="text-sm text-bone-400" data-testid="my-list-count">
              {plural(saved.length, "saved title")}
            </p>
            {confirming ? (
              <div role="group" aria-label="Confirm clearing My List" className="flex flex-wrap items-center gap-3 rounded-full bg-ink-900 py-1 pl-4 pr-1 ring-1 ring-inset ring-white/12">
                <span className="text-sm text-bone-50">Remove all {saved.length}?</span>
                <button type="button" onClick={onClear} className={buttonClasses({ size: "md", className: "bg-red-300! text-ink-950! hover:bg-red-200!" })}>
                  Yes, clear list
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={buttonClasses({ variant: "ghost", size: "md" })}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-bone-200 hover:text-bone-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>
          <ul aria-label="Saved titles" className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shown.map((c) => (
              <li key={c.slug} className="flex flex-col gap-2">
                <TitleCard title={c} morph />
                <button
                  type="button"
                  onClick={() => onRemove(c)}
                  aria-label={`Remove ${c.title} from My List`}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/6 px-4 text-sm font-semibold text-bone-200 ring-1 ring-inset ring-white/10 hover:bg-white/12 hover:text-bone-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div aria-live="polite" className="fixed-lock pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" data-testid="undo-region">
        {undo ? (
          <div role="status" className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink-800 py-1.5 pl-5 pr-2 text-sm text-bone-50 shadow-card ring-1 ring-inset ring-white/15">
            <span className="min-w-0 truncate">{"cleared" in undo ? `Cleared ${plural(undo.cleared.length, "title")}` : `Removed ${undo.title}`}</span>
            <button type="button" onClick={onUndo} className={buttonClasses({ size: "md", className: "min-h-10 shrink-0" })}>
              Undo
            </button>
            <button type="button" aria-label="Dismiss" onClick={() => setUndo(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-bone-200 hover:bg-white/10">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="wrap" aria-busy="true" data-testid="my-list-loading">
      <p className="sr-only" role="status">
        Loading your list
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="aspect-[2/3] animate-pulse rounded-card bg-ink-850" />
        ))}
      </ul>
    </div>
  );
}
