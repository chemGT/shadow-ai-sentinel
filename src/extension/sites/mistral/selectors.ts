/**
 * Sélecteurs chat.mistral.ai (Le Chat, rebrandé « Vibe ») — ordre de priorité.
 * Vérifié en live le 2026-07-02 (derrière la modale CGU, sans session) :
 *   input = div.ProseMirror[contenteditable="true"] unique, dans un <form> ·
 *   send = button[type="submit"] du form (flèche, sans aria-label — 2 submit
 *   dans le DOM, seul le visible compte pour queryFirstVisible).
 */
export const MISTRAL_INPUT_SELECTORS = [
  'div.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'form div[contenteditable="true"]',
  'main div[contenteditable="true"]',
  'textarea[name="message.text"]',
  'div[contenteditable="true"]',
  'textarea',
] as const;

export const MISTRAL_SEND_SELECTORS = [
  'form button[type="submit"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Envoyer"]',
  'button[type="submit"]',
] as const;

export const MISTRAL_COMPOSER_SELECTORS = ['form', 'footer', 'main'] as const;
