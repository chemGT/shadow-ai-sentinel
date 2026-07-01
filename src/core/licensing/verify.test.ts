import { describe, it, expect, vi } from 'vitest';
import { evaluateGumroadResponse, verifyGumroadLicense } from './verify.js';

describe('evaluateGumroadResponse', () => {
  it('valide une licence active', () => {
    expect(evaluateGumroadResponse({ success: true, uses: 1, purchase: {} })).toEqual({
      valid: true,
      reason: 'ok',
      uses: 1,
    });
  });

  it('rejette une licence inconnue', () => {
    const res = evaluateGumroadResponse({ success: false, message: 'does not exist' });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('not_found');
  });

  it('rejette un remboursement / chargeback', () => {
    expect(evaluateGumroadResponse({ success: true, purchase: { refunded: true } }).reason).toBe(
      'refunded',
    );
    expect(
      evaluateGumroadResponse({ success: true, purchase: { chargebacked: true } }).valid,
    ).toBe(false);
  });

  it('rejette un litige', () => {
    expect(evaluateGumroadResponse({ success: true, purchase: { disputed: true } }).reason).toBe(
      'disputed',
    );
  });

  it('rejette un abonnement annulé', () => {
    const res = evaluateGumroadResponse({
      success: true,
      purchase: { subscription_cancelled_at: '2026-01-01T00:00:00Z' },
    });
    expect(res.reason).toBe('cancelled');
  });

  it('rejette une réponse malformée', () => {
    expect(evaluateGumroadResponse(null).reason).toBe('malformed');
    expect(evaluateGumroadResponse('nope').reason).toBe('malformed');
  });
});

describe('verifyGumroadLicense', () => {
  it('appelle l’endpoint Gumroad et parse la réponse', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, uses: 2, purchase: {} }),
    } as Response);

    const res = await verifyGumroadLicense({
      productId: 'prod_123',
      licenseKey: 'KEY-456',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res).toEqual({ valid: true, reason: 'ok', uses: 2 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/v2/licenses/verify');
    expect(String(init?.body)).toContain('product_id=prod_123');
    expect(String(init?.body)).toContain('license_key=KEY-456');
  });

  it('renvoie network_error si le fetch échoue', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const res = await verifyGumroadLicense({
      productId: 'p',
      licenseKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.reason).toBe('network_error');
  });

  it('refuse une clé vide sans appel réseau', async () => {
    const fetchImpl = vi.fn();
    const res = await verifyGumroadLicense({
      productId: 'p',
      licenseKey: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.reason).toBe('malformed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
