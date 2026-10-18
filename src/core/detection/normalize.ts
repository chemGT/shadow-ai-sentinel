/**
 * Normalisation défensive avant scan (cf. `docs/security/bypasses-2026-09.md`, section D).
 *
 * Les motifs des détecteurs sont ASCII : un caractère invisible intercalé, un espace Unicode
 * exotique ou un homoglyphe suffit à casser un match. Cette passe produit une version
 * « repliée » du texte, sur laquelle tournent les détecteurs, plus une carte d'index vers le
 * texte ORIGINAL : les offsets `start/end` renvoyés au content script servent au caviardage
 * sur le texte réellement saisi (`analyze.ts`), ils doivent donc désigner le texte original.
 *
 * Transformations, par point de code :
 * 1. suppression des caractères invisibles (zero-width, BOM, soft hyphen, word joiner) ;
 * 2. repli des espaces Unicode (NBSP, espace fine, espaces typographiques…) vers l'espace ASCII ;
 * 3. repli d'homoglyphes cyrilliques/grecs visuellement identiques à une lettre latine ;
 * 4. NFKC, limité aux formes de compatibilité qui imitent de l'ASCII : pleine chasse, ligatures
 *    latines, exposants/indices, chiffres cerclés, alphanumériques mathématiques.
 *
 * Performance : seuls ces caractères sont visités (une regex native les cible) — un texte ASCII
 * ou accentué ordinaire (français, allemand…) ne coûte qu'un parcours regex. La carte d'index est
 * « creuse » : seuls les points de code dont le repli change la LONGUEUR (suppression, expansion
 * NFKC) y sont enregistrés ; les substitutions de même longueur (NBSP → espace, homoglyphe,
 * chiffre pleine chasse) ne coûtent rien.
 */

const INVISIBLE_CLASS = '\\u00AD\\u200B-\\u200D\\u2060\\uFEFF';
const SPACE_CLASS = '\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000';
const NFKC_CLASS =
  '\\u00B2\\u00B3\\u00B9\\u2070-\\u209F\\u2460-\\u24FF\\uFB00-\\uFB06\\uFF01-\\uFF5E\\u{1D400}-\\u{1D7FF}';

/**
 * Homoglyphes stricts (glyphe identique à la lettre latine dans les polices usuelles).
 * Volontairement limité : le but est de fermer l'évasion « une lettre cyrillique dans une clé »,
 * pas de translittérer. Un texte russe/grec replié ne déclenche rien seul — les détecteurs
 * exigent des préfixes et formats précis (AKIA…, sk-…, IBAN mod-97, Luhn…).
 */
const HOMOGLYPHS: Record<string, string> = {
  // Cyrillique majuscules
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X',
  І: 'I', Ј: 'J', Ѕ: 'S',
  // Cyrillique minuscules
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's',
  // Grec majuscules
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P',
  Τ: 'T', Υ: 'Y', Χ: 'X',
  // Grec minuscules
  ο: 'o',
};

const INVISIBLE = new RegExp(`^[${INVISIBLE_CLASS}]$`, 'u');
const UNICODE_SPACE = new RegExp(`^[${SPACE_CLASS}]$`, 'u');

/** Tout caractère susceptible d'être replié. Le drapeau `u` gère les paires de substitution. */
const FOLDABLE = new RegExp(
  `[${INVISIBLE_CLASS}${SPACE_CLASS}${Object.keys(HOMOGLYPHS).join('')}${NFKC_CLASS}]`,
  'gu',
);

export type NormalizedText = {
  /** Texte replié, passé aux détecteurs. */
  text: string;
  /** Convertit un intervalle `[start, end)` du texte replié en intervalle du texte original. */
  toOriginal: (start: number, end: number) => { start: number; end: number };
};

function foldChar(ch: string): string {
  if (INVISIBLE.test(ch)) return '';
  if (UNICODE_SPACE.test(ch)) return ' ';
  return HOMOGLYPHS[ch] ?? ch.normalize('NFKC');
}

/** Point de code dont le repli a changé la longueur, aux positions repliée et originale. */
type Breakpoint = { norm: number; normLen: number; orig: number; origLen: number };

/** Dernier breakpoint dont `norm <= pos` (les breakpoints sont triés par `norm`). */
function lastBreakpointAtOrBefore(breakpoints: Breakpoint[], pos: number): Breakpoint | null {
  let lo = 0;
  let hi = breakpoints.length - 1;
  let found: Breakpoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (breakpoints[mid].norm <= pos) {
      found = breakpoints[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function normalizeForScan(text: string): NormalizedText {
  const breakpoints: Breakpoint[] = [];
  let delta = 0;
  const folded = text.replace(FOLDABLE, (ch: string, offset: number) => {
    const out = foldChar(ch);
    if (out.length !== ch.length) {
      breakpoints.push({ norm: offset + delta, normLen: out.length, orig: offset, origLen: ch.length });
      delta += out.length - ch.length;
    }
    return out;
  });

  if (breakpoints.length === 0) {
    return { text: folded, toOriginal: (start, end) => ({ start, end }) };
  }

  /** Position originale du début du caractère replié `pos`. */
  const originalStart = (pos: number): number => {
    const bp = lastBreakpointAtOrBefore(breakpoints, pos);
    if (!bp) return pos;
    if (pos < bp.norm + bp.normLen) return bp.orig;
    return bp.orig + bp.origLen + (pos - bp.norm - bp.normLen);
  };

  /** Position originale de la fin (exclusive) du caractère replié `pos`. */
  const originalEnd = (pos: number): number => {
    const bp = lastBreakpointAtOrBefore(breakpoints, pos);
    if (!bp) return pos + 1;
    if (pos < bp.norm + bp.normLen) return bp.orig + bp.origLen;
    return bp.orig + bp.origLen + (pos - bp.norm - bp.normLen) + 1;
  };

  return {
    text: folded,
    toOriginal: (start, end) => ({
      start: start < folded.length ? originalStart(start) : text.length,
      end: end > 0 ? originalEnd(end - 1) : 0,
    }),
  };
}
