import type { ReactNode } from "react";

/** Page heading block for index pages (Movies, TV Shows, Genres...). */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[image:var(--glow-ember)]" />
      <div className="wrap relative pb-6 pt-10 sm:pt-16">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display mt-2 text-5xl text-bone-50 sm:text-7xl">{title}</h1>
        {children ? <div className="mt-4 max-w-2xl text-base leading-relaxed text-bone-200">{children}</div> : null}
      </div>
    </div>
  );
}

/** Temporary marker for stubs; removed as each phase builds the page. */
export function StubNotice({ phase }: { phase: string }) {
  return (
    <p className="wrap mt-6 text-sm text-bone-400">
      This page is scaffolded; its full layout arrives in {phase}.
    </p>
  );
}
