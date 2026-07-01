import { describe, it, expect, vi } from 'vitest';
import type { Db } from './index.js';
import { appendAuditEntry, getTelemetryCount, getTelemetryAggregate } from './queries.js';

function makeDb(overrides?: Record<string, unknown>) {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  return {
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    update: vi.fn(),
    delete: vi.fn(),
    _insertValues: insertValues,
    ...overrides,
  } as unknown as Db & { _insertValues: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
}

function makeSelectDb(rows: unknown[]) {
  // The chainable must be both awaitable AND support .groupBy().orderBy()
  const resolved = Promise.resolve(rows);
  const chainable: Promise<unknown[]> & { groupBy: () => typeof chainable; orderBy: () => typeof chainable } =
    Object.assign(resolved, {
      groupBy: () => chainable,
      orderBy: () => chainable,
    });

  const where = vi.fn().mockReturnValue(chainable);
  return {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as Db;
}

describe('getTelemetryCount', () => {
  it('retourne le count numérique', async () => {
    const db = makeSelectDb([{ cnt: '17' }]);
    const result = await getTelemetryCount(db, 'tenant-a', new Date(Date.now() - 86400000));
    expect(result).toBe(17);
  });

  it('retourne 0 si aucune ligne', async () => {
    const db = makeSelectDb([]);
    const result = await getTelemetryCount(db, 'tenant-a', new Date());
    expect(result).toBe(0);
  });
});

describe('getTelemetryAggregate', () => {
  it('retourne les rows mappées', async () => {
    const db = makeSelectDb([{ key: 'iban', cnt: '5' }, { key: 'api_key', cnt: '3' }]);
    const result = await getTelemetryAggregate(db, 'tenant-a', new Date(), 'ruleType');
    expect(result).toEqual([{ key: 'iban', count: 5 }, { key: 'api_key', count: 3 }]);
  });

  it('retourne tableau vide si aucune ligne', async () => {
    const db = makeSelectDb([]);
    const result = await getTelemetryAggregate(db, 'tenant-a', new Date(), 'action');
    expect(result).toEqual([]);
  });
});

describe('appendAuditEntry', () => {
  it('inserts one row with required fields', async () => {
    const db = makeDb();
    await appendAuditEntry(db, 'tenant-x', 'test-actor', 'api_key.created', { keyId: 'k1' });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db._insertValues).toHaveBeenCalledWith({
      tenantId: 'tenant-x',
      actor: 'test-actor',
      action: 'api_key.created',
      payload: { keyId: 'k1' },
    });
  });

  it('does not call update or delete on the db', async () => {
    const db = makeDb();
    await appendAuditEntry(db, 'tenant-x', 'actor', 'api_key.rotated');

    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('accepts optional payload', async () => {
    const db = makeDb();
    await appendAuditEntry(db, 'tenant-y', 'actor', 'tenant_created');

    expect(db._insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tenant_created', payload: undefined }),
    );
  });
});
