import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { resetRateLimitBuckets } from './rate-limit.js';

process.env.API_KEYS = 'acme-corp:dev-secret-change-me';

const { app } = createApp();
const API_KEY = 'dev-secret-change-me';

describe('API integration', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('GET /health sans auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /policies avec Bearer', async () => {
    const res = await request(app)
      .get('/policies')
      .set('Authorization', `Bearer ${API_KEY}`);
    expect(res.status).toBe(200);
    expect(res.body.policy?.tenantId).toBeDefined();
  });

  it('POST /telemetry rejette un champ interdit', async () => {
    const res = await request(app)
      .post('/telemetry')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: '00000000-0000-4000-8000-000000000001',
            tenantId: 'acme-corp',
            deviceId: '00000000-0000-4000-8000-000000000002',
            occurredAt: new Date().toISOString(),
            ruleType: 'iban',
            action: 'block',
            host: 'claude.ai',
            extensionVersion: '0.1.0',
            policyVersion: '1.0.0',
            locale: 'fr',
            browser: 'chromium',
            text: 'ne doit pas passer',
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('interdit');
  });

  it('POST /telemetry accepte un événement valide', async () => {
    const res = await request(app)
      .post('/telemetry')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: crypto.randomUUID(),
            tenantId: 'acme-corp',
            deviceId: '00000000-0000-4000-8000-000000000099',
            occurredAt: new Date().toISOString(),
            ruleType: 'api_key',
            action: 'block',
            host: 'claude.ai',
            extensionVersion: '0.1.0',
            policyVersion: '1.0.0',
            locale: 'en',
            browser: 'chromium',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(1);
  });

  it('POST /feedback exige un token Bearer', async () => {
    const res = await request(app).post('/feedback').send({ events: [] });
    expect(res.status).toBe(401);
  });

  it('POST /feedback accepte un signalement valide', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: crypto.randomUUID(),
            tenantId: 'acme-corp',
            deviceId: '00000000-0000-4000-8000-000000000010',
            occurredAt: new Date().toISOString(),
            ruleType: 'iban',
            contextChoice: 'code',
            host: 'claude.ai',
            extensionVersion: '0.2.0',
            policyVersion: '1.0.0',
            locale: 'fr',
            browser: 'chromium',
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(1);
  });

  it('POST /feedback rejette le champ "text" (contract)', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: crypto.randomUUID(),
            tenantId: 'acme-corp',
            deviceId: '00000000-0000-4000-8000-000000000011',
            occurredAt: new Date().toISOString(),
            ruleType: 'iban',
            contextChoice: 'code',
            host: 'claude.ai',
            extensionVersion: '0.2.0',
            policyVersion: '1.0.0',
            locale: 'fr',
            browser: 'chromium',
            text: 'FR7612345987654321234567890',
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('interdit');
  });

  it('POST /feedback rejette tenantId mismatch (403)', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: crypto.randomUUID(),
            tenantId: 'other-tenant',
            deviceId: '00000000-0000-4000-8000-000000000012',
            occurredAt: new Date().toISOString(),
            ruleType: 'iban',
            contextChoice: 'code',
            host: 'claude.ai',
            extensionVersion: '0.2.0',
            policyVersion: '1.0.0',
            locale: 'fr',
            browser: 'chromium',
          },
        ],
      });
    expect(res.status).toBe(403);
  });

  it('POST /feedback rejette contextChoice inconnu', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        events: [
          {
            eventId: crypto.randomUUID(),
            tenantId: 'acme-corp',
            deviceId: '00000000-0000-4000-8000-000000000013',
            occurredAt: new Date().toISOString(),
            ruleType: 'iban',
            contextChoice: 'invalid_choice',
            host: 'claude.ai',
            extensionVersion: '0.2.0',
            policyVersion: '1.0.0',
            locale: 'fr',
            browser: 'chromium',
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('contextChoice');
  });

  it('POST /feedback rejette batch > 20', async () => {
    const events = Array.from({ length: 21 }, () => ({
      eventId: crypto.randomUUID(),
      tenantId: 'acme-corp',
      deviceId: '00000000-0000-4000-8000-000000000014',
      occurredAt: new Date().toISOString(),
      ruleType: 'iban',
      contextChoice: 'code',
      host: 'claude.ai',
      extensionVersion: '0.2.0',
      policyVersion: '1.0.0',
      locale: 'fr',
      browser: 'chromium',
    }));
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({ events });
    expect(res.status).toBe(400);
  });
});
