import type { Policy } from '../../../core/types.js';
import { reportDlpAction } from '../../content/telemetry-reporter.js';
import {
  applyRedactionsToText,
  evaluateGuard,
} from '../../content/analyze.js';
import { showBlockAlert } from '../../content/ui-host.js';
import { redactNotice, resolveLocale } from '../../../ui/i18n/messages.js';
import {
  extractTextFromInput,
  findComposerInput,
  isNodeInsideComposer,
  isSendButtonTarget,
  setInputText,
} from './dom.js';

export type ClaudeAdapterOptions = {
  getPolicy: () => Policy;
};

let toastHost: HTMLDivElement | null = null;

function showRedactToast(): void {
  const locale = resolveLocale();
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.id = 'shadow-ai-sentinel-toast';
    Object.assign(toastHost.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483646',
      maxWidth: '320px',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#111827',
      color: '#f9fafb',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    });
    document.documentElement.appendChild(toastHost);
  }

  toastHost.textContent = redactNotice(locale);
  toastHost.style.display = 'block';
  window.setTimeout(() => {
    if (toastHost) {
      toastHost.style.display = 'none';
    }
  }, 4000);
}

function runGuard(
  input: HTMLElement,
  event: Event,
  getPolicy: () => Policy,
): boolean {
  const text = extractTextFromInput(input);
  const decision = evaluateGuard(text, getPolicy());

  if (decision.kind === 'allow') {
    return true;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (decision.kind === 'block') {
    showBlockAlert(decision.match.ruleType);
    void reportDlpAction(decision.match.ruleType, 'block');
    return false;
  }

  const redacted = applyRedactionsToText(text, decision.matches);
  setInputText(input, redacted);
  showRedactToast();
  const primaryType = decision.matches[0]?.ruleType;
  if (primaryType) {
    void reportDlpAction(primaryType, 'redact');
  }
  return false;
}

function onKeyDown(event: KeyboardEvent, getPolicy: () => Policy): void {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.isComposing) {
    return;
  }

  const input = findComposerInput();
  if (!input) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node) || !isNodeInsideComposer(target, input)) {
    return;
  }

  runGuard(input, event, getPolicy);
}

function onClick(event: MouseEvent, getPolicy: () => Policy): void {
  if (!isSendButtonTarget(event.target)) {
    return;
  }

  const input = findComposerInput();
  if (!input) {
    return;
  }

  runGuard(input, event, getPolicy);
}

export function attachClaudeAdapter(options: ClaudeAdapterOptions): () => void {
  const keyHandler = (event: KeyboardEvent) => onKeyDown(event, options.getPolicy);
  const clickHandler = (event: MouseEvent) => onClick(event, options.getPolicy);

  document.addEventListener('keydown', keyHandler, true);
  document.addEventListener('click', clickHandler, true);

  console.info('[Shadow AI Sentinel] Adaptateur Claude actif');

  return () => {
    document.removeEventListener('keydown', keyHandler, true);
    document.removeEventListener('click', clickHandler, true);
  };
}
