# Étude — passage en open source

**Date :** 2026-10-18 · **Décision de départ :** abandon de la vente (Lemon Squeezy, freemium),
objectif = **réputation professionnelle** (portfolio sécurité / DLP / gouvernance IA).
**Statut :** L1 fait (18/10). Décisions prises :
- Licence **Apache-2.0**, copyright au pseudo **`chemGT`** (vie privée : pas de nom réel).
- Stores CWS/AMO : **plus tard**, rien d'actif pour l'instant.
- **Historique réécrit** pour retirer le domaine perso (emails, nom réel) — voir §6.2.
- Backend télémétrie (auth Clerk JWT, jobs dunning) : **en attente** de décision.

---

## 1. Constat (audit du dépôt au 18/10)

| Point | État | Bloquant ? |
|-------|------|-----------|
| Secrets dans l'historique git (66 commits) | Seulement des **fixtures factices** (`AKIA…EXAMPLE`, `ghp_1234…`, `sk-ant-api03-e2e-fixture…`, JWT d'exemple). `.env` jamais committé. | Non |
| Données perso dans les fichiers suivis | `86713914+chemGT@users.noreply.github.com` (privacy policy, voulu). Aucune IP homelab/Tailscale/Hetzner. | Non |
| Identités de commit | `chemGT <noreply>` (62) + `Alfred (Hermes) <86713914+chemGT@users.noreply.github.com>` (4) — exposé publiquement. | À trancher |
| Licence | `package.json` = `"ISC"`, **aucun fichier `LICENSE`**. Sans LICENSE = tous droits réservés. | **Oui** |
| Licences des dépendances | Toutes permissives (React/Express/Clerk MIT, pdfjs-dist & drizzle Apache-2.0, mammoth BSD-2, postgres Unlicense). | Non — aucune contrainte sur le choix |
| Code de licensing | ~666 lignes : `src/core/licensing/*`, `license-manager.ts`, `config.ts`, branchements popup/options/content/background. | Oui (incohérent avec OSS) |
| Portail SaaS Clerk | `apps/portal/**` + `src/backend/{schema,queries,config,tenant}` : squelette non fonctionnel. | Oui (bruit, mauvaise 1ʳᵉ impression) |
| Docs internes `.ai/` (360 Ko, ~47 fichiers) | Plans commerciaux, sprints, checkpoint, agents — **en FR, orientés vente**. | À trier |
| Docs sécurité | `evasion-threat-model.md`, `bypasses-2026-09.md` : contournements **confirmés par tests**, dont B1–B5 non corrigés. | À traiter avant publication |
| README | FR, compteur de tests périmé (56 vs 273+), pas de badge, pas d'EN. | Oui pour la réputation |
| CI | GitHub Actions présente (tests + build Chromium/Firefox). | Non |
| Nom | « Shadow AI Sentinel » — proximité avec *Microsoft Sentinel* ; acceptable mais vérifier l'absence de marque déposée identique. | Non |

---

## 2. Choix de licence

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **Apache-2.0** | Standard entreprise (clause brevets explicite), rassure les RSSI/juristes qui veulent déployer en interne ; cohérent avec pdfjs/drizzle. | Permet un fork commercial fermé. | **Recommandé** |
| MIT | Le plus simple, adoption max. | Pas de clause brevets ; signal un peu moins « corporate ». | Alternative valable |
| AGPL-3.0 | Empêche un SaaS concurrent fermé. | Repoussoir en entreprise (exactement la cible DLP) ; inutile pour une extension sans SaaS. | Non |

Objectif réputation + cible B2B ⇒ **Apache-2.0**, `SPDX-License-Identifier` dans `package.json`.
Garder la possibilité d'une offre de service (intégration, policies sur mesure, formation) : la
licence permissive ne la gêne pas — la valeur vendable devient **ton expertise**, pas le binaire.

---

## 3. Ce qu'il faut retirer / transformer dans le code

### 3.1 Supprimer le freemium (toutes les fonctions deviennent disponibles)
- Supprimer `src/core/licensing/verify.ts` (+ test), `src/extension/background/license-manager.ts`
  (+ test), l'alarme `LICENSE_REFRESH_ALARM`, le message background d'activation.
