/**
 * Sélecteurs perplexity.ai — ordre de priorité.
 * Vérifié en live le 2026-07-02 (session connectée, UI FR) :
 *   input = #ask-input (contenteditable Lexical) · send = button[aria-label="Envoyer"]
 *   (pas de data-testid, type="button" ; n'apparaît que quand le composer a du texte).
 * ⚠️ Lexical ignore les événements non-trusted : setInputText (redact) peut ne pas
 * persister — vérifié partiellement, le block reste sûr (l'événement est annulé).
 */
export const PERPLEXITY_INPUT_SELECTORS = [
  '#ask-input',
  'div[contenteditable="true"][role="textbox"]',
  'main div[contenteditable="true"]',
  'textarea[placeholder*="Ask"]',
  'main textarea',
  'textarea',
] as const;

export const PERPLEXITY_SEND_SELECTORS = [
  'button[aria-label="Envoyer"]',
  'button[aria-label="Submit"]',
  'button[aria-label*="Envoyer"]',
  'button[aria-label*="Submit"]',
  'button[aria-label*="Send"]',
  'button[data-testid="submit-button"]',
  'button[type="submit"]',
] as const;

export const PERPLEXITY_COMPOSER_SELECTORS = ['form', 'main'] as const;
