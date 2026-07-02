/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { extractTextFromInput, setInputText } from './dom.js';

describe('mistral dom helpers', () => {
  it('extractTextFromInput lit un contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.className = 'ProseMirror';
    div.innerText = 'hello le chat';
    expect(extractTextFromInput(div)).toBe('hello le chat');
  });

  it('setInputText met à jour un textarea', () => {
    const textarea = document.createElement('textarea');
    setInputText(textarea, '[REDACTED_PHONE]');
    expect(textarea.value).toBe('[REDACTED_PHONE]');
  });
});
