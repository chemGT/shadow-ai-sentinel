import { describe, it, expect } from 'vitest';
import {
  ADAPTER_HEALTH_TIMEOUT_MS,
  nextAdapterHealthState,
  shouldBlockOnBrokenAdapter,
  shouldWarnOnBrokenAdapter,
} from './adapter-health.js';

describe('nextAdapterHealthState', () => {
  it('healthy dès que le composer est trouvé, quel que soit le temps écoulé', () => {
    expect(nextAdapterHealthState(true, 0)).toBe('healthy');
    expect(nextAdapterHealthState(true, ADAPTER_HEALTH_TIMEOUT_MS + 1000)).toBe('healthy');
  });

  it('checking (fail-open) tant que le timeout n’est pas atteint', () => {
    expect(nextAdapterHealthState(false, 0)).toBe('checking');
    expect(nextAdapterHealthState(false, ADAPTER_HEALTH_TIMEOUT_MS - 1)).toBe('checking');
  });

  it('broken une fois le timeout atteint sans composer trouvé', () => {
    expect(nextAdapterHealthState(false, ADAPTER_HEALTH_TIMEOUT_MS)).toBe('broken');
    expect(nextAdapterHealthState(false, ADAPTER_HEALTH_TIMEOUT_MS + 5000)).toBe('broken');
  });

  it('respecte un timeout personnalisé', () => {
    expect(nextAdapterHealthState(false, 500, 1000)).toBe('checking');
    expect(nextAdapterHealthState(false, 1000, 1000)).toBe('broken');
  });
});

describe('shouldBlockOnBrokenAdapter', () => {
  it('uniquement en fail_mode closed', () => {
    expect(shouldBlockOnBrokenAdapter('closed')).toBe(true);
    expect(shouldBlockOnBrokenAdapter('warn')).toBe(false);
    expect(shouldBlockOnBrokenAdapter('open')).toBe(false);
  });
});

describe('shouldWarnOnBrokenAdapter', () => {
  it('tout sauf fail_mode open', () => {
    expect(shouldWarnOnBrokenAdapter('warn')).toBe(true);
    expect(shouldWarnOnBrokenAdapter('closed')).toBe(true);
    expect(shouldWarnOnBrokenAdapter('open')).toBe(false);
  });
});
