import type { RawMatch } from './types.js';

/**
 * Carte bancaire : 13 à 19 chiffres, séparateur espace/tiret optionnel entre chaque chiffre.
 * Ce découpage caractère par caractère (plutôt que par groupes de 4 rigides) couvre à la fois
 * le format contigu, le groupage usuel 4-4-4-4 (Visa/Mastercard) et le groupage irrégulier
 * 4-6-5 d'Amex. Répétition bornée ({12,18} + 1 chiffre final) — pas de quantificateur imbriqué,
 * donc pas de ReDoS (même style que le motif IBAN). `isValidCardChecksum` (Luhn) est le filet
 * principal anti-faux-positifs : un numéro de commande ou un timestamp de 16 chiffres a ~1
 * chance sur 10 de passer Luhn par hasard.
 */
const CARD_PATTERN = /\b(?:\d[ -]?){12,18}\d\b/g;

/** Algorithme de Luhn (mod 10). */
export function isValidCardChecksum(value: string): boolean {
  const digits = value.replace(/[ -]/g, '');
  if (digits.length < 13 || digits.length > 19 || !/^\d+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function findCardMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  CARD_PATTERN.lastIndex = 0;

  let result = CARD_PATTERN.exec(text);
  while (result !== null) {
    if (isValidCardChecksum(result[0])) {
      matches.push({
        ruleType: 'card',
        start: result.index,
        end: result.index + result[0].length,
      });
    }
    result = CARD_PATTERN.exec(text);
  }

  return matches;
}
