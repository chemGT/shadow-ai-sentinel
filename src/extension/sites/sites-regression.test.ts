import { describe, expect, it } from 'vitest';
import {
  CLAUDE_COMPOSER_SELECTORS,
  CLAUDE_INPUT_SELECTORS,
  CLAUDE_SEND_SELECTORS,
} from './claude/selectors.js';
import {
  CHATGPT_COMPOSER_SELECTORS,
  CHATGPT_INPUT_SELECTORS,
  CHATGPT_SEND_SELECTORS,
} from './chatgpt/selectors.js';
import {
  GEMINI_COMPOSER_SELECTORS,
  GEMINI_INPUT_SELECTORS,
  GEMINI_SEND_SELECTORS,
} from './gemini/selectors.js';

function assertSelectors(name: string, input: readonly string[], send: readonly string[]): void {
  expect(input.length, `${name} input`).toBeGreaterThan(0);
  expect(send.length, `${name} send`).toBeGreaterThan(0);
  for (const sel of [...input, ...send]) {
    expect(sel.length).toBeGreaterThan(0);
    expect(sel.trim()).toBe(sel);
  }
}

describe('sélecteurs LLM (régression Phase 7)', () => {
  it('Claude — jeux non vides', () => {
    assertSelectors('Claude', CLAUDE_INPUT_SELECTORS, CLAUDE_SEND_SELECTORS);
    expect(CLAUDE_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('ChatGPT — jeux non vides', () => {
    assertSelectors('ChatGPT', CHATGPT_INPUT_SELECTORS, CHATGPT_SEND_SELECTORS);
    expect(CHATGPT_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('Gemini — jeux non vides', () => {
    assertSelectors('Gemini', GEMINI_INPUT_SELECTORS, GEMINI_SEND_SELECTORS);
    expect(GEMINI_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });
});
