/** Taille de chaque fenêtre passée au moteur regex (borne le coût d'une passe, anti-ReDoS). */
export const DETECTION_CHUNK_SIZE = 100_000;

/**
 * Chevauchement entre deux fenêtres consécutives. Doit dépasser la longueur du plus long motif
 * susceptible d'être coupé par une frontière de fenêtre, sans quoi un secret à cheval sur deux
 * fenêtres ne serait détecté ni dans l'une ni dans l'autre. Le motif le plus long du moteur est
 * le JWT triple-segment (`generic-secret.ts` : 2×4096 + 512 ≈ 8.7k caractères) ; 10k laisse une
 * marge confortable.
 */
export const DETECTION_CHUNK_OVERLAP = 10_000;

/**
 * Plafond absolu : au-delà, le texte est réellement tronqué (perte de contenu non scanné) afin
 * de borner le temps de scan sur le thread principal face à un collage massif adverse. En-deçà
 * de ce plafond, le découpage en fenêtres chevauchantes (cf. `chunkRanges`, utilisé par
 * `regex-engine.ts`) couvre tout le texte sans aucune perte — seul le dépassement de CE plafond
 * doit déclencher un avertissement utilisateur (`wasTextTruncated`), pas le simple fait de
 * dépasser `DETECTION_CHUNK_SIZE`.
 */
export const MAX_DETECTION_TOTAL_LENGTH = 2_000_000;

export function wasTextTruncated(text: string): boolean {
  return text.length > MAX_DETECTION_TOTAL_LENGTH;
}

export function truncateForDetection(text: string): string {
  if (!wasTextTruncated(text)) {
    return text;
  }
  return text.slice(0, MAX_DETECTION_TOTAL_LENGTH);
}

export type ChunkRange = { start: number; end: number };

/** Bornes `[start, end)` des fenêtres chevauchantes couvrant `length` caractères. */
export function chunkRanges(
  length: number,
  chunkSize: number = DETECTION_CHUNK_SIZE,
  overlap: number = DETECTION_CHUNK_OVERLAP,
): ChunkRange[] {
  if (length <= chunkSize) {
    return [{ start: 0, end: length }];
  }

  const step = chunkSize - overlap;
  const ranges: ChunkRange[] = [];
  let start = 0;
  while (start < length) {
    const end = Math.min(start + chunkSize, length);
    ranges.push({ start, end });
    if (end === length) {
      break;
    }
    start += step;
  }
  return ranges;
}
