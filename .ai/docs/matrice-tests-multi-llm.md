# Matrice de tests — 8 LLM × 2 navigateurs

> Phase 7 · Reprendre les scénarios [matrice-tests-pilote-claude.md](./matrice-tests-pilote-claude.md) sur **chaque** plateforme.

## Préparation commune

| Étape | Commande / action |
|-------|-------------------|
| Build | `npm run ci` |
| Chromium | Charger `dist/` |
| Firefox | Charger `dist-firefox/manifest.json` (temporaire) ou XPI signé |
| Policy | Import avec `emailDomains` pour F06–F07 |
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
| M11 | Tous | — | Télémétrie | block | `host` correct dans API | ☐ | ☐ |
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
| M24 | Nouveaux sites | — | `.txt` avec clé AWS | block (Pro) | File-guard actif sur chaque nouveau site | ☐ | ☐ |

## Vérification télémétrie (M11)

Après un Block sur ChatGPT :

```bash
curl -s -H "Authorization: Bearer <clé>" http://localhost:3000/telemetry
# ou inspecter les logs API — host attendu : chatgpt.com
```

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
