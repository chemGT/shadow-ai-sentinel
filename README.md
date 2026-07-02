# Shadow AI Sentinel

Extension navigateur **B2B** (Manifest V3) qui agit comme un **DLP** sur les LLM publics : détection **100 % locale** des données sensibles avant envoi, avec modes **Block** ou **Redact**.

**Sites couverts :** [Claude](https://claude.ai), [ChatGPT](https://chatgpt.com), [Gemini](https://gemini.google.com), [Mistral Le Chat](https://chat.mistral.ai), [DeepSeek](https://chat.deepseek.com), [Perplexity](https://www.perplexity.ai), [Grok](https://grok.com), [Microsoft Copilot](https://copilot.microsoft.com).

---

## Fonctionnalités cibles (MVP)

| Capacité | Statut |
|----------|--------|
| Détection locale (clés API, IBAN, IP interne, emails pro, téléphones, secrets) | ✅ Moteur regex |
| Policies par type (Block / Redact) | ✅ Phase 3 |
| Interception envoi (Claude, ChatGPT, Gemini + Le Chat, DeepSeek, Perplexity, Grok, Copilot) | ✅ Phase 7 / S1 |
| API policies + télémétrie anonymisée | ✅ Phase 4 (rate limit, rétention 90 j) |
| Télémétrie par `host` (8 hôtes LLM) | ✅ Phase 7 |

**Principe :** aucun contenu de prompt ne quitte le navigateur. La télémétrie serveur ne contient que des métadonnées (type de règle, action, horodatage).

---

## Démarrage rapide

### Prérequis

- Node.js 18+ (20 LTS recommandé)
- Chrome ou Edge (Chromium)

### Installation

```bash
git clone git@github.com:chemGT/shadow-ai-sentinel.git
cd shadow-ai-sentinel
npm ci
npm run build
npm test
```

### Charger l’extension (développement)

1. `npm run build`
2. Ouvrir `chrome://extensions` → **Mode développeur** → **Charger l’extension non empaquetée**
3. Sélectionner le dossier `dist/`
4. Ouvrir un LLM supporté et vérifier `Adaptateur <Site> actif` dans la console

> Recette : [.ai/docs/matrice-tests-multi-llm.md](.ai/docs/matrice-tests-multi-llm.md) · Install : [.ai/guides/INSTALLATION.md](.ai/guides/INSTALLATION.md)

### API (healthcheck uniquement)

```bash
npm run backend
curl http://localhost:3000/health
```

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Vite + rebuild extension (watch) |
| `npm run build` | Typecheck + build extension → `dist/` |
| `npm test` | Tests unitaires (56 tests) |
| `npm run test:ci` | Tests + couverture (CI) |
| `npm run ci` | Tests + build (comme GitHub Actions) |
| `npm run backend` | API Express locale (port 3000) |
| `docker compose up -d` | API conteneurisée (Phase 4+) |

---

## Structure du projet

```
src/
├── core/                 # Moteur DLP (regex, policy, validation)
├── extension/            # MV3 : background, content, platform/
├── ui/                   # Composants React (modales)
└── backend/              # API Node.js stateless
.ai/                      # Plan MVP, suivi, guides, ADR, sécurité
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [.ai/guides/INSTALLATION.md](.ai/guides/INSTALLATION.md) | Guide d’installation (mis à jour par phase) |
| [.ai/SUIVI-ACTIONS.md](.ai/SUIVI-ACTIONS.md) | Suivi des tâches et avancement |
| [.ai/plans/mvp-pilote-claude.md](.ai/plans/mvp-pilote-claude.md) | Plan MVP détaillé |
| [.ai/schemas/policy.example.json](.ai/schemas/policy.example.json) | Exemple de policy client |

---

## Stack technique

- **Extension :** TypeScript, React, Vite, [@crxjs/vite-plugin](https://crxjs.dev/)
- **Manifest :** V3 (service worker module)
- **Backend :** Express 5, Docker
- **Tests :** Vitest

---

## Licence

ISC — voir `package.json`.
