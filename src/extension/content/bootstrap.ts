import { createDefaultPolicy } from '../../core/defaults.js';
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
import { showAdapterBrokenBanner } from './ui-host.js';

type AdapterOptions = {
  getPolicy: () => Policy;
  getAllowlist: () => readonly string[];
};

const ADAPTERS: Record<LlmHost, (options: AdapterOptions) => () => void> = {
  'claude.ai': attachClaudeAdapter,
  'chatgpt.com': attachChatGptAdapter,
  'gemini.google.com': attachGeminiAdapter,
  'chat.mistral.ai': attachMistralAdapter,
  'chat.deepseek.com': attachDeepSeekAdapter,
  'perplexity.ai': attachPerplexityAdapter,
  'grok.com': attachGrokAdapter,
  'copilot.microsoft.com': attachCopilotAdapter,
};

/** Journalise sans jamais inclure de contenu utilisateur : nom de l'erreur uniquement. */
function logFailure(step: string, error: unknown): void {
  console.error(`[Shadow AI Sentinel] ${step}`, error instanceof Error ? error.name : 'erreur');
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
  return getEffectivePolicy();
}

/**
 * Démarre la protection sur la page courante.
 *
 * Ordre voulu : l'adaptateur est attaché **immédiatement** (le manifeste injecte le script à
 * `document_start`), avec la policy par défaut, puis la
 * policy et l'allowlist réelles sont chargées et prennent le relais. Avant, l'adaptateur n'était
 * attaché qu'une fois la policy chargée : un échec de chargement (storage ou service worker
 * indisponibles, exception) laissait la page sans aucune protection, avec un simple log console.
 * Désormais un échec de chargement laisse la détection active avec les règles par défaut, et un
 * échec d'attache affiche la bannière « protection inactive ».
 *
 * Renvoie `false` si l'hôte n'est pas un site géré.
 */
export function startContentScript(hostname: string): boolean {
  const llmHost = resolveLlmHost(hostname);
  if (!llmHost) {
    return false;
  }

  const fallback = createDefaultPolicy();
  let policy: Policy | null = null;
  let allowlist: string[] = [];

  try {
    ADAPTERS[llmHost]({
      getPolicy: () => policy ?? fallback,
      getAllowlist: () => allowlist,
    });
  } catch (error: unknown) {
    logFailure('Échec de l’attache de l’adaptateur — protection inactive', error);
    try {
      showAdapterBrokenBanner();
    } catch {
      // Rien de plus à faire : la page n'est pas protégée et l'erreur est journalisée.
    }
  }

  const refreshPolicy = (source: string): void => {
    void getEffectivePolicy()
      .then((next) => {
        policy = next;
        console.info(`[Shadow AI Sentinel] Policy mise à jour (${source})`, {
          version: next.version,
        });
      })
      .catch((error: unknown) => logFailure('Relecture de la policy impossible', error));
  };
  const refreshAllowlist = (): void => {
    void getEffectiveAllowlist()
      .then((next) => {
        allowlist = next;
        console.info('[Shadow AI Sentinel] Allowlist mise à jour', { count: next.length });
      })
      .catch((error: unknown) => logFailure('Relecture de l’allowlist impossible', error));
  };

  try {
    const api = getExtensionApi();
    api.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'POLICY_UPDATED' && message.payload) {
        policy = message.payload as Policy;
      }
    });
    // Fallback : écoute les mises à jour directement depuis le storage (couvre le cas où le SW
    // est terminé et ne peut pas broadcaster). La valeur brute locale n'est jamais appliquée
    // telle quelle : la policy gérée (area `managed`) reste prioritaire.
    api.storage.onChanged.addListener((changes, area) => {
      const managedChanged = area === 'managed';
      if (managedChanged || (area === 'local' && 'sentinel_policy' in changes)) {
        refreshPolicy('storage');
      }
      if (managedChanged || (area === 'local' && 'sentinel_allowlist' in changes)) {
        refreshAllowlist();
      }
    });
  } catch (error: unknown) {
    logFailure('Écoute des mises à jour de policy impossible', error);
  }

  void loadPolicy()
    .then((loaded) => {
      policy = loaded;
      console.info('[Shadow AI Sentinel] Content script prêt', {
        host: llmHost,
        policyVersion: loaded.version,
      });
    })
    .catch((error: unknown) =>
      logFailure('Chargement de la policy impossible — règles par défaut appliquées', error),
    );
  refreshAllowlist();
  // Le script tourne dès `document_start` (garde active avant le premier rendu) : la notice,
  // elle, attend que le document soit construit pour ne pas être balayée par l'hydratation.
  const showNotice = (): void => {
    void showFirstRunNoticeIfNeeded().catch((error: unknown) =>
      logFailure('Notice de premier lancement indisponible', error),
    );
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNotice, { once: true });
  } else {
    showNotice();
  }

  return true;
}
