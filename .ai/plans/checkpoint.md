# Checkpoint — Commercialisation freemium (Lemon Squeezy)

> **But de ce fichier** : permettre de reprendre le travail après un `/clear` du contexte, à froid.
> À **mettre à jour à la fin de chaque session** (section « Journal » + statuts).
> Runbook courant (Jalon 4) : `.ai/plans/plan-vente-lemonsqueezy.md` · Contexte Claude : `CLAUDE.md` (racine).

> 🎯 **PROCHAINE ACTION** : **Jalon 4** — créer le produit **Lemon Squeezy** (abo 4 €/mois + 39 €/an,
> license keys activées) → renseigner `VITE_LEMONSQUEEZY_STORE_ID/_PRODUCT_ID/_CHECKOUT_URL` ;
> héberger la privacy page (`store-assets/privacy-policy.md`) à une URL publique ; landing 1 page
> (pricing + checkout Lemon.js, promesse scan fichiers = **texte/code only**) ; soumission CWS + AMO.
> Vérifier d'abord le vert : `npm test` (238) · `npx tsc --noEmit` · `npm run build`.
> ⚠️ Avant soumission : **recette manuelle des 5 nouveaux sites** (M14–M24 de
> `.ai/docs/matrice-tests-multi-llm.md`) — les sélecteurs sont best-effort, non vérifiés post-login.
>
> ⚠️ **PIVOT rail (2026-07-01)** : Gumroad → **Lemon Squeezy** (MoR = TVA UE gérée) + modèle **abo MRR**.
> Migration code faite et committée (`9b39038`, poussée). Voir Journal + [[gumroad-pivot]] (mémoire).

---

## Résumé décision (ne pas re-débattre)

Pivot **freemium, store-first** pour une 1ʳᵉ vente rapide, **sans** dépendre du SaaS multi-tenant
(conservé pour plus tard, non supprimé). Rail de paiement = **Lemon Squeezy** (Merchant of Record :
TVA UE + taxe US gérées) en **abo MRR** (4 €/mois · 39 €/an), et non plus Gumroad lifetime.

