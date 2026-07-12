# Sprint R — Résilience : fail-closed + OTA sélecteurs

> Master plan : [master-plan.md](./master-plan.md) · Durée : ~2 semaines (~7 j dev)
> Prérequis : Sprint L terminé (extension en prod sur les stores).
> Objectif : plus jamais d'échec silencieux, et mise à jour des sélecteurs **sans republier**.

---

## Definition of Done

- [x] Sélecteur cassé simulé → bannière visible + état `adapter_broken` en popup (jamais silencieux)
- [x] Policy `fail_mode: "closed"` → envoi réellement bloqué tant que l'adapter est cassé (E2E)
- [ ] Payload OTA altéré/non signé → rejeté, fallback sur sélecteurs embarqués (test)
- [ ] Mise à jour d'un sélecteur en prod via Worker+KV effective sans republication store
- [ ] Décision « Free = zéro réseau » vs OTA actée et reflétée dans la privacy policy
- [ ] Tests verts (vitest + E2E), tsc, builds Chromium/Firefox

## R1 — Health-check adapter + mode dégradé visible (~2 j) ✅ TERMINÉ (2026-07-12)

- **Self-test au chargement** : sur un host supporté, si `findComposerInput()` ne résout aucun
  sélecteur après stabilisation du DOM (retry via MutationObserver, timeout ~10 s) → état
  `adapter_broken` (storage local, lu par la popup).
- **UX** : bannière discrète injectée « Protection inactive sur ce site — mise à jour requise »
  + badge/état dans la popup. i18n FR/EN.
- **Nouveau champ de policy `fail_mode: "open" | "warn" | "closed"`** dans le schéma core :
  - `warn` = **défaut** (bannière seule, pas de friction prosumer) ;
  - `closed` = interception générique au niveau document (keydown Enter + click
    `button[type=submit]` / submit de form) qui **bloque tout envoi** tant que l'adapter est
    cassé — destiné aux policies Team/MDM (Sprint M) ;
  - `open` = comportement actuel, opt-out explicite.
- **Tests** : unitaires sur la machine à états (`core/adapter-health.ts`) + 2 cas E2E
  (`e2e/adapter-health.e2e.ts` — fixture sans composer reconnu, `warn` et `closed`). 245 vitest +
  30 e2e verts, `tsc --noEmit` clean.
- Commit : `feat(guard): fail-closed adapter health-check (Sprint R1)` (`91755a7`,
  `sprint/s1-make-sellable`).

## R2 — Format de payload sélecteurs OTA (~2 j)

- **JSON pur = data, pas de code** (conforme CWS MV3) :
  ```json
  { "schemaVersion": 1, "version": 12, "publishedAt": "…",
    "hosts": { "claude.ai": { /* SelectorConfig */ } } }
  ```
  `SelectorConfig` reprend la forme actuelle des `sites/*/selectors.ts` (chaînes de fallback
  par élément — déjà le modèle de `createSiteDom`).
- **Signature Ed25519 détachée** : clé privée offline (fichier local hors repo, jamais commitée),
  clé publique embarquée dans le build. Vérification WebCrypto dans le service worker.
- **Règles de sûreté** : payload invalide, non signé ou `version` inférieure → ignoré →
  fallback sélecteurs embarqués (jamais pire qu'aujourd'hui).
- **Précédence** : managed policy (Sprint M) > OTA validé > embarqué.
- Commit : `feat(core): signed OTA selector payload format [R2]`.

## R3 — Worker Cloudflare + distribution (~2 j)

- Worker (route sur le domaine `prompt-redact.com` ou sous-domaine dédié) servant le bundle
  depuis **KV**, avec `Cache-Control` + ETag. Un bundle global en v1 (pas de logique tenant).
- Extension : fetch quotidien via une alarm (pattern existant `LICENSE_REFRESH_ALARM`),
  stockage `chrome.storage.local`, host permission ajoutée aux 2 manifests.
- **Décision produit à acter en début de sprint** — promesse actuelle « Free = zéro requête
  réseau » vs fetch OTA :
  - **Reco** : OTA actif par défaut (download de config signée, **aucun payload utilisateur
    sortant**) + reformulation privacy : « aucune donnée ne sort ; seule la configuration
    entre » + opt-out dans Options.
  - Alternative : OTA réservé Pro/Team si on refuse de toucher la promesse.
- **Télémétrie `adapter_broken`** (host + version extension, rien d'autre) → early-warning de
  dérive DOM. Même canal opt-in que la télémétrie existante.
- Commit : `feat(ota): cloudflare worker selector distribution [R3]`.

## R4 — Pipeline de publication (~1 j)

- `scripts/publish-selectors.mjs` : valide le schéma, teste le bundle contre les fixtures E2E
  existantes, signe (Ed25519), pousse en KV via `wrangler`. Runbook dans `.ai/docs/`.
- Commit : `chore(ota): selector publish pipeline [R4]`.

## Sortie → entrée Sprint M

`fail_mode` et la précédence « managed > OTA > embarqué » sont les fondations que le Sprint M
(policies gérées par l'IT) consomme directement.
