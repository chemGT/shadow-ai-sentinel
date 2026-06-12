import type { LlmHost } from './types.js';

export const SUPPORTED_LLM_HOSTS: readonly LlmHost[] = [
  'claude.ai',
  'chatgpt.com',
  'gemini.google.com',
] as const;

/** Patterns MV3 pour content scripts et requêtes tabs. */
export const LLM_TAB_URL_PATTERNS: readonly string[] = SUPPORTED_LLM_HOSTS.map(
  (host) => `*://${host}/*`,
);

/** @deprecated Préférer `resolveLlmHost` — conservé pour logs legacy. */
export const PILOT_LLM_HOST: LlmHost = 'claude.ai';

const HOST_MATCHERS: ReadonlyArray<{ host: LlmHost; matches: (hostname: string) => boolean }> = [
  {
    host: 'claude.ai',
    matches: (h) => h === 'claude.ai' || h.endsWith('.claude.ai'),
  },
  {
    host: 'chatgpt.com',
    matches: (h) => h === 'chatgpt.com' || h.endsWith('.chatgpt.com'),
  },
  {
    host: 'gemini.google.com',
    matches: (h) => h === 'gemini.google.com' || h.endsWith('.gemini.google.com'),
  },
];

export function resolveLlmHost(hostname: string): LlmHost | null {
  for (const { host, matches } of HOST_MATCHERS) {
    if (matches(hostname)) {
      return host;
    }
  }
  return null;
}
