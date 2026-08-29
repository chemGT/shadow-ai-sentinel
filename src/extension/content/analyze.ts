import { wasTextTruncated } from '../../core/detection/limits.js';
import { detectSensitiveData } from '../../core/regex-engine.js';
import type { DetectionMatch, Policy, RuleAction, RuleType } from '../../core/types.js';

export type GuardDecision =
  | { kind: 'allow'; truncated?: boolean }
  | { kind: 'block'; match: DetectionMatch; truncated?: boolean }
  | { kind: 'redact'; matches: DetectionMatch[]; truncated?: boolean };

function getRuleAction(policy: Policy, ruleType: RuleType): RuleAction | null {
  const rule = policy.rules.find((r) => r.type === ruleType && r.enabled);
  return rule?.action ?? null;
}

/** Normalise une valeur pour comparaison d'allowlist (insensible casse/espaces). */
export function normalizeAllowlistValue(value: string): string {
  return value.trim().toLowerCase();
}

/** Applique la policy aux correspondances détectées, hors valeurs allowlistées. */
export function evaluateGuard(
  text: string,
  policy: Policy,
  allowlist?: readonly string[],
): GuardDecision {
  if (text.trim().length === 0) {
    return { kind: 'allow' };
  }

  const truncated = wasTextTruncated(text);

  let matches = detectSensitiveData(text, policy);

  if (allowlist && allowlist.length > 0) {
    const allowed = new Set(allowlist.map(normalizeAllowlistValue));
    matches = matches.filter(
      (m) => !allowed.has(normalizeAllowlistValue(text.slice(m.start, m.end))),
    );
  }

  if (matches.length === 0) {
    return { kind: 'allow', ...(truncated ? { truncated } : {}) };
  }

  const blockMatch = matches.find((m) => getRuleAction(policy, m.ruleType) === 'block');
  if (blockMatch) {
    return { kind: 'block', match: blockMatch, ...(truncated ? { truncated } : {}) };
  }

  const redactMatches = matches.filter((m) => getRuleAction(policy, m.ruleType) === 'redact');
  if (redactMatches.length > 0) {
    return { kind: 'redact', matches: redactMatches, ...(truncated ? { truncated } : {}) };
  }

  return { kind: 'allow', ...(truncated ? { truncated } : {}) };
}

/** Remplace les segments détectés par leurs tokens (fin → début). */
export function applyRedactionsToText(text: string, matches: DetectionMatch[]): string {
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let result = text;
  for (const match of sorted) {
    result = result.slice(0, match.start) + match.replacementToken + result.slice(match.end);
  }
  return result;
}
