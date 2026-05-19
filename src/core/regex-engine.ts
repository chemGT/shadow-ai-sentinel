import { mergeRawMatches } from './detection/merge-matches.js';
import { truncateForDetection } from './detection/limits.js';
import { runAllDetectors } from './detection/run-detectors.js';
import type { DetectionMatch, Policy } from './types.js';

/**
 * Analyse le texte localement.
 * Ne jamais transmettre `text` ou les correspondances brutes à l'API.
 */
export function detectSensitiveData(text: string, policy: Policy): DetectionMatch[] {
  if (text.length === 0) {
    return [];
  }

  const scoped = truncateForDetection(text);
  const raw = runAllDetectors(scoped, policy);
  return mergeRawMatches(raw);
}
