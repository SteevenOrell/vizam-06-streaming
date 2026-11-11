// Usage:
//   node scripts/media/encode.mjs hero    <inputUrlOrFile> <startSec> <durSec> <outDirPublicMedia> <id>
//   node scripts/media/encode.mjs preview <inputUrlOrFile> <startSec> <durSec> <outDirPublicMedia> <id>
// hero:    public/media/hero/<id>.mp4 (H.264 main, faststart, 1280x720, CRF 28, no audio), <id>.webm (VP9, CRF 36), <id>-poster.webp
// preview: public/media/previews/<id>.mp4 (H.264, 640x360, CRF 30, no audio)
// Both get a 0.5 s fade in/out so the loop restarts softly. Frames are cropped to 16:9 (cover); audio is dropped.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
const [mode, input, start, dur, outDir, id] = process.argv.slice(2);
const UA = ['-user_agent', 'afterlight-media-research/1.0 (portfolio concept)'];
const hero = mode === 'hero';
const [W, H] = hero ? [1280, 720] : [640, 360];
const dir = join(outDir, hero ? 'hero' : 'previews');
mkdirSync(dir, { recursive: true });
const vf = `scale=-2:${H}:flags=lanczos,crop=${W}:${H},fade=t=in:st=0:d=0.5,fade=t=out:st=${Number(dur) - 0.5}:d=0.5,format=yuv420p`;
const base = (extra) => ['-y', '-v', 'error', ...(input.startsWith('http') ? UA : []), '-ss', start, '-t', dur, '-i', input, '-an', '-vf', vf, ...extra];
const run = (a) => execFileSync(ffmpeg, a, { stdio: 'inherit', timeout: 600000 });
const mp4 = join(dir, `${id}.mp4`);
run([...base(['-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', hero ? '28' : '31', '-maxrate', hero ? '2200k' : '700k', '-bufsize', hero ? '4400k' : '1400k', '-movflags', '+faststart']), mp4]);
console.log(mp4, (statSync(mp4).size / 1e6).toFixed(2) + ' MB');
if (hero) {
  const webm = join(dir, `${id}.webm`);
  run([...base(['-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2']), webm]);
  console.log(webm, (statSync(webm).size / 1e6).toFixed(2) + ' MB');
  const png = join(dir, `${id}-poster.png`);
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', '3', '-i', mp4, '-frames:v', '1', png]);
  await sharp(png).webp({ quality: 76 }).toFile(join(dir, `${id}-poster.webp`));
  console.log('poster ok');
}
