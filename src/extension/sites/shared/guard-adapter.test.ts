/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPolicy } from '../../../core/defaults.js';
import { MAX_DETECTION_TOTAL_LENGTH } from '../../../core/detection/limits.js';
import type { FailMode, Policy } from '../../../core/types.js';

vi.mock('../../content/ui-host.js', () => ({
  showBlockAlert: vi.fn(),
  showPolicyBlockAlert: vi.fn(),
  showAdapterBrokenBanner: vi.fn(),
  hideAdapterBrokenBanner: vi.fn(),
}));
vi.mock('../../content/reporting.js', () => ({
  reportDlpAction: vi.fn(async () => {}),
  reportTruncation: vi.fn(async () => {}),
}));
vi.mock('./adapter-health-monitor.js', () => ({
  startAdapterHealthMonitor: () => () => {},
}));

import { showBlockAlert, showPolicyBlockAlert } from '../../content/ui-host.js';
import type { SiteDom } from './dom-factory.js';
import { attachGuardAdapter } from './guard-adapter.js';

let composerText = '';
let input: HTMLTextAreaElement;
let detach: () => void;

function fakeDom(overrides: Partial<SiteDom> = {}): SiteDom {
  return {
    findComposerInput: () => input,
    findSendButton: () => null,
    isNodeInsideComposer: (node) => node === input,
    isSendButtonTarget: () => false,
    extractTextFromInput: () => composerText,
    setInputText: (_el, text) => {
      composerText = text;
    },
    ...overrides,
  };
}

function attach(failMode: FailMode, dom: SiteDom = fakeDom()): void {
  const policy: Policy = { ...createDefaultPolicy(), fail_mode: failMode };
  detach = attachGuardAdapter({ getPolicy: () => policy, host: 'claude.ai', dom, label: 'Test' });
}

/** Simule Entrée dans le composer ; renvoie `true` si l'envoi a été annulé. */
function pressEnter(): boolean {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  input.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.clearAllMocks();
  input = document.createElement('textarea');
  document.body.appendChild(input);
});

afterEach(() => {
  detach?.();
  input.remove();
});

describe('guard-adapter — décision de base', () => {
  it('laisse passer un texte anodin', () => {
    attach('warn');
    composerText = 'bonjour, résume ce paragraphe';
    expect(pressEnter()).toBe(false);
  });

  it('bloque une clé API', () => {
    attach('warn');
    composerText = 'clé AKIAIOSFODNN7EXAMPLE';
    expect(pressEnter()).toBe(true);
    expect(showBlockAlert).toHaveBeenCalledWith('api_key');
  });

  it('caviarde un IBAN dans le composer et annule l’envoi', () => {
    attach('warn');
    composerText = 'IBAN FR76 3000 6000 0112 3456 7890 189';
    expect(pressEnter()).toBe(true);
    expect(composerText).toBe('IBAN [REDACTED_IBAN]');
  });
});

describe('guard-adapter — texte au-delà du plafond de scan (F4)', () => {
  // Le secret est placé APRÈS le plafond : il n'est pas vu par le moteur.
  const beyondCap = `${'a '.repeat(MAX_DETECTION_TOTAL_LENGTH / 2 + 1)}AKIAIOSFODNN7EXAMPLE`;

  it('fail_mode closed : l’envoi est bloqué', () => {
    attach('closed');
    composerText = beyondCap;
    expect(pressEnter()).toBe(true);
    expect(showPolicyBlockAlert).toHaveBeenCalledTimes(1);
  });

  it.each(['warn', 'open'] as const)('fail_mode %s : l’envoi passe, avec un toast', (mode) => {
    attach(mode);
    composerText = beyondCap;
    expect(pressEnter()).toBe(false);
    expect(showPolicyBlockAlert).not.toHaveBeenCalled();
    expect(document.getElementById('shadow-ai-sentinel-toast')?.style.display).toBe('block');
  });
});

describe('guard-adapter — exception pendant l’analyse (F3)', () => {
  const throwingDom = () =>
    fakeDom({
      extractTextFromInput: () => {
        throw new Error('contenu confidentiel dans le message');
      },
    });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('fail_mode closed : l’envoi est bloqué', () => {
    attach('closed', throwingDom());
    expect(pressEnter()).toBe(true);
    expect(showPolicyBlockAlert).toHaveBeenCalledTimes(1);
  });

  it('fail_mode warn : l’envoi passe, avec un avertissement visible', () => {
    attach('warn', throwingDom());
    expect(pressEnter()).toBe(false);
    expect(document.getElementById('shadow-ai-sentinel-toast')?.style.display).toBe('block');
  });

  it('ne journalise jamais le message de l’erreur (contenu potentiel)', () => {
    attach('warn', throwingDom());
    pressEnter();
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls);
    expect(logged).not.toContain('confidentiel');
  });
});
