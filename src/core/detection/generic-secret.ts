import type { RawMatch } from './types.js';

type SecretPattern = { source: RegExp };

const GENERIC_SECRET_PATTERNS: SecretPattern[] = [
  { source: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,512}\b/g },
  { source: /\bBasic\s+[A-Za-z0-9+/]{20,512}={0,2}\b/g },
  { source: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
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
      const start = result.index;
      const end = result.index + result[0].length;
      if (!isSubsetOfApiKeyMatch(start, end, apiKeyMatches)) {
        matches.push({ ruleType: 'generic_secret', start, end });
      }
      result = pattern.source.exec(text);
    }
  }

  return matches;
}
