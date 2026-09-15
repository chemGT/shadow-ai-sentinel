import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Vérification de l'artefact Firefox (`dist-firefox`).
 *
 * Le build Firefox est un MV3 « à la Firefox » : le fond est déclaré par
 * `background.scripts` (page d'événements), PAS par un `service_worker`.
 * L'ancienne version de ce script exigeait en dur `dist-firefox/service-worker-loader.js`,
 * un fichier que ce build ne produit pas et ne produira jamais — la CI échouait donc
 * systématiquement (échec constaté sur tous les pushes depuis le 29/08/2026).
 *
 * Principe retenu : on ne liste plus des fichiers en dur, on vérifie que TOUT ce que
 * le manifeste déclare existe réellement sur le disque. Un fichier renommé par le build
 * (hash Vite) ne casse plus la vérification, une entrée réellement manquante la casse.
 */

const root = process.cwd();
const distDir = 'dist-firefox';
const manifestPath = join(root, distDir, 'manifest.json');

await access(manifestPath);
console.log(`OK ${distDir}/manifest.json`);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

// 1. Topologie attendue du fond côté Firefox.
const background = manifest.background ?? {};
if (!Array.isArray(background.scripts) || background.scripts.length === 0) {
  throw new Error('manifest Firefox sans background.scripts (MV3 Firefox attendu)');
}
if (background.service_worker) {
  throw new Error(
    'manifest Firefox avec background.service_worker : le build Firefox doit utiliser background.scripts',
  );
}
console.log(`OK background.scripts (${background.scripts.length})`);

// 2. Chaque fichier déclaré par le manifeste doit exister sur le disque.
const declared = new Set();
const push = (value) => {
  if (typeof value === 'string' && value && !value.includes('*')) declared.add(value);
};

for (const script of background.scripts ?? []) push(script);
for (const cs of manifest.content_scripts ?? []) {
  for (const js of cs.js ?? []) push(js);
  for (const css of cs.css ?? []) push(css);
}
push((manifest.action ?? manifest.browser_action)?.default_popup);
for (const icon of Object.values(manifest.icons ?? {})) push(icon);
for (const icon of Object.values((manifest.action ?? manifest.browser_action)?.default_icon ?? {})) {
  push(icon);
}
for (const war of manifest.web_accessible_resources ?? []) {
  for (const resource of war.resources ?? []) push(resource);
}

if (declared.size === 0) {
  throw new Error('manifest Firefox : aucun fichier déclaré à vérifier');
}
for (const file of [...declared].sort()) {
  await access(join(root, distDir, file));
  console.log(`OK ${distDir}/${file}`);
}
console.log(`OK ${declared.size} fichiers déclarés présents sur le disque`);

// 3. Identifiant gecko (signature AMO) et permissions d'hôtes.
const geckoId = manifest.browser_specific_settings?.gecko?.id;
if (!geckoId) {
  throw new Error('manifest Firefox sans browser_specific_settings.gecko.id');
}
console.log(`OK gecko.id=${geckoId}`);

const expectedHosts = [
  'claude.ai',
  'chatgpt.com',
  'gemini.google.com',
  'chat.mistral.ai',
  'chat.deepseek.com',
  'perplexity.ai',
  'www.perplexity.ai',
  'grok.com',
  'copilot.microsoft.com',
];
const hostPermissions = manifest.host_permissions ?? [];
for (const host of expectedHosts) {
  const pattern = `*://${host}/*`;
  if (!hostPermissions.includes(pattern)) {
    throw new Error(`manifest Firefox sans ${pattern}`);
  }
  console.log(`OK host_permissions ${pattern}`);
}

console.log('dist-firefox artefact verified');
