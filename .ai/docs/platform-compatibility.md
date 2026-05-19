# Compatibilité plateformes LLM

| Plateforme | Domaine | Extension testée | Statut | Dernière vérif. |
|------------|---------|------------------|--------|-----------------|
| Claude | `claude.ai` | 0.1.0 | 🟡 Pilote — sélecteurs à valider post-login | 2026-05-19 |
| ChatGPT | `chatgpt.com` | — | ⏳ Phase 7 | — |
| Gemini | `gemini.google.com` | — | ⏳ Phase 7 | — |

## Claude — sélecteurs (`src/extension/sites/claude/selectors.ts`)

### Zone de saisie

1. `div.ProseMirror[contenteditable="true"]`
2. `[data-testid="chat-input"]`
3. `div[contenteditable="true"][role="textbox"]`
4. `div[contenteditable="true"]` (fallback)

### Bouton d’envoi

1. `button[aria-label="Send message"]` / `Envoyer un message`
2. `button[aria-label*="Send"]`
3. `button[data-testid="send-button"]`

### Raccourcis interceptés

- **Entrée** (sans Shift/Ctrl/Meta/Alt) dans le composer
- **Clic** sur le bouton d’envoi

### Procédure de mise à jour (rupture UI)

1. Reproduire sur `claude.ai` (conversation ouverte).
2. Inspecter le composer (input + bouton send).
3. Ajouter le sélecteur en tête de liste dans `selectors.ts`.
4. Tester Block (clé API) et Redact (IBAN).
5. Mettre à jour ce fichier (date + statut).
