import type { RawMatch } from './types.js';

/**
 * IBAN contigu OU formaté en groupes de 4 séparés par des espaces (format usuel
 * du copier-coller, ex. `FR76 3000 6000 0112 3456 7890 189`). Le découpage en
 * groupes de 4 empêche le regex d'avaler les mots suivants (contrairement à un
 * `[ ]?` par caractère). Borné (≤ 7 groupes), pas de quantificateurs imbriqués
 * dangereux. `isValidIbanChecksum` strippe les espaces avant validation.
 */
const IBAN_PATTERN = /\b([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?)\b/gi;

export function isValidIbanChecksum(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) {
    return false;
  }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) {
    return false;
  }

  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let numeric = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numeric += String(code - 55);
    } else {
      numeric += ch;
    }
  }

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(String(remainder) + numeric.slice(i, i + 7)) % 97;
  }
  return remainder === 1;
}

export function findIbanMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  IBAN_PATTERN.lastIndex = 0;

  let result = IBAN_PATTERN.exec(text);
  while (result !== null) {
    const candidate = result[1].toUpperCase();
    if (isValidIbanChecksum(candidate)) {
      matches.push({
        ruleType: 'iban',
        start: result.index,
        end: result.index + result[0].length,
      });
    }
    result = IBAN_PATTERN.exec(text);
  }

  return matches;
}
