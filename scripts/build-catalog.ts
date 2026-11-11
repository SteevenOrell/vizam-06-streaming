/**
 * Builds content/catalog.json (git-ignored) from:
 *   - content/media-library.json (media pipeline output), or
 *   - content/catalog.sample.json (placeholders) when the library is missing/empty or CATALOG_SOURCE=sample,
 * plus content/editorial.json (hero, trending order, collections, genre blurbs).
 *
 * Both sources are validated with the Zod schemas in lib/content/schema.ts. An invalid media library fails the
 * build loudly (exit 1); it never silently falls back. Run with: node scripts/build-catalog.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EditorialSchema, MediaLibrarySchema } from "../lib/content/schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const libraryPath = join(contentDir, "media-library.json");
const samplePath = join(contentDir, "catalog.sample.json");
const editorialPath = join(contentDir, "editorial.json");
const outPath = join(contentDir, "catalog.json");

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch (err) {
    fail(`${rel(path)} is not valid JSON: ${(err as Error).message}`);
  }
}

function rel(path: string) {
  return path.slice(root.length + 1).replaceAll("\\", "/");
}

function fail(message: string): never {
  console.error(`[catalog] ERROR ${message}`);
  process.exit(1);
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues
    .slice(0, 30)
    .map((i) => `  - ${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

const forceSample = process.env.CATALOG_SOURCE === "sample";
let source: "media-library" | "sample" = "sample";
let items;

if (!forceSample && existsSync(libraryPath)) {
  const parsed = MediaLibrarySchema.safeParse(readJson(libraryPath));
  if (!parsed.success) {
    fail(
      `${rel(libraryPath)} failed validation (set CATALOG_SOURCE=sample to build with placeholders):\n` +
        formatIssues(parsed.error.issues),
    );
  }
  if (parsed.data.length > 0) {
    source = "media-library";
    items = parsed.data;
  }
}

if (!items) {
  const parsed = MediaLibrarySchema.safeParse(readJson(samplePath));
  if (!parsed.success) fail(`${rel(samplePath)} failed validation:\n${formatIssues(parsed.error.issues)}`);
  items = parsed.data;
}

const editorialParsed = EditorialSchema.safeParse(existsSync(editorialPath) ? readJson(editorialPath) : {});
if (!editorialParsed.success) fail(`${rel(editorialPath)} failed validation:\n${formatIssues(editorialParsed.error.issues)}`);

const catalog = {
  source,
  generatedAt: new Date().toISOString(),
  items,
  editorial: editorialParsed.data,
};

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`[catalog] wrote ${rel(outPath)} from ${source} (${items.length} titles)`);
