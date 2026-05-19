# Plan MVP — Pilote Claude (Shadow AI Sentinel)

> Document de référence orchestrateur. Dernière mise à jour : 2026-05-19.  
> Statut : **cadrage validé** — Phases 0–3 terminées (tests manuels + durcissement API Phase 4).  
> Suivi : [SUIVI-ACTIONS.md](../SUIVI-ACTIONS.md) · Install : [guides/INSTALLATION.md](../guides/INSTALLATION.md)

---

## Objectif

Livrer un DLP navigateur B2B opérationnel sur **Claude** (`claude.ai`) : détection locale, modes Block/Redact par type de donnée, policies synchronisables, télémétrie minimale conforme RGPD, fonctionnement **hors ligne** avec file d’attente, interfaces **FR/EN**, builds **Chrome/Edge (Chromium)** et **Firefox**.

---

## Décisions de cadrage (validées)

| Sujet | Décision |
|-------|----------|
| LLM pilote | **Claude** en premier ; ChatGPT puis Gemini (Phase 7) |
| Types sensibles | Clés API, IBAN, IP interne, emails pro, téléphones, secrets génériques |
| Modes | **Mixte** par `ruleType` (config policy) |
| Emails pro | **Liste de domaines fournie à l’intégration** par client (allowlist dans policy) |
| Télémétrie | **Obligatoire** entreprise — schéma minimal RGPD (voir § RGPD) |
| Faux positifs | **Non** — pas de bouton de signalement au MVP |
| Hors ligne | **Oui** — policies en cache + queue télémétrie avec rattrapage |
| Langues UI | **FR + EN** dès le pilote |
| Navigateurs | **Chromium + Firefox** |
| MDM | **Rien de planifié** — install manuelle / policy JSON import ; MDM post-pilote |
| Fin de pilote | **20–50 utilisateurs** OU **2 semaines** (premier seuil atteint) |
| Firefox (distribution) | **Signée Mozilla (non répertoriée) + hébergement XPI interne HTTPS** (voir § Distribution) |

---

## Scope

### In

- Extension MV3 (Chromium) + MV3 Firefox (build dual)
- Adaptateur `claude.ai` uniquement (pilote)
- Moteur regex : 6 `ruleType`
- Policies : mode Block/Redact par type ; allowlist domaines email pro
- API : `GET /policies`, `POST /telemetry`, auth Bearer par tenant
- Offline : cache policy + queue télémétrie idempotente
- Notice employé FR/EN (information légale, pas opt-in utilisateur)
- Docker/Portainer pour l’API

### Out (pilote)

- ChatGPT, Gemini (Phase 7)
- MDM Intune / Chrome Enterprise / Firefox policies (doc seulement, pas d’intégration dédiée)
- Signalement faux positif
- Dashboard admin
- ML / analyse hors regex
- Safari

---

## État actuel du dépôt

| Composant | État |
|-----------|------|
| Tooling | Vite + CRXJS + React + TS + Vitest + Docker OK |
| Moteur regex | 6 détecteurs, `npm test` (19 tests) |
| Content / background | Bootstrap policy + content actif sur `claude.ai` |
| Interception DOM Claude | ✅ Phase 2 |
| Modale Block (`SentinelAlert` Shadow DOM) | ✅ Phase 2 |
| API | `GET /health` seulement (Phase 4) |
| Manifest | Claude uniquement, permissions minimales |

---

## RGPD — télémétrie obligatoire (minimum acceptable)

*Orientation produit — validation DPO / juriste client requise avant prod.*

### Bases légales (B2B)

- **DLP / blocage local** : intérêt légitime sécurité + exécution politique interne employeur.
- **Télémétrie sans contenu** : même finalité (audit conformité, efficacité contrôle) — **pas de case opt-in** côté employé si le contrat client + notice interne couvrent la surveillance proportionnée.

### Jamais transmis

- Texte prompt, presse-papiers, snippet matché, hash de contenu
- Valeurs détectées (email, téléphone, IBAN, clé, IP) même partielles
- URL complète avec query, titre d’onglet, capture
- Email employé / nom (sauf `deviceId` pseudonyme non lié au RH dans notre SaaS)

