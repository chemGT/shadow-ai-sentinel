import { DEFAULT_FAIL_MODE } from './constants.js';
import type { FailMode } from './types.js';

/**
 * Raisons pour lesquelles un contenu part SANS analyse complète :
 * - `truncated` : texte au-delà du plafond de scan (`MAX_DETECTION_TOTAL_LENGTH`) ;
 * - `file-too-large` : pièce jointe au-delà de la taille analysable ;
 * - `file-unreadable` : pièce jointe illisible (corrompue, chiffrée, erreur de lecture) ;
 * - `scan-error` : exception inattendue pendant l'analyse.
 */
export type UnscannableReason = 'truncated' | 'file-too-large' | 'file-unreadable' | 'scan-error';

/**
 * `fail_mode` gouverne TOUS les cas « impossible d'analyser », pas seulement l'adaptateur cassé :
 * `closed` = on bloque ce qu'on n'a pas pu vérifier ; `warn` = on laisse passer avec un
 * avertissement visible ; `open` = on laisse passer (l'avertissement reste affiché : laisser
 * passer en silence n'est jamais souhaitable pour un DLP).
 */
export function shouldBlockUnscannable(failMode: FailMode | undefined): boolean {
  return (failMode ?? DEFAULT_FAIL_MODE) === 'closed';
}
