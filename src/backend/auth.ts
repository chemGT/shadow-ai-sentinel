import { createHash, timingSafeEqual } from 'node:crypto';

export type TenantAuth = {
  tenantId: string;
  apiKey: string;
};

/**
 * Comparaison à temps constant. Les deux valeurs sont d'abord hachées (SHA-256, digest fixe
 * 32 octets) pour que `timingSafeEqual` compare toujours des buffers de même longueur — sinon
 * il lève une exception dès que les tailles diffèrent, ce qui fuiterait la longueur de la clé.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest();
  const digestB = createHash('sha256').update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

/** Parse `API_KEYS=tenant1:key1,tenant2:key2` */
export function loadApiKeysFromEnv(raw = process.env.API_KEYS): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) {
    if (process.env.DEV_TENANT_ID && process.env.DEV_API_KEY) {
      map.set(process.env.DEV_TENANT_ID, process.env.DEV_API_KEY);
    }
    return map;
  }

  for (const pair of raw.split(',')) {
    const [tenantId, apiKey] = pair.split(':').map((s) => s.trim());
    if (tenantId && apiKey) {
      map.set(tenantId, apiKey);
    }
  }
  return map;
}

export function resolveTenantByApiKey(
  apiKey: string,
  registry: Map<string, string>,
): string | null {
  for (const [tenantId, key] of registry.entries()) {
    if (constantTimeEquals(key, apiKey)) {
      return tenantId;
    }
  }
  return null;
}
