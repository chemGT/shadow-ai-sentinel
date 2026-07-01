/**
 * Sélecteurs gemini.google.com — ordre de priorité.
 * Dernière vérification documentaire : 2026-05-20 (sans accès post-login).
 */
export const GEMINI_INPUT_SELECTORS = [
  'rich-textarea div[contenteditable="true"]',
  'div.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="Enter"]',
  'div[contenteditable="true"][aria-label*="Saisir"]',
  'div[contenteditable="true"][role="textbox"]',
  'div.input-area div[contenteditable="true"]',
  'div[contenteditable="true"]',
] as const;

export const GEMINI_SEND_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label="Envoyer un message"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Envoyer"]',
  'button.send-button',
  'button[data-test-id="send-button"]',
  'button.mat-mdc-button-base[aria-label*="Send"]',
] as const;

export const GEMINI_COMPOSER_SELECTORS = [
  'rich-textarea',
  'div.input-area',
  'form',
  'footer',
  'main',
] as const;
