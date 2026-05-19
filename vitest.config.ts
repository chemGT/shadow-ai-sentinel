import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: {
      API_KEYS: 'acme-corp:dev-secret-change-me',
    },
  },
});
