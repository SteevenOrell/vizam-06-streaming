import type { ReactNode } from "react";

type Tone = "ember" | "outline" | "muted" | "solid";

const tones: Record<Tone, string> = {
  /** "New", "Short film" on cards (ref 1 badges) */
  ember: "bg-ember-400 text-ink-950",
  /** Type pill in hero meta: "MOVIE" / "SERIES" (ref 2) */
  outline: "text-ember-300 ring-1 ring-inset ring-ember-400/60",
  /** Genre pills (ref 3 secondary) */
  muted: "bg-white/10 text-bone-200",
  /** Active genre pill (ref 3 primary) */
  solid: "bg-bone-50 text-ink-950",
};

export function Badge({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
