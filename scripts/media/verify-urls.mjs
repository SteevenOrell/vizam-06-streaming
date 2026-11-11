// Usage: node scripts/media/verify-urls.mjs <sources.json> <out.json>
// Range-requests (bytes=0-1) every playable WebM transcode and reports status, content-type, total bytes and CORS header.
import { readFileSync, writeFileSync } from 'node:fs';
const [srcFile, out] = process.argv.slice(2);
const sources = JSON.parse(readFileSync(srcFile, 'utf8'));
const UA = 'afterlight-media-research/1.0 (portfolio concept)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = {};
const only = process.argv.slice(4);
for (const [slug, s] of Object.entries(sources)) {
  if (only.length && !only.includes(slug)) continue;
  res[slug] = [];
  for (const d of s.deriv) {
    if (!/\.\d+p\.vp9\.webm$/.test(d.src)) continue;
    let r;
    for (let a = 0; a < 4; a++) {
      r = await fetch(d.src, { headers: { Range: 'bytes=0-1', 'User-Agent': UA, Origin: 'https://example.com' } });
      if (r.status !== 429) break;
      await sleep(5000 * (a + 1));
    }
    const total = (r.headers.get('content-range') || '').split('/')[1] || r.headers.get('content-length');
    const rec = { url: d.src, status: r.status, contentType: r.headers.get('content-type'), bytes: Number(total), acao: r.headers.get('access-control-allow-origin'), acceptRanges: r.headers.get('accept-ranges') };
    res[slug].push(rec);
    console.log(slug, d.src.match(/\.(\d+p)\./)[1], rec.status, rec.contentType, Math.round(rec.bytes / 1e6) + 'MB', 'CORS:' + rec.acao);
    await sleep(1500);
  }
}
writeFileSync(out, JSON.stringify(res, null, 1));
