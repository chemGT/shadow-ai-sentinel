/**
 * Sélecteurs Claude.ai — ordre de priorité (du plus spécifique au plus large).
 * Dernière vérification documentaire : 2026-05-19 (sans accès post-login).
 * Mettre à jour via `platform_watcher` si rupture UI.
 */
export const CLAUDE_INPUT_SELECTORS = [
  'div.ProseMirror[contenteditable="true"]',
  '[data-testid="chat-input"]',
  '[data-testid="composer-input"]',
  'div[contenteditable="true"][role="textbox"]',
  'fieldset div[contenteditable="true"]',
  'div[contenteditable="true"]',
] as const;

export const CLAUDE_SEND_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label="Envoyer un message"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Envoyer"]',
  'button[data-testid="send-button"]',
  'fieldset button[type="submit"]',
] as const;

export const CLAUDE_COMPOSER_SELECTORS = [
  'form[data-testid="composer"]',
  'fieldset',
  'footer',
] as const;
