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
