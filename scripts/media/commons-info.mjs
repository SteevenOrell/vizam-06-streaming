// Usage: node scripts/media/commons-info.mjs <out.json> "File:A.webm" "File:B.webm" ...
// Fetches licence metadata, duration, size and playable transcodes from Wikimedia Commons (polite, throttled).
import { writeFileSync } from 'node:fs';
const [out, ...titles] = process.argv.slice(2);
const UA = 'afterlight-media-research/1.0 (portfolio concept; contact via repo)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = {};
for (const t of titles) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', titles: t, prop: 'videoinfo|imageinfo', viprop: 'url|size|mime|duration|extmetadata|derivatives', iiprop: 'url|size|mime|extmetadata', iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|Copyrighted|ImageDescription|UsageTerms|DateTimeOriginal|ObjectName' });
  let j;
  for (let a = 0; a < 5; a++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    const txt = await r.text();
    try { j = JSON.parse(txt); break; } catch { await sleep(4000 * (a + 1)); }
  }
  const p = j && Object.values(j.query.pages)[0];
  const vi = p?.videoinfo?.[0] ?? p?.imageinfo?.[0];
  if (!p || p.missing !== undefined || !vi) { res[t] = { missing: true }; console.log('MISSING', t); await sleep(1500); continue; }
  const m = vi.extmetadata || {};
  res[t] = { url: vi.url, mime: vi.mime, duration: vi.duration, width: vi.width, height: vi.height, size: vi.size, licence: m.LicenseShortName?.value, licenceUrl: m.LicenseUrl?.value, artist: m.Artist?.value, credit: m.Credit?.value, copyrighted: m.Copyrighted?.value, derivatives: (vi.derivatives || []).map((d) => ({ src: d.src, type: d.type, w: d.width, h: d.height })) };
  console.log('OK', t, res[t].licence, Math.round(res[t].duration || 0) + 's', res[t].width + 'x' + res[t].height);
  await sleep(1500);
}
writeFileSync(out, JSON.stringify(res, null, 2));
