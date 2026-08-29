import { describe, expect, it } from 'vitest';
import { loadApiKeysFromEnv, resolveTenantByApiKey } from './auth.js';

describe('auth', () => {
  it('parse API_KEYS', () => {
    const map = loadApiKeysFromEnv('acme:secret,other:key2');
    expect(resolveTenantByApiKey('secret', map)).toBe('acme');
    expect(resolveTenantByApiKey('key2', map)).toBe('other');
  });

  it('rejette une clé inconnue', () => {
    const map = loadApiKeysFromEnv('acme:secret');
    expect(resolveTenantByApiKey('wrong', map)).toBeNull();
  });

  it('rejette une clé de longueur différente (comparaison constant-time)', () => {
    const map = loadApiKeysFromEnv('acme:secret');
    expect(resolveTenantByApiKey('sec', map)).toBeNull();
    expect(resolveTenantByApiKey('secret-but-much-longer', map)).toBeNull();
  });

  it('ne matche pas un préfixe valide non terminé', () => {
    const map = loadApiKeysFromEnv('acme:secret');
    expect(resolveTenantByApiKey('secre', map)).toBeNull();
  });
});
