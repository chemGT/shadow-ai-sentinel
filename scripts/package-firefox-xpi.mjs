/**
 * Empaquette dist-firefox/ en .xpi (ZIP) pour soumission Mozilla ou hébergement interne.
 * Le fichier produit n’est pas signé — la signature vient d’AMO après review.
 */
import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'dist-firefox');
const outFile = join(root, 'dist-firefox', 'shadow-ai-sentinel-unsigned.xpi');

await access(join(srcDir, 'manifest.json'));

const zip = process.platform === 'win32' ? 'powershell' : 'zip';
const args =
  process.platform === 'win32'
    ? [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path "${srcDir}\\*" -DestinationPath "${outFile}" -Force`,
      ]
    : ['-r', outFile, '.'];

const result = spawnSync(zip, args, {
  cwd: process.platform === 'win32' ? root : srcDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`XPI (non signé) : ${outFile}`);