- **Free** (produit d'appel, zéro config, zéro réseau) : détection `api_key` + `generic_secret`,
  Block/Redact sur 8 LLM (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot).
- **Pro** (clé de licence **Lemon Squeezy**, abo) : PII (`iban`, `internal_ip`, `pro_email`, `phone`)
  + scan fichiers texte/code + règles/allowlists.
- Extension **gratuite** sur les stores ; Lemon Squeezy vend une **clé de licence** vérifiée côté client.

---

## État actuel (dernier checkpoint : 2026-07-02)

**Vert** : `npx tsc --noEmit` OK · `npm test` = **217 tests** · `npm run build` OK.
Branche : `sprint/s1-make-sellable`. Commits jusqu'à `b0de026`. Le **pivot Gumroad → Lemon Squeezy
est committé** (`9b39038`, `feat(billing): migrate Pro licensing from Gumroad to Lemon Squeezy`) :
la vérif licence, les vars `VITE_LEMONSQUEEZY_*` et le host manifest pointent désormais vers
Lemon Squeezy. Prochaine action = **Jalon 4** (runbook `.ai/plans/plan-vente-lemonsqueezy.md`).
Le chantier portail SaaS (Clerk auth :
`apps/portal/**`, `backend/{schema,queries,config,tenant}`, `migrations/0003_users_table`) reste
**non committé, à part** — ne pas mélanger.

### ✅ Fait
- **Modèle d'entitlement (core, pur, testé)** : `src/core/licensing/entitlement.ts`
  (`applyEntitlementToPolicy`, `FREE_RULE_TYPES`, `PRO_RULE_TYPES`, `isFileScanAllowed`,
  `isProEntitlement`) + `verify.ts` (API **Lemon Squeezy** depuis `9b39038`). Exporté via `core/index.ts`.
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
- **Manifest** : `action`/popup, host `https://api.lemonsqueezy.com/*` (ex-Gumroad), wildcard retiré.
- **Config build** : `src/extension/config.ts` (`VITE_LEMONSQUEEZY_STORE_ID/_PRODUCT_ID/_CHECKOUT_URL`,
  `LICENSE_GRACE_DAYS`).
- **✅ Allowlist anti faux-positifs (Jalon 2, tâche #3) — TERMINÉ** :
  - `evaluateGuard(text, policy, allowlist?)` filtre les matches dont la valeur exacte est
    allowlistée (`content/analyze.ts` + `normalizeAllowlistValue`, insensible casse/espaces).
  - Câblage **Pro-gated** : `content/index.tsx` (`effectiveAllowlist()` = allowlist seulement si Pro,
    réaction au changement storage `sentinel_allowlist`) → adapters → `guard-adapter.ts` (`runGuard`)
    + `file-guard.ts`.
  - Options : sections **Licence Pro** (activer/retirer) + **Allowlist** (textarea 1 valeur/ligne).
  - Tests : filtrage allowlist dans `analyze.test.ts` (5 cas, 217 tests au total).

### ⏳ Ensuite (Jalon 4 — voir runbook `.ai/plans/plan-vente-lemonsqueezy.md`)
- (Option différée) « Ignorer cette valeur » depuis la modale Block — nécessite de passer la valeur
  matchée à `showBlockAlert` (`ui-host.tsx`), plus lourd.
- **Jalon 4** : créer le produit **Lemon Squeezy** (abo + license keys) → remplir `.env`
  (`VITE_LEMONSQUEEZY_STORE_ID/_PRODUCT_ID/_CHECKOUT_URL`) · héberger privacy page à une URL publique ·
  landing 1 page (pricing + checkout Lemon.js) · soumission CWS + AMO.
- ~~Audit sécurité/RGPD de sortie~~ ✅ **Fait** (2026-07-01, rien de bloquant — voir Journal).
- ~~Jalon 3 : icônes + descriptions EN/FR + justif permissions + privacy page + captures~~ ✅ **Fait** (2026-07-01).

---

## Reprise rapide (à froid)

```bash
cd C:/Dev/projects/shadow-ai-sentinel
npm test                 # doit être vert (217)
npx tsc --noEmit         # doit être vide
npm run build            # Chromium → dist/
```
Charger `dist/` via `chrome://extensions` (mode dev) pour tester la popup + le gating + l'allowlist.

### Architecture de gating (à connaître)
- Tout passe par `getPolicy()` côté content. `applyEntitlementToPolicy` produit la policy effective.
- L'entitlement vit dans `chrome.storage.local` (clé `sentinel_entitlement`), lu par le content et
  la popup ; mis à jour par le license-manager (background). Défaut = Free.
- L'allowlist vit dans `sentinel_allowlist` ; appliquée **uniquement en Pro** (`effectiveAllowlist`).
- Vérif licence **Lemon Squeezy côté client** (`activate`/`validate`, contournable, assumé pour du
  prosumer — pas de DRM serveur).

### À configurer avant vente (non bloquant dev)
- `VITE_LEMONSQUEEZY_STORE_ID` + `VITE_LEMONSQUEEZY_PRODUCT_ID` + `VITE_LEMONSQUEEZY_CHECKOUT_URL`
  (env `.env` de build) une fois le produit Lemon Squeezy créé — détails dans le runbook Jalon 4.

---

## Journal des checkpoints
- **2026-07-01** — Jalons 1 & 2 (core) livrés : licensing + gating + license-manager + popup +
  manifest. 206 tests verts. Allowlist démarrée (`evaluateGuard` fait, câblage restant).
- **2026-07-01** — **Allowlist terminée** (4 milestones committés jusqu'à `a5e67c3`) : storage +
  câblage Pro-gated (content → adapters → guards) + UI options (licence + allowlist) + tests.
  211 tests verts, tsc + build OK.
- **2026-07-01** — **Fondation licensing committée** (`5cc9d85`, `feat(extension): Pro license
  foundation [S1-licensing]`) : 18 fichiers — `core/licensing/` (entitlement + verify), popup,
  `background/license-manager`, `config.ts`, manifests, gating `showBlockAlert`. Découverte : ces
  fichiers étaient présents dans le tree mais **jamais versionnés** malgré le « livré » du checkpoint
  précédent (risque de perte évité). Chantier portail Clerk laissé non committé, séparé. 211 tests verts.
- **2026-07-01** — **Audit sécurité/RGPD de sortie sur la fondation licensing (`5cc9d85`) : rien de
  bloquant.** XSS popup nul (`textContent` partout, aucun handler inline, seul script = module externe) ·
  pas d'override CSP (défaut MV3 strict) · permissions minimales (`storage`+`alarms`, hosts scopés,
  pas de `<all_urls>`/`tabs`) · **télémétrie RGPD-clean** : payload = `ruleType/action/host/locale`
  seulement, zéro extrait de texte / zéro PII quitte l'appareil · verify Gumroad = API publique sans
  secret. Seul point mineur assumé : grâce offline 7 j contournable en coupant le réseau (tradeoff
  soft-DRM prosumer). Aucune modif code requise. Prochaine étape : Jalon 3 (assets stores).
- **2026-07-01** — **Jalon 3 : assets stores (hors captures) livrés.** Icône « monogramme S dans
  bouclier », dégradé indigo→cyan : `assets/icon.svg` + `scripts/build-icons.mjs` (sharp) →
  `icons/icon-{16,48,128}.png`, câblées dans les deux manifests (`icons` + `action.default_icon` —
  **manquaient, bloquant CWS**). Découverte lisibilité OK à 16px. Textes dans `store-assets/` :
  `listing-{en,fr}.md`, `permissions-justification.md`, `privacy-policy.md`, `README.md` (checklist
  captures). Point RGPD confirmé pour la privacy page : télémétrie + policy-sync **gatées sur
  credentials tenant** → free tier = **zéro appel réseau**. Build vert. Reste : captures d'écran.
- **2026-07-01** — **Jalon 3 terminé.** 5 captures store en 1280×800 (`store-assets/screenshots/` :
  block ChatGPT + block Claude + popup Free + popup Pro + options/allowlist), normalisées via
  `scripts/resize-screenshots.mjs` (pont Chrome indispo → captures manuelles). Découverte pendant les
  tests : **faux négatif IBAN** (regex ne matchait que le contigu) → **corrigé** (`21041c3`, pattern
  groupes-de-4 + tests). Confirmé au passage : le content script réagit **en live** à l'entitlement
  (`storage.onChanged`), pas de bug de gating. **213 tests** verts, tsc + build OK. Prochaine : Jalon 4.
- **2026-07-01** — **Pivot Gumroad → Lemon Squeezy committé** (`9b39038`, `feat(billing)`) : abo MRR
  (4 €/mois · 39 €/an) via Merchant of Record, vars `VITE_LEMONSQUEEZY_*`, host manifest LS, verify
  côté client `activate`/`validate`. Runbook Jalon 4 rédigé (`plan-vente-lemonsqueezy.md`, `b0de026`).
- **2026-07-02** — **Docs de reprise consolidées.** Création du `CLAUDE.md` racine (point d'entrée
  Claude Code : commandes/garde-fous, archi gating freemium, état sprint, renvois `.ai/`). Checkpoint
  **renommé** `gumroad-checkpoint.md` → `checkpoint.md` et purgé des mentions Gumroad obsolètes
  (résumé décision, gating, « à configurer », pointeur de plan mort → `plan-vente-lemonsqueezy.md`).
  `.ai/context.md` complété d'un bloc « modèle commercial ». **217 tests** verts, tsc OK.
- **2026-07-02** — **5 nouveaux LLM : Le Chat, DeepSeek, Perplexity, Grok, Copilot** (3 → 8 hôtes).
  Pattern adapter répliqué (`sites/{mistral,deepseek,perplexity,grok,copilot}/`), `LlmHost` + matchers
  génériques dans `llm-hosts.ts`, listes de hosts codées en dur dans `validation/{telemetry,feedback}.ts`
  remplacées par `SUPPORTED_LLM_HOSTS` (sinon la télémétrie des nouveaux hôtes était rejetée),
  `LLM_TAB_URL_PATTERNS` émet apex + sous-domaines (fix broadcast policy-sync sur www.perplexity.ai).
  `queryFirstVisible` protégé par try/catch (sélecteur `:has()` DeepSeek) + Firefox
  `strict_min_version` → 121. Manifests : 6 patterns ajoutés, **reliquat `api.gumroad.com` remplacé
  par `api.lemonsqueezy.com`** (le manifest committé au pivot ne l'avait pas). Sweep docs/store :
  listings EN/FR corrigés (8 sites, abo LS au lieu de « licence à vie Gumroad », promesse pièces
  jointes ramenée à **texte/code** — PDF/DOCX retiré, conforme plan de vente), privacy policy,
  permissions-justification (+ justification exclusion x.com), i18n notice employé, matrice M14–M24.
  Décisions : Grok = grok.com seul (pas x.com), Copilot grand public seul (pas M365).
  **238 tests** verts, tsc OK, builds + verify-dist Chromium/Firefox OK.
  **Sélecteurs vérifiés en live (Chrome MCP, UI FR)** : Perplexity ✅ (`#ask-input` +
  `button[aria-label="Envoyer"]` ; ⚠️ Lexical ignore les events non-trusted → redact à recetter),
  Grok ✅ (textarea + `form button[type=submit]` — pas de Tiptap finalement), Copilot ✅
  (`textarea#userInput` + `button[data-testid="submit-button"]`), Mistral ~ (ProseMirror + form
  submit confirmés derrière la modale CGU « Vibe », non acceptée), DeepSeek ❌ (mur /sign_in —
  à valider connecté, M16–M17). Recette manuelle extension chargée (M14–M24) reste à faire.
