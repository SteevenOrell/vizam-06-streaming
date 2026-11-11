// Frame tools (ffmpeg-static + sharp). Run from the project root. Paths as arguments.
//   node scripts/media/frames.mjs sheet <sources.json> <outDir> <slug> [<slug> ...]
//       -> <outDir>/<slug>.sheet.png : 8 candidate frames (480p) with timestamps, for choosing a poster/backdrop frame
//   node scripts/media/frames.mjs grab <sources.json> <slug> <seconds> <out.png> [res=1080p|480p]
//       -> one full-size frame from the Wikimedia Commons transcode (streamed with HTTP range seeking; nothing else downloaded)
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

export function pickUrl(src, res) {
  const want = res || '480p';
  const d = src.deriv.find((x) => x.type.startsWith('video/webm') && x.src.includes(`.${want}.vp9.webm`));
  if (d) return d.src;
  const any = src.deriv.filter((x) => x.type.startsWith('video/webm') && /\.\d+p\.vp9\.webm$/.test(x.src));
  return (any.find((x) => x.src.includes('.480p.')) || any[any.length - 1]).src;
}
export function grab(url, sec, out, scale) {
  const args = ['-y', '-v', 'error', '-user_agent', 'afterlight-media-research/1.0 (portfolio concept)', '-ss', String(sec), '-i', url, '-frames:v', '1'];
  if (scale) args.push('-vf', `scale=${scale}`);
  args.push(out);
  for (let n = 0; n < 8; n++) {
    try { execFileSync(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'], timeout: 120000 }); return; } catch (err) { if (n === 7) throw err; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20000); }
  }
}
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'sheet') {
  const [srcFile, outDir, ...slugs] = a;
  const sources = JSON.parse(readFileSync(srcFile, 'utf8'));
  mkdirSync(outDir, { recursive: true });
  const fr = [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.9];
  for (const slug of slugs) {
    const s = sources[slug];
    const url = pickUrl(s, '480p');
    const cells = [];
    for (const f of fr) {
      const t = Math.round(s.duration * f);
      const p = join(outDir, `${slug}.${t}.jpg`);
      try { if (!existsSync(p)) { grab(url, t, p, '400:-2'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200); } cells.push({ t, p }); } catch { console.log('fail', slug, t); }
    }
    const W = 400, H = 225;
    const comps = [];
    for (let i = 0; i < cells.length; i++) {
      const img = await sharp(cells[i].p).resize(W, H, { fit: 'contain', background: '#000' }).toBuffer();
      const label = Buffer.from(`<svg width="${W}" height="24"><rect width="100%" height="100%" fill="#000a"/><text x="6" y="17" font-size="15" fill="#fff" font-family="Arial">${slug} ${cells[i].t}s</text></svg>`);
      comps.push({ input: img, left: (i % 4) * W, top: Math.floor(i / 4) * H });
      comps.push({ input: label, left: (i % 4) * W, top: Math.floor(i / 4) * H });
    }
    await sharp({ create: { width: W * 4, height: H * 2, channels: 3, background: '#222' } }).composite(comps).png().toFile(join(outDir, `${slug}.sheet.png`));
    cells.forEach((c) => rmSync(c.p, { force: true }));
    console.log('sheet', slug);
  }
} else if (cmd === 'grab') {
  const [srcFile, slug, sec, out, res] = a;
  const sources = JSON.parse(readFileSync(srcFile, 'utf8'));
  grab(pickUrl(sources[slug], res || '1080p'), sec, out);
  console.log('grabbed', slug, sec);
}
