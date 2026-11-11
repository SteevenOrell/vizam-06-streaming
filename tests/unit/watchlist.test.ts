import { describe, expect, it } from "vitest";
import { WATCHLIST_KEY, parseWatchlist, readWatchlist, insertSlug, toggleSlug, writeWatchlist } from "@/lib/watchlist";

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(WATCHLIST_KEY, initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("watchlist store", () => {
  it("parses a valid list and de-duplicates", () => {
    expect(parseWatchlist('["sintel","spring","sintel"]')).toEqual(["sintel", "spring"]);
  });
  it("ignores corrupt or malicious storage", () => {
    expect(parseWatchlist("not json")).toEqual([]);
    expect(parseWatchlist('{"a":1}')).toEqual([]);
    expect(parseWatchlist('["Bad Slug","<img>"]')).toEqual([]);
    expect(parseWatchlist(null)).toEqual([]);
  });
  it("toggles slugs, newest first", () => {
    expect(toggleSlug([], "sintel")).toEqual(["sintel"]);
    expect(toggleSlug(["sintel"], "spring")).toEqual(["spring", "sintel"]);
    expect(toggleSlug(["spring", "sintel"], "spring")).toEqual(["sintel"]);
  });
  it("round-trips through storage and survives a throwing storage", () => {
    const s = memoryStorage();
    writeWatchlist(s, ["a", "b"]);
    expect(readWatchlist(s)).toEqual(["a", "b"]);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readWatchlist(broken)).toEqual([]);
    expect(() => writeWatchlist(broken, ["a"])).not.toThrow();
  });
});

describe("insertSlug (undo position)", () => {
  it("re-inserts at the original index, clamped, without duplicates", () => {
    expect(insertSlug(["a", "c"], "b", 1)).toEqual(["a", "b", "c"]);
    expect(insertSlug(["a"], "z", 99)).toEqual(["a", "z"]);
    expect(insertSlug(["a"], "z", -3)).toEqual(["z", "a"]);
    expect(insertSlug(["a", "b"], "a", 1)).toEqual(["a", "b"]);
  });
});
