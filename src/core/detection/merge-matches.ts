import type { DetectionMatch } from '../types.js';
import { REDACT_TOKENS } from '../constants.js';
import { RULE_PRIORITY, type RawMatch } from './types.js';

function overlaps(a: RawMatch, b: RawMatch): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Fusionne les chevauchements en conservant la règle la plus prioritaire. */
export function mergeRawMatches(matches: RawMatch[]): DetectionMatch[] {
  if (matches.length === 0) {
    return [];
  }

  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    const prio = RULE_PRIORITY[a.ruleType] - RULE_PRIORITY[b.ruleType];
    if (prio !== 0) {
      return prio;
    }
    return b.end - b.start - (a.end - a.start);
  });

  const kept: RawMatch[] = [];

  for (const candidate of sorted) {
    const conflict = kept.find((k) => overlaps(k, candidate));
    if (!conflict) {
      kept.push(candidate);
      continue;
    }
    if (RULE_PRIORITY[candidate.ruleType] < RULE_PRIORITY[conflict.ruleType]) {
      const idx = kept.indexOf(conflict);
      kept[idx] = candidate;
    }
  }

  return kept
    .sort((a, b) => a.start - b.start)
    .map((m) => ({
      ruleType: m.ruleType,
      start: m.start,
      end: m.end,
      replacementToken: REDACT_TOKENS[m.ruleType],
    }));
}