- `src/extension/config.ts` : retirer les 3 variables `VITE_LEMONSQUEEZY_*` (`.env.example` idem).
- `content/index.tsx` : `getPolicy()` sans `applyEntitlementToPolicy`, `effectiveAllowlist()` → `allowlist`.
- Popup / options : retirer palier, champ clé, CTA « Passer en Pro » ; remplacer par lien GitHub.
- `platform/storage.ts` : clé `sentinel_entitlement` → lecture tolérée puis ignorée (migration
  silencieuse ; pas besoin de nettoyer chez les testeurs).
- Store assets / privacy policy : retirer toute mention Pro, Lemon Squeezy, abonnement.
- Option conservatrice : garder `entitlement.ts` en forçant `tier: 'pro'` = diff minimal ;
  **déconseillé** — du code mort de DRM dans un dépôt OSS fait mauvais effet à la relecture.

### 3.2 Portail Clerk / multi-tenant
- Sortir `apps/portal/**`, `migrations/0003_users_table`, `src/backend/{schema,queries,config,tenant}`
  vers une branche `archive/saas-portal` (tag), puis supprimer de `master`.
- Garder le **backend Express de télémétrie** seulement s'il est documenté comme « self-hosted,
  optionnel, métadonnées uniquement » — c'est un vrai argument (souveraineté, `docker compose up`).
  Sinon l'archiver aussi : une extension 100 % locale est un pitch plus net.

### 3.3 Corriger avant d'annoncer
- B1 IBAN tirets/NBSP, B2 carte NBSP, B4 zero-width/homoglyphes (normalisation commune « D ») :
  correctifs **déjà spécifiés** dans `bypasses-2026-09.md`, faible effort, gros gain de crédibilité.
- B3, B5, C1, C2 : publier comme **issues `good first issue` / `help wanted`** — la limitation
  documentée devient un point d'entrée contributeurs.

---

## 4. Ce qu'il faut ajouter (hygiène OSS = signal de sérieux)

