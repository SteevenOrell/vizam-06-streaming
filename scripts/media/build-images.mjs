// Usage: node scripts/media/build-images.mjs <sources.json> <picks.json> <frameDir> <publicMediaDir> <imagesOut.json> [slug ...]
// picks.json: { "<id>": { "t": seconds, "fx": 0..1 poster crop centre-x, "fy": 0..1 backdrop vertical focus, "src": "orig"|"1080p"|"480p", "kind": "title"|"episode" } }
// For kind "title": grabs a frame, writes posters/<id>.webp (600x900) and backdrops/<id>.webp (1920x1080) plus tiny blur data URIs.
//   Low-resolution sources (<= 640 px tall) get a 400x600 poster and a 1280x720 backdrop instead of upscaling hard.
// picks may carry "derive": true to cut from the derive.mjs source (archive.org / Blender mirror) instead of Wikimedia.
// For kind "episode": writes stills/<id>.webp (640x360) only.
// Frames are extracted from the Commons transcode/original (streamed); nothing is rehosted besides these WebP derivatives. No text is added.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { grab, pickUrl } from './frames.mjs';
import { derive } from './derive.mjs';

const [srcFile, picksFile, frameDir, outDir, imagesOut, ...only] = process.argv.slice(2);
const sources = JSON.parse(readFileSync(srcFile, 'utf8'));
const picks = JSON.parse(readFileSync(picksFile, 'utf8'));
const images = existsSync(imagesOut) ? JSON.parse(readFileSync(imagesOut, 'utf8')) : {};
for (const d of ['posters', 'backdrops', 'stills']) mkdirSync(join(outDir, d), { recursive: true });
mkdirSync(frameDir, { recursive: true });

const blur = async (img, w, h) => {
  const b = await img.clone().resize(w, h, { fit: 'cover' }).blur(0.5).webp({ quality: 35 }).toBuffer();
  return 'data:image/webp;base64,' + b.toString('base64');
};
for (const [id, p] of Object.entries(picks)) {
  if (only.length && !only.includes(id)) continue;
  const s = sources[id] || {};
  const frame = join(frameDir, `${id}.png`);
  if (!existsSync(frame)) {
    const url = p.derive ? derive[p.derive === true ? id : p.derive].url : p.src === 'orig' ? s.url : pickUrl(s, p.src || '1080p');
    grab(url, p.t, frame);
  }
  let base = sharp(frame);
  { // trim letterbox/pillarbox bars, but only when they are modest (a dark scene must not be trimmed away)
    const m0 = await base.metadata();
    try {
      const { data, info } = await sharp(frame).trim({ background: '#000000', threshold: 10 }).toBuffer({ resolveWithObject: true });
      if (info.width >= m0.width * 0.75 && info.height >= m0.height * 0.75 && (info.width < m0.width - 4 || info.height < m0.height - 4)) base = sharp(data);
    } catch { /* no bars */ }
  }
  const { width: W, height: H } = await base.metadata();
  if (p.kind === 'episode') {
    await base.clone().resize(640, 360, { fit: 'cover', position: 'centre' }).webp({ quality: 72 }).toFile(join(outDir, 'stills', `${id}.webp`));
    images[id] = { still: `/media/stills/${id}.webp` };
    console.log('still', id, W + 'x' + H);
    continue;
  }
  // poster: 2:3 crop at full frame height, centred on fx
  const cw = Math.min(W, Math.round((H * 2) / 3));
  const left = Math.max(0, Math.min(W - cw, Math.round((p.fx ?? 0.5) * W - cw / 2)));
  const poster = base.clone().extract({ left, top: 0, width: cw, height: H });
  const posterBuf = await poster.toBuffer();
  const low = H <= 640;
  const tiny = H <= 300;
  const [pw, ph] = tiny ? [300, 450] : low ? [400, 600] : [600, 900];
  await sharp(posterBuf).resize(pw, ph, { fit: 'cover' }).webp({ quality: 80 }).toFile(join(outDir, 'posters', `${id}.webp`));
  // backdrop: 16:9 crop
  const ch = Math.min(H, Math.round((W * 9) / 16));
  const cwb = Math.min(W, Math.round((ch * 16) / 9));
  const top = Math.max(0, Math.min(H - ch, Math.round((p.fy ?? 0.5) * H - ch / 2)));
  const bdBuf = await base.clone().extract({ left: Math.round((W - cwb) / 2), top, width: cwb, height: ch }).toBuffer();
  await sharp(bdBuf).resize(tiny ? 960 : low ? 1280 : 1920, tiny ? 540 : low ? 720 : 1080, { fit: 'cover' }).webp({ quality: 76 }).toFile(join(outDir, 'backdrops', `${id}.webp`));
  images[id] = {
    poster: `/media/posters/${id}.webp`,
    backdrop: `/media/backdrops/${id}.webp`,
    posterBlur: await blur(sharp(posterBuf), 12, 18), backdropBlur: await blur(sharp(bdBuf), 16, 9),
  };
  console.log('images', id, W + 'x' + H);
}
writeFileSync(imagesOut, JSON.stringify(images, null, 1));
