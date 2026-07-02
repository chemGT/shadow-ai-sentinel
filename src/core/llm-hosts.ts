import type { LlmHost } from './types.js';

export const SUPPORTED_LLM_HOSTS: readonly LlmHost[] = [
  'claude.ai',
  'chatgpt.com',
  'gemini.google.com',
  'chat.mistral.ai',
  'chat.deepseek.com',
  'perplexity.ai',
  'grok.com',
  'copilot.microsoft.com',
] as const;

/**
 * Patterns MV3 pour content scripts et requêtes tabs.
 * Deux formes par hôte : apex + sous-domaines (`www.perplexity.ai`…),
 * sinon `tabs.query` rate les onglets sur sous-domaine lors du broadcast policy-sync.
 */
export const LLM_TAB_URL_PATTERNS: readonly string[] = SUPPORTED_LLM_HOSTS.flatMap(
  (host) => [`*://${host}/*`, `*://*.${host}/*`],
);

/** @deprecated Préférer `resolveLlmHost` — conservé pour logs legacy. */
export const PILOT_LLM_HOST: LlmHost = 'claude.ai';

const HOST_MATCHERS: ReadonlyArray<{ host: LlmHost; matches: (hostname: string) => boolean }> =
  SUPPORTED_LLM_HOSTS.map((host) => ({
    host,
    matches: (h: string) => h === host || h.endsWith(`.${host}`),
  }));

export function resolveLlmHost(hostname: string): LlmHost | null {
  for (const { host, matches } of HOST_MATCHERS) {
    if (matches(hostname)) {
      return host;
    }
  }
  return null;
}
