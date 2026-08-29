/**
 * Fixtures HTML par site : répliques minimales des composers réels, servies aux
 * URLs de prod via interception réseau (le content script s'injecte car l'URL
 * matche le manifest). Les sélecteurs répliqués sont ceux de
 * `src/extension/sites/<site>/selectors.ts` — si un sélecteur de prod change,
 * mettre à jour la fixture ET le fichier selectors.
 *
 * Chaque fixture expose pour les assertions :
 *  - window.__sent        : incrémenté si un clic sur le bouton d'envoi atteint la cible
 *  - window.__enterReached: incrémenté si un Enter sur l'input atteint la cible
 *  (le guard bloque en capture phase via stopImmediatePropagation → ces compteurs
 *   restent à 0 quand Sentinel intercepte)
 */

export type SiteFixture = {
  host: string;
  label: string;
  /** Sélecteur utilisé par le TEST pour saisir du texte. */
  inputSelector: string;
  /** Sélecteur utilisé par le TEST pour cliquer sur envoyer. */
  sendSelector: string;
  inputKind: 'textarea' | 'contenteditable';
  html: string;
};

function pageHtml(title: string, composerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title} — fixture Sentinel</title>
<style>
  [contenteditable], textarea { display:block; width:420px; min-height:48px; border:1px solid #888; padding:6px; }
  button, [role="button"] { display:inline-block; min-width:44px; min-height:32px; margin-top:8px; }
</style>
</head>
<body>
${composerHtml}
<input type="file" data-fixture-file>
<script>
  window.__sent = 0;
  window.__enterReached = 0;
  const send = document.querySelector('[data-fixture-send]');
  send.addEventListener('click', () => { window.__sent += 1; });
  const input = document.querySelector('[data-fixture-input]');
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.__enterReached += 1; });
  const form = document.querySelector('form');
  if (form) form.addEventListener('submit', (e) => e.preventDefault());
</script>
</body>
</html>`;
}

export const SITE_FIXTURES: SiteFixture[] = [
  {
    host: 'claude.ai',
    label: 'Claude',
    inputSelector: 'div.ProseMirror[contenteditable="true"]',
    sendSelector: 'button[aria-label="Send message"]',
    inputKind: 'contenteditable',
    html: pageHtml(
      'Claude',
      `<fieldset>
        <div class="ProseMirror" contenteditable="true" data-fixture-input></div>
        <button type="button" aria-label="Send message" data-fixture-send>Send</button>
      </fieldset>`,
    ),
  },
  {
    host: 'chatgpt.com',
    label: 'ChatGPT',
    inputSelector: '#prompt-textarea',
    sendSelector: 'button[data-testid="send-button"]',
    inputKind: 'contenteditable',
    html: pageHtml(
      'ChatGPT',
      `<form>
        <div id="prompt-textarea" class="ProseMirror" contenteditable="true" data-fixture-input></div>
        <button type="button" data-testid="send-button" data-fixture-send>Send</button>
      </form>`,
    ),
  },
  {
    host: 'gemini.google.com',
    label: 'Gemini',
    inputSelector: 'rich-textarea div[contenteditable="true"]',
    sendSelector: 'button[aria-label="Send message"]',
    inputKind: 'contenteditable',
    html: pageHtml(
      'Gemini',
      `<main>
        <rich-textarea><div class="ql-editor" contenteditable="true" data-fixture-input></div></rich-textarea>
        <button type="button" aria-label="Send message" data-fixture-send>Send</button>
      </main>`,
    ),
  },
  {
    host: 'chat.mistral.ai',
    label: 'Le Chat',
    inputSelector: 'div.ProseMirror[contenteditable="true"]',
    sendSelector: 'form button[type="submit"]',
    inputKind: 'contenteditable',
    html: pageHtml(
      'Le Chat',
      `<form>
        <div class="ProseMirror" contenteditable="true" data-fixture-input></div>
        <button type="submit" data-fixture-send>→</button>
      </form>`,
    ),
  },
  {
    host: 'chat.deepseek.com',
    label: 'DeepSeek',
    inputSelector: 'textarea#chat-input',
    sendSelector: 'div.ds-icon-button[role="button"]',
    inputKind: 'textarea',
    html: pageHtml(
      'DeepSeek',
      `<main>
        <textarea id="chat-input" class="ds-scroll-area" data-fixture-input></textarea>
        <div role="button" class="ds-icon-button" data-fixture-send>
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M8.3125 0.981587L8 12L14 8Z"></path></svg>
        </div>
      </main>`,
    ),
  },
  {
    host: 'perplexity.ai',
    label: 'Perplexity',
    inputSelector: '#ask-input',
    sendSelector: 'button[aria-label="Envoyer"]',
    inputKind: 'contenteditable',
    html: pageHtml(
      'Perplexity',
      `<main>
        <div id="ask-input" contenteditable="true" role="textbox" data-fixture-input></div>
        <button type="button" aria-label="Envoyer" data-fixture-send>→</button>
      </main>`,
    ),
  },
  {
    host: 'grok.com',
    label: 'Grok',
    inputSelector: 'textarea[aria-label*="Grok"]',
    sendSelector: 'form button[type="submit"]',
    inputKind: 'textarea',
    html: pageHtml(
      'Grok',
      `<form>
        <textarea aria-label="Poser une question à Grok" data-fixture-input></textarea>
        <button type="submit" aria-label="Envoyer" data-fixture-send>→</button>
      </form>`,
    ),
  },
  {
    host: 'copilot.microsoft.com',
    label: 'Copilot',
    inputSelector: 'textarea#userInput',
    sendSelector: 'button[data-testid="submit-button"]',
    inputKind: 'textarea',
    html: pageHtml(
      'Copilot',
      `<main>
        <textarea id="userInput" data-testid="composer-input" data-fixture-input></textarea>
        <button type="button" data-testid="submit-button" aria-label="Envoyer le message" data-fixture-send>→</button>
      </main>`,
    ),
  },
];
