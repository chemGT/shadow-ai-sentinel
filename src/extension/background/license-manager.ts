import {
  activateLemonLicense,
  validateLemonLicense,
  type LicenseCheckResult,
} from '../../core/licensing/verify.js';
import { createFreeEntitlement, type Entitlement } from '../../core/licensing/entitlement.js';
import {
  clearStoredLicense,
  getOrCreateDeviceId,
  getStoredEntitlement,
  getStoredLicenseInstanceId,
  getStoredLicenseKey,
  setStoredEntitlement,
  setStoredLicenseInstanceId,
  setStoredLicenseKey,
} from '../platform/storage.js';
import {
  LEMONSQUEEZY_PRODUCT_ID,
  LEMONSQUEEZY_STORE_ID,
  LICENSE_GRACE_DAYS,
} from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcule l'entitlement résultant d'une vérification de licence.
 * Pur et testable : applique la grâce offline en cas d'erreur réseau.
 */
export function entitlementFromCheck(
  result: LicenseCheckResult,
  previous: Entitlement | null,
  now: Date = new Date(),
  graceDays: number = LICENSE_GRACE_DAYS,
): Entitlement {
  const nowIso = now.toISOString();

  if (result.valid) {
    return { tier: 'pro', valid: true, checkedAt: nowIso, lastValidAt: nowIso };
  }

  if (result.reason === 'network_error') {
    const lastValid = previous?.lastValidAt ? Date.parse(previous.lastValidAt) : NaN;
    const withinGrace =
      Number.isFinite(lastValid) && now.getTime() - lastValid <= graceDays * DAY_MS;
    if (previous?.tier === 'pro' && withinGrace) {
      return { ...previous, valid: true, checkedAt: nowIso, message: 'offline_grace' };
    }
    return {
      tier: previous?.tier ?? 'free',
      valid: false,
      checkedAt: nowIso,
      lastValidAt: previous?.lastValidAt,
      message: 'network_error',
    };
  }

  // Rejet définitif (introuvable, remboursé, litige, abonnement annulé).
  return { tier: 'free', valid: false, checkedAt: nowIso, message: result.reason };
}

/** Entitlement courant (Free par défaut). */
export async function getEntitlement(): Promise<Entitlement> {
  return (await getStoredEntitlement()) ?? createFreeEntitlement();
}

/** Active une clé saisie par l'utilisateur (crée une instance Lemon Squeezy). */
export async function activateLicense(rawKey: string): Promise<Entitlement> {
  const key = rawKey.trim();
  const result = await activateLemonLicense({
    licenseKey: key,
    instanceName: await getOrCreateDeviceId(),
    expectedStoreId: LEMONSQUEEZY_STORE_ID || undefined,
    expectedProductId: LEMONSQUEEZY_PRODUCT_ID || undefined,
  });
  const entitlement = entitlementFromCheck(result, await getStoredEntitlement());
  if (entitlement.tier === 'pro' && entitlement.valid) {
    await setStoredLicenseKey(key);
    if (result.instanceId) {
      await setStoredLicenseInstanceId(result.instanceId);
    }
  }
  await setStoredEntitlement(entitlement);
  return entitlement;
}

/** Revérifie la clé stockée (re-check périodique, sans consommer d'activation). */
export async function refreshEntitlement(): Promise<Entitlement> {
  const key = await getStoredLicenseKey();
  if (!key) {
    const free = createFreeEntitlement();
    await setStoredEntitlement(free);
    return free;
  }
  const result = await validateLemonLicense({
    licenseKey: key,
    instanceId: (await getStoredLicenseInstanceId()) ?? undefined,
    expectedStoreId: LEMONSQUEEZY_STORE_ID || undefined,
    expectedProductId: LEMONSQUEEZY_PRODUCT_ID || undefined,
  });
  const entitlement = entitlementFromCheck(result, await getStoredEntitlement());
  await setStoredEntitlement(entitlement);
  return entitlement;
}

/** Supprime la licence et repasse en Free. */
export async function deactivateLicense(): Promise<Entitlement> {
  await clearStoredLicense();
  const free = createFreeEntitlement();
  await setStoredEntitlement(free);
  return free;
}
