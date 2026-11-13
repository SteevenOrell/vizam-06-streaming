import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("TMDB wider-film feed (mocked fetch)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("makes no request and returns [] without a key", async () => {
    vi.stubEnv("TMDB_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getWiderFilmFeed } = await import("@/lib/tmdb");
    expect(await getWiderFilmFeed()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a valid payload to text-only records (no images)", async () => {
    vi.stubEnv("TMDB_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        respond({
          page: 1,
          results: [
            { id: 1, title: "Example Film", overview: "An   example\n overview.", release_date: "2024-05-01", poster_path: "/x.jpg" },
            { id: 2, title: "", overview: "no title" },
            { id: 3, title: "No Overview", overview: "" },
            { id: 4, title: "Undated", overview: "x".repeat(400) },
          ],
        }),
      ),
    );
    const { getWiderFilmFeed } = await import("@/lib/tmdb");
    const feed = await getWiderFilmFeed(6);
    expect(feed.map((f) => f.title)).toEqual(["Example Film", "Undated"]);
    expect(feed[0]).toEqual({ id: 1, title: "Example Film", year: 2024, overview: "An example overview." });
    expect(feed[1].year).toBeUndefined();
    expect(feed[1].overview.length).toBeLessThanOrEqual(221);
    expect(JSON.stringify(feed)).not.toContain("poster");
  });

  it("returns [] for an invalid payload", async () => {
    vi.stubEnv("TMDB_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(() => respond({ unexpected: true })));
    const { getWiderFilmFeed } = await import("@/lib/tmdb");
    expect(await getWiderFilmFeed()).toEqual([]);
  });

  it("returns [] on a non-OK status", async () => {
    vi.stubEnv("TMDB_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(() => respond({ status_message: "Invalid API key" }, 401)));
    const { getWiderFilmFeed } = await import("@/lib/tmdb");
    expect(await getWiderFilmFeed()).toEqual([]);
  });

  it("returns [] on a network error and never logs the key", async () => {
    vi.stubEnv("TMDB_API_KEY", "super-secret-key-value");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("network down"))));
    const warn = vi.spyOn(console, "warn");
    const { getWiderFilmFeed } = await import("@/lib/tmdb");
    expect(await getWiderFilmFeed()).toEqual([]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("super-secret-key-value");
  });
});
