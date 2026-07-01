import type { LlmHost } from '../../core/types.js';
import { validateTelemetryEvent } from '../../core/validation/telemetry.js';
import type {
  RuleAction,
  RuleType,
  TelemetryEvent,
  TelemetryQueueItem,
} from '../../core/types.js';
import {
  getOrCreateDeviceId,
  getStoredPolicy,
  getTelemetryQueue,
  getTenantCredentials,
  setTelemetryQueue,
} from '../platform/storage.js';
import {
  getBrowserFamily,
  getExtensionVersion,
} from '../platform/browser-api.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { getExtensionApi } from '../platform/browser-api.js';

const MAX_QUEUE_SIZE = 1000;
const BATCH_SIZE = 50;
const MAX_RETRY = 10;

export type DlpEventInput = {
  ruleType: RuleType;
  action: RuleAction;
  host: LlmHost;
  locale?: 'fr' | 'en';
};

function backoffMs(retryCount: number): number {
  const base = Math.min(30 * 60 * 1000, 60 * 1000 * 2 ** retryCount);
  return base;
}

async function getLocale(): Promise<'fr' | 'en'> {
  const api = getExtensionApi();
  const stored = await api.storage.local.get(STORAGE_KEYS.locale);
  const value = stored[STORAGE_KEYS.locale];
  return value === 'en' ? 'en' : 'fr';
}

export async function buildTelemetryEvent(input: DlpEventInput): Promise<TelemetryEvent | null> {
  const policy = await getStoredPolicy();
  const credentials = await getTenantCredentials();
  if (!credentials?.tenantId) {
    return null;
  }

  const deviceId = await getOrCreateDeviceId();
  const locale = input.locale ?? (await getLocale());

  const event: TelemetryEvent = {
    eventId: crypto.randomUUID(),
    tenantId: credentials.tenantId,
    deviceId,
    occurredAt: new Date().toISOString(),
    ruleType: input.ruleType,
    action: input.action,
    host: input.host,
    extensionVersion: getExtensionVersion(),
    policyVersion: policy.version,
    locale,
    browser: getBrowserFamily(),
    ...(policy.departmentId ? { departmentId: policy.departmentId } : {}),
  };

  const validated = validateTelemetryEvent(event);
  if (!validated.ok) {
    console.warn('[Shadow AI Sentinel] Événement télémétrie rejeté', validated.errors);
    return null;
  }

  return validated.event;
}

export async function enqueueTelemetryEvent(input: DlpEventInput): Promise<void> {
  const event = await buildTelemetryEvent(input);
  if (!event) {
    return;
  }

  const queue = await getTelemetryQueue();
  queue.push({
    event,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  });

  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  await setTelemetryQueue(queue);
  void flushTelemetryQueue();
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function flushTelemetryQueue(): Promise<{ sent: number; remaining: number }> {
  const credentials = await getTenantCredentials();
  if (!credentials) {
    return { sent: 0, remaining: (await getTelemetryQueue()).length };
  }

  let queue = await getTelemetryQueue();
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 };
  }

  const base = normalizeBaseUrl(credentials.apiBaseUrl);
  let sent = 0;

  while (queue.length > 0) {
    const batch = queue.slice(0, BATCH_SIZE);
    const events = batch.map((item) => item.event);

    try {
      const response = await fetch(`${base}/telemetry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      sent += batch.length;
      queue = queue.slice(batch.length);
      await setTelemetryQueue(queue);
    } catch (error) {
      const failed = queue.slice(0, BATCH_SIZE);
      const rest = queue.slice(BATCH_SIZE);
      const kept: TelemetryQueueItem[] = [];

      for (const item of failed) {
        const nextRetry = item.retryCount + 1;
        if (nextRetry > MAX_RETRY) {
          console.warn('[Shadow AI Sentinel] Drop télémétrie', item.event.eventId);
          continue;
        }
        kept.push({
          ...item,
          retryCount: nextRetry,
          queuedAt: new Date(Date.now() + backoffMs(item.retryCount)).toISOString(),
        });
      }

      queue = [...kept, ...rest];
      await setTelemetryQueue(queue);
      console.warn('[Shadow AI Sentinel] Flush télémétrie reporté', error);
      break;
    }
  }

  return { sent, remaining: queue.length };
}
