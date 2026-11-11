import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/content/catalog";
import { routes } from "@/lib/content/routes";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const { titles, genres } = getCatalog();
  const abs = (path: string) => `${site.url}${path}`;
  const fixed = ["/", "/movies", "/tv", "/genres", "/trending", "/search", "/about"].map((p) => ({
    url: abs(p),
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
  return [
    ...fixed,
    ...genres.map((g) => ({ url: abs(routes.genre(g.slug)), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...titles.map((t) => ({ url: abs(routes.title(t)), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
