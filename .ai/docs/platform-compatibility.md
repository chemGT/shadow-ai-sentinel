# Compatibilité plateformes LLM

| Plateforme | Domaine | Extension | Statut | Dernière vérif. |
|------------|---------|-----------|--------|-----------------|
| Claude | `claude.ai` | 0.1.0 | 🟢 Adaptateur Phase 2 | 2026-05-19 |
| ChatGPT | `chatgpt.com` | 0.1.0 | 🟡 Phase 7 — sélecteurs à valider post-login | 2026-05-20 |
| Gemini | `gemini.google.com` | 0.1.0 | 🟡 Phase 7 — sélecteurs à valider post-login | 2026-05-20 |

## Architecture

- Code partagé : `src/extension/sites/shared/` (`dom-factory`, `guard-adapter`, `input-text`)
- Par site : `selectors.ts` → `dom.ts` → `adapter.ts`
- Routage content script : `resolveLlmHost()` dans `src/core/llm-hosts.ts`

## Claude — `src/extension/sites/claude/selectors.ts`

### Zone de saisie

1. `div.ProseMirror[contenteditable="true"]`
2. `[data-testid="chat-input"]`
3. `div[contenteditable="true"][role="textbox"]`

### Bouton d’envoi

1. `button[aria-label="Send message"]`
2. `button[data-testid="send-button"]`

## ChatGPT — `src/extension/sites/chatgpt/selectors.ts`

### Zone de saisie

1. `#prompt-textarea`
2. `div.ProseMirror[contenteditable="true"]`
3. `[data-testid="prompt-textarea"]`
4. `main div[contenteditable="true"]`

### Bouton d’envoi

1. `button[data-testid="send-button"]`
2. `#composer-submit-button[data-testid="send-button"]`
3. `button[aria-label*="Send"]`

## Gemini — `src/extension/sites/gemini/selectors.ts`

### Zone de saisie

1. `rich-textarea div[contenteditable="true"]`
2. `div.ql-editor[contenteditable="true"]`
3. `div[contenteditable="true"][role="textbox"]`

### Bouton d’envoi

1. `button[aria-label="Send message"]`
2. `button.send-button`
3. `button[aria-label*="Send"]`

## Raccourcis interceptés (tous sites)

- **Entrée** (sans Shift/Ctrl/Meta/Alt) dans le composer
- **Clic** sur le bouton d’envoi
- **Fichiers texte** : `change` sur `input[type=file]`, `drop`, `paste` (fichiers du presse-papiers)

### Fichiers texte (`src/extension/sites/shared/file-guard.ts`)

- Lecture locale `FileReader` (max 5 Mo, analyse 100k car.)
- Block / Redact identiques au composer
- PDF / binaires : ignorés (pas d’analyse)

## Procédure de mise à jour (rupture UI)

1. Reproduire sur le site concerné (conversation ouverte).
2. Inspecter le composer (input + bouton send).
3. Ajouter le sélecteur en tête de liste dans `sites/<llm>/selectors.ts`.
4. `npm test` puis Block (clé API) + Redact (IBAN) manuels.
5. Mettre à jour ce fichier (date + statut).
