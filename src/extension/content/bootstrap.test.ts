/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPolicy } from '../../core/defaults.js';
import type { Policy } from '../../core/types.js';

const attachClaude = vi.fn<(o: { getPolicy: () => Policy; getAllowlist: () => readonly string[] }) => () => void>();
const showBanner = vi.fn();
const getEffectivePolicy = vi.fn<() => Promise<Policy>>();
const getEffectiveAllowlist = vi.fn<() => Promise<string[]>>();
const sendMessage = vi.fn<() => Promise<unknown>>();

vi.mock('../sites/claude/adapter.js', () => ({ attachClaudeAdapter: (o: never) => attachClaude(o) }));
vi.mock('./ui-host.js', () => ({ showAdapterBrokenBanner: () => showBanner() }));
vi.mock('./first-run-notice.js', () => ({ showFirstRunNoticeIfNeeded: async () => {} }));
vi.mock('../platform/storage.js', () => ({
  getEffectivePolicy: () => getEffectivePolicy(),
  getEffectiveAllowlist: () => getEffectiveAllowlist(),
}));
vi.mock('../platform/runtime.js', () => ({ sendMessage: () => sendMessage() }));
vi.mock('../platform/browser-api.js', () => ({
  getExtensionApi: () => {
    throw new Error('API indisponible');
  },
}));

import { startContentScript } from './bootstrap.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  attachClaude.mockReturnValue(() => {});
});

describe('startContentScript — échecs d’initialisation (F3)', () => {
  it('ignore un hôte non géré', () => {
    expect(startContentScript('example.org')).toBe(false);
    expect(attachClaude).not.toHaveBeenCalled();
  });

  it('attache l’adaptateur avant tout chargement, avec la policy par défaut', () => {
    sendMessage.mockReturnValue(new Promise(() => {})); // ne répond jamais
    getEffectiveAllowlist.mockReturnValue(new Promise(() => {}));
    startContentScript('claude.ai');
    expect(attachClaude).toHaveBeenCalledTimes(1);
    const { getPolicy } = attachClaude.mock.calls[0][0];
    expect(getPolicy().rules).toEqual(createDefaultPolicy().rules);
  });

  it('storage et service worker en échec : la détection reste active (règles par défaut)', async () => {
    sendMessage.mockRejectedValue(new Error('no SW'));
    getEffectivePolicy.mockRejectedValue(new Error('storage down'));
    getEffectiveAllowlist.mockRejectedValue(new Error('storage down'));
    startContentScript('claude.ai');
    await flush();
    expect(attachClaude).toHaveBeenCalledTimes(1);
    const { getPolicy, getAllowlist } = attachClaude.mock.calls[0][0];
    expect(getPolicy().rules.find((r) => r.type === 'api_key')?.enabled).toBe(true);
    expect(getAllowlist()).toEqual([]);
  });

  it('la policy chargée remplace la policy par défaut', async () => {
    const loaded: Policy = { ...createDefaultPolicy(), version: '9.9.9', fail_mode: 'closed' };
    sendMessage.mockResolvedValue({ policy: loaded });
    getEffectiveAllowlist.mockResolvedValue(['ok-value']);
    startContentScript('claude.ai');
    await flush();
    const { getPolicy, getAllowlist } = attachClaude.mock.calls[0][0];
    expect(getPolicy().version).toBe('9.9.9');
    expect(getAllowlist()).toEqual(['ok-value']);
  });

  it('échec d’attache : bannière « protection inactive » au lieu d’un échec muet', () => {
    sendMessage.mockReturnValue(new Promise(() => {}));
    getEffectiveAllowlist.mockReturnValue(new Promise(() => {}));
    attachClaude.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => startContentScript('claude.ai')).not.toThrow();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });
});
