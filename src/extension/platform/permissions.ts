import { getExtensionApi } from './browser-api.js';

export function apiOriginPattern(apiBaseUrl: string): string | null {
  try {
    const origin = new URL(apiBaseUrl).origin;
    return `${origin}/*`;
  } catch {
    return null;
  }
}

export async function ensureApiHostPermission(apiBaseUrl: string): Promise<boolean> {
  const pattern = apiOriginPattern(apiBaseUrl);
  if (!pattern) {
    return false;
  }

  const api = getExtensionApi();
  const has = await api.permissions.contains({ origins: [pattern] });
  if (has) {
    return true;
  }

  return api.permissions.request({ origins: [pattern] });
}
