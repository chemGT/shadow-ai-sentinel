# Checkpoint — Commercialisation freemium (Lemon Squeezy)

> **But de ce fichier** : permettre de reprendre le travail après un `/clear` du contexte, à froid.
> À **mettre à jour à la fin de chaque session** (section « Journal » + statuts).
> Runbook courant (Jalon 4) : `.ai/plans/plan-vente-lemonsqueezy.md` · Contexte Claude : `CLAUDE.md` (racine).

> 🎯 **PROCHAINE ACTION** : **Sprint R — Résilience**, R1 **terminé** (`sprint-resilience.md`),
> reste **R2/R3** (OTA sélecteurs signés Ed25519 via Cloudflare Workers + KV) puis **R4**.
> ⚠️ **File sécurité ouverte (2026-09-15)** : `.ai/security/bypasses-2026-09.md` — 1 contournement
> HAUTE corrigé (`+33…` non détecté), items 🟠/🟡 documentés ; la **normalisation défensive avant scan**
> est l'item au plus fort rendement mais elle touche les offsets de caviardage (à concevoir).
> Sprint L reste en parallèle sur item **L5** (recette manuelle des 5 nouveaux sites, M14–M24 de
> `.ai/docs/matrice-tests-multi-llm.md`), en cours côté utilisateur. Roadmap complète :
> **`master-plan.md`** (« master plan ») — séquence L (launch) → R (fail-closed + OTA sélecteurs,
> **bloquant avant toute vente B2B active**) → M (MDM + Team) → backlog E.
> Le Jalon 4 du runbook `plan-vente-lemonsqueezy.md` est absorbé dans le Sprint L.
> Vérifier d'abord le vert : `npm test` (245) · `npx tsc --noEmit` · `npm run build`.
>
> ⚠️ **PIVOT rail (2026-07-01)** : Gumroad → **Lemon Squeezy** (MoR = TVA UE gérée) + modèle **abo MRR**.
> Migration code faite et committée (`9b39038`, poussée). Voir Journal + [[gumroad-pivot]] (mémoire).

---

## Résumé décision (ne pas re-débattre)

Pivot **freemium, store-first** pour une 1ʳᵉ vente rapide, **sans** dépendre du SaaS multi-tenant
(conservé pour plus tard, non supprimé). Rail de paiement = **Lemon Squeezy** (Merchant of Record :
TVA UE + taxe US gérées) en **abo MRR** (5 €/mois · 49 €/an, annuel par défaut affiché « ~4 €/mois »), et non plus Gumroad lifetime.
Décision pricing 2026-07-06 : 5/49 au lieu de 4/39 (frais LS 5 % + 0,50 € fixe → 17,5 % mangés sur un
mensuel à 4 €) + tier **Team** affiché sur la landing comme ancre (« nous contacter », S2) + coupon
early-bird **-20 % la 1ʳᵉ année**, pas de lifetime.

