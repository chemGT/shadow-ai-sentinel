import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const required = ['dist/manifest.json', 'dist/service-worker-loader.js'];
const expectedHosts = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];

for (const file of required) {
  const path = join(root, file);
  await access(path);
  console.log(`OK ${file}`);
}

const manifestPath = join(root, 'dist/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const permissions = manifest.host_permissions ?? [];
for (const host of expectedHosts) {
  const pattern = `*://${host}/*`;
  if (!permissions.includes(pattern)) {
    throw new Error(`manifest sans host_permissions ${pattern}`);
  }
  console.log(`OK host_permissions ${pattern}`);
}

console.log('dist artefact verified');
