import { describe, it, expect, vi } from 'vitest';
import type { Db } from './index.js';
import { appendAuditEntry } from './queries.js';

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
