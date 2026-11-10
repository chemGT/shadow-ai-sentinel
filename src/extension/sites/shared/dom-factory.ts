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
    if (sendButton && (sendButton === target || sendButton.contains(target))) {
      return true;
    }

    return isGenericSendButton(target);
  }

  /**
   * Repli quand les sélecteurs du site ne résolvent plus le bouton d'envoi (refonte d'UI) : un
   * bouton situé dans la zone du composer et qui se présente comme un bouton d'envoi
   * (`type="submit"`, ou libellé/`data-testid` contenant send/envoyer/submit) est traité comme
   * tel. Sans ce repli, un sélecteur périmé laissait le clic partir sans analyse alors que le
   * self-test (qui ne regarde que la zone de saisie) restait au vert.
   */
  function isGenericSendButton(target: Node): boolean {
    const element = target instanceof Element ? target : target.parentElement;
    const button = element?.closest<HTMLElement>('button, [role="button"], input[type="submit"]');
    if (!button) {
      return false;
    }
    const input = findComposerInput();
    if (!input || !isNodeInsideComposer(button, input)) {
      return false;
    }
    if (button.getAttribute('type') === 'submit') {
      return true;
    }
    const hint = `${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('data-testid') ?? ''} ${button.getAttribute('title') ?? ''}`;
    return /send|envoy|submit/i.test(hint);
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