- **Free** (produit d'appel, zéro config, zéro réseau) : détection `api_key` + `generic_secret`,
  Block/Redact sur 8 LLM (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot).
- **Pro** (clé de licence **Lemon Squeezy**, abo) : PII (`iban`, `internal_ip`, `pro_email`, `phone`)
  + scan fichiers texte/code + règles/allowlists.
- Extension **gratuite** sur les stores ; Lemon Squeezy vend une **clé de licence** vérifiée côté client.

---

## État actuel (dernier checkpoint : 2026-07-10)

**Vert** : `npx tsc --noEmit` OK · `npm test` = **273 tests** (35 fichiers) · `npm run build` OK ·
`npx playwright test` = **30 e2e** OK.
**master = référence** (merge de `sprint/s1-make-sellable` le 29/08, `e0f6e78`). Le **pivot Gumroad → Lemon Squeezy est committé** (`9b39038`) et
le produit Lemon Squeezy est **créé et configuré** (Store ID `426600`, Product ID `1206351`, checkout
avec choix mensuel/annuel intégré) — `.env` rempli, checkout testé en Test Mode : activation licence
OK, statut Pro actif dans l'extension. Site `prompt-redact-site` en ligne, prod verrouillée en
coming-soon (`MAINTENANCE=true`), preview restreint à l'email owner via Cloudflare Access.
Prochaine action = **L5** (recette manuelle 5 sites, voir `sprint-launch.md`).
Le chantier portail SaaS (Clerk auth :
`apps/portal/**`, `backend/{schema,queries,config,tenant}`, `migrations/0003_users_table`) est
**committé sur master (décision 29/08 : on le garde — la doc « non committé » était erronée)** mais
**hors périmètre S1 extension** — ne pas mélanger.

### ✅ Fait
- **Modèle d'entitlement (core, pur, testé)** : `src/core/licensing/entitlement.ts`
  (`applyEntitlementToPolicy`, `FREE_RULE_TYPES`, `PRO_RULE_TYPES`, `isFileScanAllowed`,
  `isProEntitlement`) + `verify.ts` (API **Lemon Squeezy** depuis `9b39038`). Exporté via `core/index.ts`.
- **Gating** : la policy effective désactive les règles Pro en Free ; scan fichiers gaté par
  `isFileScanEnabled()` — câblé dans `content/index.tsx` → adapters (8 sites) →
  `guard-adapter.ts` → `file-guard.ts`.
- **Scan fichiers PDF/DOCX (Pro, 29/08)** : extraction 100 % locale via pdfjs-dist (build legacy,
  worker conditionné à `chrome.runtime`) + mammoth (`{buffer}`/`{arrayBuffer}` selon l'env),
  imports dynamiques (chunks séparés, `web_accessible_resources` auto) ; gate `hasScannableInList`
  (texte OU PDF/DOCX) sur change/drop/paste ; décision `redact` sur binaire → **block** avec message
  dédié ; limite 10 Mo + toasts (trop volumineux / parsing échoué) ; Free inchangé. Tests ajoutés :
  binary-file, binary-extract, file-guard (+28 → 273).
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
- **2026-09-15** — **Corpus d'évasion adversarial du moteur DLP** (`4a1188d` + `d30a9bc`, non poussés) :
  `.ai/security/evasion-threat-model.md` (modèle de menace vérifié sur le code réel),
  `src/core/detection/evasion-corpus.test.ts` (35 cas exécutables), `.ai/security/bypasses-2026-09.md`
  (findings confirmés par exécution). **Contournement de gravité HAUTE corrigé : les numéros `+33…`
  n'étaient JAMAIS détectés** — l'ancrage `\b` ne peut pas exister avant un `+` et le motif E.164
  exclut explicitement `+33` ; c'est la forme la plus courante en France, donc tout le PII téléphone
  en écriture internationale échappait au DLP, **Pro inclus**. Correctif : `\b` → `(?<![\w+])`.
  Suite 325 tests verts (36 fichiers), `tsc` propre. **Restent ouverts** (documentés, non corrigés) :
  normalisation défensive avant scan (fermerait NBSP / zero-width / pleine-chasse d'un coup, mais
  impacte les offsets de caviardage — à concevoir), élargissement des séparateurs IBAN/carte,
  sous-domaines `pro_email`, formats fichiers non extractibles (XLSX/PPTX/RTF/ZIP/images),
  PDF image ou chiffré, texte en commentaire DOCX, `.txt` > 5 Mo en **fail-open silencieux**.
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
- **2026-07-02** — **Tests E2E automatisés** (`npm run test:e2e`, Playwright) : extension réelle
  (`dist/`) chargée dans Chromium headless, fixtures répliquant les composers des 8 sites servies
  aux URLs de prod par interception réseau → le content script s'injecte comme en vrai. 28 tests :
  block Enter + block clic + passage texte anodin ×8 sites, redact IBAN Pro (Enter + clic),
  file-guard Pro (bloqué/sain). Astuces harnais : acquittement notice premier lancement
  (`sentinel_notice_ack_at`, overlay plein écran) ; seed Pro **après** chargement page (le SW
  réécrit Free à chaque réveil sans clé — le content script suit via `storage.onChanged`) ;
  `dispatchEvent('click')` pour les cas bloqués (le `stopImmediatePropagation` du guard casse le
  hit-target check de Playwright). **Bug réel trouvé par l'E2E et corrigé** : `replaceInputFiles`
  re-dispatchait un `change` que le file-guard ré-interceptait → boucle de re-scan infinie et le
  site ne recevait jamais l'événement (fichiers autorisés/caviardés) — marqueur one-shot
  `consumeReplacedInputMark` ajouté. **239 vitest + 28 e2e verts.** La recette manuelle ne couvre
  plus que la dérive des DOM réels.
- **2026-07-08** — **MASTER PLAN rédigé** (`master-plan.md` + `sprint-{launch,resilience,mdm-team}.md`,
  session Plan Mode, zéro code). Verdict enterprise-readiness vérifié dans le code :
  **fail-open confirmé** (`guard-adapter.ts` — composer introuvable → le message part sans analyse),
  MDM 0 %, sélecteurs sans OTA. Cadrage acté (ne pas re-débattre) : lancer d'abord (Sprint L =
  Jalon 4 + site prompt-redact.com), puis Sprint R (fail-closed `fail_mode` + OTA sélecteurs
  signés Ed25519 via **Cloudflare Workers + KV**), puis Sprint M (`chrome.storage.managed`,
  templates Intune/Firefox/Jamf, tier **Team = licence LS quantity-based**, sans portail) ;
  **SSO/Clerk reste en pause** (déclencheur : ≥ 2 prospects). Anciens plans commercialisation*
  marqués obsolètes, items survivants dans le backlog E (`sprint-mdm-team.md`).
- **2026-07-10** — **Sprint L : L1/L2/L3 terminés.** Site `prompt-redact-site` en ligne (Cloudflare
  Pages) : bug de fuite corrigé (binding KV `WAITLIST` mal configuré au départ — namespace créé mais
  pas rattaché en scope Production ; puis découverte que la branche `maintenance` servie en prod était
  figée 2 commits derrière `main`, **sans** le toggle coming-soon → site complet exposé publiquement).
  Corrections : branche `maintenance` resynchronisée avec `main` (fast-forward) et repositionnée comme
  branche de **preview** perso (accès restreint à l'email owner via Cloudflare Access) ; `main` reste
  la branche Production, gatée par `MAINTENANCE=true` (var de **build**, `import.meta.env`, distincte
  des bindings Functions runtime — piège à ne pas reproduire). Waitlist KV vérifiée opérationnelle
  (email de test bien capturé). Produit **Lemon Squeezy créé** : Store ID `426600`, Product ID
  `1206351`, un seul checkout link (`prompt-redact.lemonsqueezy.com/checkout/buy/cd6acc61-...`) qui
  propose le choix mensuel (5€) / annuel (49€) directement sur la page LS — pas besoin de deux
  boutons séparés côté extension/site. `.env` extension rempli (`VITE_LEMONSQUEEZY_STORE_ID`,
  `_PRODUCT_ID`, `_CHECKOUT_URL`). Pricing vérifié cohérent partout (5€/mois·49€/an) — seuls écarts
  trouvés sont des entrées de journal datées (ancien 4€/39€) et un doc `commercialisation.md` obsolète
  (table Team par-siège), sans impact code/copy live. Build + tests **239 vitest verts**, `tsc` OK.
  Checkout testé manuellement en Lemon Squeezy Test Mode : activation licence OK, statut Pro affiché
  dans l'extension. Prochaine étape : **L5** (recette manuelle 5 sites, M14–M24).
- **2026-07-10 (suite)** — **Pivot positionnement landing `prompt-redact-site`** : copy EN/FR
  (`src/i18n/translations.ts`) réorientée de « devs qui collent une stack trace » vers **Shadow AI /
  Shadow IT B2B** (décideur IT/sécurité), sans toucher au pricing (Free/Pro/Team gelé, cf. ce fichier).
  Changé : `hero.title/subtitle` + nouveau CTA secondaire `hero.ctaContact` (mailto, `Hero.astro`),
  `problem.title/body` (mix multi-métiers : dev/support/finance), `trustedBy.label/categories`
  (« ÉQUIPES IT & SÉCURITÉ » en tête), une ligne `tiers.team.features`. `astro build` OK (pas de
  régression visuelle vérifiée en dist HTML ; revue visuelle navigateur encore à faire). Committé
  `18ac300` sur branche `worktree-shadow-ai-positioning`, poussé, **PR #1 ouverte**
  (github.com/chemGT/prompt-redact-site/pull/1) — **pas encore mergée**.
  **L5 (recette manuelle multi-LLM) en cours par l'utilisateur**, un test à la fois. Premier résultat :
  incohérence de traduction trouvée sur la modale "Envoi bloqué" (bouton FR "Comprendre" au lieu de
  "J'ai compris" utilisé ailleurs) → relecture complète des 2 fichiers FR du produit
  (`messages.ts`, `popup/main.ts`), seule incohérence trouvée, corrigée et **committée** (`db09e7d`,
  `fix(i18n)`), 239 tests + tsc verts. Reste : poursuivre L5 site par site (M14–M24), décider du
  merge de la PR #1 positioning.
- **2026-07-12** — **PR #1 positioning mergée** (`d1f9bad` sur `main` de `prompt-redact-site`), rien
  en attente côté site. Sprint L L1–L9 toujours ⏳ (infra Cloudflare/DNS/stores, nécessite les accès
  de l'utilisateur, non actionnable directement).
  **Refonte UX page Options extension** (`/ui-ux-pro-max`) : table "Règles de détection" (toggle +
  segmented redact/block par `RuleType`) remplace le textarea JSON brut ; JSON avancé + import/export
  déplacés dans `<details><summary>Avancé</summary>` ; toast `aria-live="polite"` généralisé
  (`showToast`) remplace le `setStatus()` peu visible sur toute la page (credentials, allowlist,
  licence, sync policy, telemetry). Import JSON avancé validé via `validatePolicy` avant application
  (jamais silencieux). Fichiers : `src/extension/options/index.html`, `main.ts`. Committé `8f4c36c`,
  poussé sur `sprint/s1-make-sellable`.
  **Deux bugs Firefox trouvés et corrigés pendant les tests manuels de l'utilisateur** (Chrome OK,
  Firefox KO) :
  1. Install impossible (« background.service_worker is currently disabled ») — `manifest.firefox.json`
     utilisait la clé Chrome-only `service_worker` ; Firefox stable exige `background.scripts` (array).
  2. Une fois l'install corrigée, **détection totalement inactive sur Firefox** (pas juste partielle) :
     `platform/runtime.ts` (`sendMessageOnce`) et `platform/storage.ts` (`storageGet/Set`,
     `clearStoredLicense`) passaient un callback en dernier argument à `chrome.runtime.sendMessage` /
     `chrome.storage.local.*`. Chrome MV3 tolère ce pattern hybride callback+Promise ; `browser.*`
     (Firefox) est Promise-only et ignore le callback silencieusement → la Promise wrapper ne se
     résolvait jamais → `Promise.all([loadPolicy(), getStoredEntitlement(), getAllowlist()])` dans le
     bootstrap de `content/index.tsx` restait bloqué indéfiniment. **Piège à ne pas reproduire** :
     toujours utiliser les formes Promise natives dans `platform/`, jamais de callback même optionnel.
  Fix : passage aux formes Promise natives dans les deux fichiers, `onMessage` simplifié pour retourner
  directement la Promise du handler. Vérifié : `tsc --noEmit`, `build` + `build:firefox`, `npm test`
  239/239. Committé + poussé `311e49e` sur `sprint/s1-make-sellable` (avec le fix manifest ci-dessus).
  **Reste à faire** : l'utilisateur termine ses tests manuels Chrome/Firefox (recette L5 en cours,
  pas de blocage connu restant). Tâche différée notée par l'utilisateur, pas encore planifiée : renommer
  l'extension et refaire le brand design — « Shadow AI Sentinel » ne correspond plus au positioning
  cible depuis le pivot copy du 2026-07-10.
- **2026-07-12 (suite)** — **Analyse marché/concurrence + Sprint R1 livré.** Analyse honnête
  concurrence/positioning demandée par l'utilisateur (Nightfall AI, Harmonic Security, Microsoft
  Purview, dope.security, LayerX, Netskope, Cyberhaven, Metomic — tous en B2B 100-200+$/siège/an) :
  aucune protection technique réelle contre la copie du code extension (.crx/.xpi extractibles),
  mais le vrai moat court terme = exécution (SLA, support, fail-closed, MDM) + first-mover sur le
  segment PME/ETI RGPD délaissé par les gros acteurs enterprise-only. `master-plan.md` mis à jour
  (section « Positionnement & séquencement commercial ») : Sprint R = **bloquant avant toute vente
  B2B active** (fail-open actuel = disqualifiant face à un RSSI), tier Team à ne pas mettre en avant
  commercialement avant Sprint M (MDM).
  **Sprint R1 implémenté et livré** (`91755a7`, `feat(guard): fail-closed adapter health-check
  [Sprint R1]`, `sprint/s1-make-sellable`) : self-test adaptateur au chargement (MutationObserver +
  timeout 10 s, `core/adapter-health.ts`) → état `adapter_broken` si aucun composer reconnu ;
  nouveau champ policy `fail_mode: "open"|"warn"|"closed"` (défaut `warn`) ; `warn` = bannière
  discrète + badge popup (site toujours utilisable) ; `closed` = interception générique
  document-level (Enter + clic bouton d'envoi) qui **bloque réellement l'envoi** tant que
  l'adaptateur est cassé, même sans reconnaître le composer spécifique du site — corrige le
  fail-open confirmé en session du 2026-07-08. i18n FR/EN, storage `getAdapterHealth`/
  `setAdapterHealth`. **Piège rencontré** : seed du `fail_mode` en E2E via message
  `POLICY_UPDATED` échouait envoyé depuis le service worker lui-même (« Could not establish
  connection » — un SW MV3 ne peut pas fiablement se messager lui-même) ; fix = envoyer le message
  depuis une page d'extension (popup) plutôt que depuis le SW. **245 vitest + 30 e2e verts**,
  `tsc --noEmit` clean. `sprint-resilience.md` R1 marqué terminé (checklist DoD cochée).
  **Reste** : R2/R3 (OTA sélecteurs signés Ed25519 via Cloudflare Workers + KV), R4.
