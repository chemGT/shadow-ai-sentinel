import type { RawMatch } from './types.js';

type SecretPattern = {
  source: RegExp;
  /** Groupe capturant le secret seul (défaut : toute la correspondance). */
  valueGroup?: number;
  validate?: (value: string) => boolean;
};

/** `Bearer` suivi d'un long mot arrive en prose ; un jeton opaque contient au moins un chiffre. */
function looksLikeToken(value: string): boolean {
  return /\d/.test(value);
}

/**
 * `Basic <base64>` : un vrai en-tête décode en `utilisateur:motdepasse`. Écarte la prose
 * (« Basic understandingofthesystem… ») sans rater d'identifiants réels.
 */
export function isBasicAuthPayload(base64: string): boolean {
  try {
    const decoded = atob(base64);
    return /^[\x20-\x7e]{1,128}:[\x20-\x7e]{1,128}$/.test(decoded);
  } catch {
    return false;
  }
}

const PLACEHOLDER = /^(?:x{4,}|\*{4,}|\.{4,}|changeme\d*|example\d*|your[_-]?\w{0,20}|todo\d*)$/i;

/**
 * Valeur d'une affectation `password=…` : au moins une lettre ET un chiffre (écarte `password:
 * string`, `secret = None`, les mots de prose), pas un gabarit (`${VAR}`, `<secret>`, `xxxx`).
 */
export function looksLikeAssignedSecret(value: string): boolean {
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return false;
  }
  return !PLACEHOLDER.test(value);
}

/**
 * Motifs bornés, sans quantificateur imbriqué. Les jetons de longueur variable se terminent par
 * un lookahead négatif (et non `\b`) : un jeton dépassant la borne n'est PAS détecté à moitié.
 */
const GENERIC_SECRET_PATTERNS: SecretPattern[] = [
  {
    source: /\bBearer\s{1,3}([A-Za-z0-9._~+/-]{20,4096}={0,2})(?![A-Za-z0-9._~+/=-])/g,
    valueGroup: 1,
    validate: looksLikeToken,
  },
  {
    source: /\bBasic\s{1,3}([A-Za-z0-9+/]{16,512}={0,2})(?![A-Za-z0-9+/=])/g,
    valueGroup: 1,
    validate: isBasicAuthPayload,
  },
  { source: /\beyJ[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,512}\b/g },
  // URL avec identifiants : `postgres://user:motdepasse@hôte`, `https://user:jeton@dépôt`…
  {
    source: /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s:/@]{1,64}:[^\s@/]{3,128}@[A-Za-z0-9.-]{1,253}/gi,
  },
  // Affectations de secrets : `DB_PASSWORD=…`, `"client_secret": "…"`, `aws_secret_access_key = …`.
  // Seule la VALEUR est retenue (groupe 1) : le nom de la variable reste lisible après caviardage.
  {
    source:
      /(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token|api[_-]?token)[A-Za-z0-9_]{0,24}["']?\s{0,3}[:=]\s{0,3}["']?([A-Za-z0-9!@#$%^&*+=_/~-]{8,128})(?![A-Za-z0-9!@#$%^&*+=_/~-])/gi,
    valueGroup: 1,
    validate: looksLikeAssignedSecret,
  },
];

function isSubsetOfApiKeyMatch(start: number, end: number, apiMatches: RawMatch[]): boolean {
  return apiMatches.some((m) => m.start <= start && m.end >= end);
}

export function findGenericSecretMatches(
  text: string,
  apiKeyMatches: RawMatch[],
): RawMatch[] {
  const matches: RawMatch[] = [];

  for (const pattern of GENERIC_SECRET_PATTERNS) {
    pattern.source.lastIndex = 0;
    let result = pattern.source.exec(text);
    while (result !== null) {
      const whole = result[0];
      const value = pattern.valueGroup !== undefined ? result[pattern.valueGroup] : whole;
      const accepted = pattern.validate === undefined || pattern.validate(value);
      // Bearer/Basic : la correspondance garde le mot-clé (jeton `[REDACTED_SECRET]` complet) ;
      // affectations : seule la valeur, en fin de correspondance, est retenue.
      const keepWhole = pattern.valueGroup === undefined || /^(?:Bearer|Basic)\s/.test(whole);
      const start = keepWhole ? result.index : result.index + whole.length - value.length;
      const end = result.index + whole.length;
      if (accepted && !isSubsetOfApiKeyMatch(start, end, apiKeyMatches)) {
        matches.push({ ruleType: 'generic_secret', start, end });
      }
      result = pattern.source.exec(text);
    }
  }

  return matches;
}
