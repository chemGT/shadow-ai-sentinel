# Guide d’installation — Shadow AI Sentinel

> **Document évolutif** : les sections sont étiquetées par phase. Ne pas appliquer une section marquée « à venir » tant que la phase n’est pas ✅ dans [SUIVI-ACTIONS.md](../SUIVI-ACTIONS.md).

**Dernière mise à jour :** 2026-05-19  
**Phases disponibles aujourd’hui :** 0, 1 (développement / tests — **pas encore de protection DLP active sur Claude**)

---

## Sommaire

1. [Prérequis](#1-prérequis) — Phase 0 ✅  
2. [Installation environnement de développement](#2-installation-environnement-de-développement) — Phase 0 ✅  
3. [Build et chargement extension (Chromium)](#3-build-et-chargement-extension-chromium) — Phase 0 ✅  
4. [Vérifier le moteur de détection](#4-vérifier-le-moteur-de-détection) — Phase 1 ✅  
5. [Tester sur Claude.ai](#5-tester-sur-claudeai) — Phase 2 ⏳ *à venir*  
6. [Configurer policies et credentials](#6-configurer-policies-et-credentials) — Phase 3 ⏳ *à venir*  
7. [Installer l’API (Docker)](#7-installer-lapi-docker) — Phase 4 ⏳ *à venir*  
8. [Firefox (XPI signé)](#8-firefox-xpi-signé) — Phase 6 ⏳ *à venir*  
9. [Release pilote entreprise](#9-release-pilote-entreprise) — Phase 6 ⏳ *à venir*  
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
npm run build
npm test
```

Résultat attendu :

- Build : dossier `dist/` créé sans erreur.
- Tests : `19 passed`.

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
- `host_permissions` : `*://claude.ai/*` uniquement

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

**⏳ À venir — Phase 2**

Quand la Phase 2 sera livrée, cette section contiendra :

- Scénarios Block (clé API, secret) → modale, envoi bloqué
- Scénarios Redact (IBAN, IP, email pro, téléphone) → token visible
- Raccourci Entrée + bouton Envoyer
- Collage depuis le presse-papiers

*En attendant : seule la présence du content script en console est normale.*

---

## 6. Configurer policies et credentials

**⏳ À venir — Phase 3**

Prévu :

1. Page **Options** de l’extension (`tenantId`, `apiKey`, `apiBaseUrl`)
2. Import fichier policy JSON (modèle : `.ai/schemas/policy.example.json`)
3. Liste `emailDomains` renseignée à l’intégration client

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

**⏳ À venir — Phase 4** (healthcheck seulement disponible aujourd’hui)

### État actuel (dev local sans Docker)

```bash
npm run backend
curl http://localhost:3000/health
```

Réponse attendue : `{"status":"ok","service":"shadow-ai-sentinel-api"}`

### Prévu Phase 4

```bash
docker compose up -d --build
```

Variables d’environnement (exemple à documenter en Phase 4) :

| Variable | Description |
|----------|-------------|
| `API_AUTH_KEYS` | Clés Bearer par tenant |
| `TELEMETRY_RETENTION_DAYS` | Défaut `90` |

---

## 8. Firefox (XPI signé)

**⏳ À venir — Phase 6**

Procédure cible :

1. Build Firefox : `npm run build:firefox` *(script à créer)*
2. Soumission Mozilla Developer Hub — distribution **non répertoriée**
3. Héberger le `.xpi` signé en **HTTPS** (intranet client)
4. Installation : lien interne ou `policies.json` entreprise

*Aujourd’hui : uniquement Chromium (§3).*

---

## 9. Release pilote entreprise

**⏳ À venir — Phase 6**

Checklist prévue :

- [ ] Version figée (`manifest.json` / tag Git)
- [ ] Guide utilisateur FR/EN
- [ ] Notice employé (télémétrie)
- [ ] Paramètres client : `tenantId`, clé API, `emailDomains`
- [ ] 20–50 utilisateurs ou 2 semaines de pilote
- [ ] Support : contact interne client

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

**Comportement normal avant Phase 2.** Le moteur regex fonctionne en tests unitaires mais n’est pas encore branché au DOM.

### Docker / API

Phase 4 non livrée : seul `/health` existe. Ne pas attendre `/policies` ou `/telemetry` pour l’instant.

---

## Historique du guide

| Date | Phase | Modifications |
|------|-------|----------------|
| 2026-05-19 | 0–1 | Création : prérequis, build Chromium, tests regex, sections futures |

---

## Liens utiles

| Document | Rôle |
|----------|------|
| [SUIVI-ACTIONS.md](../SUIVI-ACTIONS.md) | Tableau de bord tâches et statuts |
| [plans/mvp-pilote-claude.md](../plans/mvp-pilote-claude.md) | Plan MVP détaillé |
| [schemas/policy.example.json](../schemas/policy.example.json) | Exemple policy |
| [architecture/permissions-mv3.md](../architecture/permissions-mv3.md) | Permissions extension |
