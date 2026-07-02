# CLAUDE.md — Shadow AI Sentinel

Point d'entrée Claude Code. Concis : le détail vit dans `.ai/` (voir renvois en bas).
Les préférences globales de chemGT (style FR, RTK, conventions) s'appliquent en plus — non redupliquées ici.

## Le projet en une ligne

Extension navigateur **MV3 B2B** = **DLP** sur les LLM publics (Claude / ChatGPT / Gemini /
Le Chat / DeepSeek / Perplexity / Grok / Copilot) :
détection **100 % locale** des données sensibles **avant envoi**, modes **Block** ou **Redact**.
Aucun contenu de prompt ne quitte le navigateur ; la télémétrie serveur (optionnelle, tier tenant)
ne porte que des métadonnées.

**Modèle commercial — freemium :**
- **Free** (produit d'appel, zéro config, zéro réseau) : `api_key` + `generic_secret`, Block/Redact.
- **Pro** (clé de licence **Lemon Squeezy**, abo 4 €/mois · 39 €/an) : PII (`iban`, `internal_ip`,
  `pro_email`, `phone`) + scan fichiers **texte/code** + allowlist.
- L'extension est **gratuite sur les stores** ; Lemon Squeezy vend une **clé de licence** vérifiée côté client.

## Commandes & garde-fous

| Commande | Rôle |
|----------|------|
| `npm test` | Vitest — **239 tests, doit être vert** |
| `npm run test:e2e` | Playwright — extension réelle (`dist/`) + fixtures des 8 sites (28 tests) |
| `npx tsc --noEmit` | Typecheck — doit être vide |
| `npm run build` | Typecheck + build extension Chromium → `dist/` |
| `npm run build:firefox` | Build Firefox → `dist-firefox/` |
| `npm run package:firefox` | .xpi signable pour AMO |
| `npm run backend` | API Express locale (port 3000) |

**Reprise à froid :** les 3 premiers verts, puis charger `dist/` via `chrome://extensions`
(mode dev → « charger l'extension non empaquetée ») pour tester popup + gating + allowlist.

## Architecture de gating freemium (l'essentiel)

- Côté content, tout passe par `getPolicy()` → **`applyEntitlementToPolicy`**
  (`src/core/licensing/entitlement.ts`) produit la **policy effective** (désactive les règles Pro en Free).
- **Entitlement** dans `chrome.storage.local` clé **`sentinel_entitlement`** (défaut = Free) : lu par le
  content + la popup, écrit par le **license-manager background**
  (`src/extension/background/license-manager.ts`) — grâce offline `LICENSE_GRACE_DAYS = 7`,
  re-check quotidien `LICENSE_REFRESH_ALARM`.
- **Allowlist** dans clé **`sentinel_allowlist`**, appliquée **uniquement en Pro** (`effectiveAllowlist()`).
- **Vérif licence côté client** (`src/core/licensing/verify.ts`, API publique Lemon Squeezy,
  `activate`/`validate`, pas de secret) — soft-DRM prosumer assumé, contournable.
- **Config build** (env `.env` gitignoré, préfixe `VITE_`) : `src/extension/config.ts` →
  `VITE_LEMONSQUEEZY_STORE_ID`, `VITE_LEMONSQUEEZY_PRODUCT_ID`, `VITE_LEMONSQUEEZY_CHECKOUT_URL`.

## État sprint & prochaine action

- Branche : **`sprint/s1-make-sellable`**. Pivot **Gumroad → Lemon Squeezy** committé (`9b39038`).
- **Prochaine action = Jalon 4** → runbook exécutable **`.ai/plans/plan-vente-lemonsqueezy.md`**
  (créer le produit LS, remplir `.env`, héberger la privacy page, landing 1 page, soumission CWS + AMO).
- Reprise détaillée à froid : **`.ai/plans/checkpoint.md`**.
- ⚠️ Le chantier **portail SaaS Clerk** (`apps/portal/**`, `src/backend/{schema,queries,config,tenant}`,
  `migrations/0003_users_table`) est **hors-scope S1, non committé, volontairement à part** —
  **ne pas le mélanger** aux commits extension.

## Renvois documentation (`.ai/`)

| Fichier | Rôle |
|---------|------|
| `.ai/plans/checkpoint.md` | **Reprise à froid** (statuts, journal, archi gating) |
| `.ai/plans/plan-vente-lemonsqueezy.md` | **Runbook Jalon 4** (vente + déploiement stores) |
| `.ai/context.md` | Vision technique + doc projet + agents |
| `.ai/agents/orchestrator.md` | Délégation multi-agents (tâche large) |
| `.ai/SUIVI-ACTIONS.md` | Suivi des actions / avancement |
| `store-assets/` | Listings EN/FR, permissions, privacy, screenshots 1280×800 |
