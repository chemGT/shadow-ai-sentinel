import { SUPPORTED_LLM_HOSTS } from '../../core/constants.js';
import { createDefaultPolicy } from '../../core/defaults.js';
import type { ExtensionMessage, Policy } from '../../core/types.js';
import {
  getBrowserFamily,
  getExtensionVersion,
  getOrCreateDeviceId,
  getStoredPolicy,
  onMessage,
  setStoredPolicy,
} from '../platform/index.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { POLICY_SYNC_ALARM, TELEMETRY_FLUSH_ALARM, registerAlarms } from './alarms.js';
import { broadcastPolicyUpdate, syncPolicyFromApi } from './policy-sync.js';
import { enqueueTelemetryEvent, flushTelemetryQueue, type DlpEventInput } from './telemetry-queue.js';

let cachedPolicy: Policy = createDefaultPolicy();

async function refreshCachedPolicy(): Promise<Policy> {
  cachedPolicy = await getStoredPolicy();
  return cachedPolicy;
}

async function bootstrap(): Promise<void> {
  await refreshCachedPolicy();
  const deviceId = await getOrCreateDeviceId();
  registerAlarms();

  const api = getExtensionApi();
  api.runtime.onInstalled.addListener(() => {
    void trySyncAll();
  });

  globalThis.addEventListener('online', () => {
    void trySyncAll();
  });

  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLICY_SYNC_ALARM) {
      void syncPolicyFlow();
      return;
    }
    if (alarm.name === TELEMETRY_FLUSH_ALARM) {
      void flushTelemetryQueue();
    }
  });

  console.info('[Shadow AI Sentinel] Service worker prêt', {
    supportedHosts: SUPPORTED_LLM_HOSTS,
    policyVersion: cachedPolicy.version,
    deviceId: `${deviceId.slice(0, 8)}…`,
    browser: getBrowserFamily(),
    version: getExtensionVersion(),
  });

  void trySyncAll();
}

async function syncPolicyFlow(): Promise<void> {
  try {
    const policy = await syncPolicyFromApi();
    if (policy) {
      cachedPolicy = policy;
      await broadcastPolicyUpdate(policy);
    }
  } catch (error) {
    console.warn('[Shadow AI Sentinel] Sync policy', error);
  }
}

async function trySyncAll(): Promise<void> {
  await syncPolicyFlow();
  await flushTelemetryQueue();
}

onMessage(async (message: ExtensionMessage) => {
  switch (message.type) {
    case 'GET_POLICY':
      return { policy: cachedPolicy };
    case 'POLICY_UPDATED': {
      const next = message.payload as Policy;
      await setStoredPolicy(next);
      cachedPolicy = next;
      await broadcastPolicyUpdate(next);
      return { ok: true };
    }
    case 'QUEUE_TELEMETRY': {
      const input = message.payload as DlpEventInput;
      await enqueueTelemetryEvent(input);
      return { ok: true };
    }
    case 'FLUSH_TELEMETRY': {
      const result = await flushTelemetryQueue();
      return { ok: true, ...result };
    }
    case 'SYNC_POLICY': {
      await syncPolicyFlow();
      return { ok: true, policy: cachedPolicy };
    }
    default:
      return { ok: false, reason: 'Unhandled message type' };
  }
});

void bootstrap();
