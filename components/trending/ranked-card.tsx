import Link from "next/link";
import type { CardData } from "@/lib/content/card";
import { routes } from "@/lib/content/routes";
import { FadeImage } from "@/components/ui/fade-image";

/**
 * Ranked card: an oversized outlined numeral sits behind and to the left of the poster. The whole card is one link;
 * the rank is read out as part of its name ("1. Sintel").
 */
export function RankedCard({ rank, title, priority = false }: { rank: number; title: CardData; priority?: boolean }) {
  return (
    <Link href={routes.title(title)} className="group/rank relative flex h-full @container items-end rounded-card outline-offset-4" aria-label={`Number ${rank}: ${title.title}`}>
      <span aria-hidden="true" className={`rank-num display pointer-events-none absolute bottom-0 left-0 select-none leading-[0.72] ${rank >= 10 ? "text-[56cqw] tracking-[-0.05em]" : "text-[80cqw]"}`}>
        {rank}
      </span>
      <span className="relative ml-auto block aspect-[2/3] w-[62%] overflow-hidden rounded-card bg-ink-850 shadow-card ring-1 ring-inset ring-white/8 m-lift group-hover/rank:scale-[1.03] group-focus-visible/rank:scale-[1.03]">
        <FadeImage
          src={title.poster}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 12vw, (min-width: 640px) 20vw, 36vw"
          blur={title.posterBlur}
          className="object-cover"
        />
      </span>
    </Link>
  );
}
