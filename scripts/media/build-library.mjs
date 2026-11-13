// Usage: node scripts/media/build-library.mjs <sources.json> <verified.json> <images.json> <captionsReport.json> <heroes.json> <contentOut.json> <licencesOut.md> [picksOld.json picksNew.json]
// picksNew.json (derive-based picks) and derive.mjs name the archive.org / Blender / ESA copy every frame, loop and preview was cut from.
// Assembles content/media-library.json and docs/CONTENT_LICENSES.md from titles.mjs plus the measured data.
// heroes.json: { "<slug>": { "hero": {start,dur,source}, "preview": {start,dur,source} } }  (cut points, documented as modifications)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { titles } from './titles.mjs';
import { derive } from './derive.mjs';
const [srcF, verF, imgF, capF, heroF, outJson, outMd, picksOldF, picksNewF] = process.argv.slice(2);
const rd = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {});
const sources = rd(srcF), verified = rd(verF), images = rd(imgF), caps = rd(capF), heroes = rd(heroF), picksOld = rd(picksOldF), picksNew = rd(picksNewF);
const SA = (name) => (/BY-SA/.test(name) ? ' Adaptation shared under the same licence (CC BY-SA).' : '');
const dsrc = (key) => { const d = derive[key]; return d ? `${d.host} copy ${d.page}${d.note ? ' (' + d.note + ')' : ''}; rights shown there: ${d.rights}` : 'unknown'; };
const imgSrc = (id) => { const p = picksNew[id]; if (p?.derive) return dsrc(p.derive === true ? id : p.derive); return picksOld[id] ? 'Wikimedia Commons transcode of the same file (single frame streamed)' : 'unknown'; };
const AUTHOR = {
  'big-buck-bunny': 'Blender Foundation (Blender Institute)', 'elephants-dream': 'Blender Foundation (Blender Institute)', sintel: 'Blender Foundation (Blender Institute)',
  'tears-of-steel': 'Blender Foundation (Blender Institute)', 'cosmos-laundromat': 'Blender Foundation (Blender Institute)', spring: 'Blender Studio',
  'sprite-fright': 'Blender Studio', charge: 'Blender Studio', 'wing-it': 'Blender Studio', caminandes: 'Blender Foundation (Pablo Vazquez)',
  'fleischer-superman': 'Fleischer Studios', 'felix-the-cat-1958': 'Joe Oriolo', hubblecast: 'ESA/Hubble (European Space Agency)',
};
const PD_URL = 'https://creativecommons.org/publicdomain/mark/1.0/';
const wikiUrl = (f) => 'https://commons.wikimedia.org/wiki/' + encodeURI(f.replace(/ /g, '_'));
const licOf = (id, t, file) => {
  const s = sources[id];
  const pd = /public domain/i.test(s?.licence || '');
  const author = AUTHOR[t.slug] || t.credits.directors.join(', ');
  const name = pd ? 'Public domain (US; per Wikimedia Commons file page)' : s.licence;
  return { name, url: pd ? PD_URL : s.licenceUrl, attribution: pd ? `"${t.title}" (${t.year}), ${author}. Public domain. Source: Wikimedia Commons.` : `"${t.title}" (${t.year}) by ${author}, ${s.licence}. Source: Wikimedia Commons.`, sourceUrl: wikiUrl(file), author };
};
const VT = 'video/webm; codecs="vp9, opus"';
const srcList = (id) => {
  const v = (verified[id] || []).filter((x) => x.status === 206 || x.status === 200);
  const by = (p) => v.find((x) => x.url.includes(`.${p}.vp9.webm`));
  const pick = [by('1080p'), by('480p')].filter(Boolean);
  if (!pick.length) { // low-resolution sources only have smaller transcodes: use the best one available
    const all = v.filter((x) => /\.(\d+)p\.vp9\.webm$/.test(x.url)).sort((p, q) => Number(q.url.match(/\.(\d+)p\.vp9/)[1]) - Number(p.url.match(/\.(\d+)p\.vp9/)[1]));
    if (all[0]) pick.push(all[0]);
  }
  return pick.map((x) => ({ url: x.url, type: VT }));
};
const heroVideos = (slug) => {
  const h = heroes[slug]; const out = [];
  if (h?.hero) out.push({ kind: 'hero-loop', src: [{ url: `/media/hero/${slug}-hero.mp4`, type: 'video/mp4; codecs="avc1.4d401f"' }, { url: `/media/hero/${slug}-hero.webm`, type: 'video/webm; codecs="vp9"' }], poster: `/media/hero/${slug}-hero-poster.webp`, durationSeconds: h.hero.dur, captions: [], host: 'local' });
  if (h?.preview) out.push({ kind: 'preview', src: [{ url: `/media/previews/${slug}-preview.mp4`, type: 'video/mp4; codecs="avc1.4d401f"' }, { url: `/media/previews/${slug}-preview.webm`, type: 'video/webm; codecs="vp9"' }], poster: `/media/previews/${slug}-preview-poster.webp`, durationSeconds: h.preview.dur, captions: [], host: 'local' });
  return out;
};
const feat = (id, t, file, img, ep) => {
  const s = sources[id]; const srcs = srcList(id);
  const c = caps[id]?.cues > 0 ? [{ src: `/media/captions/${id}.en.vtt`, lang: 'en', label: 'English' }] : [];
  return { kind: ep ? 'episode' : s.duration >= 2400 ? 'feature' : 'short', src: srcs, poster: img, durationSeconds: Math.round(s.duration), captions: c, host: 'wikimedia' };
};
const lib = [], rows = [];
const row = (title, asset, url, author, lic, attr, mods) => rows.push(`| ${title} | ${asset} | ${url} | ${author} | ${lic} | ${attr} | ${mods} |`);
for (const t of titles) {
  if (!images[t.slug]?.poster) { console.log('SKIP (no images yet)', t.slug); continue; }
  const isS = t.type === 'series';
  const firstId = isS ? `${t.slug}-s1e${t.seasons[0].episodes[0].number}` : t.slug;
  const licenceFor = licOf(firstId, t, isS ? t.seasons[0].episodes[0].file : t.file);
  const img = images[t.slug] || {};
  const mods = 'Posters, backdrops, hero loops and previews are derived frames/cuts (see docs/CONTENT_LICENSES.md); full films are streamed unmodified from Wikimedia Commons.';
  const entry = { id: t.slug, slug: t.slug, type: t.type, title: t.title, year: t.year, runtimeMinutes: 0, genres: t.genres, synopsis: t.synopsis, tagline: t.tagline, rating: { source: 'none' }, credits: t.credits, licence: { ...licenceFor, modifications: mods }, images: img, videos: [] };
  const m = heroes[t.slug];
  if (!isS) {
    const f = feat(t.slug, t, t.file, img.backdrop);
    entry.runtimeMinutes = Math.round(sources[t.slug].duration / 60);
    entry.videos = [f, ...heroVideos(t.slug)];
    row(t.title, 'Full film (streamed)', wikiUrl(t.file), licenceFor.author, `${licenceFor.name} ${licenceFor.url}`, licenceFor.attribution, 'None (hosted by Wikimedia Commons, not copied)');
  } else {
    entry.seasons = t.seasons.map((s) => ({ number: s.number, episodes: s.episodes.map((e) => {
      const id = `${t.slug}-s${s.number}e${e.number}`;
      const el = licOf(id, { ...t, title: `${t.title}: ${e.title}`, year: e.year }, e.file);
      const still = images[id]?.still;
      row(`${t.title}, ep. ${e.number} "${e.title}"`, 'Episode (streamed) + still', wikiUrl(e.file), el.author, `${el.name} ${el.url}`, el.attribution, still ? `Still: single frame cut from ${imgSrc(id)}, cropped 16:9, resized, WebP. No logos or title cards.${SA(el.name)}` : 'No still');
      return { number: e.number, title: e.title, synopsis: e.synopsis, runtimeMinutes: Math.max(1, Math.round(sources[id].duration / 60)), still, videos: [feat(id, t, e.file, still, true)] };
    }) }));
    const rt = entry.seasons.flatMap((s) => s.episodes.map((e) => e.runtimeMinutes));
    entry.runtimeMinutes = Math.round(rt.reduce((a, b) => a + b, 0) / rt.length);
    entry.videos = heroVideos(t.slug);
  }
  row(t.title, 'Poster (2:3) and backdrop (16:9) + blur placeholders', licenceFor.sourceUrl, licenceFor.author, `${licenceFor.name} ${licenceFor.url}`, licenceFor.attribution, `Frame cut from: ${imgSrc(t.slug)}. Cropped, resized, WebP. No title text, logos or title cards used.${SA(licenceFor.name)}`);
  if (m?.hero) row(t.title, `Hero loop ${m.hero.dur}s (MP4 + WebM + poster)`, licenceFor.sourceUrl, licenceFor.author, `${licenceFor.name} ${licenceFor.url}`, licenceFor.attribution, `Cut from ${dsrc(m.hero.from)} at ${m.hero.start}s for ${m.hero.dur}s; scaled/cropped to 1280x720, audio removed, 0.5 s fades, re-encoded H.264 + VP9.${SA(licenceFor.name)}`);
  if (m?.preview) row(t.title, `Card preview ${m.preview.dur}s (MP4 + WebM + poster)`, licenceFor.sourceUrl, licenceFor.author, `${licenceFor.name} ${licenceFor.url}`, licenceFor.attribution, `Cut from ${dsrc(m.preview.from)} at ${m.preview.start}s for ${m.preview.dur}s; 640x360, audio removed, 0.5 s fades, re-encoded H.264 + VP9 (preview poster is a frame of the preview).${SA(licenceFor.name)}`);
  if (caps[t.slug]?.cues > 0) row(t.title, 'English captions (WebVTT)', `https://commons.wikimedia.org/wiki/TimedText:${encodeURI(t.file.replace('File:', '').replace(/ /g, '_'))}.en.srt`, 'Wikimedia Commons contributors', 'Same licence as the film (Commons TimedText)', 'Captions: Wikimedia Commons contributors', 'Converted SRT to WebVTT');
  lib.push(entry);
}
writeFileSync(outJson, JSON.stringify(lib, null, 2) + '\n');
const head = `# Content licences\n\nEvery title, video, image and caption used by AFTERLIGHT. AFTERLIGHT is a fictional streaming concept (VIZAM portfolio project); it sells nothing and shows no ratings. Licence statuses were read from the Wikimedia Commons file page of each film (licence template plus source page); "Public domain" means public domain in the United States as asserted there (not-renewed, expired term or defective notice). Where Commons gives a different licence than the film's own project page, the Commons file page is recorded because that is the file we stream.\n\nCaveats: Cosmos Laundromat and Caminandes 2 are tagged CC BY-SA 3.0 on Commons, so adaptations (posters, backdrops, loops) are shared under the same licence. Felix the Cat (1958) and Superman (Fleischer) are public-domain recordings of characters that remain trademarks; no trademark endorsement is implied, and no logos or title cards are used as images (Superman frames avoid the chest emblem). Derivation sources: because upload.wikimedia.org rate-limits non-browser clients, every poster, backdrop, still, loop and preview added after the first slice was cut from a same-work copy on archive.org, download.blender.org or esahubble.org (named per row, with the rights statement shown there); playback URLs still point to Wikimedia Commons. Felix episode stills are frames from the 1958 series (1990s syndication print on archive.org) and may not belong to the exact episode shown. The Charge frame source is a third-party archive.org upload whose page only says "open and free license"; the film is CC BY 4.0 per Wikimedia Commons. Caminandes 2 is CC BY-SA 3.0 on Commons (the archive.org item says CC BY 3.0); its derivatives are treated as BY-SA.\n\n| Title | Asset | Source URL | Author | Licence | Required attribution | Modifications |\n|---|---|---|---|---|---|---|\n`;
const tail = `\n## What is NOT used\n\n- No commercial posters, trailers, stills, logos or key art. All imagery is frames cut from the open or public-domain films above.\n- No TMDB images or data are stored or rehosted (TMDB is optional server-side enrichment, with its own attribution, and absent from this library).\n- No Envato Elements files or other stock assets are in this folder or repository.\n- No ratings are invented: \`rating\` is \`{"source":"none"}\` for every title.\n- Full films are streamed from Wikimedia Commons (upload.wikimedia.org, CORS \`Access-Control-Allow-Origin: *\`, range requests supported); they are never committed to git.\n`;
writeFileSync(outMd, head + rows.join('\n') + '\n' + tail);
console.log('titles', lib.length, 'rows', rows.length);