### Schéma `TelemetryEvent` (autorisé)

```ts
{
  eventId: string;           // UUID v4 — idempotence
  tenantId: string;
  deviceId: string;          // UUID install, local, rotatable via policy
  occurredAt: string;        // ISO 8601 UTC
  ruleType: 'api_key' | 'iban' | 'internal_ip' | 'pro_email' | 'phone' | 'generic_secret';
  action: 'block' | 'redact';
  host: 'claude.ai';
  extensionVersion: string;
  policyVersion: string;
  locale: 'fr' | 'en';
  browser: 'chromium' | 'firefox';
}
```

**Optionnel (DPO client)** : `departmentId` issu de la policy uniquement.

### Obligations produit

1. Notice FR/EN au premier lancement (liste des champs ci-dessus).
2. Rétention API : **90 jours** par défaut, purge automatique.
3. Validation API : **rejet 400** si clé interdite (`text`, `snippet`, `match`, etc.).
4. Logs serveur sans corps utile des événements.
5. Fiche traitement + DPIA simplifiée livrées au client (`compliance_rgpd`).

### Checklist pré-release RGPD

- [ ] Schéma télémétrie implémenté et testé (contract test)
- [ ] Aucun `fetch` ne sérialise du texte utilisateur
- [ ] Notice affichée une fois par install / mise à jour majeure
- [ ] Purge rétention vérifiée
- [ ] Registre des traitements (modèle) fourni

---

## Auth API (retenu)

| Couche | Choix |
|--------|--------|
| Transport | HTTPS TLS 1.2+ obligatoire |
| Extension → API | **Bearer token** = clé API par `tenantId` |
| Scopes | `policies:read`, `telemetry:write` |
| Rotation | Nouvelle clé via policy ; ancienne valide 7 j (grace) |
| Enterprise+ | mTLS au reverse proxy (Traefik/Nginx) — hors extension |
| Install pilote | Page **Options** : `tenantId`, `apiKey`, import JSON policy |

Post-MVP : OAuth2 client credentials pour portail admin uniquement.

---

## Types de détection & modes par défaut

| `ruleType` | Exemples | Mode défaut suggéré |
|------------|----------|---------------------|
| `api_key` | AWS, OpenAI, GitHub, Azure | Block |
| `generic_secret` | `sk-…`, Bearer, patterns password | Block |
| `iban` | IBAN FR/EU | Redact |
| `internal_ip` | RFC1918 | Redact |
| `pro_email` | Domaines **allowlist client** (`policy.emailDomains[]`) | Redact |
| `phone` | FR / E.164 courants | Redact |

Tokens Redact : `[REDACTED_API_KEY]`, `[REDACTED_IBAN]`, etc.

---

## Distribution navigateurs

### Chromium (Chrome / Edge) — pilote

| Option | Usage |
|--------|--------|
| **Extension unpacked** (mode développeur) | Dev / debug uniquement |
| **Chrome Web Store — non répertoriée (Private)** ou paquet CRX + `ExtensionInstallForcelist` | **Recommandé prod** quand le client a Google Workspace / Edge managed |
| Install manuelle `.crx` / dossier | Pilote très petit (&lt; 10 postes) |

**Recommandation pilote 20–50 users** : build signé/store privé **ou** procédure IT documentée (GPO Chrome) si le client a déjà une console — sans MDM formalisé côté nous, fournir **guide install** + binaire/version figée.

### Firefox — meilleure option (Q3)

| Option | Verdict |
|--------|---------|
| `about:debugging` temporaire | ❌ Dev seulement |
| AMO public | ❌ Hors scope B2B |
| **AMO Developer — distribution « sur votre propre site » (unlisted signed)** | ✅ **Retenue** |
| Signature auto non-Mozilla | ❌ Refusée sur Firefox Release |

**Flux retenu**

1. Soumettre l’add-on sur [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/) en **distribution self-hosted / unlisted**.
2. Mozilla signe le `.xpi` ; télécharger le artefact signé.
3. Héberger le `.xpi` sur **URL HTTPS interne** du client (ou CDN projet pilote).
4. Install pilote : glisser-déposer le XPI signé **ou** lien interne ; prod : `policies.json` Firefox (`ExtensionSettings` / `InstallAddons`) quand le client sera prêt.

