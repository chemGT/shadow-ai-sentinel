import { STORAGE_KEYS } from '../../core/constants.js';
import type { Policy, TelemetryQueueItem, TenantCredentials } from '../../core/types.js';
import { createDefaultPolicy } from '../../core/defaults.js';
import { validatePolicy } from '../../core/validation/policy.js';
import { getExtensionApi } from './browser-api.js';

function storageGet<T>(keys: string | string[]): Promise<Record<string, T>> {
  const api = getExtensionApi();
  return new Promise((resolve, reject) => {
    api.storage.local.get(keys, (result) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(result as Record<string, T>);
    });
  });
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  const api = getExtensionApi();
  return new Promise((resolve, reject) => {
    api.storage.local.set(items, () => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
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
