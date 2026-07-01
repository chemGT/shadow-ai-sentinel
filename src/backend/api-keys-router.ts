import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './db/index.js';
import { apiKeys } from './db/schema.js';
import { appendAuditEntry } from './db/queries.js';
import { tenantMiddleware, requireScope } from './middleware/tenant.js';

export const GRACE_PERIOD_DAYS = 7;
export const BCRYPT_ROUNDS = 10;
export const VALID_SCOPES = ['policies:read', 'telemetry:read', 'telemetry:write', 'admin:*'] as const;

function generateKey(): { full: string; prefix: string; hash: Promise<string> } {
  const full = `sk_live_${randomBytes(24).toString('hex')}`;
  const prefix = full.slice(0, 16);
  const hash = bcrypt.hash(full, BCRYPT_ROUNDS);
  return { full, prefix, hash };
}

export const apiKeysRouter = Router();

apiKeysRouter.use(tenantMiddleware as never);
apiKeysRouter.use(requireScope('admin:*') as never);

/** POST /api-keys — create new key */
apiKeysRouter.post('/', async (req, res) => {
  const { scopes = ['policies:read', 'telemetry:write'] } = req.body as {
    scopes?: string[];
  };

  const invalid = scopes.filter((s) => !(VALID_SCOPES as readonly string[]).includes(s));
  if (invalid.length > 0) {
    res.status(400).json({ error: 'invalid_scopes', invalid });
    return;
  }

  const tenantId = req.tenant!.tenantId;
  const { full, prefix, hash } = generateKey();

  const db = getDb();
  const [row] = await db
    .insert(apiKeys)
    .values({ tenantId, keyHash: await hash, keyPrefix: prefix, scopes })
    .returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });

  await appendAuditEntry(db, tenantId, req.tenant!.scopes.join(','), 'api_key.created', {
    keyId: row.id,
    scopes,
  });

  // Full key shown once — not stored in plain text
  res.status(201).json({ id: row.id, key: full, prefix, scopes, createdAt: row.createdAt });
});

/** DELETE /api-keys/:id — immediate revoke */
apiKeysRouter.delete('/:id', async (req, res) => {
  const tenantId = req.tenant!.tenantId;
  const db = getDb();

  const [revoked] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, req.params.id),
        eq(apiKeys.tenantId, tenantId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });

  if (!revoked) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  await appendAuditEntry(db, tenantId, req.tenant!.scopes.join(','), 'api_key.revoked', {
    keyId: revoked.id,
  });

  res.status(204).end();
});

/** POST /api-keys/:id/rotate — new key + grace period on old */
apiKeysRouter.post('/:id/rotate', async (req, res) => {
  const tenantId = req.tenant!.tenantId;
  const db = getDb();

  const [old] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, req.params.id),
        eq(apiKeys.tenantId, tenantId),
        isNull(apiKeys.revokedAt),
      ),
    );

  if (!old) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const graceExpiry = new Date();
  graceExpiry.setDate(graceExpiry.getDate() + GRACE_PERIOD_DAYS);

  const { full, prefix, hash } = generateKey();

  const [newKey] = await db
    .insert(apiKeys)
    .values({ tenantId, keyHash: await hash, keyPrefix: prefix, scopes: old.scopes })
    .returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });

  await db
    .update(apiKeys)
    .set({ expiresAt: graceExpiry })
    .where(eq(apiKeys.id, old.id));

  await appendAuditEntry(db, tenantId, req.tenant!.scopes.join(','), 'api_key.rotated', {
    oldKeyId: old.id,
    newKeyId: newKey.id,
    graceExpiry,
  });

  res.status(201).json({
    id: newKey.id,
    key: full,
    prefix,
    scopes: old.scopes,
    createdAt: newKey.createdAt,
    oldKeyExpiresAt: graceExpiry,
  });
});
