# Tests automatisés — Shadow AI Sentinel

> Périmètre agent `qa_tester` · exécution locale et CI GitHub.

## Commandes

| Commande | Description |
|----------|-------------|
| `npm test` | Tous les tests (Vitest, mode run) |
| `npm run test:watch` | Mode interactif |
| `npm run test:ci` | CI : run + couverture (seuils `src/core`, `src/backend`) |
| `npm run test:regex` | Moteur regex + régression |
| `npm run test:api` | Backend uniquement |
| `npm run ci` | `test:ci` + `build` (équivalent pipeline) |

## Structure

```
src/
├── core/
│   ├── regex-engine.test.ts      # Détecteurs unitaires
│   ├── regex-regression.test.ts  # Jeu versionné (fixtures)
│   └── validation/*.test.ts    # Policy & télémétrie
├── backend/
│   ├── api.integration.test.ts   # supertest /health /policies /telemetry
│   ├── rate-limit.test.ts
│   └── …
├── extension/
│   ├── content/analyze.test.ts
│   └── sites/claude/dom.dom.test.ts  # happy-dom
└── test/fixtures/
    └── regex-regression.ts       # Cas positifs / négatifs
```

## CI (GitHub Actions)

Fichier : [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

Déclenché sur `push` / `pull_request` vers `master` ou `main` :

1. `npm ci`
2. `npm run test:ci`
3. `npm run build`
4. `node scripts/verify-dist.mjs`

## Jeu de régression regex

Modifier **`src/test/fixtures/regex-regression.ts`** pour ajouter un cas.  
Les tests `regex-regression.test.ts` échouent en CI si un pattern casse un cas connu.

## Perf (seuil)

`regex-engine.test.ts` : analyse ~10k caractères **&lt; 50 ms** (p95 cible pilote).

## Hors scope CI (manuel)

- Interception DOM sur claude.ai connecté → `functional_tester`
- Firefox build → Phase 6
- Docker compose smoke → `docker compose up` post-merge optionnel

## Critères merge

- [ ] `npm run ci` vert en local
- [ ] CI GitHub verte sur la PR
- [ ] Nouveau pattern regex → cas ajouté dans `regex-regression.ts`
