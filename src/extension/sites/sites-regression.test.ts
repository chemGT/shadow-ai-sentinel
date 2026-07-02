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
import {
  MISTRAL_COMPOSER_SELECTORS,
  MISTRAL_INPUT_SELECTORS,
  MISTRAL_SEND_SELECTORS,
} from './mistral/selectors.js';
import {
  DEEPSEEK_COMPOSER_SELECTORS,
  DEEPSEEK_INPUT_SELECTORS,
  DEEPSEEK_SEND_SELECTORS,
} from './deepseek/selectors.js';
import {
  PERPLEXITY_COMPOSER_SELECTORS,
  PERPLEXITY_INPUT_SELECTORS,
  PERPLEXITY_SEND_SELECTORS,
} from './perplexity/selectors.js';
import {
  GROK_COMPOSER_SELECTORS,
  GROK_INPUT_SELECTORS,
  GROK_SEND_SELECTORS,
} from './grok/selectors.js';
import {
  COPILOT_COMPOSER_SELECTORS,
  COPILOT_INPUT_SELECTORS,
  COPILOT_SEND_SELECTORS,
} from './copilot/selectors.js';

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

  it('Mistral Le Chat — jeux non vides', () => {
    assertSelectors('Mistral', MISTRAL_INPUT_SELECTORS, MISTRAL_SEND_SELECTORS);
    expect(MISTRAL_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('DeepSeek — jeux non vides', () => {
    assertSelectors('DeepSeek', DEEPSEEK_INPUT_SELECTORS, DEEPSEEK_SEND_SELECTORS);
    expect(DEEPSEEK_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('Perplexity — jeux non vides', () => {
    assertSelectors('Perplexity', PERPLEXITY_INPUT_SELECTORS, PERPLEXITY_SEND_SELECTORS);
    expect(PERPLEXITY_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('Grok — jeux non vides', () => {
    assertSelectors('Grok', GROK_INPUT_SELECTORS, GROK_SEND_SELECTORS);
    expect(GROK_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });

  it('Copilot — jeux non vides', () => {
    assertSelectors('Copilot', COPILOT_INPUT_SELECTORS, COPILOT_SEND_SELECTORS);
    expect(COPILOT_COMPOSER_SELECTORS.length).toBeGreaterThan(0);
  });
});
