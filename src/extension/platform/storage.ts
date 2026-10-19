import { STORAGE_KEYS } from '../../core/constants.js';
import type { Policy } from '../../core/types.js';
import type { PersistedAdapterHealth } from '../../core/adapter-health.js';
import { createDefaultPolicy } from '../../core/defaults.js';

/** Compteurs locaux affichés dans la popup (jamais envoyés). */
export interface LocalStats {
  blocked: number;
  redacted: number;
  truncated: number;
}
import { validatePolicy } from '../../core/validation/policy.js';
import {
  applyManagedPolicy,
  MANAGED_KEYS,
  mergeAllowlists,
  parseManagedConfig,
  type ManagedConfig,
} from '../../core/managed-policy.js';
import { getExtensionApi } from './browser-api.js';

/**
 * `chrome.storage.local.get/set/remove` acceptent un callback en dernier argument
 * (API historique) ET retournent une Promise (MV3). `browser.storage.local.*` (Firefox)
 * est Promise-only : le callback passé en dernier argument est silencieusement ignoré,
 * jamais invoqué. Utiliser le pattern callback fait donc pendre indéfiniment la Promise
 * wrapper sur Firefox (policy jamais lue, allowlist jamais chargée, etc.) — d'où l'usage exclusif de la forme Promise native, supportée nativement
 * par les deux navigateurs.
 */
function storageGet<T>(keys: string | string[]): Promise<Record<string, T>> {
  const api = getExtensionApi();
  return api.storage.local.get(keys) as Promise<Record<string, T>>;
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  const api = getExtensionApi();
  return api.storage.local.set(items) as Promise<void>;
}

export async function getStoredPolicy(): Promise<Policy> {
  const result = await storageGet<Policy>(STORAGE_KEYS.policy);
  const raw = result[STORAGE_KEYS.policy];
  if (raw === undefined) {
    return createDefaultPolicy();
  }
  const validated = validatePolicy(raw);
  if (!validated.ok) {
    console.warn('[Shadow AI Sentinel] Policy invalide en storage:', validated.errors);
    return createDefaultPolicy();
  }
  return validated.policy;
}

export async function setStoredPolicy(policy: Policy): Promise<void> {
  const validated = validatePolicy(policy);
  if (!validated.ok) {
    throw new Error(`Policy invalide: ${validated.errors.join(', ')}`);
  }
  await storageSet({ [STORAGE_KEYS.policy]: validated.policy });
}

/** Valeurs allowlistées : matches dont la valeur exacte ne doit pas déclencher la policy. */
export async function getAllowlist(): Promise<string[]> {
  const result = await storageGet<unknown>(STORAGE_KEYS.allowlist);
  const value = result[STORAGE_KEYS.allowlist];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export async function setAllowlist(values: readonly string[]): Promise<void> {
  const cleaned = Array.from(
    new Set(values.map((v) => v.trim()).filter((v) => v.length > 0)),
  );
  await storageSet({ [STORAGE_KEYS.allowlist]: cleaned });
}

/**
 * Configuration gérée par l'organisation (lecture seule). Absente — aucun `managed_schema`
 * (Firefox sans policy `3rdparty`), stockage vide ou API indisponible — : configuration vide,
 * comportement inchangé. Les entrées invalides sont ignorées et signalées en console.
 */
export async function getManagedConfig(): Promise<ManagedConfig> {
  let raw: unknown;
  try {
    // Firefox rejette la Promise quand aucun manifeste de stockage géré n'existe.
    raw = await getExtensionApi().storage.managed.get([...MANAGED_KEYS]);
  } catch {
    return parseManagedConfig(undefined);
  }
  const config = parseManagedConfig(raw);
  if (config.errors.length > 0) {
    console.warn('[Shadow AI Sentinel] Policy gérée partiellement ignorée:', config.errors);
  }
  return config;
}

/** Policy appliquée : locale, surchargée champ par champ par la policy gérée. */
export async function getEffectivePolicy(): Promise<Policy> {
  const [local, managed] = await Promise.all([getStoredPolicy(), getManagedConfig()]);
  return applyManagedPolicy(local, managed);
}

/** Allowlist appliquée : locale + gérée. */
export async function getEffectiveAllowlist(): Promise<string[]> {
  const [local, managed] = await Promise.all([getAllowlist(), getManagedConfig()]);
  return mergeAllowlists(local, managed);
}

export async function getLocalStats(): Promise<LocalStats> {
  const result = await storageGet<LocalStats>(STORAGE_KEYS.stats);
  const value = result[STORAGE_KEYS.stats];
  if (value && typeof value.blocked === 'number' && typeof value.redacted === 'number') {
    return {
      blocked: value.blocked,
      redacted: value.redacted,
      // Champ ajouté après coup : les stats déjà en storage n'en disposent pas encore.
      truncated: typeof value.truncated === 'number' ? value.truncated : 0,
    };
  }
  return { blocked: 0, redacted: 0, truncated: 0 };
}

export async function incrementLocalStat(kind: 'blocked' | 'redacted' | 'truncated'): Promise<void> {
  const stats = await getLocalStats();
  stats[kind] += 1;
  await storageSet({ [STORAGE_KEYS.stats]: stats });
}

/** État de santé de l'adaptateur du site courant (self-test au chargement, R1). */
export async function getAdapterHealth(): Promise<PersistedAdapterHealth> {
  const result = await storageGet<PersistedAdapterHealth>(STORAGE_KEYS.adapterHealth);
  return result[STORAGE_KEYS.adapterHealth] === 'broken' ? 'broken' : 'healthy';
}

export async function setAdapterHealth(state: PersistedAdapterHealth): Promise<void> {
  await storageSet({ [STORAGE_KEYS.adapterHealth]: state });
}
