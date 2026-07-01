export function extractTextFromInput(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  return element.innerText ?? element.textContent ?? '';
}

export function setInputText(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (!element.isContentEditable) {
    return;
  }

  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const inserted = document.execCommand('insertText', false, text);
  if (!inserted) {
    element.textContent = text;
  }

  element.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
  );
}
