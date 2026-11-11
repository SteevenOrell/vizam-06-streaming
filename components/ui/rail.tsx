"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "./section-header";

type Props = {
  id: string;
  title: string;
  eyebrow?: string;
  seeAllHref?: string;
  variant?: "poster" | "landscape";
  children: ReactNode;
};

const ITEM_WIDTH = {
  // Card widths: equal per rail, sized so a partial next card always peeks (signals scrollability).
  poster: "w-[42vw] sm:w-[28vw] md:w-[22vw] lg:w-[17vw] xl:w-[14.5vw] max-w-[15rem]",
  landscape: "w-[78vw] sm:w-[46vw] md:w-[36vw] lg:w-[28vw] xl:w-[23vw] max-w-[24rem]",
};

/**
 * Horizontal rail: native scroll-snap, touch/trackpad friendly, prev/next buttons for pointer and keyboard users.
 * Cards stay in the tab order (no roving tabindex), so focusing one scrolls it into view natively.
 */
export function Rail({ id, title, eyebrow, seeAllHref, variant = "poster", children }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 2;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  const headingId = `${id}-title`;
  const navButton =
    "grid h-10 w-10 place-items-center rounded-full bg-white/8 text-bone-50 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/16 disabled:opacity-30 disabled:hover:bg-white/8";

  return (
    <section aria-labelledby={headingId} className="py-6">
      <SectionHeader
        id={headingId}
        eyebrow={eyebrow}
        title={title}
        seeAllHref={seeAllHref}
        actions={
          <div className="hidden gap-2 sm:flex">
            <button type="button" className={navButton} onClick={() => page(-1)} disabled={edges.start} aria-controls={id} aria-label={`Previous: ${title}`}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className={navButton} onClick={() => page(1)} disabled={edges.end} aria-controls={id} aria-label={`Next: ${title}`}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        }
      />
      <ul id={id} ref={trackRef} className="rail-track mt-4 pb-2">
        {Children.map(children, (child) => (
          <li className={`shrink-0 ${ITEM_WIDTH[variant]}`}>{child}</li>
        ))}
      </ul>
    </section>
  );
}
