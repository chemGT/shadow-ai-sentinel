import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.firefox.json';

/** Artefact Firefox MV3 — même sources que Chromium, manifest Gecko. */
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist-firefox',
    emptyOutDir: true,
  },
});
