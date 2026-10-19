import type { Policy } from '../types.js';
import type { RawMatch } from './types.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProEmailPattern(domains: string[]): RegExp | null {
  if (domains.length === 0) {
    return null;
  }
  const domainPart = domains.map(escapeRegex).join('|');
  // Chaîne de sous-domaines optionnelle avant le domaine configuré (bypass B3) :
  // `jean@mail.acme.com` matche `acme.com`, mais `evilmacme.com` ne peut pas (le `.`
  // précédent le domaine est littéral, exigé par le préfixe `(?:label\.)*`).
  return new RegExp(
    `\\b([a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]+\\.)*(?:${domainPart}))\\b`,
    'gi',
  );
}

export function findProEmailMatches(text: string, policy: Policy): RawMatch[] {
  const domains = policy.emailDomains
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => d.length > 0);

  const pattern = buildProEmailPattern(domains);
  if (!pattern) {
    return [];
  }

  const matches: RawMatch[] = [];
  pattern.lastIndex = 0;

  let result = pattern.exec(text);
  while (result !== null) {
    matches.push({
      ruleType: 'pro_email',
      start: result.index,
      end: result.index + result[0].length,
    });
    result = pattern.exec(text);
  }

  return matches;
}
