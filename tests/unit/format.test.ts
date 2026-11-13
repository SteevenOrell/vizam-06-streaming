import { describe, expect, it } from "vitest";
import { publicModifications } from "@/lib/format";

describe("publicModifications", () => {
  it("drops repo paths from public licence text", () => {
    const out = publicModifications("Posters are derived frames (see docs/CONTENT_LICENSES.md); full films are streamed unmodified.");
    expect(out).toBe("Posters are derived frames; full films are streamed unmodified.");
    expect(out).not.toMatch(/docs\//);
  });
  it("returns undefined for empty input", () => {
    expect(publicModifications(undefined)).toBeUndefined();
    expect(publicModifications("  ")).toBeUndefined();
  });
});

describe("metaDescription", () => {
  it("joins tagline and synopsis and cuts at a word boundary", async () => {
    const { metaDescription } = await import("@/lib/format");
    expect(metaDescription({ title: "X", year: 2000, tagline: "Short.", synopsis: "A film." })).toBe("Short. A film.");
    const long = metaDescription({ title: "X", year: 2000, synopsis: "word ".repeat(60) });
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith("word…")).toBe(true);
  });
});
