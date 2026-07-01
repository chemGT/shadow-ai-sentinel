import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { validatePolicy } from '../core/validation/policy.js';
import { validateTelemetryEvent } from '../core/validation/telemetry.js';
import { validateFeedbackEvent } from '../core/validation/feedback.js';
import type {
  FeedbackBatchRequest,
  FeedbackEvent,
  PoliciesResponse,
  TelemetryBatchRequest,
  TelemetryEvent,
} from '../core/types.js';
import { loadApiKeysFromEnv, resolveTenantByApiKey } from './auth.js';
import { loadApiConfig } from './config.js';
import { buildPolicyForTenant } from './default-policy.js';
import { rejectForbiddenTelemetryBody, securityHeaders } from './middleware/security.js';
import { safeRequestLog } from './middleware/request-log.js';
import { createRateLimiter } from './rate-limit.js';
import { countStoredEvents, getRetentionMs, registerEvents } from './telemetry-store.js';
import { apiKeysRouter } from './api-keys-router.js';
import { eventsRouter } from './events-router.js';

export type AuthedRequest = Request & { tenantId?: string };

export function createApp() {
  const config = loadApiConfig();
  const apiKeys = loadApiKeysFromEnv();
  const retentionMs = getRetentionMs(config.telemetryRetentionDays);
  const app = express();

  function bearerAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization Bearer requis' });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    const tenantId = resolveTenantByApiKey(token, apiKeys);
    if (!tenantId) {
      res.status(401).json({ error: 'Clé API invalide' });
      return;
    }

    req.tenantId = tenantId;
    next();
  }

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(securityHeaders);
  app.use(safeRequestLog);
  app.use(
    cors({
      origin: config.corsOrigins === '*' ? true : config.corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(rejectForbiddenTelemetryBody);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shadow-ai-sentinel-api',
      telemetryStored: countStoredEvents(),
      retentionDays: config.telemetryRetentionDays,
    });
  });

  const policiesLimiter = createRateLimiter(config.rateLimitPoliciesPerMin);
  const telemetryLimiter = createRateLimiter(config.rateLimitTelemetryPerMin);

  app.get('/policies', bearerAuth, policiesLimiter, (req: AuthedRequest, res) => {
    const tenantId = req.tenantId!;
    const emailDomainsRaw = req.query.emailDomains;
    const emailDomains =
      typeof emailDomainsRaw === 'string'
        ? emailDomainsRaw.split(',').map((d) => d.trim()).filter(Boolean)
        : [];

    const policy = buildPolicyForTenant(tenantId, emailDomains);
    const validated = validatePolicy(policy);
    if (!validated.ok) {
      res.status(500).json({ error: 'Policy serveur invalide', details: validated.errors });
      return;
    }

    const body: PoliciesResponse = { policy: validated.policy };
    res.json(body);
  });

  app.post('/telemetry', bearerAuth, telemetryLimiter, (req: AuthedRequest, res) => {
    const payload = req.body as TelemetryBatchRequest;
    if (!payload || !Array.isArray(payload.events)) {
      res.status(400).json({ error: 'Corps attendu: { events: TelemetryEvent[] }' });
      return;
    }

    if (payload.events.length === 0) {
      res.json({ accepted: 0, duplicates: 0 });
      return;
    }

    if (payload.events.length > 50) {
      res.status(400).json({ error: 'Maximum 50 événements par requête' });
      return;
    }

    const tenantId = req.tenantId!;
    const validEvents: TelemetryEvent[] = [];

    for (let i = 0; i < payload.events.length; i += 1) {
      const result = validateTelemetryEvent(payload.events[i]);
      if (!result.ok) {
        res.status(400).json({ error: `events[${i}] invalide`, details: result.errors });
        return;
      }
      if (result.event.tenantId !== tenantId) {
        res.status(403).json({ error: `events[${i}].tenantId ne correspond pas au token` });
        return;
      }
      validEvents.push(result.event);
    }

    const { accepted, duplicates } = registerEvents(validEvents, retentionMs);
    res.json({ accepted, duplicates });
  });

  app.post('/feedback', bearerAuth, telemetryLimiter, (req: AuthedRequest, res) => {
    const payload = req.body as FeedbackBatchRequest;
    if (!payload || !Array.isArray(payload.events)) {
      res.status(400).json({ error: 'Corps attendu: { events: FeedbackEvent[] }' });
      return;
    }

    if (payload.events.length === 0) {
      res.json({ accepted: 0 });
      return;
    }

    if (payload.events.length > 20) {
      res.status(400).json({ error: 'Maximum 20 signalements par requête' });
      return;
    }

    const tenantId = req.tenantId!;
    const validEvents: FeedbackEvent[] = [];

    for (let i = 0; i < payload.events.length; i += 1) {
      const result = validateFeedbackEvent(payload.events[i]);
      if (!result.ok) {
        res.status(400).json({ error: `events[${i}] invalide`, details: result.errors });
        return;
      }
      if (result.event.tenantId !== tenantId) {
        res.status(403).json({ error: `events[${i}].tenantId ne correspond pas au token` });
        return;
      }
      validEvents.push(result.event);
    }

    res.json({ accepted: validEvents.length });
  });

  app.use('/api-keys', apiKeysRouter);
  app.use('/events', eventsRouter);

  return { app, config, retentionMs };
}
