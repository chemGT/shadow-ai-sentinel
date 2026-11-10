import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.dom.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts', 'src/extension/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.dom.test.ts'],
      // Seuils = plancher mesuré (2026-11) arrondi vers le bas, pour bloquer une régression.
      // La couverture globale inclut `src/extension/**` et `src/ui/**` : les gardes d'envoi et
      // de fichiers (là où vivaient les défauts fail-open) ne sont plus hors mesure. Les pages
      // popup/options et les sélecteurs de sites sont couverts par l'e2e Playwright, pas ici.
      thresholds: {
        lines: 60,
        functions: 58,
        branches: 55,
        statements: 60,
        'src/core/**': {
          lines: 90,
          functions: 90,
          branches: 80,
          statements: 90,
        },
      },
    },
  },
});
