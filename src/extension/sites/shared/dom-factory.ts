import { extractTextFromInput, setInputText } from './input-text.js';

export type SiteSelectorConfig = {
  inputSelectors: readonly string[];
  sendSelectors: readonly string[];
  composerSelectors: readonly string[];
};

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

/** Un sélecteur non supporté par le moteur (ex. `:has()` sur vieux Firefox) lève — on passe au fallback. */
function safeQueryAll(root: ParentNode, selector: string): HTMLElement[] {
  try {
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  } catch {
    return [];
  }
}

function queryFirstVisible(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const node of safeQueryAll(document, selector)) {
      if (isVisible(node)) {
        return node;
      }
    }
  }
  return null;
}

export type SiteDom = {
  findComposerInput: () => HTMLElement | null;
  findSendButton: () => HTMLElement | null;
  isNodeInsideComposer: (node: Node, input: HTMLElement) => boolean;
  isSendButtonTarget: (target: EventTarget | null) => boolean;
  extractTextFromInput: (element: HTMLElement) => string;
  setInputText: (element: HTMLElement, text: string) => void;
};

export function createSiteDom(config: SiteSelectorConfig): SiteDom {
  const { inputSelectors, sendSelectors, composerSelectors } = config;

  function findComposerInput(): HTMLElement | null {
    return queryFirstVisible(inputSelectors);
  }

  function findSendButton(): HTMLElement | null {
    const direct = queryFirstVisible(sendSelectors);
    if (direct) {
      return direct;
    }

    for (const rootSelector of composerSelectors) {
      const root = document.querySelector(rootSelector);
      if (!root) {
        continue;
      }
      for (const sendSelector of sendSelectors) {
        const btn = safeQueryAll(root, sendSelector)[0];
        if (btn && isVisible(btn)) {
          return btn;
        }
      }
    }

    return null;
  }

  function isNodeInsideComposer(node: Node, input: HTMLElement): boolean {
    if (input.contains(node)) {
      return true;
    }

    for (const rootSelector of composerSelectors) {
      const root = document.querySelector(rootSelector);
      if (root?.contains(node)) {
        return true;
      }
    }

    return false;
  }

  function isSendButtonTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false;
    }

    const sendButton = findSendButton();
    if (!sendButton) {
      return false;
    }

    return sendButton === target || sendButton.contains(target);
  }

  return {
    findComposerInput,
    findSendButton,
    isNodeInsideComposer,
    isSendButtonTarget,
    extractTextFromInput,
    setInputText,
  };
}
