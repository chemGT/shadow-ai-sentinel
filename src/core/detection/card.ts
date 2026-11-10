import type { RawMatch } from './types.js';

/**
 * Carte bancaire : 13 à 19 chiffres, séparateur espace/tiret optionnel entre chaque chiffre.
 * Ce découpage caractère par caractère (plutôt que par groupes de 4 rigides) couvre à la fois
 * le format contigu, le groupage usuel 4-4-4-4 (Visa/Mastercard) et le groupage irrégulier
 * 4-6-5 d'Amex. Répétition bornée ({12,18} + 1 chiffre final) — pas de quantificateur imbriqué,
 * donc pas de ReDoS (même style que le motif IBAN). `isValidCardChecksum` (Luhn) est le filet
 * principal anti-faux-positifs : un numéro de commande ou un timestamp de 16 chiffres a ~1
 * chance sur 10 de passer Luhn par hasard.
 * Les espaces Unicode (NBSP, espace fine) et les invisibles (BOM, zero-width) sont repliés en
 * amont par `normalize.ts` : la classe `[ -]` reste ASCII. Le point n'est volontairement PAS
 * séparateur (numéros de version `4111.1111…` → faux positifs, cf. bypass C2).
 * Les lookarounds refusent un chiffre adjacent (même après un séparateur) : un identifiant plus
 * long (`4111-1111-1111-1111-0000`) n'est pas une carte.
 */
const CARD_PATTERN = /(?<!\d[ -]?)\b(?:\d[ -]?){12,18}\d\b(?![ -]?\d)/g;

/**
 * Préfixe émetteur (IIN) et longueur cohérents avec un réseau de cartes. Luhn seul laisse passer
 * 1 nombre de 16 chiffres sur 10 (numéros de commande, horodatages en microsecondes — qui
 * commencent par 1) : aucune carte ne commence par 0, 1, 7, 8 ou 9.
 */
export function hasCardIssuerPrefix(digits: string): boolean {
  const len = digits.length;
  const p2 = Number(digits.slice(0, 2));
  const p4 = Number(digits.slice(0, 4));
  if (digits[0] === '4') {
    return len === 13 || len === 16 || len === 19; // Visa
  }
  if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) {
    return len === 16; // Mastercard
  }
  if (p2 === 34 || p2 === 37) {
    return len === 15; // American Express
  }
  if ((p4 >= 3000 && p4 <= 3059) || p2 === 36 || p2 === 38 || p2 === 39) {
    return len >= 14; // Diners Club
  }
  if (p4 >= 3528 && p4 <= 3589) {
    return len >= 16; // JCB
  }
  if (digits[0] === '6' || p2 === 50 || (p2 >= 56 && p2 <= 59)) {
    return len >= 16 || p2 === 50 || p2 >= 56; // Discover, UnionPay, Maestro (12–19)
  }
  return false;
}

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
  return sum % 10 === 0 && hasCardIssuerPrefix(digits);
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
