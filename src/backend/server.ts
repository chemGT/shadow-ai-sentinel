import { loadApiKeysFromEnv } from './auth.js';
import { createApp } from './app.js';
import { purgeExpiredEvents } from './telemetry-store.js';
import { getDb } from './db/index.js';
import { startScheduler } from './jobs/scheduler.js';

const { app, config, retentionMs } = createApp();
const apiKeys = loadApiKeysFromEnv();

const PURGE_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  const removed = purgeExpiredEvents(retentionMs);
  if (removed > 0) {
    console.info(`[API] Purge télémétrie : ${removed} événement(s) expiré(s)`);
  }
}, PURGE_INTERVAL_MS);

app.listen(config.port, () => {
  console.log(`[Shadow AI Sentinel] API listening on port ${config.port}`);
  console.info(
    `[Shadow AI Sentinel] Rétention télémétrie ${config.telemetryRetentionDays} j — rate limits policies=${config.rateLimitPoliciesPerMin}/min telemetry=${config.rateLimitTelemetryPerMin}/min`,
  );
  if (apiKeys.size === 0) {
    console.warn('[Shadow AI Sentinel] Aucune clé API — définir API_KEYS ou DEV_TENANT_ID + DEV_API_KEY');
  }

  try {
    const db = getDb();
    startScheduler(db);
    console.info('[Shadow AI Sentinel] Background jobs démarrés (purge + warmup + dunning)');
  } catch {
    console.warn('[Shadow AI Sentinel] DATABASE_URL absent — background jobs désactivés');
  }
});
