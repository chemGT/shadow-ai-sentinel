import {
  ADAPTER_HEALTH_TIMEOUT_MS,
  nextAdapterHealthState,
  shouldBlockOnBrokenAdapter,
  shouldWarnOnBrokenAdapter,
} from '../../../core/adapter-health.js';
import type { FailMode } from '../../../core/types.js';
import { hideAdapterBrokenBanner, showAdapterBrokenBanner } from '../../content/ui-host.js';
import { setAdapterHealth } from '../../platform/storage.js';
import type { SiteDom } from './dom-factory.js';

export type AdapterHealthMonitorOptions = {
  dom: SiteDom;
  getFailMode: () => FailMode;
  label: string;
};

function isGenericSubmitTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return (
    target.closest(
      'button[type="submit"], input[type="submit"], form button:not([type="button"]):not([type="reset"])',
    ) !== null
  );
}

/**
 * Self-test au chargement d'un site : si `dom.findComposerInput()` ne résout aucun
 * sélecteur dans les `ADAPTER_HEALTH_TIMEOUT_MS`, l'adaptateur est marqué `broken` —
 * une bannière est affichée (sauf `fail_mode: "open"`) et, en `fail_mode: "closed"`,
 * une interception générique (Entrée + clic submit + submit de formulaire) bloque
 * tout envoi tant que l'adaptateur n'est pas réparé (R1, remplace le fail-open muet).
 */
export function startAdapterHealthMonitor(options: AdapterHealthMonitorOptions): () => void {
  const { dom, getFailMode, label } = options;
  const startedAt = Date.now();
  let settled = false;
  let observer: MutationObserver | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let detachClosedGuard: (() => void) | null = null;

  function onGenericKeyDown(event: KeyboardEvent): void {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onGenericClick(event: MouseEvent): void {
    if (!isGenericSubmitTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onGenericSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  function installClosedGuard(): void {
    document.addEventListener('keydown', onGenericKeyDown, true);
    document.addEventListener('click', onGenericClick, true);
    document.addEventListener('submit', onGenericSubmit, true);
    detachClosedGuard = () => {
      document.removeEventListener('keydown', onGenericKeyDown, true);
      document.removeEventListener('click', onGenericClick, true);
      document.removeEventListener('submit', onGenericSubmit, true);
      detachClosedGuard = null;
    };
  }

  function settle(broken: boolean): void {
    if (settled) {
      return;
    }
    settled = true;
    observer?.disconnect();
    observer = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    void setAdapterHealth(broken ? 'broken' : 'healthy');

    if (!broken) {
      return;
    }

    console.warn(`[Shadow AI Sentinel] Adaptateur ${label} indisponible — sélecteurs obsolètes`);

    const failMode = getFailMode();
    if (shouldWarnOnBrokenAdapter(failMode)) {
      showAdapterBrokenBanner();
    }
    if (shouldBlockOnBrokenAdapter(failMode)) {
      installClosedGuard();
    }
  }

  function check(): void {
    const state = nextAdapterHealthState(
      dom.findComposerInput() !== null,
      Date.now() - startedAt,
    );
    if (state === 'healthy') {
      settle(false);
    } else if (state === 'broken') {
      settle(true);
    }
  }

  check();
  if (!settled) {
    observer = new MutationObserver(() => check());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    timeoutId = setTimeout(() => check(), ADAPTER_HEALTH_TIMEOUT_MS);
  }

  return () => {
    observer?.disconnect();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    detachClosedGuard?.();
    hideAdapterBrokenBanner();
  };
}
