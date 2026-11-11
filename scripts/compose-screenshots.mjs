/**
 * Compose les captures du store (Chrome Web Store : 1280×800) à partir des sources brutes.
 *   entrée : store-assets/screenshots/raw/*.png  (captures à leur taille native)
 *   sortie : store-assets/screenshots/NN-*.png   (1280×800, fond de marque, légendes en anglais)
 *
 * Chaque scène empile 1 à 2 captures sous un titre. Une capture n'est JAMAIS agrandie (pas de flou) :
 * elle est seulement réduite si la pile dépasse la hauteur disponible. Coins arrondis, étiquettes
 * « avant / après ».
 * Prérequis : `npm i --no-save sharp`. Usage : `node scripts/compose-screenshots.mjs`.
 *
 * Origine des sources : aws-key-*, iban-*, first-launch = captures directes ; gemini-before /
 * gemini-after = images 30 et 69 de `assets/demo-redact-gemini.gif`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'store-assets', 'screenshots', 'raw');
const outDir = join(root, 'store-assets', 'screenshots');

const W = 1280;
const H = 800;
const BG = '#0f122a'; // slate, couleur de marque
const RADIUS = 14;
const TOP = 44;
const CAPTION_H = 84;
const LABEL_H = 44;
const GAP = 22;
const BOTTOM = 36;

const SCENES = [
  {
    out: '01-block-modal.png',
    caption: 'Secrets are blocked before they reach the AI',
    items: [
      { file: 'aws-key-before.png', label: 'You paste an API key into a chat' },
      { file: 'aws-key-after.png', label: 'Shadow AI Sentinel stops the send — nothing leaves your browser' },
    ],
  },
  {
    out: '02-redact-iban.png',
    caption: 'Personal data is redacted automatically',
    items: [
      { file: 'iban-before.png', label: 'You type an IBAN' },
      { file: 'iban-after.png', label: 'It is replaced by a token before sending' },
    ],
  },
  {
    out: '03-redact-gemini.png',
    caption: 'Works across 8 AI sites — here on Gemini',
    items: [
      { file: 'gemini-before.png', label: 'A phone number and a work email' },
      { file: 'gemini-after.png', label: 'Both are masked in place' },
    ],
  },
  {
    out: '04-first-launch.png',
    caption: 'Clear about what it does — and what it does not',
    items: [{ file: 'first-launch.png', label: '' }],
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function textSvg(text, size, weight, color, width) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size + 16}">` +
      `<text x="${width / 2}" y="${size}" text-anchor="middle" font-family="Helvetica, Arial, DejaVu Sans, sans-serif" ` +
      `font-size="${size}" font-weight="${weight}" fill="${color}">${esc(text)}</text></svg>`,
  );
}

async function roundedImage(file, scale) {
  const src = sharp(join(rawDir, file));
  const meta = await src.metadata();
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`,
  );
  const input = await src
    .resize(w, h, { kernel: 'lanczos3' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return { input, w, h };
}

await mkdir(outDir, { recursive: true });

for (const scene of SCENES) {
  const metas = await Promise.all(scene.items.map((i) => sharp(join(rawDir, i.file)).metadata()));
  const labelsH = scene.items.reduce((n, i) => n + (i.label ? LABEL_H : 0), 0);
  const fixed = TOP + CAPTION_H + labelsH + GAP * (scene.items.length - 1) + BOTTOM;
  const sumH = metas.reduce((n, m) => n + m.height, 0);
  const maxW = Math.max(...metas.map((m) => m.width));
  // Jamais d'agrandissement : échelle plafonnée à 1.
  const scale = Math.min(1, (H - fixed) / sumH, (W - 160) / maxW);

  const layers = [];
  layers.push({ input: textSvg(scene.caption, 40, 700, '#ffffff', W), left: 0, top: TOP });
  let y = TOP + CAPTION_H;
  for (const item of scene.items) {
    if (item.label) {
      layers.push({ input: textSvg(item.label, 24, 400, '#a9b2d6', W), left: 0, top: y });
      y += LABEL_H;
    }
    const img = await roundedImage(item.file, scale);
    layers.push({ input: img.input, left: Math.round((W - img.w) / 2), top: y });
    y += img.h + GAP;
  }

  const buffer = await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toBuffer();
  await writeFile(join(outDir, scene.out), buffer);
  console.log(`✓ ${scene.out} → ${W}×${H} (échelle ${scale.toFixed(2)})`);
}
