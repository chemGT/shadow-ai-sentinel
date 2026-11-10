import type { LlmHost, Policy, RuleType } from '../../../core/types.js';
import {
  applyRedactionsToText,
  evaluateGuard,
} from '../../content/analyze.js';
import { reportDlpAction, reportTruncation } from '../../content/reporting.js';
import { showBlockAlert, showPolicyBlockAlert } from '../../content/ui-host.js';
import {
  redactNotice,
  resolveLocale,
  scanErrorNotice,
  truncationNotice,
  unscannableBlockCopy,
} from '../../../ui/i18n/messages.js';
import { shouldBlockUnscannable } from '../../../core/fail-mode.js';
import { startAdapterHealthMonitor } from './adapter-health-monitor.js';
import type { SiteDom } from './dom-factory.js';
import { attachFileGuard } from './file-guard.js';

export type GuardAdapterOptions = {
  getPolicy: () => Policy;
  host: LlmHost;
  dom: SiteDom;
  /** Libellé console (ex. « Claude », « ChatGPT »). */
  label: string;
  /** Valeurs allowlistées à exclure des détections. Si absent, aucune exclusion. */
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

function showTruncationToast(): void {
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

  toastHost.textContent = truncationNotice(locale);
  toastHost.style.display = 'block';
  window.setTimeout(() => {
    if (toastHost) {
      toastHost.style.display = 'none';
    }
  }, 6000);
}

function showScanErrorToast(): void {
  showTruncationToast();
  if (toastHost) {
    toastHost.textContent = scanErrorNotice(resolveLocale());
  }
}

/**
 * Garde-fou autour de `runGuard` : une exception pendant l'analyse (extraction du texte,
 * moteur, policy) ne doit pas se traduire par un envoi silencieux. `fail_mode: closed` bloque
 * l'envoi ; sinon l'envoi passe avec un avertissement visible. On ne journalise que le nom de
 * l'erreur, jamais son message (il pourrait reprendre du contenu saisi).
 */
function runGuardSafely(
  dom: SiteDom,
  host: LlmHost,
  input: HTMLElement,
  event: Event,
  getPolicy: () => Policy,
  getAllowlist?: () => readonly string[],
): boolean {
  try {
    return runGuard(dom, host, input, event, getPolicy, getAllowlist);
  } catch (error: unknown) {
    console.error(
      '[Shadow AI Sentinel] Échec de l’analyse avant envoi',
      error instanceof Error ? error.name : 'erreur',
    );
    let failMode: Policy['fail_mode'];
    try {
      failMode = getPolicy().fail_mode;
    } catch {
      failMode = undefined;
    }
    if (shouldBlockUnscannable(failMode)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showPolicyBlockAlert(unscannableBlockCopy('scan-error', resolveLocale()));
      return false;
    }
    showScanErrorToast();
    return true;
  }
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
  const policy = getPolicy();
  const decision = evaluateGuard(text, policy, getAllowlist?.());

  // Texte au-delà du plafond de scan : la fin n'a pas été analysée. `fail_mode: closed` bloque
  // l'envoi (sauf si une donnée sensible a déjà été trouvée : la modale habituelle prime).
  const blockTruncated =
    decision.truncated === true &&
    decision.kind !== 'block' &&
    shouldBlockUnscannable(policy.fail_mode);

  if (decision.truncated) {
    void reportTruncation(host);
    if (!blockTruncated) {
      showTruncationToast();
    }
  }

  if (blockTruncated) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showPolicyBlockAlert(unscannableBlockCopy('truncated', resolveLocale()));
    return false;
  }

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

    runGuardSafely(dom, host, input, event, getPolicy, getAllowlist);
  }

  function onClick(event: MouseEvent): void {
    if (!dom.isSendButtonTarget(event.target)) {
      return;
    }

    const input = dom.findComposerInput();
    if (!input) {
      return;
    }

    runGuardSafely(dom, host, input, event, getPolicy, getAllowlist);
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', onClick, true);

  const detachFile = attachFileGuard({
    getPolicy: options.getPolicy,
    host: options.host,
    getAllowlist: options.getAllowlist,
  });

  const detachHealthMonitor = startAdapterHealthMonitor({
    dom,
    label,
    getFailMode: () => getPolicy().fail_mode ?? 'warn',
  });

  console.info(`[Shadow AI Sentinel] Adaptateur ${label} actif (texte + fichiers texte)`);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click', onClick, true);
    detachFile();
    detachHealthMonitor();
  };
}
