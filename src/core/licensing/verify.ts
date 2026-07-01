/**
 * Vérification d'une clé de licence Gumroad (API publique, sans secret).
 * Doc : https://gumroad.com/help/article/76-license-keys
 *   POST https://api.gumroad.com/v2/licenses/verify
 *   body: product_id, license_key, increment_uses_count
 */

export type LicenseReason =
  | 'ok'
  | 'not_found'
  | 'refunded'
  | 'disputed'
  | 'cancelled'
  | 'network_error'
  | 'malformed';

export interface LicenseCheckResult {
  valid: boolean;
  reason: LicenseReason;
  /** Nombre d'activations connues côté Gumroad (anti-partage soft). */
  uses?: number;
  message?: string;
}

export interface GumroadVerifyParams {
  productId: string;
  licenseKey: string;
  /** Injectable pour les tests ; par défaut `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  apiBase?: string;
  /** Incrémente le compteur d'activations Gumroad (false lors des re-checks périodiques). */
  incrementUsesCount?: boolean;
}

const DEFAULT_API_BASE = 'https://api.gumroad.com';

interface GumroadPurchase {
  refunded?: boolean;
  chargebacked?: boolean;
  disputed?: boolean;
  subscription_cancelled_at?: string | null;
  subscription_failed_at?: string | null;
}

interface GumroadResponse {
  success?: boolean;
  uses?: number;
  message?: string;
  purchase?: GumroadPurchase;
}

/** Évalue une réponse Gumroad déjà désérialisée (pur, testable sans réseau). */
export function evaluateGumroadResponse(json: unknown): LicenseCheckResult {
  if (typeof json !== 'object' || json === null) {
    return { valid: false, reason: 'malformed' };
  }
  const res = json as GumroadResponse;

  if (res.success !== true) {
    return { valid: false, reason: 'not_found', message: res.message };
  }

  const purchase = res.purchase ?? {};
  if (purchase.refunded === true || purchase.chargebacked === true) {
    return { valid: false, reason: 'refunded', uses: res.uses };
  }
  if (purchase.disputed === true) {
    return { valid: false, reason: 'disputed', uses: res.uses };
  }
  if (purchase.subscription_cancelled_at || purchase.subscription_failed_at) {
    return { valid: false, reason: 'cancelled', uses: res.uses };
  }

  return { valid: true, reason: 'ok', uses: res.uses };
}

/** Appelle l'API Gumroad et renvoie un résultat normalisé. Ne lève jamais. */
export async function verifyGumroadLicense(
  params: GumroadVerifyParams,
): Promise<LicenseCheckResult> {
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  const apiBase = params.apiBase ?? DEFAULT_API_BASE;

  if (!params.productId || !params.licenseKey) {
    return { valid: false, reason: 'malformed', message: 'Clé ou produit manquant.' };
  }

  const body = new URLSearchParams({
    product_id: params.productId,
    license_key: params.licenseKey.trim(),
    increment_uses_count: String(params.incrementUsesCount ?? false),
  });

  try {
    const response = await fetchImpl(`${apiBase}/v2/licenses/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    // Gumroad renvoie 404 + { success:false } pour une licence inconnue.
    const json: unknown = await response.json().catch(() => null);
    if (json === null) {
      return { valid: false, reason: 'malformed' };
    }
    return evaluateGumroadResponse(json);
  } catch {
    return { valid: false, reason: 'network_error' };
  }
}
