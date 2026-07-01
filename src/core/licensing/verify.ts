/**
 * Vérification d'une clé de licence Lemon Squeezy (License API publique, sans secret).
 * Doc : https://docs.lemonsqueezy.com/help/licensing/license-api-introduction
 *   POST https://api.lemonsqueezy.com/v1/licenses/activate  (1ère activation → instance_id)
 *   POST https://api.lemonsqueezy.com/v1/licenses/validate   (re-checks périodiques)
 *
 * Le statut d'abonnement se reflète dans `license_key.status` :
 *   inactive (jamais activée) · active · expired (abo terminé) · disabled (révoquée/remboursée).
 */

export type LicenseReason =
  | 'ok'
  | 'not_found'
  | 'refunded'
  | 'disputed'
  | 'cancelled'
  | 'limit_reached'
  | 'network_error'
  | 'malformed';

export interface LicenseCheckResult {
  valid: boolean;
  reason: LicenseReason;
  /** Nombre d'activations connues côté serveur (anti-partage soft). */
  uses?: number;
  /** Identifiant d'instance renvoyé à l'activation (à persister pour les re-checks). */
  instanceId?: string;
  message?: string;
}

export interface LemonVerifyParams {
  licenseKey: string;
  /** Instance existante (validate). Absent ⇒ activation (activate). */
  instanceId?: string;
  /** Nom d'instance lisible envoyé à l'activation (ex : deviceId). */
  instanceName?: string;
  /** Store attendu : rejette une clé émise par un autre vendeur. */
  expectedStoreId?: string;
  /** Produit attendu (optionnel) : rejette une clé d'un autre produit. */
  expectedProductId?: string;
  /** Injectable pour les tests ; par défaut `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  apiBase?: string;
}

const DEFAULT_API_BASE = 'https://api.lemonsqueezy.com';

interface LemonLicenseKey {
  status?: string;
  activation_usage?: number;
}
interface LemonInstance {
  id?: string;
}
interface LemonMeta {
  store_id?: number;
  product_id?: number;
}
interface LemonResponse {
  valid?: boolean;
  activated?: boolean;
  error?: string | null;
  license_key?: LemonLicenseKey;
  instance?: LemonInstance | null;
  meta?: LemonMeta | null;
}

export interface EvaluateOptions {
  expectedStoreId?: string;
  expectedProductId?: string;
}

/** Évalue une réponse Lemon Squeezy déjà désérialisée (pur, testable sans réseau). */
export function evaluateLemonResponse(
  json: unknown,
  opts: EvaluateOptions = {},
): LicenseCheckResult {
  if (typeof json !== 'object' || json === null) {
    return { valid: false, reason: 'malformed' };
  }
  const res = json as LemonResponse;
  const status = res.license_key?.status;
  const uses = res.license_key?.activation_usage;
  const instanceId = res.instance?.id;

  // Le statut prime : une clé expirée/désactivée est rejetée même si activated=true.
  if (status === 'expired') {
    return { valid: false, reason: 'cancelled', uses };
  }
  if (status === 'disabled') {
    return { valid: false, reason: 'refunded', uses };
  }

  const success = res.valid === true || res.activated === true;
  if (!success) {
    const limitReached =
      typeof res.error === 'string' && /activation limit/i.test(res.error);
    return {
      valid: false,
      reason: limitReached ? 'limit_reached' : 'not_found',
      uses,
      message: res.error ?? undefined,
    };
  }

  // Contrôle d'appartenance : empêche une clé d'un autre store/produit de débloquer le Pro.
  if (opts.expectedStoreId && String(res.meta?.store_id) !== opts.expectedStoreId) {
    return { valid: false, reason: 'not_found', message: 'store_mismatch' };
  }
  if (opts.expectedProductId && String(res.meta?.product_id) !== opts.expectedProductId) {
    return { valid: false, reason: 'not_found', message: 'product_mismatch' };
  }

  return { valid: true, reason: 'ok', uses, instanceId };
}

async function callLemon(
  endpoint: 'activate' | 'validate',
  body: URLSearchParams,
  params: LemonVerifyParams,
): Promise<LicenseCheckResult> {
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  const apiBase = params.apiBase ?? DEFAULT_API_BASE;

  try {
    const response = await fetchImpl(`${apiBase}/v1/licenses/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const json: unknown = await response.json().catch(() => null);
    if (json === null) {
      return { valid: false, reason: 'malformed' };
    }
    return evaluateLemonResponse(json, {
      expectedStoreId: params.expectedStoreId,
      expectedProductId: params.expectedProductId,
    });
  } catch {
    return { valid: false, reason: 'network_error' };
  }
}

/** Active une clé (première utilisation) : crée une instance et renvoie son `instanceId`. */
export function activateLemonLicense(params: LemonVerifyParams): Promise<LicenseCheckResult> {
  const key = params.licenseKey.trim();
  if (!key) {
    return Promise.resolve({ valid: false, reason: 'malformed', message: 'Clé manquante.' });
  }
  const body = new URLSearchParams({
    license_key: key,
    instance_name: params.instanceName?.trim() || 'shadow-ai-sentinel',
  });
  return callLemon('activate', body, params);
}

/** Revalide une clé déjà activée (re-check périodique, ne consomme pas d'activation). */
export function validateLemonLicense(params: LemonVerifyParams): Promise<LicenseCheckResult> {
  const key = params.licenseKey.trim();
  if (!key) {
    return Promise.resolve({ valid: false, reason: 'malformed', message: 'Clé manquante.' });
  }
  const body = new URLSearchParams({ license_key: key });
  if (params.instanceId) {
    body.set('instance_id', params.instanceId);
  }
  return callLemon('validate', body, params);
}
