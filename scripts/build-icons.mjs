/**
 * Génère icons/icon-{16,48,128}.png (icônes de l'extension) depuis le logo assets/logo.jpg :
 * recadrage carré par taille, puis tuile sombre aux coins arrondis (lisible sur
 * barre d'outils claire comme sombre).
 * Usage : npm i --no-save sharp && node scripts/build-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Zones du logo source (1408×768) : bouclier complet pour 48/128 ; à 16 px le détail devient
// illisible, on ne garde que le bouclier intérieur et sa serrure.
const FULL_SHIELD = { left: 404, top: 84, width: 600, height: 600 };
const INNER_SHIELD = { left: 590, top: 300, width: 230, height: 230 };
const CROPS = { 16: INNER_SHIELD, 48: FULL_SHIELD, 128: FULL_SHIELD };

const logo = join(root, 'assets', 'logo.jpg');
await mkdir(join(root, 'icons'), { recursive: true });

for (const [key, crop] of Object.entries(CROPS)) {
  const size = Number(key);
  const radius = Math.round(size * 0.2);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  const png = await sharp(logo)
    .extract(crop)
    .resize(size, size, { kernel: 'lanczos3' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const out = join(root, 'icons', `icon-${size}.png`);
  await writeFile(out, png);
  console.log(`✓ icons/icon-${size}.png (${png.length} B)`);
}
