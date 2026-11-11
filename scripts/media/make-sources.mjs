// Usage: node scripts/media/make-sources.mjs <out.json> <info1.json> [info2.json ...]
// Merges commons-info output with titles.mjs into a slug -> {file, duration, licence, derivative URLs} map.
import { readFileSync, writeFileSync } from 'node:fs';
import { titles } from './titles.mjs';
const [out, ...infos] = process.argv.slice(2);
const info = Object.assign({}, ...infos.map((f) => JSON.parse(readFileSync(f, 'utf8'))));
const res = {};
const add = (slug, file) => {
  const i = info[file];
  if (!i || i.missing) return console.log('NOINFO', file);
  res[slug] = { file, url: i.url, duration: i.duration, w: i.width, h: i.height, licence: i.licence, licenceUrl: i.licenceUrl, artist: i.artist, deriv: i.derivatives };
};
for (const t of titles) {
  if (t.file) add(t.slug, t.file);
  for (const s of t.seasons || []) for (const e of s.episodes) add(`${t.slug}-s${s.number}e${e.number}`, e.file);
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k, v.licence, Math.round(v.duration) + 's', v.deriv.map((d) => (d.src.match(/\.(\d+p)\.(\w+)\.(\w+)$/) || []).slice(1).join('.')).filter(Boolean).join(' '));
