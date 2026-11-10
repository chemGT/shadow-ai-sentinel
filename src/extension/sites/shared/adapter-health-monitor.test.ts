/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FailMode } from '../../../core/types.js';

const showBanner = vi.fn();
const hideBanner = vi.fn();
const setHealth = vi.fn(async (_state: string) => {});
vi.mock('../../content/ui-host.js', () => ({
  showAdapterBrokenBanner: () => showBanner(),
  hideAdapterBrokenBanner: () => hideBanner(),
}));
vi.mock('../../platform/storage.js', () => ({ setAdapterHealth: (s: string) => setHealth(s) }));

import { ADAPTER_HEALTH_TIMEOUT_MS } from '../../../core/adapter-health.js';
import { startAdapterHealthMonitor, type AdapterHealthMonitor } from './adapter-health-monitor.js';
import type { SiteDom } from './dom-factory.js';

let composer: HTMLElement | null = null;
let monitor: AdapterHealthMonitor;

function start(failMode: FailMode): void {
  const dom = { findComposerInput: () => composer } as unknown as SiteDom;
  monitor = startAdapterHealthMonitor({ dom, label: 'Test', getFailMode: () => failMode });
}

function enterIsBlocked(): boolean {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  document.body.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  composer = null;
});

afterEach(() => {
  monitor?.stop();
  vi.useRealTimers();
});

describe('adapter-health-monitor', () => {
  it('composer présent : sain, pas de bannière', () => {
    composer = document.createElement('div');
    start('warn');
    expect(setHealth).toHaveBeenCalledWith('healthy');
    expect(showBanner).not.toHaveBeenCalled();
  });

  it('composer introuvable après le délai : cassé + bannière (warn), envoi non bloqué', () => {
    start('warn');
    vi.advanceTimersByTime(ADAPTER_HEALTH_TIMEOUT_MS + 1);
    expect(setHealth).toHaveBeenCalledWith('broken');
    expect(showBanner).toHaveBeenCalledTimes(1);
    expect(enterIsBlocked()).toBe(false);
  });

  it('fail_mode closed : cassé ⇒ Entrée bloquée', () => {
    start('closed');
    vi.advanceTimersByTime(ADAPTER_HEALTH_TIMEOUT_MS + 1);
    expect(enterIsBlocked()).toBe(true);
  });

  it('fail_mode open : cassé sans bannière ni blocage', () => {
    start('open');
    vi.advanceTimersByTime(ADAPTER_HEALTH_TIMEOUT_MS + 1);
    expect(showBanner).not.toHaveBeenCalled();
    expect(enterIsBlocked()).toBe(false);
  });

  it('casse en cours de session : sain au chargement, puis reportComposerMissing ⇒ cassé (F8)', () => {
    composer = document.createElement('div');
    start('closed');
    expect(showBanner).not.toHaveBeenCalled();

    composer = null;
    expect(monitor.reportComposerMissing()).toBe(true);
    expect(setHealth).toHaveBeenLastCalledWith('broken');
    expect(showBanner).toHaveBeenCalledTimes(1);
    expect(enterIsBlocked()).toBe(true);
  });

  it('retour à la normale : reportComposerFound lève la bannière et le blocage', () => {
    start('closed');
    vi.advanceTimersByTime(ADAPTER_HEALTH_TIMEOUT_MS + 1);
    expect(enterIsBlocked()).toBe(true);

    monitor.reportComposerFound();
    expect(setHealth).toHaveBeenLastCalledWith('healthy');
    expect(hideBanner).toHaveBeenCalled();
    expect(enterIsBlocked()).toBe(false);
  });

  it('reportComposerMissing en warn : bannière, mais ne demande pas le blocage', () => {
    composer = document.createElement('div');
    start('warn');
    expect(monitor.reportComposerMissing()).toBe(false);
    expect(showBanner).toHaveBeenCalledTimes(1);
  });
});
