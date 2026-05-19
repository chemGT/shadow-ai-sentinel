/** Limite de taille analysée (évite DoS / blocage UI sur collages massifs). */
export const MAX_DETECTION_INPUT_LENGTH = 100_000;

export function truncateForDetection(text: string): string {
  if (text.length <= MAX_DETECTION_INPUT_LENGTH) {
    return text;
  }
  return text.slice(0, MAX_DETECTION_INPUT_LENGTH);
}
