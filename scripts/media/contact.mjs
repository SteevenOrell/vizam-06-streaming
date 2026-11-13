// Usage: node scripts/media/contact.mjs <out.png> <img1> <img2> ...   (grid of 6 columns, 300px wide cells)
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const W = 300, H = 300, cols = 6;
const comps = [];
for (let i = 0; i < files.length; i++) comps.push({ input: await sharp(files[i]).resize(W, H, { fit: 'inside' }).toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H });
await sharp({ create: { width: W * cols, height: H * Math.ceil(files.length / cols), channels: 3, background: '#111' } }).composite(comps).png().toFile(out);
