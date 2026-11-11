import { describe, expect, it } from "vitest";
import {
  applyBrowse,
  decadeOf,
  facets,
  filterItems,
  parseBrowseParams,
  sortItems,
  toQueryString,
  type BrowseItem,
} from "@/lib/content/browse";

const g = (name: string) => ({ slug: name.toLowerCase(), name });
const items: BrowseItem[] = [
  { slug: "a", title: "Zeta", year: 1926, runtimeMinutes: 76, genres: [g("Comedy")] },
  { slug: "b", title: "alpha", year: 2008, runtimeMinutes: 11, genres: [g("Animation"), g("Comedy")] },
  { slug: "c", title: "Beta", year: 2012, runtimeMinutes: 12, genres: [g("Sci-Fi")] },
  { slug: "d", title: "Gamma", year: 2019, genres: [g("Animation")] },
  { slug: "e", title: "Delta", year: 2010, runtimeMinutes: 96, episodes: 4, genres: [g("Horror")] },
];
const slugs = (xs: BrowseItem[]) => xs.map((x) => x.slug);
const SORTS = ["newest", "oldest", "az", "shortest", "longest"] as const;

describe("browse sort", () => {
  it("sorts newest and oldest", () => {
    expect(slugs(sortItems(items, "newest"))).toEqual(["d", "c", "e", "b", "a"]);
    expect(slugs(sortItems(items, "oldest"))).toEqual(["a", "b", "e", "c", "d"]);
  });
  it("sorts A-Z ignoring case", () => {
    expect(slugs(sortItems(items, "az"))).toEqual(["b", "c", "e", "d", "a"]);
  });
  it("sorts by runtime with missing runtimes last in both directions", () => {
    expect(slugs(sortItems(items, "shortest"))).toEqual(["b", "c", "a", "e", "d"]);
    expect(slugs(sortItems(items, "longest"))).toEqual(["e", "a", "c", "b", "d"]);
  });
  it("does not mutate the input", () => {
    const copy = [...items];
    sortItems(items, "az");
    expect(items).toEqual(copy);
  });
});

describe("browse filter", () => {
  it("filters by genre and decade, combinable", () => {
    expect(slugs(filterItems(items, { genre: "comedy", sort: "az" }))).toEqual(["a", "b"]);
    expect(slugs(filterItems(items, { decade: 2010, sort: "az" }))).toEqual(["c", "d", "e"]);
    expect(slugs(applyBrowse(items, { genre: "animation", decade: 2000, sort: "az" }))).toEqual(["b"]);
    expect(filterItems(items, { genre: "western", sort: "az" })).toEqual([]);
  });
  it("computes decades and genre facets", () => {
    expect(decadeOf(2019)).toBe(2010);
    const f = facets(items);
    expect(f.decades).toEqual([1920, 2000, 2010]);
    expect(f.genres[0].count).toBe(2);
  });
});

describe("browse URL params", () => {
  const p = (q: string) => parseBrowseParams(new URLSearchParams(q), SORTS);
  it("parses valid params", () => {
    expect(p("genre=comedy&decade=2010&sort=az")).toEqual({ genre: "comedy", decade: 2010, sort: "az" });
  });
  it("falls back on invalid values (untrusted input)", () => {
    expect(p("genre=<script>&decade=2013&sort=evil")).toEqual({ genre: undefined, decade: undefined, sort: "newest" });
    expect(p("")).toEqual({ genre: undefined, decade: undefined, sort: "newest" });
  });
  it("rejects a sort not allowed for the page", () => {
    expect(parseBrowseParams(new URLSearchParams("sort=episodes"), SORTS).sort).toBe("newest");
  });
  it("round-trips and omits defaults", () => {
    expect(toQueryString({ sort: "newest" }, "newest")).toBe("");
    expect(toQueryString({ genre: "comedy", decade: 1920, sort: "az" }, "newest")).toBe("?genre=comedy&decade=1920&sort=az");
  });
});
