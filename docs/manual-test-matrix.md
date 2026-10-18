# Matrice de tests — 8 LLM × 2 navigateurs

> ⚡ **Automatisé** : `npm run test:e2e` (Playwright, `e2e/guard.e2e.ts`) couvre block
> Enter/clic + passage texte anodin sur les 8 sites, redact et file-guard —
> extension réelle chargée, fixtures répliquant les sélecteurs de prod.
> **Reste manuel** : uniquement la dérive des DOM réels (sélecteurs qui ne matchent
> plus après un redesign du site) et le comportement des éditeurs riches en vrai
> (persistance du redact dans Lexical/ProseMirror).

> Recette manuelle avant chaque release (`v*`), sur Chromium et Firefox.

## Préparation commune

| Étape | Commande / action |
|-------|-------------------|
| Build | `npm run build && npm run build:firefox` |
| Chromium | Charger `dist/` |
| Firefox | Charger `dist-firefox/manifest.json` (temporaire) ou XPI signé |
| Policy | Importer [`policy.example.json`](policy.example.json) (options → Règles) pour activer `pro_email` |
| Console | `Adaptateur <Site> actif` selon l’URL |

## Matrice par site

Pour chaque ligne, cocher **Chr** (Chromium) et **FF** (Firefox).

| ID | Site | URL | Donnée | Mode | Attendu | Chr | FF |
|----|------|-----|--------|------|---------|-----|-----|
| M01 | Claude | claude.ai | IBAN | block (override) | Modale, pas d’envoi | ☐ | ☐ |
| M02 | Claude | claude.ai | IBAN | redact | Token + toast | ☐ | ☐ |
| M03 | Claude | claude.ai | Clé AWS | block | Modale | ☐ | ☐ |
| M04 | ChatGPT | chatgpt.com | Clé AWS | block | Modale | ☐ | ☐ |
| M05 | ChatGPT | chatgpt.com | IBAN | redact | Token | ☐ | ☐ |
| M06 | ChatGPT | chatgpt.com | `sk-…` | block | Modale | ☐ | ☐ |
| M07 | Gemini | gemini.google.com | Clé AWS | block | Modale | ☐ | ☐ |
| M08 | Gemini | gemini.google.com | IP 10.x | redact | Token | ☐ | ☐ |
| M09 | Gemini | gemini.google.com | Téléphone FR | redact | Token | ☐ | ☐ |
| M10 | Claude | claude.ai | email `@client.com` | redact + allowlist | Token pro | ☐ | ☐ |
| M12 | Claude | claude.ai | `.txt` avec clé AWS | block | Fichier non joint + modale | ☐ | ☐ |
| M13 | ChatGPT | chatgpt.com | `.csv` avec IBAN | redact | Fichier joint avec tokens | ☐ | ☐ |
| M14 | Le Chat | chat.mistral.ai | Clé AWS | block (Enter + clic) | Modale, pas d’envoi | ☐ | ☐ |
| M15 | Le Chat | chat.mistral.ai | IBAN | redact | Token persistant (ProseMirror) | ☐ | ☐ |
| M16 | DeepSeek | chat.deepseek.com | Clé AWS | block (Enter + **clic flèche**) | Modale — vérifier le chemin clic (div role=button) | ☐ | ☐ |
| M17 | DeepSeek | chat.deepseek.com | IBAN | redact | Token dans textarea | ☐ | ☐ |
| M18 | Perplexity | www.perplexity.ai | Clé AWS | block (Enter + clic) | Modale, pas d’envoi | ☐ | ☐ |
| M19 | Perplexity | www.perplexity.ai | IBAN | redact | Token persistant (Lexical) | ☐ | ☐ |
| M20 | Grok | grok.com | Clé AWS | block (Enter + clic) | Modale, pas d’envoi | ☐ | ☐ |
| M21 | Grok | grok.com | IBAN | redact | Token persistant (Tiptap) | ☐ | ☐ |
| M22 | Copilot | copilot.microsoft.com | Clé AWS | block (Enter + clic) | Modale, pas d’envoi | ☐ | ☐ |
| M23 | Copilot | copilot.microsoft.com | IBAN | redact | Token dans textarea | ☐ | ☐ |
| M24 | Nouveaux sites | — | `.txt` avec clé AWS | block | File-guard actif sur chaque nouveau site | ☐ | ☐ |

## Rupture sélecteurs

| Site | Fichier à mettre à jour |
|------|-------------------------|
| Claude | `src/extension/sites/claude/selectors.ts` |
| ChatGPT | `src/extension/sites/chatgpt/selectors.ts` |
| Gemini | `src/extension/sites/gemini/selectors.ts` |
| Le Chat | `src/extension/sites/mistral/selectors.ts` |
| DeepSeek | `src/extension/sites/deepseek/selectors.ts` |
| Perplexity | `src/extension/sites/perplexity/selectors.ts` |
| Grok | `src/extension/sites/grok/selectors.ts` |
| Copilot | `src/extension/sites/copilot/selectors.ts` |

Puis `npm test` (régression `sites-regression.test.ts`) et recette manuelle.
