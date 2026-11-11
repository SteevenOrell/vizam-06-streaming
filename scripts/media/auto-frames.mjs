// Usage: node scripts/media/auto-frames.mjs <sources.json> <frameDir> <picks.json>
// For every title (first episode for series) and episode, extracts one frame at the first candidate position that is
// neither too dark/bright nor flat (uses sharp stats), and records the chosen second in picks.json for build-images.mjs.
// Station: remote Wikimedia transcodes are rate limited, so this runs serially and slowly by design.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
sharp.cache(false);
import { grab, pickUrl } from './frames.mjs';
import { titles } from './titles.mjs';
const [srcFile, frameDir, picksFile] = process.argv.slice(2);
const sources = JSON.parse(readFileSync(srcFile, 'utf8'));
const picks = existsSync(picksFile) ? JSON.parse(readFileSync(picksFile, 'utf8')) : {};
mkdirSync(frameDir, { recursive: true });
const MIRROR = { sintel: 'https://download.blender.org/durian/movies/Sintel.2010.1080p.mkv' };
const jobs = [];
for (const t of titles) {
  if (t.type === 'movie') jobs.push({ id: t.slug, kind: 'title', res: '1080p' });
  else {
    const e1 = t.seasons[0].episodes[0];
    jobs.push({ id: `${t.slug}-s1e${e1.number}`, kind: 'title', res: '1080p', alias: t.slug });
    for (const s of t.seasons) for (const e of s.episodes) jobs.push({ id: `${t.slug}-s${s.number}e${e.number}`, kind: 'episode', res: '480p' });
  }
}
for (const j of jobs) {
  const key = j.alias || j.id; // series poster uses alias id; episode stills keep episode id
  const pid = j.kind === 'episode' ? j.id : key;
  if (picks[pid]?.done) continue;
  const s = sources[j.id];
  const url = MIRROR[j.id] || pickUrl(s, j.res);
  const fr = [0.35, 0.5, 0.22, 0.62, 0.75];
  let ok = false;
  for (const f of fr) {
    const t = Math.round(s.duration * f);
    const p = join(frameDir, `${pid}.png`);
    try { grab(url, t, p); } catch { console.log('grab failed', pid, t); continue; }
    const st = await sharp(p).stats();
    const lum = st.channels.reduce((a, c) => a + c.mean, 0) / st.channels.length;
    const sd = st.channels.reduce((a, c) => a + c.stdev, 0) / st.channels.length;
    console.log(pid, t, 'lum', Math.round(lum), 'sd', Math.round(sd));
    if (lum > 40 && lum < 210 && sd > 40) { picks[pid] = { t, fx: 0.5, fy: 0.5, src: MIRROR[j.id] ? 'mirror' : j.res, kind: j.kind, done: true }; ok = true; break; }
  }
  if (!ok) picks[pid] = { t: Math.round(s.duration * 0.35), fx: 0.5, fy: 0.5, src: j.res, kind: j.kind, done: true, weak: true };
  writeFileSync(picksFile, JSON.stringify(picks, null, 1));
}
console.log('auto-frames done');
