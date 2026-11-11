// Usage: node scripts/media/build-images.mjs <sources.json> <picks.json> <frameDir> <publicMediaDir> <imagesOut.json> [slug ...]
// picks.json: { "<id>": { "t": seconds, "fx": 0..1 poster crop centre-x, "fy": 0..1 backdrop vertical focus, "src": "orig"|"1080p"|"480p", "kind": "title"|"episode" } }
// For kind "title": grabs a frame, writes posters/<id>.webp (600x900), posters/<id>-sm.webp (300x450),
//   backdrops/<id>.webp (1920x1080), backdrops/<id>-sm.webp (960x540) and tiny blur data URIs.
// For kind "episode": writes stills/<id>.webp (640x360) only.
// Frames are extracted from the Commons transcode/original (streamed); nothing is rehosted besides these WebP derivatives. No text is added.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { grab, pickUrl } from './frames.mjs';

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
  const s = sources[id];
  const frame = join(frameDir, `${id}.png`);
  if (!existsSync(frame)) {
    const url = p.src === 'orig' ? s.url : pickUrl(s, p.src || '1080p');
    grab(url, p.t, frame);
  }
  const base = sharp(frame);
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
  await sharp(posterBuf).resize(600, 900, { fit: 'cover' }).webp({ quality: 80 }).toFile(join(outDir, 'posters', `${id}.webp`));
  await sharp(posterBuf).resize(300, 450, { fit: 'cover' }).webp({ quality: 76 }).toFile(join(outDir, 'posters', `${id}-sm.webp`));
  // backdrop: 16:9 crop
  const ch = Math.min(H, Math.round((W * 9) / 16));
  const cwb = Math.min(W, Math.round((ch * 16) / 9));
  const top = Math.max(0, Math.min(H - ch, Math.round((p.fy ?? 0.5) * H - ch / 2)));
  const bdBuf = await base.clone().extract({ left: Math.round((W - cwb) / 2), top, width: cwb, height: ch }).toBuffer();
  await sharp(bdBuf).resize(1920, 1080, { fit: 'cover' }).webp({ quality: 76 }).toFile(join(outDir, 'backdrops', `${id}.webp`));
  await sharp(bdBuf).resize(960, 540, { fit: 'cover' }).webp({ quality: 72 }).toFile(join(outDir, 'backdrops', `${id}-sm.webp`));
  images[id] = {
    poster: `/media/posters/${id}.webp`, posterSmall: `/media/posters/${id}-sm.webp`,
    backdrop: `/media/backdrops/${id}.webp`, backdropSmall: `/media/backdrops/${id}-sm.webp`,
    posterBlur: await blur(sharp(posterBuf), 12, 18), backdropBlur: await blur(sharp(bdBuf), 16, 9),
  };
  console.log('images', id, W + 'x' + H);
}
writeFileSync(imagesOut, JSON.stringify(images, null, 1));
