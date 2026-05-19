export type TenantAuth = {
  tenantId: string;
  apiKey: string;
};

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
    if (key === apiKey) {
      return tenantId;
    }
  }
  return null;
}
