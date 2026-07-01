import type { LlmHost, Policy, RuleType } from '../../../core/types.js';
import {
  applyRedactionsToText,
  evaluateGuard,
} from '../../content/analyze.js';
import { reportDlpAction } from '../../content/telemetry-reporter.js';
import { showBlockAlert } from '../../content/ui-host.js';
import { redactNotice, resolveLocale } from '../../../ui/i18n/messages.js';
import type { SiteDom } from './dom-factory.js';
import { attachFileGuard } from './file-guard.js';

export type GuardAdapterOptions = {
  getPolicy: () => Policy;
  host: LlmHost;
  dom: SiteDom;
  /** Libellé console (ex. « Claude », « ChatGPT »). */
  label: string;
  /** Scan des pièces jointes (Pro). Si absent ou `true`, le scan est actif. */
  isFileScanEnabled?: () => boolean;
  /** Valeurs allowlistées (Pro) à exclure des détections. Si absent, aucune exclusion. */
  getAllowlist?: () => readonly string[];
};

let toastHost: HTMLDivElement | null = null;

function showRedactToast(ruleTypes: RuleType[]): void {
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

  toastHost.textContent = redactNotice(ruleTypes, locale);
  toastHost.style.display = 'block';
  window.setTimeout(() => {
    if (toastHost) {
      toastHost.style.display = 'none';
    }
  }, 4000);
}

function runGuard(
  dom: SiteDom,
  host: LlmHost,
  input: HTMLElement,
  event: Event,
  getPolicy: () => Policy,
  getAllowlist?: () => readonly string[],
): boolean {
  const text = dom.extractTextFromInput(input);
  const decision = evaluateGuard(text, getPolicy(), getAllowlist?.());

  if (decision.kind === 'allow') {
    return true;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (decision.kind === 'block') {
    showBlockAlert(decision.match.ruleType);
    void reportDlpAction(decision.match.ruleType, 'block', host);
    return false;
  }

  const redacted = applyRedactionsToText(text, decision.matches);
  dom.setInputText(input, redacted);
  const ruleTypes = decision.matches.map((m) => m.ruleType);
  showRedactToast(ruleTypes);
  const primaryType = decision.matches[0]?.ruleType;
  if (primaryType) {
    void reportDlpAction(primaryType, 'redact', host);
  }
  return false;
}

export function attachGuardAdapter(options: GuardAdapterOptions): () => void {
  const { dom, host, getPolicy, label, getAllowlist } = options;

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.isComposing) {
      return;
    }

    const input = dom.findComposerInput();
    if (!input) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node) || !dom.isNodeInsideComposer(target, input)) {
      return;
    }

    runGuard(dom, host, input, event, getPolicy, getAllowlist);
  }

  function onClick(event: MouseEvent): void {
    if (!dom.isSendButtonTarget(event.target)) {
      return;
    }

    const input = dom.findComposerInput();
    if (!input) {
      return;
    }

    runGuard(dom, host, input, event, getPolicy, getAllowlist);
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', onClick, true);

  const detachFile = attachFileGuard({
    getPolicy: options.getPolicy,
    host: options.host,
    isFileScanEnabled: options.isFileScanEnabled,
    getAllowlist: options.getAllowlist,
  });

  console.info(`[Shadow AI Sentinel] Adaptateur ${label} actif (texte + fichiers texte)`);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click', onClick, true);
    detachFile();
  };
}