**Pourquoi** : conforme aux exigences de signature Mozilla, non visible publiquement, même chemin que beaucoup de déploiements ESR entreprise, pas de dépendance AMO listing public.

### Alignement dual-build

```
src/core/          → partagé
src/extension/sites/claude/ → partagé
src/extension/platform/   → abstraction chrome.* / browser.*
build/chromium/  → Vite + CRXJS (actuel)
build/firefox/   → WXT ou web-ext + webextension-polyfill
```

---

## Phases d'exécution

### Phase 0 — Architecture (Agent: `architect`) ✅

**Tâches**

- [x] Créer `src/core/types.ts` : `Policy`, `Rule`, `TelemetryEvent`, `RuleType`
- [x] Validation `validatePolicy` / `validateTelemetryEvent`
- [x] ADR dual-browser + offline queue (`.ai/adr/`)
- [x] Abstraction `src/extension/platform/`
- [x] Corriger `manifest.json` : Claude uniquement ; permissions minimales
- [x] Threat model (`.ai/security/threat-model-mvp.md`)
- [x] Exemple policy (`.ai/schemas/policy.example.json`)
- [x] Permissions MV3 (`.ai/architecture/permissions-mv3.md`)

**Done when**

- [x] Schémas TS + ADR validés
- [x] Liste permissions MV3 minimale documentée
- [x] `npm run build` OK

---

### Phase 1 — Moteur regex (Agent: `backend_ops` + revue `security_auditor`) ✅

**Tâches**

- [x] 6 détecteurs (`src/core/detection/*`)
- [x] `pro_email` : allowlist `policy.emailDomains` uniquement
- [x] IBAN : checksum mod97
- [x] Fusion chevauchements par priorité
- [x] Limite entrée 100k caractères
- [x] Tests Vitest (`npm test`) — 19 tests

**Done when**

- [x] Tests unitaires verts
- [x] Perf &lt; 50 ms sur ~10k caractères (test CI)

---

### Phase 2 — Adaptateur Claude (Agent: `platform_watcher` → `ext_dev`) ✅

**Tâches**

- [x] `src/extension/sites/claude/` : sélecteurs, DOM, hooks Entrée + clic Envoyer
- [x] `evaluateGuard` + Block (`SentinelAlert`) + Redact (`execCommand`)
- [x] Shadow DOM + i18n FR/EN (`src/ui/i18n/messages.ts`)
- [x] Tests unitaires `analyze` (4 tests)
- [ ] Tests manuels matrice sur claude.ai connecté
- [ ] Firefox (Phase 6)

**Done when**

- [ ] Matrice fonctionnelle Claude OK Chromium (Firefox Phase 6)

---

### Phase 3 — Policies & offline (Agent: `ext_dev`) ✅

**Tâches**

- [x] Policy locale + sync `GET /policies` (Bearer)
- [x] Queue télémétrie + flush (alarms 5 min, backoff)
- [x] Page Options (credentials, import/export JSON)
- [x] API MVP `GET /policies`, `POST /telemetry`
- [ ] Test manuel offline 24 h

**Done when**

- [ ] 24 h offline → policy en cache, télémétrie rattrapée sans doublon

---

### Phase 4 — API (Agent: `backend_ops` + `compliance_rgpd` + `security_auditor`)

**Tâches**

- `GET /policies`, `POST /telemetry` + validation schéma strict
- Auth Bearer, rate limiting, rétention 90 j + purge
- Fiche traitement + notice employé FR/EN (brouillon juridique)

**Done when**

- Payload avec champ interdit → 400
- Checklist RGPD technique cochée

---

### Phase 5 — UX & i18n (Agent: `ux_writer`)

**Tâches**

- Copy modales Block, tokens Redact, onboarding notice
- Ton B2B pédagogique FR/EN

**Done when**

- Recette `functional_tester` : message compris sans formation

---

### Phase 6 — QA & release pilote (Agent: `qa_tester` + `functional_tester`)

