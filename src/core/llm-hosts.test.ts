import { describe, expect, it } from 'vitest';
import {
  LLM_TAB_URL_PATTERNS,
  resolveLlmHost,
  SUPPORTED_LLM_HOSTS,
} from './llm-hosts.js';

describe('resolveLlmHost', () => {
  it.each([
    ['claude.ai', 'claude.ai'],
    ['www.claude.ai', 'claude.ai'],
    ['chatgpt.com', 'chatgpt.com'],
    ['www.chatgpt.com', 'chatgpt.com'],
    ['gemini.google.com', 'gemini.google.com'],
    ['chat.mistral.ai', 'chat.mistral.ai'],
    ['chat.deepseek.com', 'chat.deepseek.com'],
    ['perplexity.ai', 'perplexity.ai'],
    ['www.perplexity.ai', 'perplexity.ai'],
    ['grok.com', 'grok.com'],
    ['copilot.microsoft.com', 'copilot.microsoft.com'],
  ] as const)('résout %s → %s', (hostname, expected) => {
    expect(resolveLlmHost(hostname)).toBe(expected);
  });

  it('retourne null pour un domaine non supporté', () => {
    expect(resolveLlmHost('example.com')).toBeNull();
    expect(resolveLlmHost('chat.openai.com')).toBeNull();
    // Surfaces voisines volontairement hors scope
    expect(resolveLlmHost('x.com')).toBeNull(); // Grok sur X exclu
    expect(resolveLlmHost('www.mistral.ai')).toBeNull(); // marketing, pas le chat
    expect(resolveLlmHost('www.deepseek.com')).toBeNull();
    expect(resolveLlmHost('m365.cloud.microsoft')).toBeNull(); // Copilot M365 exclu
  });

  it('expose les 8 hôtes et patterns MV3 (apex + sous-domaines)', () => {
    expect(SUPPORTED_LLM_HOSTS).toHaveLength(8);
    expect(LLM_TAB_URL_PATTERNS).toHaveLength(16);
    for (const host of SUPPORTED_LLM_HOSTS) {
      expect(LLM_TAB_URL_PATTERNS).toContain(`*://${host}/*`);
      expect(LLM_TAB_URL_PATTERNS).toContain(`*://*.${host}/*`);
    }
  });
});
