/**
 * Sélecteurs copilot.microsoft.com — ordre de priorité.
 * Vérifié en live le 2026-07-02 (accessible sans login, UI FR) :
 *   input = textarea#userInput (data-testid="composer-input") ·
 *   send = button[data-testid="submit-button"] (aria FR « Envoyer le message »,
 *   type="button" ; n'apparaît que quand le composer a du texte).
 * Copilot grand public uniquement (le Copilot M365 `*.cloud.microsoft` est hors scope).
 */
export const COPILOT_INPUT_SELECTORS = [
  'textarea#userInput',
  'textarea[data-testid="composer-input"]',
  '#userInput',
  'div[contenteditable="true"][role="textbox"]',
  'main textarea',
  'textarea',
] as const;

export const COPILOT_SEND_SELECTORS = [
  'button[data-testid="submit-button"]',
  'button[aria-label="Envoyer le message"]',
  'button[aria-label="Submit message"]',
  'button[aria-label*="Envoyer"]',
  'button[aria-label*="Submit"]',
  'button[aria-label*="Send"]',
  'form button[type="submit"]',
] as const;

export const COPILOT_COMPOSER_SELECTORS = ['form', 'footer', 'main'] as const;
