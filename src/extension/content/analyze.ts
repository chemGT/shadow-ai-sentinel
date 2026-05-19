import { detectSensitiveData } from '../../core/regex-engine.js';
import type { DetectionMatch, Policy, RuleAction, RuleType } from '../../core/types.js';

export type GuardDecision =
  | { kind: 'allow' }
  | { kind: 'block'; match: DetectionMatch }
  | { kind: 'redact'; matches: DetectionMatch[] };

function getRuleAction(policy: Policy, ruleType: RuleType): RuleAction | null {
  const rule = policy.rules.find((r) => r.type === ruleType && r.enabled);
  return rule?.action ?? null;
}

/** Applique la policy aux correspondances détectées. */
export function evaluateGuard(text: string, policy: Policy): GuardDecision {
  if (text.trim().length === 0) {
    return { kind: 'allow' };
  }

  const matches = detectSensitiveData(text, policy);
  if (matches.length === 0) {
    return { kind: 'allow' };
  }

  const blockMatch = matches.find((m) => getRuleAction(policy, m.ruleType) === 'block');
  if (blockMatch) {
    return { kind: 'block', match: blockMatch };
  }

  const redactMatches = matches.filter((m) => getRuleAction(policy, m.ruleType) === 'redact');
  if (redactMatches.length > 0) {
    return { kind: 'redact', matches: redactMatches };
  }

  return { kind: 'allow' };
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
