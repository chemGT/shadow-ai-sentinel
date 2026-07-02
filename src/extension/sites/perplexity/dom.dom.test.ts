/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { extractTextFromInput, setInputText } from './dom.js';

describe('perplexity dom helpers', () => {
  it('extractTextFromInput lit un contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.id = 'ask-input';
    div.innerText = 'hello perplexity';
    expect(extractTextFromInput(div)).toBe('hello perplexity');
  });

  it('setInputText met à jour un textarea', () => {
    const textarea = document.createElement('textarea');
    setInputText(textarea, '[REDACTED_PHONE]');
    expect(textarea.value).toBe('[REDACTED_PHONE]');
  });
});
