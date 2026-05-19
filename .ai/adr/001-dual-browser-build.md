# ADR 001 — Builds Chromium et Firefox

**Statut :** Accepté  
**Date :** 2026-05-19  
**Contexte :** Phase 0 — pilote Claude, navigateurs Chromium + Firefox.

## Décision

- **Chromium (Chrome / Edge)** : pipeline actuel **Vite + `@crxjs/vite-plugin`**, manifest MV3, service worker module.
- **Firefox** : second pipeline **WXT** ou **vite + web-ext** (Phase 6), manifest MV3 Firefox, même code métier.
- **Code partagé** : `src/core/*`, `src/extension/sites/*`, `src/extension/platform/*`.
- **API navigateur** : passer par `src/extension/platform/` (`getExtensionApi()`, storage, messaging) — jamais `chrome.*` direct dans le métier.

## Détection runtime

```ts
getBrowserFamily(): 'chromium' | 'firefox'
```

Utilisé dans la télémétrie (`browser`) et les tests.

## Firefox — distribution

Add-on **signé Mozilla**, distribution **non répertoriée**, XPI hébergé en HTTPS interne (cf. plan MVP).

## Conséquences

- Deux artefacts de build en CI (`npm run build`, `npm run build:firefox` à ajouter Phase 6).
- Tests manuels ×2 sur chaque jalon DOM.
- Polyfill `webextension-polyfill` seulement si APIs divergent (promises) — à évaluer à l’intégration Firefox.

## Alternatives écartées

| Alternative | Raison |
|-------------|--------|
| Un seul manifest | Firefox et Chromium divergent (clés mineures, review AMO) |
| `webextension-polyfill` dès Phase 0 | Complexité prématurée ; abstraction maison suffit |
| Safari | Hors scope MVP |
