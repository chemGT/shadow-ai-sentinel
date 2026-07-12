import type { FailMode } from './types.js';

/**
 * `checking` se comporte comme `healthy` (fail-open) tant que le timeout n'est pas
 * atteint — une SPA lente au premier rendu ne doit pas être signalée cassée trop tôt.
 */
export type AdapterHealthState = 'checking' | 'healthy' | 'broken';

/** État persisté en storage — `checking` est transitoire, jamais écrit. */
export type PersistedAdapterHealth = Exclude<AdapterHealthState, 'checking'>;

export const ADAPTER_HEALTH_TIMEOUT_MS = 10_000;

/**
 * Décision pure du self-test au chargement d'un site : étant donné si le composer a
 * été trouvé à cette tentative et le temps écoulé depuis la première tentative,
 * détermine l'état de santé suivant.
 */
export function nextAdapterHealthState(
  composerFound: boolean,
  elapsedMs: number,
  timeoutMs: number = ADAPTER_HEALTH_TIMEOUT_MS,
): AdapterHealthState {
  if (composerFound) {
    return 'healthy';
  }
  return elapsedMs >= timeoutMs ? 'broken' : 'checking';
}

/** `true` si un adaptateur cassé doit bloquer tout envoi générique (`fail_mode: "closed"`). */
export function shouldBlockOnBrokenAdapter(failMode: FailMode): boolean {
  return failMode === 'closed';
}

/** `true` si la bannière d'alerte doit être affichée (tout sauf `fail_mode: "open"`). */
export function shouldWarnOnBrokenAdapter(failMode: FailMode): boolean {
  return failMode !== 'open';
}
