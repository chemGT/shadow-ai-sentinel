import { getExtensionApi } from '../platform/browser-api.js';

export const POLICY_SYNC_ALARM = 'sentinel-policy-sync';
export const TELEMETRY_FLUSH_ALARM = 'sentinel-telemetry-flush';
export const LICENSE_REFRESH_ALARM = 'sentinel-license-refresh';

const POLICY_INTERVAL_MINUTES = 30;
const TELEMETRY_INTERVAL_MINUTES = 5;
const LICENSE_INTERVAL_MINUTES = 24 * 60;

export function registerAlarms(): void {
  const api = getExtensionApi();
  api.alarms.create(POLICY_SYNC_ALARM, { periodInMinutes: POLICY_INTERVAL_MINUTES });
  api.alarms.create(TELEMETRY_FLUSH_ALARM, { periodInMinutes: TELEMETRY_INTERVAL_MINUTES });
  api.alarms.create(LICENSE_REFRESH_ALARM, { periodInMinutes: LICENSE_INTERVAL_MINUTES });
}