**Tâches**

- CI : `npm run build` Chromium + Firefox, tests regex, smoke API
- Guides : install Chromium, install Firefox (XPI signé), config Options
- Checklist fin de pilote

**Done when**

- Critères § Fin de pilote atteints

---

### Phase 7 — ChatGPT puis Gemini (Agent: `platform_watcher` → `ext_dev`)

**Tâches**

- Répéter pattern `sites/<llm>/` pour ChatGPT puis Gemini
- Étendre `host_permissions` + tests régression cross-site

**Done when**

- Matrice 3 LLM × 2 navigateurs validée

---

## Matrice de tests — pilote Claude (extrait)

| ID | Donnée | Mode policy | Action | Attendu |
|----|--------|-------------|--------|---------|
| F01 | IBAN | Block | Envoyer | Modale + pas d’envoi |
| F02 | IBAN | Redact | Envoyer | Token + envoi |
| F03 | Clé AWS | Block | Coller + Envoyer | Bloqué |
| F04 | `sk-…` | Block | Envoyer | Bloqué |
| F05 | IP 10.x | Redact | Envoyer | Token |
| F06 | email `@client.com` | Redact | Envoyer | Token (domaine dans allowlist) |
| F07 | email `@gmail.com` | — | Envoyer | Pas de match pro |
| F08 | Téléphone FR | Redact | Envoyer | Token |
| F09 | Offline 24h | — | Block event | Queue puis flush |
| F10 | Firefox | F03 | — | Même F03 |

---

## Risques & dépendances

| Risque | Mitigation |
|--------|------------|
| DOM Claude change | Adaptateur isolé + `platform_watcher` |
| Télémétrie vs RGPD | Schéma strict + notice + DPO client |
| Dual-build coût | Abstraction `platform/` en Phase 0 |
| Allowlist email vide à l’install | Policy default : `pro_email` désactivé jusqu’à intégration |
| Firefox signing délai | Soumettre AMO tôt en Phase 6 (review Mozilla) |

**Ordre**

```
0 → 1 → 2 → 3 → 5 → 6 → 7
     ↘ 4 (parallèle après 0, fin avant release)
```

---

## Fin de pilote — critères validés

| Critère | Cible |
|---------|--------|
| Utilisateurs | **20–50** OU **2 semaines** (premier atteint) |
| Fonctionnel | 100 % matrice Claude F01–F10 |
| Navigateurs | Chromium + Firefox |
| Stabilité | 0 bug bloquant sur 5 jours usage interne |
| Perf | Détection p95 &lt; 50 ms (cible projet) |
| RGPD | Checklist § RGPD + relecture DPO client |
| Télémétrie | 100 % événements conformes schéma |

---

## Intégration client — checklist données

À compléter **à l’intégration** (pas bloquant dev, bloquant go-live client) :

- [ ] `tenantId` + clé API Bearer
- [ ] `emailDomains[]` (emails pro)
- [ ] Modes par `ruleType` (override défauts)
- [ ] URL API policies/télémétrie
- [ ] `departmentId` (optionnel)
- [ ] URL hébergement XPI Firefox signé (ou store privé Chromium)

---

## Commandes de validation (référence)

```bash
npm run build          # Chromium extension
# (à ajouter) npm run build:firefox
npm run backend        # API locale :3000
docker compose up -d   # API conteneurisée
```

Chargement extension : `dist/` (Chromium) — voir guides Phase 6.

---

## Agents & revues

| Phase | Principal | Revue obligatoire |
|-------|-----------|-------------------|
| 0 | architect | security_auditor |
| 1 | backend_ops | security_auditor |
| 2 | platform_watcher → ext_dev | functional_tester |
| 3 | ext_dev | security_auditor |
| 4 | backend_ops | compliance_rgpd, security_auditor |
| 5 | ux_writer | functional_tester |
| 6 | qa_tester, functional_tester | product_owner |
| 7 | platform_watcher → ext_dev | qa_tester |

---

## Prochaine action recommandée

Démarrer **Phase 0** : types, correction manifest, ADR Firefox/Chromium, format policy avec `emailDomains`.
