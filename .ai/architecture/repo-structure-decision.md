# Décision architecture repo — S0-10

**Date** : 2026-06-12  
**Statut** : ✅ Décidé — monorepo plat conservé

---

## Contexte

Le projet a une structure monorepo plat avec 4 zones :

| Zone | Path | Artefact |
|------|------|---------|
| Core | `src/core/` | Moteur de détection (partageable) |
| Extension | `src/extension/` | MV3 Chrome + Firefox (crxjs + Vite) |
| Backend | `src/backend/` | Express telemetry server |
| UI | `src/ui/` | Composants React + i18n |

Deux builds Vite configurés : `vite.config.ts` (Chrome) et `vite.firefox.config.ts` (Firefox).

---

## Options évaluées

### Option A — Monorepo plat (actuel)
**Pour** :
- Zéro refactoring, CI simple
- Builds Chrome + Firefox déjà opérationnels
- TypeScript paths resolvent sans workspace overhead

**Contre** :
- `@sentinel/core` non publiable sur npm en l'état
- Couplage fort backend/extension dans le même `package.json`

### Option B — npm workspaces
**Pour** :
- `packages/core`, `packages/extension`, `packages/backend` séparés
- Permet de publier `@sentinel/core` comme SDK client ultérieurement

**Contre** :
- +1-2 jours de refactoring (déplacements, tsconfig par package)
- CI plus complexe (build ordering, shared deps)
- Aucun besoin client immédiat pour SDK

### Option C — Split repos indépendants
**Pour** : isolation totale CI/CD par composant

**Contre** : overhead git maximal, duplication du code partagé `core/`, synchro des versions

---

## Décision

**Option A maintenue pour Sprint 0-1.**

Raisons :
1. Aucun client n'a demandé un SDK `@sentinel/core` standalone
2. Le premier objectif commercial est un paying customer, pas un SDK
3. Refactoring workspaces = +2j sans valeur livrée en Sprint 1
4. La séparation peut être introduite en Sprint 2 si un prospect demande une intégration SDK

**Trigger pour réévaluer** : premier prospect demandant une intégration non-extension (ex. CASB API, SDK npm), ou au moment où `src/backend/` nécessite un déploiement indépendant avec SLA.

---

## Actions

- [x] Décision documentée
- [ ] (Sprint 2+) Si SDK requis : extraire `src/core/` en `packages/core` avec npm workspaces
