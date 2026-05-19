import type { RawMatch } from './types.js';

/** FR : 0X XX XX XX XX ou +33 X XX XX XX XX */
const FR_PHONE_PATTERN =
  /\b(?:(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4})\b/g;

/** E.164 international (hors +33 déjà couvert). */
const E164_PATTERN = /\+[1-9]\d{7,14}\b/g;

function normalizePhoneDigits(value: string): string {
  return value.replace(/[\s.-]/g, '');
}

function isValidFrPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  if (digits.startsWith('+33')) {
    const rest = digits.slice(3);
    return rest.length === 9 && /^[1-9]\d{8}$/.test(rest);
  }
  if (digits.startsWith('0033')) {
    const rest = digits.slice(4);
    return rest.length === 9 && /^[1-9]\d{8}$/.test(rest);
  }
  if (digits.startsWith('0')) {
    return digits.length === 10 && /^0[1-9]\d{8}$/.test(digits);
  }
  return false;
}

function isValidE164(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function findPhoneMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];

  FR_PHONE_PATTERN.lastIndex = 0;
  let fr = FR_PHONE_PATTERN.exec(text);
  while (fr !== null) {
    if (isValidFrPhone(fr[0])) {
      matches.push({
        ruleType: 'phone',
        start: fr.index,
        end: fr.index + fr[0].length,
      });
    }
    fr = FR_PHONE_PATTERN.exec(text);
  }

  E164_PATTERN.lastIndex = 0;
  let e164 = E164_PATTERN.exec(text);
  while (e164 !== null) {
    const value = e164[0];
    if (!value.startsWith('+33') && isValidE164(value)) {
      matches.push({
        ruleType: 'phone',
        start: e164.index,
        end: e164.index + value.length,
      });
    }
    e164 = E164_PATTERN.exec(text);
  }

  return matches;
}
