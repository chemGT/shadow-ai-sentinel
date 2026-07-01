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
  ] as const)('résout %s → %s', (hostname, expected) => {
    expect(resolveLlmHost(hostname)).toBe(expected);
  });

  it('retourne null pour un domaine non supporté', () => {
    expect(resolveLlmHost('example.com')).toBeNull();
    expect(resolveLlmHost('chat.openai.com')).toBeNull();
  });

  it('expose les 3 hôtes et patterns MV3', () => {
    expect(SUPPORTED_LLM_HOSTS).toHaveLength(3);
    expect(LLM_TAB_URL_PATTERNS).toEqual([
      '*://claude.ai/*',
      '*://chatgpt.com/*',
      '*://gemini.google.com/*',
    ]);
  });
});
