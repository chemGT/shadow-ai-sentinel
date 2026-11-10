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

export type AdapterHealthMonitor = {
  stop: () => void;
  /**
   * À appeler quand l'utilisateur valide (Entrée) dans une zone de saisie que l'adaptateur ne
   * reconnaît pas : les sélecteurs sont cassés EN COURS de session (le self-test de chargement
   * ne le voit pas). Passe à `broken` (bannière / garde `closed`). Renvoie `true` si l'envoi
   * en cours doit être bloqué (`fail_mode: closed`).
   */
  reportComposerMissing: () => boolean;
  /** Le composer est de nouveau résolu : lève l'état `broken` (bannière, garde `closed`). */
  reportComposerFound: () => void;
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
 *
 * Le chronomètre ne démarre qu'une fois la page chargée (`load`) : le content script tourne dès
 * `document_start`, bien avant que la SPA n'ait rendu son composer. L'état n'est pas figé après
 * le self-test : `reportComposerMissing` / `reportComposerFound` le font évoluer en session.
 */
export function startAdapterHealthMonitor(options: AdapterHealthMonitorOptions): AdapterHealthMonitor {
  const { dom, getFailMode, label } = options;
  let startedAt = Date.now();
  let settled = false;
  let broken = false;
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

  function markBroken(): void {
    if (broken) {
      return;
    }
    broken = true;
    void setAdapterHealth('broken');
    console.warn(`[Shadow AI Sentinel] Adaptateur ${label} indisponible — sélecteurs obsolètes`);

    const failMode = getFailMode();
    if (shouldWarnOnBrokenAdapter(failMode)) {
      showAdapterBrokenBanner();
    }
    if (shouldBlockOnBrokenAdapter(failMode) && detachClosedGuard === null) {
      installClosedGuard();
    }
  }

  function markHealthy(): void {
    if (!broken) {
      return;
    }
    broken = false;
    void setAdapterHealth('healthy');
    detachClosedGuard?.();
    hideAdapterBrokenBanner();
  }

  function settle(isBroken: boolean): void {
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

    if (isBroken) {
      markBroken();
    } else {
      void setAdapterHealth('healthy');
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

  function begin(): void {
    startedAt = Date.now();
    check();
    if (!settled) {
      observer = new MutationObserver(() => check());
      observer.observe(document.documentElement, { childList: true, subtree: true });
      timeoutId = setTimeout(() => check(), ADAPTER_HEALTH_TIMEOUT_MS);
    }
  }

  const onLoad = (): void => begin();
  if (document.readyState === 'complete') {
    begin();
  } else {
    window.addEventListener('load', onLoad, { once: true });
  }

  return {
    stop: () => {
      window.removeEventListener('load', onLoad);
      observer?.disconnect();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      detachClosedGuard?.();
      hideAdapterBrokenBanner();
    },
    reportComposerMissing: () => {
      settle(true);
      markBroken();
      return shouldBlockOnBrokenAdapter(getFailMode());
    },
    reportComposerFound: () => {
      if (settled) {
        markHealthy();
      }
    },
  };
}
