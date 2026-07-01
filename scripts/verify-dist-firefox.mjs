import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'dist-firefox/manifest.json',
  'dist-firefox/service-worker-loader.js',
];

for (const file of required) {
  await access(join(root, file));
  console.log(`OK ${file}`);
}

const manifestPath = join(root, 'dist-firefox/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const geckoId = manifest.browser_specific_settings?.gecko?.id;
if (!geckoId) {
  throw new Error('manifest Firefox sans browser_specific_settings.gecko.id');
}
console.log(`OK gecko.id=${geckoId}`);

const expectedHosts = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];
for (const host of expectedHosts) {
  const pattern = `*://${host}/*`;
  if (!(manifest.host_permissions ?? []).includes(pattern)) {
    throw new Error(`manifest Firefox sans ${pattern}`);
  }
  console.log(`OK host_permissions ${pattern}`);
}

console.log('dist-firefox artefact verified');
