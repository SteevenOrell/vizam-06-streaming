"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { routes } from "@/lib/content/routes";

export type SearchEntry = {
  slug: string;
  type: "movie" | "series";
  title: string;
  year: number;
  poster: string;
  keywords: string;
};

const fold = (v: string) =>
  v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Phase 0 search: instant client-side filter synced to ?q=. Phase 4 adds ranking UI, filters and empty states. */
export function SearchClient({ index }: { index: SearchEntry[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferred = useDeferredValue(query);
  const inputId = useId();

  const results = useMemo(() => {
    const q = fold(deferred.trim());
    if (!q) return [];
    return index.filter((e) => fold(e.keywords).includes(q));
  }, [deferred, index]);

  return (
    <div className="wrap">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(query ? `${pathname}?q=${encodeURIComponent(query)}` : pathname, { scroll: false });
        }}
        className="relative max-w-2xl"
      >
        <label htmlFor={inputId} className="sr-only">
          Search titles, genres or people
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-400" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, genres or people"
          autoComplete="off"
          className="h-14 w-full rounded-full bg-ink-850 pl-12 pr-5 text-base text-bone-50 ring-1 ring-inset ring-white/10 placeholder:text-bone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
        />
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-bone-400">
        {deferred.trim() ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
      </p>
      <ul className="mt-4 grid gap-2">
        {results.map((r) => (
          <li key={r.slug}>
            <Link href={routes.title(r)} className="font-semibold text-bone-50 hover:text-ember-300">
              {r.title}
            </Link>{" "}
            <span className="text-sm text-bone-400">
              {r.year} · {r.type === "movie" ? "Film" : "Series"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
