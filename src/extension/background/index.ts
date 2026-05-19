import { PILOT_LLM_HOST } from '../../core/constants.js';
import { createDefaultPolicy } from '../../core/defaults.js';
import type { Policy } from '../../core/types.js';
import {
  getBrowserFamily,
  getExtensionVersion,
  getOrCreateDeviceId,
  getStoredPolicy,
  onMessage,
  setStoredPolicy,
} from '../platform/index.js';

let cachedPolicy: Policy = createDefaultPolicy();

async function bootstrap(): Promise<void> {
  cachedPolicy = await getStoredPolicy();
  const deviceId = await getOrCreateDeviceId();
  const browser = getBrowserFamily();
  const version = getExtensionVersion();

  console.info('[Shadow AI Sentinel] Service worker prêt', {
    pilotHost: PILOT_LLM_HOST,
    policyVersion: cachedPolicy.version,
    deviceId: `${deviceId.slice(0, 8)}…`,
    browser,
    version,
  });
}

onMessage(async (message) => {
  switch (message.type) {
    case 'GET_POLICY':
      return { policy: cachedPolicy };
    case 'POLICY_UPDATED': {
      const next = message.payload as Policy;
      await setStoredPolicy(next);
      cachedPolicy = next;
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'Unhandled message type' };
  }
});

void bootstrap();
