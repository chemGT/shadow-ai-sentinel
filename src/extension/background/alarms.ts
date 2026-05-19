import { getExtensionApi } from '../platform/browser-api.js';

export const POLICY_SYNC_ALARM = 'sentinel-policy-sync';
export const TELEMETRY_FLUSH_ALARM = 'sentinel-telemetry-flush';

const POLICY_INTERVAL_MINUTES = 30;
const TELEMETRY_INTERVAL_MINUTES = 5;

export function registerAlarms(): void {
  const api = getExtensionApi();
  api.alarms.create(POLICY_SYNC_ALARM, { periodInMinutes: POLICY_INTERVAL_MINUTES });
  api.alarms.create(TELEMETRY_FLUSH_ALARM, { periodInMinutes: TELEMETRY_INTERVAL_MINUTES });
}
