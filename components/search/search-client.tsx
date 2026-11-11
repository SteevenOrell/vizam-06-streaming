"use client";

import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Search, X } from "lucide-react";
import { TitleCard } from "@/components/ui/title-card";
import { buttonClasses } from "@/components/ui/button";
import type { CardData } from "@/lib/content/card";
import { routes } from "@/lib/content/routes";
import {
  MAX_QUERY_LENGTH,
  parseQuery,
  parseTypeFilter,
  searchEntries,
  type SearchEntry,
  type SearchTypeFilter,
} from "@/lib/content/search";
import { formatRuntime, plural } from "@/lib/format";
import { SEARCH_INPUT_ID, consumeSearchFocus } from "@/lib/search-focus";

type Props = {
  entries: SearchEntry[];
  genres: { slug: string; name: string }[];
  trending: CardData[];
};

const TYPES: { value: SearchTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
];
const chip = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors";
const chipOff = "bg-white/6 text-bone-200 ring-white/10 hover:bg-white/12 hover:text-bone-50";
const chipOn = "bg-ember-400 text-ink-950 ring-ember-400";
const DEBOUNCE_MS = 250;

/** Instant client-side search. The query lives in the URL (?q=, ?type=), written after a short debounce. */
export function SearchClient({ entries, genres, trending }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => parseQuery(params.get("q")));
  const [type, setType] = useState<SearchTypeFilter>(() => parseTypeFilter(params.get("type")));

  useEffect(() => {
    if (consumeSearchFocus()) inputRef.current?.focus();
  }, []);

  // Debounced URL sync (replace, so typing does not fill the history).
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams();
      const trimmed = parseQuery(query);
      if (trimmed) q.set("q", trimmed);
      if (type !== "all") q.set("type", type);
      const qs = q.toString();
      const current = new URLSearchParams(window.location.search).toString();
      // history.replaceState is synchronous and integrated with the Next router (no stale async navigation can win).
      if (qs !== current) window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, type, pathname]);

  const clean = parseQuery(query);
  const results = useMemo(() => searchEntries(entries, clean, type), [entries, clean, type]);
  const [top, ...rest] = results;

  return (
    <div className="wrap">
      <form role="search" aria-label="Site search" onSubmit={(e) => e.preventDefault()} className="relative max-w-2xl">
        <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
          Search titles, genres or people
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-400" aria-hidden="true" />
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="search"
          value={query}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (query) {
                e.preventDefault();
                setQuery("");
              } else inputRef.current?.blur();
            }
          }}
          placeholder="Search titles, genres or people"
          autoComplete="off"
          spellCheck={false}
          className="h-14 w-full rounded-full bg-ink-850 pl-12 pr-14 text-base text-bone-50 ring-1 ring-inset ring-white/10 placeholder:text-bone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-bone-200 hover:bg-white/10 hover:text-bone-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-sm bg-white/8 px-2 py-0.5 text-xs font-semibold text-bone-400 ring-1 ring-inset ring-white/10 sm:block"
          >
            /
          </kbd>
        )}
      </form>

      <div role="group" aria-label="Filter by type" className="mt-4 flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)} className={`${chip} ${type === t.value ? chipOn : chipOff}`}>
            {t.label}
          </button>
        ))}
        <p role="status" aria-live="polite" className="ml-1 text-sm text-bone-400" data-testid="result-count">
          {clean ? plural(results.length, "result") : ""}
        </p>
      </div>

      {!clean ? (
        <Suggestions genres={genres} trending={trending} heading="Not sure where to start?" blurb="Try a title, a genre such as Animation, or a name from the credits." />
      ) : results.length === 0 ? (
        <div data-testid="no-results">
          <div className="mt-8 rounded-panel bg-ink-900 p-8 text-center ring-1 ring-inset ring-white/8">
            <p className="display text-4xl text-bone-50">No matches</p>
            <p className="mx-auto mt-3 max-w-md text-bone-200">
              Nothing in the library matches <span className="font-semibold text-bone-50">&ldquo;{clean}&rdquo;</span>
              {type !== "all" ? ` among ${type === "movie" ? "movies" : "series"}` : ""}. Check the spelling or try fewer words.
            </p>
            {type !== "all" ? (
              <button type="button" onClick={() => setType("all")} className={buttonClasses({ size: "md", className: "mt-5" })}>
                Search movies and series
              </button>
            ) : null}
          </div>
          <Suggestions genres={genres} trending={trending} heading="Browse instead" />
        </div>
      ) : (
        <div className="mt-6">
          {top ? <TopResult entry={top} /> : null}
          {rest.length > 0 ? (
            <>
              <h2 className="mt-10 text-xl font-extrabold text-bone-50">More results</h2>
              <ul aria-label="More results" className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {rest.map((r) => (
                  <li key={r.card.slug}>
                    <TitleCard title={r.card} morph />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TopResult({ entry }: { entry: SearchEntry }) {
  const c = entry.card;
  const meta = [
    c.year,
    c.type === "movie" ? "Film" : "Series",
    c.type === "movie" ? formatRuntime(c.runtimeMinutes) : c.episodes ? plural(c.episodes, "episode") : undefined,
    c.genres.map((g) => g.name).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section aria-labelledby="top-result" data-testid="top-result" className="relative flex flex-col overflow-hidden rounded-panel bg-ink-900 ring-1 ring-inset ring-white/8">
      {/* Phone: the backdrop is a bright 16:9 banner above the text. From sm: it sits behind the text, dimmed on the left only. */}
      <div aria-hidden="true" className="relative aspect-[16/9] w-full sm:absolute sm:inset-0 sm:aspect-auto">
        <FadeImage src={c.backdrop} alt="" fill sizes="(min-width: 1280px) 1200px, 100vw" blur={c.backdropBlur} className="object-cover sm:opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/10 to-transparent sm:bg-gradient-to-r sm:from-ink-950 sm:via-ink-950/75 sm:to-transparent" />
      </div>
      <div className="relative -mt-6 max-w-xl p-6 pt-0 sm:mt-0 sm:p-10">
        <p id="top-result" className="eyebrow">
          Top result
        </p>
        <p className="display mt-2 text-4xl text-bone-50 sm:text-6xl">{c.title}</p>
        <p className="mt-2 text-sm text-bone-200">{meta}</p>
        <p className="mt-3 line-clamp-3 text-base leading-relaxed text-bone-200">{entry.synopsis}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={routes.title(c)} className={buttonClasses({ size: "lg" })}>
            <Play aria-hidden="true" />
            <span>View {c.title}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Suggestions({
  genres,
  trending,
  heading,
  blurb,
}: {
  genres: { slug: string; name: string }[];
  trending: CardData[];
  heading: string;
  blurb?: string;
}) {
  return (
    <section aria-label="Suggestions" className="mt-10" data-testid="search-suggestions">
      <h2 className="text-xl font-extrabold text-bone-50">{heading}</h2>
      {blurb ? <p className="mt-1 text-bone-200">{blurb}</p> : null}
      <ul aria-label="Genres" className="mt-4 flex flex-wrap gap-2">
        {genres.map((g) => (
          <li key={g.slug}>
            <Link href={routes.genre(g.slug)} className={`${chip} ${chipOff}`}>
              {g.name}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/trending" className={`${chip} ${chipOn}`}>
            Trending picks
          </Link>
        </li>
      </ul>
      <ul aria-label="Trending titles" className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {trending.map((c) => (
          <li key={c.slug}>
            <TitleCard title={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}
