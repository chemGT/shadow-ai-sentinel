import { mergeRawMatches } from './detection/merge-matches.js';
import { chunkRanges, truncateForDetection } from './detection/limits.js';
import { normalizeForScan } from './detection/normalize.js';
import { runAllDetectors } from './detection/run-detectors.js';
import type { RawMatch } from './detection/types.js';
import type { DetectionMatch, Policy } from './types.js';

/**
 * Analyse le texte localement, par fenêtres chevauchantes (cf. `detection/limits.ts`) pour
 * couvrir tout le texte sans jamais soumettre un bloc non borné au moteur regex (anti-ReDoS,
 * anti-blocage UI). Les correspondances de chaque fenêtre sont réindexées en offsets absolus
 * avant fusion — les doublons produits par le chevauchement sont éliminés par
 * `mergeRawMatches` (deux correspondances identiques se chevauchent, la seconde est écartée).
 * Le scan porte sur une version normalisée du texte (`detection/normalize.ts` : invisibles,
 * espaces Unicode, homoglyphes, NFKC) ; les offsets renvoyés sont ramenés au texte ORIGINAL.
 * Ne jamais transmettre `text` ou les correspondances brutes à l'API.
 */
export function detectSensitiveData(text: string, policy: Policy): DetectionMatch[] {
  if (text.length === 0) {
    return [];
  }

  const normalized = normalizeForScan(truncateForDetection(text));
  const scoped = normalized.text;
  const raw: RawMatch[] = [];
  for (const { start, end } of chunkRanges(scoped.length)) {
    const chunkMatches = runAllDetectors(scoped.slice(start, end), policy);
    for (const match of chunkMatches) {
      // Une correspondance collée à un bord INTERNE de fenêtre est peut-être un secret coupé en
      // deux (ex. jeton trop long tronqué par la fenêtre, donc « valide » à tort). Le
      // chevauchement garantit que la fenêtre voisine la voit en entier : on écarte celle-ci.
      const cutAtEnd = end < scoped.length && match.end === end - start;
      const cutAtStart = start > 0 && match.start === 0;
      if (cutAtEnd || cutAtStart) {
        continue;
      }
      const original = normalized.toOriginal(match.start + start, match.end + start);
      raw.push({ ruleType: match.ruleType, start: original.start, end: original.end });
    }
  }
  return mergeRawMatches(raw);
}
