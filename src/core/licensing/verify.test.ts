import { describe, it, expect, vi } from 'vitest';
import {
  evaluateLemonResponse,
  activateLemonLicense,
  validateLemonLicense,
} from './verify.js';

describe('evaluateLemonResponse', () => {
  it('valide une licence active (validate) et remonte l’instanceId', () => {
    expect(
      evaluateLemonResponse({
        valid: true,
        license_key: { status: 'active', activation_usage: 1 },
        instance: { id: 'inst-1' },
      }),
    ).toEqual({ valid: true, reason: 'ok', uses: 1, instanceId: 'inst-1' });
  });

  it('valide une activation (activated=true)', () => {
    const res = evaluateLemonResponse({
      activated: true,
      license_key: { status: 'active', activation_usage: 1 },
      instance: { id: 'inst-2' },
    });
    expect(res.valid).toBe(true);
    expect(res.instanceId).toBe('inst-2');
  });

  it('rejette une licence inconnue / invalide', () => {
    const res = evaluateLemonResponse({ valid: false, error: 'license_key not found' });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('not_found');
  });

  it('mappe un abonnement expiré → cancelled', () => {
    const res = evaluateLemonResponse({ valid: false, license_key: { status: 'expired' } });
    expect(res.reason).toBe('cancelled');
  });

  it('mappe une licence désactivée / remboursée → refunded', () => {
    const res = evaluateLemonResponse({ valid: true, license_key: { status: 'disabled' } });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('refunded');
  });

  it('détecte la limite d’activation atteinte', () => {
    const res = evaluateLemonResponse({
      activated: false,
      error: 'This license key has reached its activation limit.',
      license_key: { status: 'active' },
    });
    expect(res.reason).toBe('limit_reached');
  });

  it('rejette une clé d’un autre store', () => {
    const res = evaluateLemonResponse(
      { valid: true, license_key: { status: 'active' }, meta: { store_id: 999 } },
      { expectedStoreId: '1' },
    );
    expect(res.valid).toBe(false);
    expect(res.message).toBe('store_mismatch');
  });

  it('rejette une clé d’un autre produit', () => {
    const res = evaluateLemonResponse(
      {
        valid: true,
        license_key: { status: 'active' },
        meta: { store_id: 1, product_id: 999 },
      },
      { expectedStoreId: '1', expectedProductId: '42' },
    );
    expect(res.valid).toBe(false);
    expect(res.message).toBe('product_mismatch');
  });

  it('rejette une réponse malformée', () => {
    expect(evaluateLemonResponse(null).reason).toBe('malformed');
    expect(evaluateLemonResponse('nope').reason).toBe('malformed');
  });
});

describe('activateLemonLicense', () => {
  it('appelle /activate avec license_key + instance_name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          activated: true,
          license_key: { status: 'active', activation_usage: 1 },
          instance: { id: 'inst-9' },
        }),
    } as Response);

    const res = await activateLemonLicense({
      licenseKey: 'KEY-456',
      instanceName: 'device-x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res).toEqual({ valid: true, reason: 'ok', uses: 1, instanceId: 'inst-9' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/v1/licenses/activate');
    expect(String(init?.body)).toContain('license_key=KEY-456');
    expect(String(init?.body)).toContain('instance_name=device-x');
  });

  it('refuse une clé vide sans appel réseau', async () => {
    const fetchImpl = vi.fn();
    const res = await activateLemonLicense({
      licenseKey: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.reason).toBe('malformed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('validateLemonLicense', () => {
  it('appelle /validate avec license_key + instance_id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ valid: true, license_key: { status: 'active', activation_usage: 2 } }),
    } as Response);

    const res = await validateLemonLicense({
      licenseKey: 'KEY-456',
      instanceId: 'inst-9',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res.valid).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/v1/licenses/validate');
    expect(String(init?.body)).toContain('instance_id=inst-9');
  });

  it('renvoie network_error si le fetch échoue', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const res = await validateLemonLicense({
      licenseKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.reason).toBe('network_error');
  });
});
