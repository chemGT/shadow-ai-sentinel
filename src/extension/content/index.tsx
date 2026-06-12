import { resolveLlmHost } from '../../core/llm-hosts.js';
import type { ExtensionMessage, LlmHost, Policy } from '../../core/types.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { getStoredPolicy } from '../platform/storage.js';
import { sendMessage } from '../platform/runtime.js';
import { attachClaudeAdapter } from '../sites/claude/adapter.js';
import { attachChatGptAdapter } from '../sites/chatgpt/adapter.js';
import { attachGeminiAdapter } from '../sites/gemini/adapter.js';
import { showFirstRunNoticeIfNeeded } from './first-run-notice.js';

const host = globalThis.location.hostname;
const llmHost = resolveLlmHost(host);

let policy: Policy | null = null;

async function loadPolicy(): Promise<Policy> {
  try {
    const response = (await sendMessage({ type: 'GET_POLICY' })) as { policy?: Policy };
    if (response?.policy) {
      return response.policy;
    }
  } catch {
    // Service worker non disponible — fallback storage
  }
  return getStoredPolicy();
}

function listenPolicyUpdates(): void {
  const api = getExtensionApi();
  api.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'POLICY_UPDATED' && message.payload) {
      policy = message.payload as Policy;
      console.info('[Shadow AI Sentinel] Policy mise à jour (message)', {
        version: policy.version,
      });
    }
  });
  // Fallback : écoute les mises à jour directement depuis le storage
  // (couvre le cas où le SW est terminé et ne peut pas broadcaster)
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'sentinel_policy' in changes) {
      const newPolicy = changes['sentinel_policy'].newValue as Policy | undefined;
      if (newPolicy) {
        policy = newPolicy;
        console.info('[Shadow AI Sentinel] Policy mise à jour (storage)', {
          version: newPolicy.version,
        });
      }
    }
  });
}

function attachSiteAdapter(site: LlmHost, getPolicy: () => Policy): () => void {
  switch (site) {
    case 'claude.ai':
      return attachClaudeAdapter({ getPolicy });
    case 'chatgpt.com':
      return attachChatGptAdapter({ getPolicy });
    case 'gemini.google.com':
      return attachGeminiAdapter({ getPolicy });
    default: {
      const _exhaustive: never = site;
      throw new Error(`Hôte non géré: ${_exhaustive}`);
    }
  }
}

function bootstrap(): void {
  if (!llmHost) {
    return;
  }

  listenPolicyUpdates();

  void loadPolicy()
    .then((loaded) => {
      policy = loaded;
      void showFirstRunNoticeIfNeeded();
      attachSiteAdapter(llmHost, () => policy ?? loaded);
      console.info('[Shadow AI Sentinel] Content script prêt', {
        host: llmHost,
        policyVersion: loaded.version,
      });
    })
    .catch((error: unknown) => {
      console.error('[Shadow AI Sentinel] Échec initialisation', error);
    });
}

bootstrap();
