/**
 * Normalise raw store screenshots to 1280×800 (Chrome Web Store spec).
 *   input : store-assets/screenshots/raw/*.png|jpg
 *   output: store-assets/screenshots/*.png (same basename, .png)
 *
 * Fits the capture inside 1280×800 on a neutral canvas (no distortion / cropping),
 * so shots of any aspect ratio come out at the exact store size.
 * Usage: node scripts/resize-screenshots.mjs
 */
import { readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, parse } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'store-assets', 'screenshots', 'raw');
const outDir = join(root, 'store-assets', 'screenshots');
const W = 1280;
const H = 800;
const BG = { r: 15, g: 18, b: 42, alpha: 1 }; // slate, matches brand

await mkdir(rawDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const files = (await readdir(rawDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
if (files.length === 0) {
  console.log(`No raw screenshots found in ${rawDir}`);
  console.log('Drop your captures there (e.g. 01-block-modal.png) and re-run.');
  process.exit(0);
}

for (const file of files.sort()) {
  const out = join(outDir, `${parse(file).name}.png`);
  await sharp(join(rawDir, file))
    .resize(W, H, { fit: 'contain', background: BG })
    .png()
    .toFile(out);
  console.log(`✓ ${parse(file).name}.png → ${W}×${H}`);
}
