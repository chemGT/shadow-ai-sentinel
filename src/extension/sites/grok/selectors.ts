/**
 * Sélecteurs grok.com — ordre de priorité.
 * Vérifié en live le 2026-07-02 (accessible sans login, UI FR) :
 *   input = <textarea aria-label="Poser une question à Grok"> dans un <form>
 *   (pas de Tiptap/ProseMirror dans l'UI actuelle — gardé en fallback) ·
 *   send = button[aria-label="Envoyer"][type="submit"] dans le même form.
 * La surface Grok intégrée à x.com/i/grok est volontairement hors scope
 * (matcher x.com injecterait sur tout X/Twitter).
 */
export const GROK_INPUT_SELECTORS = [
  'textarea[aria-label*="Grok"]',
  'form textarea',
  'div.tiptap.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]',
  'textarea',
] as const;

export const GROK_SEND_SELECTORS = [
  'form button[aria-label="Envoyer"][type="submit"]',
  'form button[type="submit"]',
  'button[aria-label*="Envoyer"]',
  'button[aria-label="Submit"]',
  'button[aria-label*="Submit"]',
  'button[aria-label*="Send"]',
] as const;

export const GROK_COMPOSER_SELECTORS = ['form', 'footer', 'main'] as const;
