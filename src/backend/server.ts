import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { validatePolicy } from '../core/validation/policy.js';
import { validateTelemetryEvent } from '../core/validation/telemetry.js';
import type { PoliciesResponse, TelemetryBatchRequest, TelemetryEvent } from '../core/types.js';
import { loadApiKeysFromEnv, resolveTenantByApiKey } from './auth.js';
import { buildPolicyForTenant } from './default-policy.js';
import { registerEvents } from './telemetry-store.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const apiKeys = loadApiKeysFromEnv();

type AuthedRequest = Request & { tenantId?: string };

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

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'shadow-ai-sentinel-api' });
});

app.get('/policies', bearerAuth, (req: AuthedRequest, res) => {
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

app.post('/telemetry', bearerAuth, (req: AuthedRequest, res) => {
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

  const { accepted, duplicates } = registerEvents(validEvents);
  res.json({ accepted, duplicates });
});

app.listen(PORT, () => {
  console.log(`[Shadow AI Sentinel] API listening on port ${PORT}`);
  if (apiKeys.size === 0) {
    console.warn('[Shadow AI Sentinel] Aucune clé API — définir API_KEYS ou DEV_TENANT_ID + DEV_API_KEY');
  }
});
