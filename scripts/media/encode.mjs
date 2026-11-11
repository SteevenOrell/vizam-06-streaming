// Usage:
//   node scripts/media/encode.mjs hero    <inputUrlOrFile> <startSec> <durSec> <outDirPublicMedia> <id>
//   node scripts/media/encode.mjs preview <inputUrlOrFile> <startSec> <durSec> <outDirPublicMedia> <id>
// hero:    public/media/hero/<id>.mp4 (H.264 main, faststart, 1280x720, CRF 28, no audio), <id>.webm (VP9, CRF 36), <id>-poster.webp
// preview: public/media/previews/<id>-preview.mp4 + .webm (640x360, no audio, <= 1.5 MB) and <id>-preview-poster.webp
// Both get a 0.5 s fade in/out so the loop restarts softly. Frames are cropped to 16:9 (cover); audio is dropped.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
const [mode, input, start, dur, outDir, id] = process.argv.slice(2);
const UA = ['-user_agent', 'afterlight-media-research/1.0 (portfolio concept)'];
const hero = mode === 'hero';
const [W, H] = hero ? [1280, 720] : [640, 360];
const dir = join(outDir, hero ? 'hero' : 'previews');
mkdirSync(dir, { recursive: true });
const name = hero ? `${id}-hero` : `${id}-preview`;
const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fade=t=in:st=0:d=0.5,fade=t=out:st=${Number(dur) - 0.5}:d=0.5,format=yuv420p`;
const base = (extra) => ['-y', '-v', 'error', ...(input.startsWith('http') ? [...UA, '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_on_network_error', '1', '-reconnect_delay_max', '4', '-rw_timeout', '30000000'] : []), '-ss', start, '-t', dur, '-i', input, '-an', '-vf', vf, ...extra];
const run = (a) => { for (let n = 0; ; n++) { try { return execFileSync(ffmpeg, a, { stdio: 'inherit', timeout: 600000 }); } catch (e) { if (n >= 3) throw e; console.log('retry', n + 1); } } };
const mp4 = join(dir, `${name}.mp4`);
run([...base(['-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', hero ? '28' : '31', '-maxrate', hero ? '2200k' : '700k', '-bufsize', hero ? '4400k' : '1400k', '-movflags', '+faststart']), mp4]);
console.log(mp4, (statSync(mp4).size / 1e6).toFixed(2) + ' MB');
{
  const webm = join(dir, `${name}.webm`);
  const vp9 = ['-c:v', 'libvpx-vp9', '-crf', hero ? '36' : '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2'];
  // previews: WebM is made from the finished local MP4 (no second network pass, same cut)
  if (hero) run([...base(vp9), webm]); else run(['-y', '-v', 'error', '-i', mp4, '-an', ...vp9, webm]);
  console.log(webm, (statSync(webm).size / 1e6).toFixed(2) + ' MB');
  const png = join(dir, `${name}-poster.png`);
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', '3', '-i', mp4, '-frames:v', '1', png]);
  await sharp(png).webp({ quality: hero ? 76 : 70 }).toFile(join(dir, `${name}-poster.webp`));
  rmSync(png);
  console.log('poster ok');
}
