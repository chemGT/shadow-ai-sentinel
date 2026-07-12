import { STORAGE_KEYS } from '../../core/constants.js';
import type { Policy, TelemetryQueueItem, TenantCredentials } from '../../core/types.js';
import type { Entitlement } from '../../core/licensing/entitlement.js';
import { createDefaultPolicy } from '../../core/defaults.js';

/** Compteurs locaux affichés dans la popup (jamais envoyés). */
export interface LocalStats {
  blocked: number;
  redacted: number;
}
import { validatePolicy } from '../../core/validation/policy.js';
import { getExtensionApi } from './browser-api.js';

/**
 * `chrome.storage.local.get/set/remove` acceptent un callback en dernier argument
 * (API historique) ET retournent une Promise (MV3). `browser.storage.local.*` (Firefox)
 * est Promise-only : le callback passé en dernier argument est silencieusement ignoré,
 * jamais invoqué. Utiliser le pattern callback fait donc pendre indéfiniment la Promise
 * wrapper sur Firefox (policy jamais lue, allowlist jamais chargée, device id jamais
 * généré, etc.) — d'où l'usage exclusif de la forme Promise native, supportée nativement
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

export async function getTelemetryQueue(): Promise<TelemetryQueueItem[]> {
  const result = await storageGet<TelemetryQueueItem[]>(STORAGE_KEYS.telemetryQueue);
  return result[STORAGE_KEYS.telemetryQueue] ?? [];
}

export async function setTelemetryQueue(queue: TelemetryQueueItem[]): Promise<void> {
  await storageSet({ [STORAGE_KEYS.telemetryQueue]: queue });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const result = await storageGet<string>(STORAGE_KEYS.deviceId);
  const existing = result[STORAGE_KEYS.deviceId];
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  const deviceId = crypto.randomUUID();
  await storageSet({ [STORAGE_KEYS.deviceId]: deviceId });
  return deviceId;
}

export async function getTenantCredentials(): Promise<TenantCredentials | null> {
  const result = await storageGet<TenantCredentials>(STORAGE_KEYS.credentials);
  const creds = result[STORAGE_KEYS.credentials];
  if (
    creds &&
    typeof creds.tenantId === 'string' &&
    typeof creds.apiKey === 'string' &&
    typeof creds.apiBaseUrl === 'string'
  ) {
    return creds;
  }
  return null;
}

export async function setTenantCredentials(credentials: TenantCredentials): Promise<void> {
  await storageSet({ [STORAGE_KEYS.credentials]: credentials });
}

export async function getStoredEntitlement(): Promise<Entitlement | null> {
  const result = await storageGet<Entitlement>(STORAGE_KEYS.entitlement);
  const value = result[STORAGE_KEYS.entitlement];
  if (value && (value.tier === 'free' || value.tier === 'pro')) {
    return value;
  }
  return null;
}

export async function setStoredEntitlement(entitlement: Entitlement): Promise<void> {
  await storageSet({ [STORAGE_KEYS.entitlement]: entitlement });
}

export async function getStoredLicenseKey(): Promise<string | null> {
  const result = await storageGet<string>(STORAGE_KEYS.licenseKey);
  const value = result[STORAGE_KEYS.licenseKey];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function setStoredLicenseKey(key: string): Promise<void> {
  await storageSet({ [STORAGE_KEYS.licenseKey]: key });
}

/** Identifiant d'instance Lemon Squeezy (créé à l'activation, requis pour les re-checks). */
export async function getStoredLicenseInstanceId(): Promise<string | null> {
  const result = await storageGet<string>(STORAGE_KEYS.licenseInstanceId);
  const value = result[STORAGE_KEYS.licenseInstanceId];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function setStoredLicenseInstanceId(id: string): Promise<void> {
  await storageSet({ [STORAGE_KEYS.licenseInstanceId]: id });
}

export async function clearStoredLicense(): Promise<void> {
  const api = getExtensionApi();
  await (api.storage.local.remove([
    STORAGE_KEYS.licenseKey,
    STORAGE_KEYS.licenseInstanceId,
    STORAGE_KEYS.entitlement,
  ]) as Promise<void>);
}

/** Valeurs allowlistées (Pro) : matches dont la valeur exacte ne doit pas déclencher la policy. */
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

export async function getLocalStats(): Promise<LocalStats> {
  const result = await storageGet<LocalStats>(STORAGE_KEYS.stats);
  const value = result[STORAGE_KEYS.stats];
  if (value && typeof value.blocked === 'number' && typeof value.redacted === 'number') {
    return value;
  }
  return { blocked: 0, redacted: 0 };
}

export async function incrementLocalStat(kind: 'blocked' | 'redacted'): Promise<void> {
  const stats = await getLocalStats();
  stats[kind] += 1;
  await storageSet({ [STORAGE_KEYS.stats]: stats });
}
