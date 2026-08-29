import { defineConfig } from '@playwright/test';

/**
 * E2E extension : contexte persistant + extension chargée → 1 worker, pas de
 * parallélisme. Prérequis : `npm run build` (dist/ à jour) — couvert par le
 * script npm `test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
});
