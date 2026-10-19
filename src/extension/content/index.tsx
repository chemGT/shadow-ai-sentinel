import { resolveLlmHost } from '../../core/llm-hosts.js';
import type { ExtensionMessage, LlmHost, Policy } from '../../core/types.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { getEffectiveAllowlist, getEffectivePolicy } from '../platform/storage.js';
import { sendMessage } from '../platform/runtime.js';
import { attachClaudeAdapter } from '../sites/claude/adapter.js';
import { attachChatGptAdapter } from '../sites/chatgpt/adapter.js';
import { attachGeminiAdapter } from '../sites/gemini/adapter.js';
import { attachMistralAdapter } from '../sites/mistral/adapter.js';
import { attachDeepSeekAdapter } from '../sites/deepseek/adapter.js';
import { attachPerplexityAdapter } from '../sites/perplexity/adapter.js';
import { attachGrokAdapter } from '../sites/grok/adapter.js';
import { attachCopilotAdapter } from '../sites/copilot/adapter.js';
import { showFirstRunNoticeIfNeeded } from './first-run-notice.js';

const host = globalThis.location.hostname;
const llmHost = resolveLlmHost(host);

let policy: Policy | null = null;
let allowlist: string[] = [];

async function loadPolicy(): Promise<Policy> {
  try {
    const response = (await sendMessage({ type: 'GET_POLICY' })) as { policy?: Policy };
    if (response?.policy) {
      return response.policy;
    }
  } catch {
    // Service worker non disponible — fallback storage
  }
  return getEffectivePolicy();
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
  // (couvre le cas où le SW est terminé et ne peut pas broadcaster). La valeur brute locale
  // n'est jamais appliquée telle quelle : la policy gérée (area `managed`) reste prioritaire.
  api.storage.onChanged.addListener((changes, area) => {
    const managedChanged = area === 'managed';
    if (managedChanged || (area === 'local' && 'sentinel_policy' in changes)) {
      void getEffectivePolicy().then((next) => {
        policy = next;
        console.info('[Shadow AI Sentinel] Policy mise à jour (storage)', {
          version: next.version,
        });
      });
    }
    if (managedChanged || (area === 'local' && 'sentinel_allowlist' in changes)) {
      void getEffectiveAllowlist().then((next) => {
        allowlist = next;
        console.info('[Shadow AI Sentinel] Allowlist mise à jour', { count: allowlist.length });
      });
    }
  });
}

function attachSiteAdapter(
  site: LlmHost,
  getPolicy: () => Policy,
  getAllowlist: () => readonly string[],
): () => void {
  switch (site) {
    case 'claude.ai':
      return attachClaudeAdapter({ getPolicy, getAllowlist });
    case 'chatgpt.com':
      return attachChatGptAdapter({ getPolicy, getAllowlist });
    case 'gemini.google.com':
      return attachGeminiAdapter({ getPolicy, getAllowlist });
    case 'chat.mistral.ai':
      return attachMistralAdapter({ getPolicy, getAllowlist });
    case 'chat.deepseek.com':
      return attachDeepSeekAdapter({ getPolicy, getAllowlist });
    case 'perplexity.ai':
      return attachPerplexityAdapter({ getPolicy, getAllowlist });
    case 'grok.com':
      return attachGrokAdapter({ getPolicy, getAllowlist });
    case 'copilot.microsoft.com':
      return attachCopilotAdapter({ getPolicy, getAllowlist });
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

  void Promise.all([loadPolicy(), getEffectiveAllowlist()])
    .then(([loaded, loadedAllowlist]) => {
      policy = loaded;
      allowlist = loadedAllowlist;
      void showFirstRunNoticeIfNeeded();
      attachSiteAdapter(
        llmHost,
        () => policy ?? loaded,
        () => allowlist,
      );
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
