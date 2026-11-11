// Usage: node scripts/media/commons-licence-tags.mjs <out.json> "File:A.webm" ...
// Pulls the raw wikitext of each Commons file page and extracts the licence templates (e.g. PD-US-not-renewed, cc-by-3.0) and source/author fields.
import { writeFileSync } from 'node:fs';
const [out, ...titles] = process.argv.slice(2);
const UA = 'afterlight-media-research/1.0 (portfolio concept)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = {};
for (const t of titles) {
  const u = new URL('https://commons.wikimedia.org/w/index.php');
  u.search = new URLSearchParams({ title: t, action: 'raw' });
  let txt = '';
  for (let a = 0; a < 4; a++) { const r = await fetch(u, { headers: { 'User-Agent': UA } }); txt = await r.text(); if (r.ok) break; await sleep(3000 * (a + 1)); }
  const lic = txt.split(/==\s*\{\{int:license-header\}\}\s*==/i)[1] || '';
  const tags = [...lic.matchAll(/\{\{([^{}|]+)(?:\|[^{}]*)?\}\}/g)].map((m) => m[1].trim());
  const field = (n) => (txt.match(new RegExp('\|\s*' + n + '\s*=\s*([^\n]*)', 'i')) || [])[1]?.trim() || '';
  res[t] = { tags, source: field('source'), author: field('author'), date: field('date'), description: field('description').slice(0, 300) };
  console.log(t, '=>', tags.join(', '));
  await sleep(1200);
}
writeFileSync(out, JSON.stringify(res, null, 2));
