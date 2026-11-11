import type { RawMatch } from './types.js';

/**
 * FR : 0X XX XX XX XX ou +33 X XX XX XX XX.
 * Ancrage de tête `(?<![\w+])` et non `\b` : une frontière `\b` ne peut exister avant un `+`
 * précédé d'un espace ou d'un début de chaîne (`+` et espace sont tous deux non-`\w`), si bien
 * qu'un `\b` de tête empêchait tout numéro au format international `+33…` d'être reconnu — et le
 * motif E.164 ci-dessous l'exclut explicitement. Le lookbehind négatif conserve le refus des
 * numéros collés à un mot/chiffre (`x0612345678`) tout en couvrant `+33…`. Le refus de `.`, `/`,
 * `-` avant et d'un chiffre après écarte les dates (`2024-01-01 2024-12-31`).
 */
const FR_PHONE_PATTERN =
  /(?<![\w+./-])(?:(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4})\b(?![./-]?\d)/g;

/**
 * International (hors +33 / 0033, déjà couverts par le motif FR) : préfixe `+` ou `00`, puis
 * 8 à 15 chiffres, contigus ou groupés par espace/point/tiret, avec parenthèses tolérées
 * (`+1 (415) 555-2671`, `+44 (0)20 7946 0958`, `0044 20 7946 0958`).
 * Refus d'un chiffre + séparateur en tête (`(?<!\d[ .-])`) : `0031 2200 3222` à l'intérieur d'une
 * carte groupée n'est pas un numéro. Le séparateur est `[ .()-]{0,2}` devant CHAQUE chiffre (répétition bornée, pas de
 * quantificateur imbriqué) ; la cohérence des parenthèses est vérifiée après coup par
 * `hasValidParens`. Un numéro `00…` collé sans aucun séparateur est refusé (`isValidIntl`) :
 * indistinguable d'un identifiant à zéros de tête.
 */
const INTL_PATTERN = /(?<![\w+]|\d[ .-])(?:\+|00)[1-9](?:[ .()-]{0,2}\d){7,15}(?![ .-]?\d)/g;

/**
 * Amérique du Nord (NANP, +1) sans indicatif : `(415) 555-2671`, `415-555-2671`, `415.555.2671`,
 * `415 555 2671`, `1-415-555-2671`. L'indicatif régional et le central commencent par 2–9 et ne
 * sont pas de la forme N11 (911, 411…). Séparateur identique entre les groupes (référence
 * arrière) : `415-555.2671` n'est pas lu comme un numéro. Les 10 chiffres contigus
 * (`4155552671`) ne sont PAS détectés : indistinguables d'un entier quelconque.
 */
const NANP_PATTERN =
  /(?<![\w+./(-]|\d[ .-])(?:1([ .-]))?(?:\(([2-9]\d{2})\)[ .-]?|([2-9]\d{2})([ .-]))([2-9]\d{2})([ .-])(\d{4})(?![\w.-]?\d)/g;

/**
 * Royaume-Uni national avec espaces (obligatoires, même raison que `00…`) :
 * mobile `07911 123456` / `07911 123 456`, fixe `020 7946 0958` / `0161 496 0123`.
 */
const UK_PATTERN = /(?<![\w+./-]|\d[ ])(?:07\d{3} \d{3} ?\d{3}|0[1-3]\d{1,2} \d{3,4} \d{3,4})(?![ .-]?\d)/g;

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

/**
 * Parenthèses : appariées, non imbriquées, ne contenant que 1 à 4 chiffres (`(415)`, `(0)`).
 * Parcours linéaire, pas de regex.
 */
function hasValidParens(value: string): boolean {
  let inside = 0;
  let open = false;
  for (const ch of value) {
    if (ch === '(') {
      if (open) return false;
      open = true;
      inside = 0;
    } else if (ch === ')') {
      if (!open || inside < 1 || inside > 4) return false;
      open = false;
    } else if (open) {
      if (ch < '0' || ch > '9') return false;
      inside += 1;
    }
  }
  return !open;
}

function isValidIntl(value: string): boolean {
  if (!hasValidParens(value)) {
    return false;
  }
  const isPlus = value.startsWith('+');
  // `00…` collé sans séparateur : indistinguable d'un identifiant à zéros de tête.
  if (!isPlus && !/[ .-]/.test(value)) {
    return false;
  }
  // Zéro de trunk entre parenthèses (`+44 (0)20…`) : pas un chiffre du numéro E.164.
  const digits = value.replace(/\(0\)/g, '').replace(/\D/g, '');
  const e164 = isPlus ? digits : digits.slice(2);
  // Indicatif 33 : déjà traité par le motif FR (évite le double comptage).
  if (e164.startsWith('33')) {
    return false;
  }
  return e164.length >= 8 && e164.length <= 15;
}

function isValidNanp(areaCode: string, exchange: string): boolean {
  const isN11 = (s: string): boolean => s[1] === '1' && s[2] === '1';
  return !isN11(areaCode) && !isN11(exchange);
}

function isValidUk(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 || (digits.length === 10 && !digits.startsWith('07'));
}

function collect(
  text: string,
  pattern: RegExp,
  accept: (m: RegExpExecArray) => boolean,
  out: RawMatch[],
): void {
  pattern.lastIndex = 0;
  let result = pattern.exec(text);
  while (result !== null) {
    if (accept(result)) {
      out.push({ ruleType: 'phone', start: result.index, end: result.index + result[0].length });
    }
    result = pattern.exec(text);
  }
}

export function findPhoneMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];

  collect(text, FR_PHONE_PATTERN, (m) => isValidFrPhone(m[0]), matches);
  collect(text, INTL_PATTERN, (m) => isValidIntl(m[0]), matches);
  collect(
    text,
    NANP_PATTERN,
    (m) => {
      // Sans parenthèses : même séparateur après l'indicatif régional et après le central.
      if (m[3] !== undefined && m[4] !== m[6]) return false;
      return isValidNanp(m[2] ?? m[3], m[5]);
    },
    matches,
  );
  collect(text, UK_PATTERN, (m) => isValidUk(m[0]), matches);

  return matches;
}
