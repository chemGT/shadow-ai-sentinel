import { resolveLlmHost } from '../../core/llm-hosts.js';
import type { ExtensionMessage, LlmHost, Policy } from '../../core/types.js';
import {
  applyEntitlementToPolicy,
  isFileScanAllowed,
  isProEntitlement,
  type Entitlement,
} from '../../core/licensing/index.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { getStoredPolicy, getStoredEntitlement, getAllowlist } from '../platform/storage.js';
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
let entitlement: Entitlement | null = null;
let allowlist: string[] = [];

/** Allowlist effective : réservée au Pro (aucune exclusion en Free). */
function effectiveAllowlist(): readonly string[] {
  return isProEntitlement(entitlement) ? allowlist : [];
}

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
    if (area === 'local' && 'sentinel_entitlement' in changes) {
      entitlement =
        (changes['sentinel_entitlement'].newValue as Entitlement | undefined) ?? null;
      console.info('[Shadow AI Sentinel] Entitlement mis à jour', {
        tier: entitlement?.tier ?? 'free',
      });
    }
    if (area === 'local' && 'sentinel_policy' in changes) {
      const newPolicy = changes['sentinel_policy'].newValue as Policy | undefined;
      if (newPolicy) {
        policy = newPolicy;
        console.info('[Shadow AI Sentinel] Policy mise à jour (storage)', {
          version: newPolicy.version,
        });
      }
    }
    if (area === 'local' && 'sentinel_allowlist' in changes) {
      const next = changes['sentinel_allowlist'].newValue;
      allowlist = Array.isArray(next) ? next.filter((v): v is string => typeof v === 'string') : [];
      console.info('[Shadow AI Sentinel] Allowlist mise à jour', { count: allowlist.length });
    }
  });
}

function attachSiteAdapter(
  site: LlmHost,
  getPolicy: () => Policy,
  isFileScanEnabled: () => boolean,
  getAllowlist: () => readonly string[],
): () => void {
  switch (site) {
    case 'claude.ai':
      return attachClaudeAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'chatgpt.com':
      return attachChatGptAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'gemini.google.com':
      return attachGeminiAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'chat.mistral.ai':
      return attachMistralAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'chat.deepseek.com':
      return attachDeepSeekAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'perplexity.ai':
      return attachPerplexityAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'grok.com':
      return attachGrokAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
    case 'copilot.microsoft.com':
      return attachCopilotAdapter({ getPolicy, isFileScanEnabled, getAllowlist });
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

  void Promise.all([loadPolicy(), getStoredEntitlement(), getAllowlist()])
    .then(([loaded, loadedEntitlement, loadedAllowlist]) => {
      policy = loaded;
      entitlement = loadedEntitlement;
      allowlist = loadedAllowlist;
      void showFirstRunNoticeIfNeeded();
      attachSiteAdapter(
        llmHost,
        () => applyEntitlementToPolicy(policy ?? loaded, entitlement),
        () => isFileScanAllowed(entitlement),
        effectiveAllowlist,
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
