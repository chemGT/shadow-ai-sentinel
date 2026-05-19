import { describe, expect, it } from 'vitest';
import { loadApiKeysFromEnv, resolveTenantByApiKey } from './auth.js';

describe('auth', () => {
  it('parse API_KEYS', () => {
    const map = loadApiKeysFromEnv('acme:secret,other:key2');
    expect(resolveTenantByApiKey('secret', map)).toBe('acme');
    expect(resolveTenantByApiKey('key2', map)).toBe('other');
  });
});
