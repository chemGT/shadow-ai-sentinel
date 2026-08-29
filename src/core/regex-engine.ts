import { mergeRawMatches } from './detection/merge-matches.js';
import { chunkRanges, truncateForDetection } from './detection/limits.js';
import { runAllDetectors } from './detection/run-detectors.js';
import type { RawMatch } from './detection/types.js';
import type { DetectionMatch, Policy } from './types.js';

/**
 * Analyse le texte localement, par fenêtres chevauchantes (cf. `detection/limits.ts`) pour
 * couvrir tout le texte sans jamais soumettre un bloc non borné au moteur regex (anti-ReDoS,
 * anti-blocage UI). Les correspondances de chaque fenêtre sont réindexées en offsets absolus
 * avant fusion — les doublons produits par le chevauchement sont éliminés par
 * `mergeRawMatches` (deux correspondances identiques se chevauchent, la seconde est écartée).
 * Ne jamais transmettre `text` ou les correspondances brutes à l'API.
 */
export function detectSensitiveData(text: string, policy: Policy): DetectionMatch[] {
  if (text.length === 0) {
    return [];
  }

  const scoped = truncateForDetection(text);
  const raw: RawMatch[] = [];
  for (const { start, end } of chunkRanges(scoped.length)) {
    const chunkMatches = runAllDetectors(scoped.slice(start, end), policy);
    for (const match of chunkMatches) {
      raw.push({ ruleType: match.ruleType, start: match.start + start, end: match.end + start });
    }
  }
  return mergeRawMatches(raw);
}
