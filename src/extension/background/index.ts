import { SUPPORTED_LLM_HOSTS } from '../../core/constants.js';
import { createDefaultPolicy } from '../../core/defaults.js';
import { LLM_TAB_URL_PATTERNS } from '../../core/llm-hosts.js';
import type { ExtensionMessage, Policy } from '../../core/types.js';
import {
  getBrowserFamily,
  getExtensionVersion,
  getStoredPolicy,
  onMessage,
  setStoredPolicy,
} from '../platform/index.js';
import { getExtensionApi } from '../platform/browser-api.js';

let cachedPolicy: Policy = createDefaultPolicy();

async function broadcastPolicyUpdate(policy: Policy): Promise<void> {
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

async function bootstrap(): Promise<void> {
  cachedPolicy = await getStoredPolicy();
  console.info('[Shadow AI Sentinel] Service worker prêt', {
    supportedHosts: SUPPORTED_LLM_HOSTS,
    policyVersion: cachedPolicy.version,
    browser: getBrowserFamily(),
    version: getExtensionVersion(),
  });
}

onMessage(async (message: ExtensionMessage) => {
  switch (message.type) {
    case 'GET_POLICY':
      return { policy: cachedPolicy };
    case 'POLICY_UPDATED': {
      const next = message.payload as Policy;
      await setStoredPolicy(next);
      cachedPolicy = next;
      await broadcastPolicyUpdate(next);
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'Unhandled message type' };
  }
});

void bootstrap();
