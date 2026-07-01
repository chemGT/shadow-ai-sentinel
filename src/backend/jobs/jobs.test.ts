import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/queries.js', () => ({
  getAllTenants: vi.fn(),
  getActiveTenants: vi.fn(),
  deleteTelemetryOlderThan: vi.fn(),
  getOverdueTenants: vi.fn(),
  suspendTenant: vi.fn(),
  revokeAllTenantKeys: vi.fn(),
  appendAuditEntry: vi.fn(),
  getTelemetryAggregate: vi.fn(),
  getTelemetryCount: vi.fn(),
}));

vi.mock('../events-router.js', () => ({
  setCacheEntry: vi.fn(),
  CACHE_TTL_MS: 5 * 60 * 1000,
}));

import {
  getAllTenants,
  getActiveTenants,
  deleteTelemetryOlderThan,
  getOverdueTenants,
  suspendTenant,
  revokeAllTenantKeys,
  appendAuditEntry,
  getTelemetryAggregate,
  getTelemetryCount,
} from '../db/queries.js';
import { setCacheEntry } from '../events-router.js';
import { runPurgeJob, retentionDaysForPlan } from './purge-db.js';
import { runAggregateWarmup } from './aggregate-warmup.js';
import { runDunningCheck, DEFAULT_GRACE_PERIOD_DAYS } from './dunning.js';

const mockDb = {} as never;

describe('retentionDaysForPlan', () => {
  it('trial → 30 jours', () => expect(retentionDaysForPlan('trial')).toBe(30));
  it('starter → 60 jours', () => expect(retentionDaysForPlan('starter')).toBe(60));
  it('business → 90 jours', () => expect(retentionDaysForPlan('business')).toBe(90));
  it('plan inconnu → 90 jours (défaut)', () => expect(retentionDaysForPlan('unknown')).toBe(90));
});

describe('runPurgeJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('purge les événements de chaque tenant selon son plan', async () => {
    vi.mocked(getAllTenants).mockResolvedValue([
      { id: 'tenant-1', plan: 'trial', status: 'active' },
      { id: 'tenant-2', plan: 'business', status: 'active' },
    ]);
    vi.mocked(deleteTelemetryOlderThan).mockResolvedValue(undefined);

    const count = await runPurgeJob(mockDb);

    expect(count).toBe(2);
    expect(deleteTelemetryOlderThan).toHaveBeenCalledTimes(2);

    const call1 = vi.mocked(deleteTelemetryOlderThan).mock.calls[0];
    const cutoff1 = call1[2] as Date;
    const diffDays1 = (Date.now() - cutoff1.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays1).toBeCloseTo(30, 0);

    const call2 = vi.mocked(deleteTelemetryOlderThan).mock.calls[1];
    const cutoff2 = call2[2] as Date;
    const diffDays2 = (Date.now() - cutoff2.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays2).toBeCloseTo(90, 0);
  });

  it('0 tenant → retourne 0', async () => {
    vi.mocked(getAllTenants).mockResolvedValue([]);
    const count = await runPurgeJob(mockDb);
    expect(count).toBe(0);
    expect(deleteTelemetryOlderThan).not.toHaveBeenCalled();
  });
});

describe('runAggregateWarmup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pré-chauffe le cache pour chaque tenant actif', async () => {
    vi.mocked(getActiveTenants).mockResolvedValue([
      { id: 'tenant-a' },
      { id: 'tenant-b' },
    ]);
    vi.mocked(getTelemetryAggregate).mockResolvedValue([{ key: 'iban', count: 5 }]);
    vi.mocked(getTelemetryCount).mockResolvedValue(10);

    const count = await runAggregateWarmup(mockDb);

    expect(count).toBe(2);
    expect(setCacheEntry).toHaveBeenCalledTimes(2);

    const firstCall = vi.mocked(setCacheEntry).mock.calls[0];
    expect(firstCall[0]).toBe('tenant-a');
    expect(firstCall[1]).toBe(30);
    expect(firstCall[2]).toBe('all');
    expect(firstCall[3]).toMatchObject({ days: 30, groupBy: 'all', total: 10 });
  });

  it('0 tenant actif → retourne 0', async () => {
    vi.mocked(getActiveTenants).mockResolvedValue([]);
    const count = await runAggregateWarmup(mockDb);
    expect(count).toBe(0);
    expect(setCacheEntry).not.toHaveBeenCalled();
  });
});

describe('runDunningCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DEFAULT_GRACE_PERIOD_DAYS est 7', () => {
    expect(DEFAULT_GRACE_PERIOD_DAYS).toBe(7);
  });

  it('suspend les tenants en retard + révoque leurs clés + audit', async () => {
    vi.mocked(getOverdueTenants).mockResolvedValue([
      { id: 'tenant-overdue' },
    ]);
    vi.mocked(revokeAllTenantKeys).mockResolvedValue(2);
    vi.mocked(suspendTenant).mockResolvedValue(undefined);
    vi.mocked(appendAuditEntry).mockResolvedValue(undefined);

    const count = await runDunningCheck(mockDb);

    expect(count).toBe(1);
    expect(suspendTenant).toHaveBeenCalledWith(mockDb, 'tenant-overdue');
    expect(revokeAllTenantKeys).toHaveBeenCalledWith(mockDb, 'tenant-overdue');
    expect(appendAuditEntry).toHaveBeenCalledWith(
      mockDb,
      'tenant-overdue',
      'system:dunning',
      'tenant.suspended',
      expect.objectContaining({ reason: 'payment_overdue', keysRevoked: 2 }),
    );
  });

  it('utilise le cutoff correct pour la grace period', async () => {
    vi.mocked(getOverdueTenants).mockResolvedValue([]);
    await runDunningCheck(mockDb, 14);

    const cutoff = vi.mocked(getOverdueTenants).mock.calls[0][1] as Date;
    const diffDays = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(14, 0);
  });

  it('0 tenant overdue → retourne 0', async () => {
    vi.mocked(getOverdueTenants).mockResolvedValue([]);
    const count = await runDunningCheck(mockDb);
    expect(count).toBe(0);
    expect(suspendTenant).not.toHaveBeenCalled();
  });
});
