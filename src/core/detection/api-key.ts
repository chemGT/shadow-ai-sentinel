import type { RawMatch } from './types.js';

type ApiKeyPattern = {
  source: RegExp;
  ruleType: 'api_key';
  /** Filtre anti-faux-positifs appliqué à la valeur trouvée (défaut : toujours accepté). */
  validate?: (value: string) => boolean;
};

/**
 * Préfixe `sk-` : il est partagé par des clés (OpenAI, Anthropic, DeepSeek et la plupart des API
 * compatibles OpenAI) ET par du texte banal — classes CSS (`sk-spinner-wave-rectangle-one`),
 * slugs (`sk-learn-pipeline-tutorial`). Un slug est fait de mots courts en minuscules séparés
 * par des tirets ; une clé a au moins un long segment aléatoire. Est retenu comme clé :
 * - un segment (entre `-`/`_`) d'au moins 32 caractères ;
 * - ou un segment d'au moins 16 caractères contenant un chiffre ou mêlant majuscules/minuscules
 *   (ex. DeepSeek : `sk-` + 32 hex minuscules) ;
 * - ou, à défaut, la présence d'un chiffre ET d'une majuscule dans l'ensemble.
 */
export function looksLikeSkKey(value: string): boolean {
  const body = value.slice(3);
  for (const segment of body.split(/[-_]/)) {
    if (segment.length >= 32) {
      return true;
    }
    if (
      segment.length >= 16 &&
      (/\d/.test(segment) || (/[A-Z]/.test(segment) && /[a-z]/.test(segment)))
    ) {
      return true;
    }
  }
  return /\d/.test(body) && /[A-Z]/.test(body);
}

/**
 * Patterns à ancres fixes et répétitions bornées — pas de quantificateur imbriqué (anti-ReDoS,
 * cf. `docs/security/redos-audit.md`). Toute correspondance doit couvrir le secret EN ENTIER :
 * en mode redact, seul le segment trouvé est remplacé.
 */
const API_KEY_PATTERNS: ApiKeyPattern[] = [
  // AWS
  { source: /\bAKIA[0-9A-Z]{16}\b/g, ruleType: 'api_key' },
  { source: /\bASIA[0-9A-Z]{16}\b/g, ruleType: 'api_key' },
  // OpenAI / Anthropic / DeepSeek et compatibles
  { source: /\bsk-[A-Za-z0-9_-]{20,255}\b/g, ruleType: 'api_key', validate: looksLikeSkKey },
  // Stripe : underscore (pas tiret) — distinct des clés `sk-...` ci-dessus, aucune collision.
  { source: /\bsk_live_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bsk_test_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\brk_live_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\brk_test_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bwhsec_[A-Za-z0-9]{24,255}\b/g, ruleType: 'api_key' },
  // GitHub : ghp_ (PAT), gho_ (OAuth), ghu_/ghs_ (app user/server), ghr_ (refresh)
  { source: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g, ruleType: 'api_key' },
  { source: /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g, ruleType: 'api_key' },
  { source: /\bglpat-[A-Za-z0-9_-]{20,255}\b/g, ruleType: 'api_key' },
  // Slack : jetons et webhooks entrants
  { source: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bxapp-[A-Za-z0-9-]{20,255}\b/g, ruleType: 'api_key' },
  {
    // `(?<=^|[^\w])` = le `\b` d'avant, en lookbehind : le motif reconnaît exactement les mêmes
    // webhooks, mais CodeQL n'y voit plus un « hostname non ancré »
    // (`js/regex/missing-regexp-anchor`), qui est un faux positif ici — on détecte un secret
    // n'importe où dans le texte, on ne valide pas une URL.
    source: /(?<=^|[^\w])https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,100}/g,
    ruleType: 'api_key',
  },
  // Google API key
  { source: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g, ruleType: 'api_key' },
  // npm, Hugging Face, SendGrid, Twilio, DigitalOcean
  { source: /\bnpm_[A-Za-z0-9]{36}\b/g, ruleType: 'api_key' },
  { source: /\bhf_[A-Za-z0-9]{30,60}\b/g, ruleType: 'api_key' },
  {
    source: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g,
    ruleType: 'api_key',
  },
  { source: /\bSK[0-9a-f]{32}\b/g, ruleType: 'api_key' },
  { source: /\bdop_v1_[a-f0-9]{64}\b/g, ruleType: 'api_key' },
  // Clés privées PEM (RSA, EC, OPENSSH, PKCS#8, chiffrées ou non). Deux motifs : le bloc complet
  // jusqu'à `END` (recherche paresseuse bornée à 4096 caractères — une RSA 4096 en fait ~3,3k),
  // et l'en-tête suivi du corps base64 si le bloc est coupé (sans `END`) — l'en-tête seul
  // laisserait le corps de la clé en clair après caviardage. À début égal, la fusion garde la
  // plus longue.
  {
    source:
      /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----[\s\S]{1,4096}?-----END [A-Z ]{0,30}PRIVATE KEY-----/g,
    ruleType: 'api_key',
  },
  {
    source: /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----[A-Za-z0-9+/=\s]{0,4096}/g,
    ruleType: 'api_key',
  },
  // Azure Storage : la correspondance DOIT couvrir `AccountKey=…` — en mode redact, seul le
  // segment trouvé est remplacé ; s'arrêter à `AccountName=…;` laissait la clé partir en clair.
  // `AccountKey` reste optionnel (chaîne tronquée) ; la clé seule est couverte par le motif suivant.
  {
    source:
      /\bDefaultEndpointsProtocol=https?;AccountName=[^;\s]{3,24};(?:AccountKey=[A-Za-z0-9+/]{20,128}={0,2})?/g,
    ruleType: 'api_key',
  },
  { source: /\bAccountKey=[A-Za-z0-9+/]{40,128}={0,2}/g, ruleType: 'api_key' },
  { source: /\bSharedAccessSignature=[A-Za-z0-9%&=+/_.:-]{20,512}/g, ruleType: 'api_key' },
];

function collectPatternMatches(text: string, pattern: ApiKeyPattern): RawMatch[] {
  const matches: RawMatch[] = [];
  pattern.source.lastIndex = 0;

  let result = pattern.source.exec(text);
  while (result !== null) {
    if (pattern.validate === undefined || pattern.validate(result[0])) {
      matches.push({
        ruleType: pattern.ruleType,
        start: result.index,
        end: result.index + result[0].length,
      });
    }
    result = pattern.source.exec(text);
  }

  return matches;
}

export function findApiKeyMatches(text: string): RawMatch[] {
  const all: RawMatch[] = [];
  for (const pattern of API_KEY_PATTERNS) {
    all.push(...collectPatternMatches(text, pattern));
  }
  return all;
}
