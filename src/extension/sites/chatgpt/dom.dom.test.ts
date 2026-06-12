/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { extractTextFromInput, setInputText } from './dom.js';

describe('chatgpt dom helpers', () => {
  it('extractTextFromInput lit un contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.id = 'prompt-textarea';
    div.innerText = 'hello chatgpt';
    expect(extractTextFromInput(div)).toBe('hello chatgpt');
  });

  it('setInputText met à jour un textarea', () => {
    const textarea = document.createElement('textarea');
    setInputText(textarea, '[REDACTED_API_KEY]');
    expect(textarea.value).toBe('[REDACTED_API_KEY]');
  });
});
