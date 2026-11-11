# Compatibilité plateformes LLM

État au 2026-11. Les sélecteurs sont validés par l'e2e Playwright sur des **fixtures** des 8 sites
(`e2e/fixtures.ts`), pas sur les sites réels (connexion requise) : une refonte d'UI côté site
n'est détectée qu'à l'usage, par le self-test d'adaptateur (bannière « protection inactive »,
diagnostic de la page d'options).

| Plateforme | Domaine | Sélecteurs | Fixture e2e |
|------------|---------|------------|-------------|
| Claude | `claude.ai` | `src/extension/sites/claude/selectors.ts` | oui |
| ChatGPT | `chatgpt.com` | `sites/chatgpt/selectors.ts` | oui |
| Gemini | `gemini.google.com` | `sites/gemini/selectors.ts` | oui |
| Le Chat | `chat.mistral.ai` | `sites/mistral/selectors.ts` | oui |
| DeepSeek | `chat.deepseek.com` | `sites/deepseek/selectors.ts` | oui |
| Perplexity | `perplexity.ai`, `www.perplexity.ai` | `sites/perplexity/selectors.ts` | oui |
| Grok | `grok.com` | `sites/grok/selectors.ts` | oui |
| Copilot | `copilot.microsoft.com` | `sites/copilot/selectors.ts` | oui |

Non couverts : les autres domaines des mêmes éditeurs (consoles d'API, Copilot intégré à
Microsoft 365, AI Studio…). Ajouter un hôte = `manifest*.json` (`host_permissions`,
`content_scripts.matches`), `src/core/llm-hosts.ts`, un dossier `sites/<site>/` et une fixture.

## Architecture

- Code partagé : `src/extension/sites/shared/` (`dom-factory`, `guard-adapter`, `file-guard`,
  `adapter-health-monitor`, `input-text`)
- Par site : `selectors.ts` → `dom.ts` → `adapter.ts`
- Démarrage : `src/extension/content/bootstrap.ts` (injecté à `document_start`, adaptateur
  attaché immédiatement avec la policy par défaut, puis policy réelle)

## Ce qui est intercepté (tous sites)

- **Entrée** (sans Shift/Ctrl/Meta/Alt) dans le composer
- **Clic** sur le bouton d'envoi — sélecteurs du site, puis repli générique : bouton situé dans
  la zone du composer, `type="submit"` ou libellé contenant send/envoyer/submit
- **Fichiers** : `change` sur `input[type=file]`, `drop`, `paste` (annulation synchrone, analyse,
  puis réinjection des fichiers autorisés)
  - texte/code : lus localement (5 Mo max), caviardables
  - PDF, DOCX, XLSX, PPTX : texte extrait localement (10 Mo max) ; une règle « redact » bloque le
    fichier, faute de pouvoir le réécrire
  - autres formats (images, archives, RTF/ODF) : non analysés

## Firefox

Vérifié par `npm run test:e2e:firefox` (vrai Firefox piloté en BiDi, mêmes fixtures) : installation,
options, popup, diagnostic, garde d'envoi sur les 8 sites, caviardage, pièces jointes.

Particularité : le content script voit les objets de la page à travers des enveloppes Xray.
- Les octets d'un fichier sont recopiés dans le contexte de l'extension (`readFileBytes`) avant
  toute extraction.
- pdf.js ne peut pas créer ses flux dans le content script : l'extraction PDF y échoue puis est
  refaite par la page d'arrière-plan (message interne `EXTRACT_PDF_TEXT`, aucun réseau, rien de
  stocké). Sous Chromium, l'extraction reste dans le content script.
- Non testable automatiquement : le collage d'un fichier (Firefox retire les fichiers d'un
  `ClipboardEvent` construit par script). Recette manuelle.

## Quand un site change

| Situation | Détection | Effet selon `fail_mode` |
|-----------|-----------|-------------------------|
| Zone de saisie introuvable 10 s après le chargement | Self-test (`adapter-health-monitor.ts`) | `warn` : bannière ; `closed` : bannière + envois bloqués ; `open` : rien |
| Zone de saisie introuvable en cours de session | Entrée dans un champ éditable non reconnu | idem, immédiatement |
| Bouton d'envoi non reconnu | Repli générique (ci-dessus) | Analyse normale si le repli le reconnaît |
| Zone de saisie de nouveau reconnue | Entrée suivante | État « cassé » levé |

## Procédure de mise à jour (rupture UI)

1. Reproduire sur le site concerné (conversation ouverte).
2. Inspecter le composer (zone de saisie + bouton d'envoi).
3. Ajouter le sélecteur en tête de liste dans `sites/<site>/selectors.ts` et le reporter dans la
   fixture (`e2e/fixtures.ts`).
4. `npm test`, `npm run test:e2e`, puis Block (clé API) + Redact (IBAN) manuels sur le site.
5. Mettre à jour la date en tête de ce fichier.
