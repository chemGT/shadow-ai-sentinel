import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { getDb } from '../db/index.js';
import type { Db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import {
  getTenantStatus,
  findUserByClerkId,
  provisionUserAndTenant,
} from '../db/queries.js';
import { loadApiConfig } from '../config.js';

export type TenantContext = {
  tenantId: string;
  scopes: string[];
  userId?: string;
  clerkUserId?: string;
  source: 'api_key' | 'clerk_jwt';
};

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantContext;
  }
}

const CLERK_SCOPES = [
  'policies:read',
  'policies:write',
  'telemetry:read',
  'telemetry:write',
  'admin:*',
];

let clerkClient: ReturnType<typeof createClerkClient> | null = null;
function getClerkClient(secretKey: string) {
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey });
  }
  return clerkClient;
}

async function resolveByApiKey(
  db: Db,
  token: string,
): Promise<TenantContext | null> {
  const prefix = token.slice(0, 12);
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

  if (!matched) return null;
  return {
    tenantId: matched.tenantId,
    scopes: matched.scopes,
    source: 'api_key',
  };
}

async function resolveByClerkJwt(
  db: Db,
  token: string,
  secretKey: string,
  issuer: string | null,
): Promise<TenantContext | null> {
  let payload: { sub?: string } & Record<string, unknown>;
  try {
    payload = await verifyToken(token, {
      secretKey,
      ...(issuer ? { authorizedParties: [issuer] } : {}),
    });
  } catch {
    return null;
  }

  const clerkUserId = payload.sub;
  if (!clerkUserId) return null;

  let user = await findUserByClerkId(db, clerkUserId);
  if (!user) {
    let email: string | null = null;
    try {
      const clerk = getClerkClient(secretKey);
      const cu = await clerk.users.getUser(clerkUserId);
      email = cu.primaryEmailAddress?.emailAddress ?? null;
    } catch {
      // Best-effort; provision without email if Clerk fetch fails.
    }
    user = await provisionUserAndTenant(db, { clerkUserId, email });
  }

  return {
    tenantId: user.tenantId,
    scopes: CLERK_SCOPES,
    userId: user.id,
    clerkUserId,
    source: 'clerk_jwt',
  };
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

  let db: Db;
  try {
    db = getDb();
  } catch {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const isJwt = token.split('.').length === 3 && !token.startsWith('sk_');
  const config = loadApiConfig();

  let ctx: TenantContext | null = null;
  if (isJwt && config.clerkSecretKey) {
    ctx = await resolveByClerkJwt(
      db,
      token,
      config.clerkSecretKey,
      config.clerkJwtIssuer,
    );
  }
  if (!ctx) {
    ctx = await resolveByApiKey(db, token);
  }

  if (!ctx) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const status = await getTenantStatus(db, ctx.tenantId);
  if (status === 'suspended' || status === 'canceled') {
    res.status(403).json({ error: 'tenant_suspended' });
    return;
  }

  req.tenant = ctx;
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
