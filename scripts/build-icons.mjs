/**
 * Rastérise assets/icon.svg vers icons/icon-{16,48,128}.png (icônes de l'extension).
 * Usage : node scripts/build-icons.mjs
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [16, 48, 128];

const svg = await readFile(join(root, 'assets', 'icon.svg'));
await mkdir(join(root, 'icons'), { recursive: true });

for (const size of SIZES) {
  const out = join(root, 'icons', `icon-${size}.png`);
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(out, png);
  console.log(`✓ icons/icon-${size}.png (${png.length} B)`);
}
