/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { extractTextFromInput, setInputText } from './dom.js';

describe('deepseek dom helpers', () => {
  it('extractTextFromInput lit un textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'hello deepseek';
    expect(extractTextFromInput(textarea)).toBe('hello deepseek');
  });

  it('setInputText met à jour un textarea', () => {
    const textarea = document.createElement('textarea');
    setInputText(textarea, '[REDACTED_PHONE]');
    expect(textarea.value).toBe('[REDACTED_PHONE]');
  });
});
