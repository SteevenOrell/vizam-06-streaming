import Image from "next/image";
import Link from "next/link";
import type { Title } from "@/lib/content/types";
import { routes } from "@/lib/content/routes";
import { Badge } from "./badge";

type Props = {
  title: Title;
  variant?: "poster" | "landscape";
  badge?: string;
  /** Set on the first visible cards of the first rail only */
  priority?: boolean;
  className?: string;
};

const SIZES = {
  poster: "(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 42vw",
  landscape: "(min-width: 1280px) 24vw, (min-width: 768px) 36vw, 78vw",
};

/**
 * Poster (2:3, ref 2) or landscape (16:9, ref 1) card. Fixed aspect ratio + clamped title keeps every card in a rail
 * the same size. The whole card is one link; the visible title is its accessible name.
 */
export function TitleCard({ title, variant = "poster", badge, priority = false, className = "" }: Props) {
  const isPoster = variant === "poster";
  const src = isPoster ? title.images.poster : title.images.backdrop;
  const blur = isPoster ? title.images.posterBlur : title.images.backdropBlur;
  return (
    <Link
      href={routes.title(title)}
      className={`group/card flex flex-col gap-2.5 rounded-card outline-offset-4 ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-card bg-ink-850 shadow-card ring-1 ring-inset ring-white/5 ${isPoster ? "aspect-[2/3]" : "aspect-video"}`}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={SIZES[variant]}
          priority={priority}
          placeholder={blur ? "blur" : "empty"}
          blurDataURL={blur}
          className="object-cover transition-transform duration-500 ease-cinema group-hover/card:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[image:var(--scrim-card)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
        {badge ? (
          <Badge tone="ember" className="absolute bottom-2 left-1/2 -translate-x-1/2">
            {badge}
          </Badge>
        ) : null}
      </div>
      <div className="min-h-[2.75rem]">
        <p className="line-clamp-1 text-sm font-semibold text-bone-50 group-hover/card:text-ember-200">{title.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-bone-400">
          {title.year} · {title.type === "movie" ? "Film" : "Series"}
          {title.genres[0] ? ` · ${title.genres[0].name}` : ""}
        </p>
      </div>
    </Link>
  );
}
