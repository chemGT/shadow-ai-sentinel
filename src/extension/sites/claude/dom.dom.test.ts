/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { extractTextFromInput, setInputText } from './dom.js';

describe('claude dom helpers', () => {
  it('extractTextFromInput lit un textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'message test';
    expect(extractTextFromInput(textarea)).toBe('message test');
  });

  it('extractTextFromInput lit un contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.innerText = 'editable text';
    expect(extractTextFromInput(div)).toBe('editable text');
  });

  it('setInputText met à jour un textarea', () => {
    const textarea = document.createElement('textarea');
    setInputText(textarea, '[REDACTED_IBAN]');
    expect(textarea.value).toBe('[REDACTED_IBAN]');
  });
});
