/**
 * Sélecteurs chat.deepseek.com — ordre de priorité.
 * Dernière vérification documentaire : 2026-07-02 — vérification live impossible
 * (mur de connexion /sign_in) ; la convention de classes `ds-*` du design system
 * est confirmée sur la page de login. ⚠️ À valider en session connectée (M16–M17).
 * ⚠️ Le bouton d'envoi n'est PAS un <button> mais un div[role="button"] avec un SVG
 * flèche (path stable, cf. userscript Greasy Fork 551293). Les icônes voisines
 * (DeepThink, Search, trombone) sont aussi des div[role="button"] — le sélecteur
 * doit cibler le path exact pour éviter un fail-open sur le chemin clic.
 */
export const DEEPSEEK_INPUT_SELECTORS = [
  'textarea#chat-input',
  'textarea.ds-scroll-area',
  'div[contenteditable="true"][role="textbox"]',
  'main textarea',
  'textarea',
] as const;

export const DEEPSEEK_SEND_SELECTORS = [
  'div[role="button"]:has(path[d^="M8.3125 0.981587"])',
  '.ds-icon-button:has(path[d^="M8.3125 0.981587"])',
  'button[aria-label*="Send"]',
  'button[aria-label*="Envoyer"]',
  'button[type="submit"]',
] as const;

export const DEEPSEEK_COMPOSER_SELECTORS = ['form', 'footer', 'main'] as const;
