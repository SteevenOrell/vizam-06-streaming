"use client";

import { Check, Plus } from "lucide-react";
import { buttonClasses } from "./button";
import { useWatchlist } from "@/lib/watchlist";

/** Toggle for My List. aria-pressed reflects state; the label names the title for screen readers. */
export function WatchlistButton({
  slug,
  title,
  size = "lg",
  className = "",
}: {
  slug: string;
  title: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { has, toggle } = useWatchlist();
  const saved = has(slug);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Add"} ${title} ${saved ? "from" : "to"} My List`}
      onClick={() => toggle(slug)}
      className={buttonClasses({ variant: "secondary", size, className })}
      data-testid="watchlist-toggle"
    >
      {saved ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      <span>{saved ? "In My List" : "My List"}</span>
    </button>
  );
}
