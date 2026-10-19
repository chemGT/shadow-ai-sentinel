/**
 * Empaquette les builds pour les stores et la GitHub Release, dans `release/` :
 *   - shadow-ai-sentinel-vX.Y.Z-chromium.zip          → Chrome Web Store (upload tel quel)
 *   - shadow-ai-sentinel-vX.Y.Z-firefox-unsigned.xpi  → addons.mozilla.org (signé par AMO après review)
 *   - shadow-ai-sentinel-vX.Y.Z-source.zip            → sources exigées par AMO (code minifié par Vite)
 *   - SHA256SUMS.txt
 *
 * Prérequis : `dist/` et `dist-firefox/` construits (`npm run package` les construit d'abord),
 * `zip` et `git` dans le PATH. L'archive source vient de `git archive HEAD` : les modifications
 * non commitées n'y figurent pas, d'où l'avertissement sur un arbre de travail modifié.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'release');

function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (result.error) {
    throw new Error(`${cmd} introuvable (${result.error.message})`);
  }
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} a échoué :\n${result.stderr}`);
  }
  return result.stdout;
}

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

// 1. Une seule version partout : package.json, les deux manifestes sources et les deux builds.
const version = (await readJson('package.json')).version;
for (const file of [
  'manifest.json',
  'manifest.firefox.json',
  'dist/manifest.json',
  'dist-firefox/manifest.json',
]) {
  const v = (await readJson(file)).version;
  if (v !== version) {
    throw new Error(`${file} : version ${v} ≠ package.json ${version} (rebuild ou bump manquant)`);
  }
}
const tag = `v${version}`;

if (run('git', ['status', '--porcelain']).trim() !== '') {
  console.warn('ATTENTION : arbre de travail modifié — l’archive source ne contient que HEAD.');
}

// 2. Archives. `-X` : pas d'attributs étendus ; `-D` : pas d'entrées de répertoire.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir);

const artifacts = [
  { dir: 'dist', name: `shadow-ai-sentinel-${tag}-chromium.zip` },
  { dir: 'dist-firefox', name: `shadow-ai-sentinel-${tag}-firefox-unsigned.xpi` },
];
for (const { dir, name } of artifacts) {
  await access(join(root, dir, 'manifest.json'));
  run('zip', ['-qrXD', join(outDir, name), '.'], join(root, dir));
}

const sourceName = `shadow-ai-sentinel-${tag}-source.zip`;
run('git', [
  'archive',
  '--format=zip',
  `--prefix=shadow-ai-sentinel-${tag}/`,
  '-o',
  join(outDir, sourceName),
  'HEAD',
]);

// 3. Empreintes (format `sha256sum`, vérifiable avec `sha256sum -c SHA256SUMS.txt`).
const names = [...artifacts.map((a) => a.name), sourceName];
const lines = [];
for (const name of names) {
  const hash = createHash('sha256')
    .update(await readFile(join(outDir, name)))
    .digest('hex');
  lines.push(`${hash}  ${name}`);
}
await writeFile(join(outDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);

for (const line of lines) console.log(line);
console.log(`Paquets ${tag} → release/`);
