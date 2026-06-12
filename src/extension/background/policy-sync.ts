import { LLM_TAB_URL_PATTERNS } from '../../core/llm-hosts.js';
import { validatePolicy } from '../../core/validation/policy.js';
import type { Policy } from '../../core/types.js';
import {
  getStoredPolicy,
  getTenantCredentials,
  setStoredPolicy,
} from '../platform/storage.js';
import { getExtensionApi } from '../platform/browser-api.js';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function syncPolicyFromApi(): Promise<Policy | null> {
  const credentials = await getTenantCredentials();
  if (!credentials) {
    return null;
  }

  const base = normalizeBaseUrl(credentials.apiBaseUrl);
  const localPolicy = await getStoredPolicy();
  const emailQuery =
    localPolicy.emailDomains.length > 0
      ? `?emailDomains=${encodeURIComponent(localPolicy.emailDomains.join(','))}`
      : '';

  const response = await fetch(`${base}/policies${emailQuery}`, {
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Sync policy échouée (${response.status})`);
  }

  const body = (await response.json()) as { policy?: unknown };
  const validated = validatePolicy(body.policy);
  if (!validated.ok) {
    throw new Error(`Policy API invalide: ${validated.errors.join(', ')}`);
  }

  await setStoredPolicy(validated.policy);
  return validated.policy;
}

export async function broadcastPolicyUpdate(policy: Policy): Promise<void> {
  const api = getExtensionApi();
  const tabs = await api.tabs.query({ url: [...LLM_TAB_URL_PATTERNS] });
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined)
      .map((tab) =>
        api.tabs.sendMessage(tab.id!, { type: 'POLICY_UPDATED', payload: policy }).catch(() => {
          /* onglet sans content script */
        }),
      ),
  );
}