| Fichier | Contenu |
|---------|---------|
| `LICENSE` | Apache-2.0 texte intégral, copyright « 2026 chemGT » (ou pseudo — voir §6). |
| `README.md` | **EN en premier** (FR en `README.fr.md`). Pitch 1 phrase, GIF de démo (block + redact), tableau détecteurs, sites couverts, « What it does NOT do » (lien threat model), install CWS/AMO/dev, badges CI + licence + version. |
| `SECURITY.md` | Politique de divulgation (GitHub Private Vulnerability Reporting), périmètre, lien threat model. Indispensable pour un outil sécu. |
| `CONTRIBUTING.md` | Setup, `npm test`/`tsc`/e2e, **comment ajouter un détecteur** (fichier + tests positifs/négatifs + corpus d'évasion + audit ReDoS). |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1. |
| `.github/ISSUE_TEMPLATE/` | `bug`, `false-positive`, `false-negative/bypass`, `new-detector`, `site-adapter-broken` (les DOM des LLM cassent souvent : template = remontée rapide). |
| `.github/dependabot.yml` | npm + actions, hebdo. |
| CI | Ajouter e2e Playwright, CodeQL, OpenSSF Scorecard (badge), release workflow (tag → zip Chromium + xpi Firefox attachés à la GitHub Release, provenance SLSA si possible). |
| `CHANGELOG.md` | Déjà présent — passer en EN, format Keep a Changelog, v1.0.0 = première version publique. |

---

## 5. Docs `.ai/` : tri

| Garder (traduit/nettoyé, déplacé dans `docs/`) | Archiver / supprimer du dépôt public |
|------|------|
| `security/evasion-threat-model.md`, `security/redos-audit-results.md`, `security/threat-model-mvp.md` | `plans/commercialisation*.md`, `plan-vente-lemonsqueezy.md`, `master-plan.md`, `mvp-pilote-claude.md` |
| `adr/001..003` (ADR = excellent signal d'ingénierie) — 003 multi-tenant à marquer « superseded » | `SUIVI-ACTIONS.md`, `plans/checkpoint.md`, `agents/`, `docs/superpowers/` |
| `docs/matrice-tests-multi-llm.md`, `guides/INSTALLATION.md` | `.cursorrules` (ou le garder : montrer son workflow IA peut être un plus — choix perso) |
| `bypasses-2026-09.md` → **après correctifs B1/B2/B4**, fusionné dans le threat model | |

**Historique git :** les docs commerciales restent visibles dans l'historique. Deux options :
1. **Publier l'historique tel quel** (recommandé) : rien de sensible détecté, l'historique montre
   le travail réel (tests, corpus d'évasion, fix CI) — c'est de la réputation.
2. Repartir d'un **dépôt neuf avec squash** : vitrine propre, mais perd la preuve du travail.

---

## 6. Décisions à prendre par toi

1. **Identité publique** : nom réel (« chemGT », bénéfice carrière direct, LinkedIn) vs pseudo
   `chemGT`. Pour l'objectif annoncé → **nom réel** dans `LICENSE`/README, compte GitHub inchangé.
2. **Commits `Alfred (Hermes) <86713914+chemGT@users.noreply.github.com>`** : laisser (transparence sur l'usage d'agents
   IA — cohérent avec ton profil « AI agent orchestration ») ou réécrire via `git filter-repo
   --mailmap` (implique force-push, à faire avant toute publication).
3. **Backend télémétrie** : garder en « self-hosted optionnel » ou archiver.
4. **Langue** : EN principal (visibilité internationale) + FR secondaire (marché FR/RGPD/NIS2 =
   ton différenciateur).
5. **Publication stores** : garder CWS + AMO (gratuit) — une extension installable pèse bien plus
   qu'un dépôt seul. Frais CWS 5 $ une fois.

---

## 7. Levier réputation (ce qui fait la différence, au-delà du code)

- **Positionnement** : le marché « AI DLP navigateur » est quasi uniquement commercial et fermé
  (Nightfall, Harmonic, Prompt Security, LayerX, Island…). Un outil **open source, 100 % local,
  auditable** est une niche réelle et un argument RSSI fort (« vous pouvez lire ce qui tourne »).
- **Angle gouvernance** : relier explicitement à AI Act (usage d'IA générative en entreprise),
  RGPD (art. 32), NIS2 — ton profil PMO/gouvernance + formation TPF. Une page
  `docs/compliance.md` « ce que l'outil couvre / ne couvre pas » vaut plus qu'une feature.
- **Transparence sécurité** : publier le corpus d'évasion et le threat model est rare et crédible.
  Formuler « limites connues » plutôt que « failles ».
- **Contenus** (1 par mois, réutilisables en formation) :
  1. Article lancement « Why I open-sourced my AI DLP extension » (LinkedIn + dev.to + Medium FR).
  2. Article technique « Detecting secrets before they reach ChatGPT: regex, Luhn, mod-97, ReDoS ».
  3. Article « Evasion corpus: 35 ways to bypass a browser DLP and what we fixed ».
  4. Show HN / r/netsec / r/sysadmin / Korben / LinuxFr — après README + GIF + stores OK.
- **Listes** : PR vers `awesome-llm-security`, `awesome-browser-extensions-for-privacy`,
  `awesome-security` ; référencement dans des listes OWASP LLM Top 10 (LLM02 Sensitive Info Disclosure).
- **Talks** : BSides Lyon, Lyon Data Science / meetups sécu locaux, OSSIR, Forum InCyber (stand
  communautaire) — sujet « Shadow AI en entreprise : mesurer et contenir ».
- **Métriques à suivre** (pas d'ego, des faits) : stars, installs CWS/AMO, issues externes, PR
  externes, mentions. Seuil réaliste à 6 mois pour un outil de niche : 100–500 stars, quelques
  centaines d'installs.

---

## 8. Plan d'exécution proposé

| Lot | Contenu | Effort |
|-----|---------|--------|
| **L1 — Nettoyage code** | Retrait licensing + Lemon Squeezy, popup/options, archivage portail Clerk, tests adaptés (doivent rester verts). | ~0,5 j |
| **L2 — Correctifs sécu** | B1, B2, B4 + normalisation commune, tests de verrou. | ~0,5–1 j |
| **L3 — Hygiène OSS** | LICENSE, README EN/FR, SECURITY, CONTRIBUTING, CoC, templates, Dependabot, CodeQL, Scorecard, release workflow. | ~1 j |
| **L4 — Tri docs** | `.ai/` → `docs/` (public) / suppression (commercial). Décision §6.2 sur l'historique. | ~0,5 j |
| **L5 — Publication** | Repo public, v1.0.0 taguée, GitHub Release, soumission CWS + AMO, issues `good first issue` (B3, B5, C1, C2). | ~0,5 j + délais review stores |
| **L6 — Communication** | Article lancement, PR awesome-lists, Show HN. | continu |

Ordre impératif : **L1 → L2 → L3 → L4 avant de passer le dépôt en public** (L4 seulement si
réécriture d'historique). L5/L6 ensuite.
