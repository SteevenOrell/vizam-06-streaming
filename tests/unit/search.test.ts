import { describe, expect, it } from "vitest";
import { MAX_QUERY_LENGTH, normaliseText, parseQuery, parseTypeFilter, searchEntries, type SearchEntry } from "@/lib/content/search";

function entry(
  slug: string,
  title: string,
  over: Partial<SearchEntry> & { type?: "movie" | "series"; year?: number; genres?: string[] } = {},
): SearchEntry {
  return {
    card: {
      slug,
      type: over.type ?? "movie",
      title,
      year: over.year ?? 2010,
      genres: (over.genres ?? ["Drama"]).map((n) => ({ slug: n.toLowerCase(), name: n })),
      poster: "/p.webp",
      backdrop: "/b.webp",
      seasons: 0,
      episodes: 0,
      isNew: false,
    },
    originalTitle: over.originalTitle,
    synopsis: over.synopsis ?? "",
    people: over.people ?? [],
  };
}

const entries = [
  entry("sintel", "Sintel", { synopsis: "A girl searches for her dragon.", people: ["Colin Levy"], genres: ["Fantasy", "Animation"] }),
  entry("the-general", "The General", { year: 1926, synopsis: "A train engineer chases his locomotive.", people: ["Buster Keaton"], genres: ["Comedy"] }),
  entry("spring", "Spring", { synopsis: "A shepherd girl and the seasons.", people: ["Andy Goralczyk"] }),
  entry("amelie", "Amélie", { originalTitle: "Le Fabuleux Destin", synopsis: "Paris.", year: 2001 }),
  entry("cinema-spring", "Springtime in the Cinema", { synopsis: "Short." }),
  entry("hub", "Hubblecast", { type: "series", synopsis: "Space telescope news.", people: ["Dr J Spring"] }),
];

describe("normaliseText", () => {
  it("lowercases, strips accents and collapses punctuation", () => {
    expect(normaliseText("  Amélie: La  Vie!! ")).toBe("amelie la vie");
  });
});

describe("parseQuery", () => {
  it("trims, collapses whitespace and strips control characters", () => {
    expect(parseQuery("  big \t buck\u0000 bunny ")).toBe("big buck bunny");
  });
  it("limits length and rejects non-strings", () => {
    expect(parseQuery("x".repeat(500))).toHaveLength(MAX_QUERY_LENGTH);
    expect(parseQuery(undefined)).toBe("");
    expect(parseQuery(42)).toBe("");
  });
  it("parses the type filter defensively", () => {
    expect(parseTypeFilter("series")).toBe("series");
    expect(parseTypeFilter("<script>")).toBe("all");
    expect(parseTypeFilter(null)).toBe("all");
  });
});

describe("searchEntries", () => {
  const slugs = (q: string, t?: "all" | "movie" | "series") => searchEntries(entries, q, t).map((e) => e.card.slug);

  it("returns nothing for an empty query", () => {
    expect(slugs("   ")).toEqual([]);
  });
  it("is case- and diacritic-insensitive", () => {
    expect(slugs("AMELIE")).toEqual(["amelie"]);
    expect(slugs("amélie")).toEqual(["amelie"]);
  });
  it("ranks title prefix > title contains > people > synopsis", () => {
    // exact title > title prefix > people
    expect(slugs("spring")).toEqual(["spring", "cinema-spring", "hub"]);
    expect(slugs("gen")[0]).toBe("the-general");
    expect(slugs("ntel")).toEqual(["sintel"]);
  });
  it("matches people, genres, synopsis, original title and year", () => {
    expect(slugs("keaton")).toEqual(["the-general"]);
    expect(slugs("animation")).toEqual(["sintel"]);
    expect(slugs("dragon")).toEqual(["sintel"]);
    expect(slugs("fabuleux")).toEqual(["amelie"]);
    expect(slugs("1926")).toEqual(["the-general"]);
  });
  it("requires every word to match somewhere", () => {
    expect(slugs("girl dragon")).toEqual(["sintel"]);
    expect(slugs("girl zzz")).toEqual([]);
  });
  it("filters by type", () => {
    expect(slugs("spring", "series")).toEqual(["hub"]);
    expect(slugs("spring", "movie")).not.toContain("hub");
  });
  it("copes with regex-like and over-long input", () => {
    expect(slugs(".*(")).toEqual([]);
    expect(() => slugs("a".repeat(10_000))).not.toThrow();
  });
});
