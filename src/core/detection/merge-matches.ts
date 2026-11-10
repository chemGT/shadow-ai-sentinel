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

  // Balayage linéaire : `sorted` est trié par début et `kept` reste trié, sans chevauchement —
  // seul le DERNIER élément conservé peut donc chevaucher le candidat. L'ancienne recherche
  // `kept.find(...)` par candidat était quadratique : ~23 s de gel du thread principal pour
  // 120 000 correspondances (collage d'un gros journal ou d'un export).
  const kept: RawMatch[] = [];

  for (const candidate of sorted) {
    const last = kept[kept.length - 1];
    if (last === undefined || !overlaps(last, candidate)) {
      kept.push(candidate);
      continue;
    }
    if (RULE_PRIORITY[candidate.ruleType] < RULE_PRIORITY[last.ruleType]) {
      kept[kept.length - 1] = candidate;
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
