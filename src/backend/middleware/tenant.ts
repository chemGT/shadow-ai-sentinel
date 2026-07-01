import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { getTenantStatus } from '../db/queries.js';

export type TenantContext = {
  tenantId: string;
  scopes: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantContext;
  }
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const token = authHeader.slice(7);
  if (token.length < 12) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const prefix = token.slice(0, 12);

  let db;
  try {
    db = getDb();
  } catch {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const now = new Date();
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
      ),
    );

  const matched = await Promise.all(
    candidates.map(async (k) => ({
      key: k,
      valid: await bcrypt.compare(token, k.keyHash),
    })),
  ).then((results) => results.find((r) => r.valid)?.key ?? null);

  if (!matched) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const status = await getTenantStatus(db, matched.tenantId);
  if (status === 'suspended' || status === 'canceled') {
    res.status(403).json({ error: 'tenant_suspended' });
    return;
  }

  req.tenant = { tenantId: matched.tenantId, scopes: matched.scopes };
  next();
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant?.scopes.includes(scope)) {
      res.status(403).json({ error: 'insufficient_scope', required: scope });
      return;
    }
    next();
  };
}
