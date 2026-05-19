import { access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const required = ['dist/manifest.json', 'dist/service-worker-loader.js'];

for (const file of required) {
  const path = join(root, file);
  await access(path);
  console.log(`OK ${file}`);
}

console.log('dist artefact verified');
