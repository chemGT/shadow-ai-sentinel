import {
  CLAUDE_COMPOSER_SELECTORS,
  CLAUDE_INPUT_SELECTORS,
  CLAUDE_SEND_SELECTORS,
} from './selectors.js';

function isVisible(node: HTMLElement): boolean {
  if (node === document.activeElement) {
    return true;
  }
  const style = getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function queryFirstVisible(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (const node of nodes) {
      if (isVisible(node)) {
        return node;
      }
    }
  }
  return null;
}

export function findComposerInput(): HTMLElement | null {
  return queryFirstVisible(CLAUDE_INPUT_SELECTORS);
}

export function findSendButton(): HTMLElement | null {
  const direct = queryFirstVisible(CLAUDE_SEND_SELECTORS);
  if (direct) {
    return direct;
  }

  for (const rootSelector of CLAUDE_COMPOSER_SELECTORS) {
    const root = document.querySelector(rootSelector);
    if (!root) {
      continue;
    }
    for (const sendSelector of CLAUDE_SEND_SELECTORS) {
      const btn = root.querySelector<HTMLElement>(sendSelector);
      if (btn) {
        return btn;
      }
    }
  }

  return null;
}

export function isNodeInsideComposer(node: Node, input: HTMLElement): boolean {
  if (input.contains(node)) {
    return true;
  }

  for (const rootSelector of CLAUDE_COMPOSER_SELECTORS) {
    const root = document.querySelector(rootSelector);
    if (root?.contains(node)) {
      return true;
    }
  }

  return false;
}

export function isSendButtonTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  const sendButton = findSendButton();
  if (!sendButton) {
    return false;
  }

  return sendButton === target || sendButton.contains(target);
}

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
