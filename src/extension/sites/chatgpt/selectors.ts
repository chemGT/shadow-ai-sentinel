/**
 * Sélecteurs chatgpt.com — ordre de priorité.
 * Dernière vérification documentaire : 2026-05-20 (sans accès post-login).
 */
export const CHATGPT_INPUT_SELECTORS = [
  '#prompt-textarea',
  'div#prompt-textarea[contenteditable="true"]',
  'div.ProseMirror[contenteditable="true"]',
  '[data-testid="prompt-textarea"]',
  '[data-testid="message-input"]',
  'div[contenteditable="true"][role="textbox"]',
  'main div[contenteditable="true"]',
  'form div[contenteditable="true"]',
] as const;

export const CHATGPT_SEND_SELECTORS = [
  '#composer-submit-button[data-testid="send-button"]',
  'button[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Envoyer"]',
  'form button[type="submit"]',
] as const;

export const CHATGPT_COMPOSER_SELECTORS = [
  '[data-testid="composer"]',
  'form',
  'footer',
  'main',
] as const;
