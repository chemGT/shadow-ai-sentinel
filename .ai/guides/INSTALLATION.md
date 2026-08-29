# Guide d’installation — Shadow AI Sentinel

> **Document évolutif** : les sections sont étiquetées par phase. Ne pas appliquer une section marquée « à venir » tant que la phase n’est pas ✅ dans [SUIVI-ACTIONS.md](../SUIVI-ACTIONS.md).

**Dernière mise à jour :** 2026-05-20  
**Phases disponibles aujourd’hui :** 0–7 (DLP multi-LLM, Options, API, UX, release)

---

## Sommaire

1. [Prérequis](#1-prérequis) — Phase 0 ✅  
2. [Installation environnement de développement](#2-installation-environnement-de-développement) — Phase 0 ✅  
3. [Build et chargement extension (Chromium)](#3-build-et-chargement-extension-chromium) — Phase 0 ✅  
4. [Vérifier le moteur de détection](#4-vérifier-le-moteur-de-détection) — Phase 1 ✅  
5. [Tester sur les LLM (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot)](#5-tester-sur-les-llm) — Phase 7 ✅  
6. [Configurer policies et credentials](#6-configurer-policies-et-credentials) — Phase 3 ✅
7. [Installer l’API (Docker)](#7-installer-lapi-docker) — Phase 3 ✅ (endpoints MVP)
8. [Firefox (XPI signé)](#8-firefox-xpi-signé) — Phase 6 ✅  
9. [Release pilote entreprise](#9-release-pilote-entreprise) — Phase 6 ✅  
10. [Dépannage](#10-dépannage)

---

## 1. Prérequis

| Outil | Version minimale | Phase |
|-------|------------------|-------|
| Node.js | 18+ (20 LTS recommandé) | 0 ✅ |
| npm | 9+ | 0 ✅ |
| Git | 2.x | 0 ✅ |
| Chrome ou Edge (Chromium) | Récent | 0 ✅ |
| Docker (optionnel) | 24+ | 4 ⏳ |

**Comptes / accès (plus tard)**

| Élément | Phase requise |
|---------|----------------|
| Compte `claude.ai` pour tests manuels | 2 ⏳ |
| `tenantId` + clé API client | 3 ⏳ |
| Hébergement HTTPS pour XPI Firefox | 6 ⏳ |

---

## 2. Installation environnement de développement

**Disponible : Phase 0 ✅**

```bash
git clone <url-du-repo> shadow-ai-sentinel
cd shadow-ai-sentinel
npm ci
```

Vérification :

```bash
npm test
npm run test:ci
npm run build
npm run ci
npm run build:firefox
```

Résultat attendu :

- Build Chromium : dossier `dist/` créé sans erreur.
- Build Firefox : dossier `dist-firefox/` avec `browser_specific_settings.gecko.id`.
- Tests : `72 passed` (détails : [tests-automatises.md](../docs/tests-automatises.md)).

Mode développement (rebuild automatique) :

```bash
npm run dev
```

> Laisser cette commande tourner, puis recharger l’extension dans le navigateur après chaque modification (voir §3).

---

## 3. Build et chargement extension (Chromium)

**Disponible : Phase 0 ✅**  
**Protection DLP sur Claude : Phase 2 ⏳** (l’extension se charge mais n’intercepte pas encore les envois)

### 3.1 Build production locale

```bash
npm run build
```

Artefact : répertoire `dist/` à la racine du projet.

### 3.2 Charger l’extension non empaquetée (Chrome)

1. Ouvrir `chrome://extensions`
2. Activer **Mode développeur** (coin supérieur droit)
3. **Charger l’extension non empaquetée**
4. Sélectionner le dossier **`dist/`** (pas la racine du repo)

### 3.3 Charger l’extension (Microsoft Edge)

1. Ouvrir `edge://extensions`
2. Activer **Mode développeur**
3. **Charger l’extension décompressée** → dossier `dist/`

### 3.4 Vérifier le chargement (état actuel Phase 0–1)

1. Ouvrir [https://claude.ai](https://claude.ai)
2. Ouvrir les outils de développement (F12) → onglet **Console**
3. Messages attendus :
   - `[Shadow AI Sentinel] Service worker prêt` (détails policy / deviceId)
   - `[Shadow AI Sentinel] Content script actif` sur `claude.ai`

**Permissions actuelles** (voir `.ai/architecture/permissions-mv3.md`) :

- `storage`
- `host_permissions` : `claude.ai`, `chatgpt.com`, `gemini.google.com`

### 3.5 Recharger après un nouveau build

1. `npm run build`
2. `chrome://extensions` → icône **Recharger** sur Shadow AI Sentinel
3. Rafraîchir l’onglet `claude.ai`

---

## 4. Vérifier le moteur de détection

**Disponible : Phase 1 ✅**  
*(tests hors navigateur — ne nécessite pas l’extension chargée)*

```bash
npm test
```

Couverture actuelle :

| Type | Exemple testé |
|------|----------------|
| `api_key` | AWS `AKIA…`, OpenAI `sk-…`, GitHub `ghp_…` |
| `iban` | DE89370400440532013000 (+ rejet checksum invalide) |
| `internal_ip` | 192.168.x.x (ignore 8.8.8.8) |
| `pro_email` | `@acme.com` si domaine dans policy |
| `phone` | 06 12 34 56 78 (FR) |
| `generic_secret` | `Bearer …` |

Test manuel rapide (console Node) :

```bash
npx tsx -e "
import { detectSensitiveData, createDefaultPolicy } from './src/core/index.ts';
const p = { ...createDefaultPolicy('test'), emailDomains: ['acme.com'],
  rules: createDefaultPolicy().rules.map(r => r.type === 'pro_email' ? { ...r, enabled: true } : r) };
console.log(detectSensitiveData('IBAN DE89370400440532013000 et jean@acme.com', p));
"
```

---

## 5. Tester sur Claude.ai

**Disponible : Phase 2 ✅**

### Prérequis

- Extension chargée depuis `dist/` (§3)
- Compte [claude.ai](https://claude.ai) connecté
- Nouvelle conversation ouverte

### Vérifier l’activation

Console (F12) sur `claude.ai` :

```
[Shadow AI Sentinel] Adaptateur Claude actif (texte + fichiers texte)
[Shadow AI Sentinel] Content script prêt
```

### Fichiers texte (pièces jointes)

| Mode | Comportement |
|------|----------------|
| Block | Fichier non joint + modale « Fichier bloqué » |
| Redact | Fichier remplacé avec jetons `[REDACTED_*]` |

Formats : `.txt`, `.csv`, `.json`, `.env`, `.md`, `.log`, `.sql`, etc. — via sélection, glisser-déposer ou collage. **Pas** de PDF/images/Office.

Test : `secrets.env` avec `AKIAIOSFODNN7EXAMPLE` → Block à l’ajout.

### Scénarios de test (saisie)

| # | Saisie (exemple) | Mode policy | Action | Résultat attendu |
|---|------------------|-------------|--------|------------------|
| T1 | `AKIAIOSFODNN7EXAMPLE` | Block (défaut) | Entrée ou Envoyer | Modale FR/EN, **pas d’envoi** |
| T2 | `DE89370400440532013000` | Redact (défaut) | Entrée ou Envoyer | Texte remplacé par `[REDACTED_IBAN]`, toast, pas d’envoi auto |
| T3 | `192.168.1.42` | Redact | Envoyer | `[REDACTED_INTERNAL_IP]` |
| T4 | `jean@acme.com` | Redact + `emailDomains` | Envoyer | Match **uniquement** si domaine configuré (Phase 3 import policy) |
| T5 | `06 12 34 56 78` | Redact | Envoyer | `[REDACTED_PHONE]` |
| T6 | `Bearer eyJhbGciOiJIUzI1NiJ9.abc.def` | Block (secret) | Envoyer | Modale block |

> **Emails pro (T4)** : par défaut la règle `pro_email` est **désactivée**. Activer via import policy (Phase 3) avec `emailDomains: ["votre-domaine.com"]`.

### Raccourcis testés

- **Entrée** (sans Shift) dans la zone de saisie
- **Clic** sur le bouton d’envoi
- **Pièce jointe texte** (sélection / drop / collage)

### Si rien ne se passe

1. Recharger l’extension puis la page Claude.
2. Vérifier que les sélecteurs n’ont pas changé → [.ai/docs/platform-compatibility.md](../docs/platform-compatibility.md).
3. Ouvrir une issue / mettre à jour `src/extension/sites/claude/selectors.ts`.

---

## 6. Configurer policies et credentials

**Disponible : Phase 3 ✅**

### Ouvrir les options

`chrome://extensions` → Shadow AI Sentinel → **Détails** → **Extension options**  
(ou clic droit sur l’icône → Options)

### 1. API entreprise

| Champ | Exemple dev |
|-------|-------------|
| Tenant ID | `acme-corp` |
| Clé API | `dev-secret-change-me` (voir `.env.example`) |
| URL API | `http://localhost:3000` |

Cliquer **Enregistrer** → accepter la permission réseau pour l’URL API.

Puis **Synchroniser la policy** (pull `GET /policies`).

### 2. Policy JSON locale

- **Importer** : coller / éditer le JSON puis **Importer en local**
- **Exporter** : recharge depuis `chrome.storage`

Exemple policy (référence) :

```json
{
  "version": "1.0.0",
  "tenantId": "acme-corp",
  "updatedAt": "2026-05-19T12:00:00.000Z",
  "emailDomains": ["acme.com"],
  "rules": [
    { "type": "api_key", "action": "block", "enabled": true },
    { "type": "generic_secret", "action": "block", "enabled": true },
    { "type": "iban", "action": "redact", "enabled": true },
    { "type": "internal_ip", "action": "redact", "enabled": true },
    { "type": "pro_email", "action": "redact", "enabled": true },
    { "type": "phone", "action": "redact", "enabled": true }
  ]
}
```

---

## 7. Installer l’API (Docker)

**Disponible : Phase 3 ✅** (MVP — durcissement prod en Phase 4)

### Dev local

```bash
cp .env.example .env
# Éditer API_KEYS=acme-corp:dev-secret-change-me
npm run backend
```

Vérifications :

```bash
curl http://localhost:3000/health
curl -H "Authorization: Bearer dev-secret-change-me" http://localhost:3000/policies
```

### Docker

```bash
docker compose up -d --build
```

Variables (fichier `.env` à la racine pour Compose) :

| Variable | Description |
|----------|-------------|
| `API_KEYS` | `tenantId:apiKey` (virgule pour plusieurs) |
| `PORT` | Port HTTP (défaut `3000`) |
| `TELEMETRY_RETENTION_DAYS` | Rétention (défaut `90`) |
| `RATE_LIMIT_*_PER_MIN` | Limites requêtes/min |

### Endpoints

| Méthode | Route | Auth |
|---------|-------|------|
| GET | `/health` | Non |
| GET | `/policies` | Bearer |
| POST | `/telemetry` | Bearer (max 50 événements) |

### Télémétrie extension

- Événements en file locale si API indisponible
- Flush auto toutes les **5 min** + bouton **Envoyer télémétrie** dans Options
- Aucun contenu de prompt transmis

---

## 8. Firefox (XPI signé)

**Disponible : Phase 6 ✅**

### 8.1 Build

```bash
npm run build:firefox
node scripts/verify-dist-firefox.mjs
```

Artefact : répertoire **`dist-firefox/`** (ne pas confondre avec `dist/` Chromium).

### 8.2 Test local (module temporaire)

1. Firefox → `about:debugging` → **Ce Firefox**
2. **Charger un module temporaire…** → `dist-firefox/manifest.json`
3. Ouvrir [claude.ai](https://claude.ai) — mêmes scénarios que §5

### 8.3 Paquet XPI non signé (soumission AMO)

```bash
npm run package:firefox
```

Produit : `dist-firefox/shadow-ai-sentinel-unsigned.xpi` — à soumettre sur [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).

Procédure complète : [firefox-distribution.md](../docs/firefox-distribution.md).

### 8.4 Installation pilote (XPI signé)

1. Télécharger le XPI **signé** par Mozilla (distribution non répertoriée).
2. Héberger en **HTTPS** sur l’intranet client.
3. Distribuer le lien ou installer via `policies.json` Firefox (ESR entreprise).

**ID Gecko (fixe)** : `shadow-ai-sentinel@pilot.sentinel`

---

## 9. Release pilote entreprise

**Disponible : Phase 6 ✅**

### 9.1 Figurer une version

```bash
git tag v0.1.0-pilote-claude
npm run ci
```

Vérifier `manifest.json` / `manifest.firefox.json` → version `0.1.0`.

### 9.2 Distribution Chromium (20–50 utilisateurs)

| Mode | Procédure |
|------|-----------|
| **Dev / recette** | Extension non empaquetée `dist/` (§3) |
| **Pilote IT** | CRX / Chrome Web Store **non répertoriée** ou `ExtensionInstallForcelist` (GPO) |

Livrer : ZIP du dossier `dist/` versionné + ce guide + notices [compliance/](../compliance/).

### 9.3 Matrice de recette obligatoire

Exécuter **F01–F10** : [matrice-tests-pilote-claude.md](../docs/matrice-tests-pilote-claude.md).

### 9.4 Checklist de clôture pilote

Avant de déclarer le pilote terminé : [checklist-fin-pilote.md](../docs/checklist-fin-pilote.md).

| Élément | Référence |
|---------|-----------|
| Credentials client | §6 |
| Notice employé FR/EN | [notice-employe-fr.md](../compliance/notice-employe-fr.md) |
| RGPD technique | [checklist-rgpd-release.md](../compliance/checklist-rgpd-release.md) |
| Critère métier | 20–50 utilisateurs **ou** 2 semaines |

### 9.5 Support

Définir côté client : contact sécurité / IT pour faux positifs, policy, et révocation clé API.

---

## 10. Dépannage

### L’extension ne apparaît pas dans `dist/`

```bash
npm run build
```

Vérifier l’absence d’erreurs TypeScript.

### Pas de message console sur claude.ai

- Extension bien chargée depuis **`dist/`** (recharger après build)
- URL exacte : `https://claude.ai` (permissions limitées à ce domaine)
- Pas de filtre « Errors only » dans la console

### `npm test` échoue

```bash
npm ci
npm test
```

### Le texte sensible n’est pas bloqué sur Claude

1. Vérifier les logs « Adaptateur Claude actif » (sinon §5 dépannage sélecteurs).
2. `npm run build` + recharger l’extension.
3. Policy par défaut : `api_key` et `generic_secret` en **block**, autres en **redact**.

### Firefox : module temporaire disparu

Recharger via `about:debugging` après chaque `npm run build:firefox`, ou déployer un XPI signé (§8.4).

### Docker / API

```bash
docker compose up -d --build
curl http://localhost:3000/health
```

Si `/policies` ou `/telemetry` échouent : vérifier `API_KEYS` et Bearer dans Options.

---

## Historique du guide

| Date | Phase | Modifications |
|------|-------|----------------|
| 2026-05-19 | 0–1 | Création : prérequis, build Chromium, tests regex, sections futures |
| 2026-05-19 | 2 | Tests DLP sur claude.ai, scénarios Block/Redact |
| 2026-05-20 | 6 | Build Firefox, release pilote, matrice F01–F10, checklist clôture |
| 2026-05-20 | 7 | ChatGPT + Gemini, permissions 3 hosts, télémétrie par site |

---

## Liens utiles

| Document | Rôle |
|----------|------|
| [SUIVI-ACTIONS.md](../SUIVI-ACTIONS.md) | Tableau de bord tâches et statuts |
| [plans/mvp-pilote-claude.md](../plans/mvp-pilote-claude.md) | Plan MVP détaillé |
| [schemas/policy.example.json](../schemas/policy.example.json) | Exemple policy |
| [architecture/permissions-mv3.md](../architecture/permissions-mv3.md) | Permissions extension |
| [docs/matrice-tests-pilote-claude.md](../docs/matrice-tests-pilote-claude.md) | Recette F01–F10 |
| [docs/checklist-fin-pilote.md](../docs/checklist-fin-pilote.md) | Clôture pilote |
| [docs/firefox-distribution.md](../docs/firefox-distribution.md) | AMO + XPI signé |
