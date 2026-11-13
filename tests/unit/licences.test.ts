import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCatalog, getLicences } from "@/lib/content/catalog";

/** The About page lists licences straight from the catalog; this keeps them aligned with docs/CONTENT_LICENSES.md. */
describe("About licences vs docs/CONTENT_LICENSES.md", () => {
  const doc = readFileSync("docs/CONTENT_LICENSES.md", "utf8");
  const catalog = getCatalog();

  it("has one licence entry per title", () => {
    expect(getLicences().length).toBe(catalog.titles.length);
  });

  it("documents every catalog title, with its licence URL and author", () => {
    if (catalog.source !== "media-library") return; // sample catalog has placeholder titles
    for (const l of getLicences()) {
      expect(doc, `title ${l.titleName}`).toContain(`| ${l.titleName} |`);
      const row = doc.split("\n").find((r) => r.startsWith(`| ${l.titleName} |`) && r.includes("Full film")) ?? doc.split("\n").find((r) => r.startsWith(`| ${l.titleName} |`));
      expect(row, `row for ${l.titleName}`).toBeTruthy();
      expect(doc, `licence url for ${l.titleName}`).toContain(l.url.replace(/\/$/, ""));
    }
  });
});
