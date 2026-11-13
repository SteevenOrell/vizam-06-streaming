// Usage: node scripts/media/captions.mjs <outDir> <report.json> [lang=en]
// For every video in titles.mjs, fetches the Commons TimedText SRT (if one exists), converts it to WebVTT and saves
// <outDir>/<slug>[-sXeY].<lang>.vtt. Writes a report of what exists.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { titles } from './titles.mjs';
const [outDir, report, lang = 'en'] = process.argv.slice(2);
const UA = 'afterlight-media-research/1.0 (portfolio concept)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(outDir, { recursive: true });
const jobs = [];
for (const t of titles) {
  if (t.file) jobs.push([t.slug, t.file]);
  for (const s of t.seasons || []) for (const e of s.episodes) jobs.push([`${t.slug}-s${s.number}e${e.number}`, e.file]);
}
const rep = {};
for (const [id, file] of jobs) {
  const u = new URL('https://commons.wikimedia.org/w/index.php');
  u.search = new URLSearchParams({ title: `TimedText:${file.replace(/^File:/, '')}.${lang}.srt`, action: 'raw' });
  let r, txt = '';
  for (let a = 0; a < 3; a++) { r = await fetch(u, { headers: { 'User-Agent': UA } }); txt = await r.text(); if (r.status !== 429) break; await sleep(4000 * (a + 1)); }
  const cues = (txt.match(/-->/g) || []).length;
  if (r.ok && cues > 3) {
    const vtt = 'WEBVTT\n\n' + txt.replace(/\r/g, '').trim().replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') + '\n';
    writeFileSync(join(outDir, `${id}.${lang}.vtt`), vtt);
    rep[id] = { lang, cues, source: u.toString().replace('action=raw', 'action=raw') };
  } else rep[id] = { lang, cues: 0, status: r.status };
  console.log(id, rep[id].cues);
  await sleep(1200);
}
writeFileSync(report, JSON.stringify(rep, null, 1));
