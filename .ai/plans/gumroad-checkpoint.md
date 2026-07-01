# Checkpoint — Chantier Gumroad (freemium)

> **But de ce fichier** : permettre de reprendre le travail après un `/clear` du contexte, à froid.
> À **mettre à jour à la fin de chaque session** (section « Journal » + statuts).
> Plan complet : `~\.claude\plans\review-le-projet-donne-nested-minsky.md`

---

## Résumé décision (ne pas re-débattre)

Pivot **Gumroad-first, freemium** pour une 1ʳᵉ vente rapide, **sans** dépendre du SaaS multi-tenant
(conservé pour plus tard, non supprimé).

- **Free** (produit d'appel, zéro config, zéro réseau) : détection `api_key` + `generic_secret`,
  Block/Redact sur Claude/ChatGPT/Gemini.
- **Pro** (clé de licence Gumroad, lifetime) : PII (`iban`, `internal_ip`, `pro_email`, `phone`)
  + scan pièces jointes + règles/allowlists.
- Extension **gratuite** sur les stores ; Gumroad vend une **clé de licence** vérifiée côté client.

---

## État actuel (dernier checkpoint : 2026-07-01)

**Vert** : `npx tsc --noEmit` OK · `npm test` = **211 tests** · `npm run build` OK.
Branche : `sprint/s1-make-sellable`. Commits faits jusqu'à `a5e67c3` (S1-allowlist livré).

### ✅ Fait
- **Modèle d'entitlement (core, pur, testé)** : `src/core/licensing/entitlement.ts`
  (`applyEntitlementToPolicy`, `FREE_RULE_TYPES`, `PRO_RULE_TYPES`, `isFileScanAllowed`,
  `isProEntitlement`) + `verify.ts` (API Gumroad). Exporté via `core/index.ts`.
- **Gating** : la policy effective désactive les règles Pro en Free ; scan fichiers gaté par
  `isFileScanEnabled()` — câblé dans `content/index.tsx` → adapters (claude/chatgpt/gemini) →
  `guard-adapter.ts` → `file-guard.ts`.
- **License-manager (background)** : `src/extension/background/license-manager.ts`
  (`activateLicense`, `refreshEntitlement`, `deactivateLicense`, `entitlementFromCheck` pur avec
  **grâce offline 7 j**). Re-check quotidien via `LICENSE_REFRESH_ALARM` (`alarms.ts`).
- **Messages** : `GET_ENTITLEMENT` / `ACTIVATE_LICENSE` / `DEACTIVATE_LICENSE`.
- **Stockage** : entitlement, licenseKey, stats + **allowlist** (`getAllowlist/setAllowlist`,
  clé `sentinel_allowlist`, dedup/trim) dans `platform/storage.ts` + `core/constants.ts`.
- **Popup** : statut, compteurs, badge tier, activation licence, CTA Pro, i18n FR/EN.
- **Manifest** : `action`/popup, host `https://api.gumroad.com/*`, wildcard retiré.
- **Config build** : `src/extension/config.ts` (`VITE_GUMROAD_PRODUCT_ID/_URL`, `LICENSE_GRACE_DAYS`).
- **✅ Allowlist anti faux-positifs (Jalon 2, tâche #3) — TERMINÉ** :
  - `evaluateGuard(text, policy, allowlist?)` filtre les matches dont la valeur exacte est
    allowlistée (`content/analyze.ts` + `normalizeAllowlistValue`, insensible casse/espaces).
  - Câblage **Pro-gated** : `content/index.tsx` (`effectiveAllowlist()` = allowlist seulement si Pro,
    réaction au changement storage `sentinel_allowlist`) → adapters → `guard-adapter.ts` (`runGuard`)
    + `file-guard.ts`.
  - Options : sections **Licence Pro** (activer/retirer) + **Allowlist** (textarea 1 valeur/ligne).
  - Tests : filtrage allowlist dans `analyze.test.ts` (5 cas, 211 tests au total).

### ⏳ Ensuite (Jalon 3 & 4)
- (Option différée) « Ignorer cette valeur » depuis la modale Block — nécessite de passer la valeur
  matchée à `showBlockAlert` (`ui-host.tsx`), plus lourd.
- Assets stores (icônes 16/48/128, captures, descriptions EN/FR, justif permissions, privacy page).
- Soumission CWS + AMO. Landing 1 page + produit Gumroad (clé de licence activée).
- Audit sécurité/RGPD de sortie (skill `security-review` + personas `.ai/agents/`).

---

## Reprise rapide (à froid)

```bash
cd C:/Dev/projects/shadow-ai-sentinel
npm test                 # doit être vert (211+)
npx tsc --noEmit         # doit être vide
npm run build            # Chromium → dist/
```
Charger `dist/` via `chrome://extensions` (mode dev) pour tester la popup + le gating + l'allowlist.

### Architecture de gating (à connaître)
- Tout passe par `getPolicy()` côté content. `applyEntitlementToPolicy` produit la policy effective.
- L'entitlement vit dans `chrome.storage.local` (clé `sentinel_entitlement`), lu par le content et
  la popup ; mis à jour par le license-manager (background). Défaut = Free.
- L'allowlist vit dans `sentinel_allowlist` ; appliquée **uniquement en Pro** (`effectiveAllowlist`).
- Vérif licence Gumroad **côté client** (contournable, assumé pour du prosumer — pas de DRM serveur).

### À configurer avant vente (non bloquant dev)
- `VITE_GUMROAD_PRODUCT_ID` + `VITE_GUMROAD_PRODUCT_URL` (env de build) une fois le produit Gumroad créé.

---

## Journal des checkpoints
- **2026-07-01** — Jalons 1 & 2 (core) livrés : licensing + gating + license-manager + popup +
  manifest. 206 tests verts. Allowlist démarrée (`evaluateGuard` fait, câblage restant).
- **2026-07-01** — **Allowlist terminée** (4 milestones committés jusqu'à `a5e67c3`) : storage +
  câblage Pro-gated (content → adapters → guards) + UI options (licence + allowlist) + tests.
  211 tests verts, tsc + build OK.
