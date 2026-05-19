import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.dom.test.ts'],
    environment: 'node',
    env: {
      API_KEYS: 'acme-corp:dev-secret-change-me',
    },
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/backend/**'],
      exclude: ['**/*.test.ts', '**/*.dom.test.ts', 'src/backend/server.ts'],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 45,
        statements: 55,
      },
    },
  },
});
