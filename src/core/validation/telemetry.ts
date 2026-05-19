import { FORBIDDEN_TELEMETRY_KEYS, ALL_RULE_TYPES } from '../constants.js';
import type {
  BrowserFamily,
  Locale,
  LlmHost,
  RuleAction,
  RuleType,
  TelemetryEvent,
} from '../types.js';

export type TelemetryValidationResult =
  | { ok: true; event: TelemetryEvent }
  | { ok: false; errors: string[] };

const LLM_HOSTS: LlmHost[] = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];
const LOCALES: Locale[] = ['fr', 'en'];
const BROWSERS: BrowserFamily[] = ['chromium', 'firefox'];
const ACTIONS: RuleAction[] = ['block', 'redact'];

function hasForbiddenKeys(record: Record<string, unknown>): string[] {
  return FORBIDDEN_TELEMETRY_KEYS.filter((key) => key in record).map(
    (key) => `champ interdit: ${key}`,
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Valide un événement télémétrie avant enqueue ou envoi API. */
export function validateTelemetryEvent(input: unknown): TelemetryValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['Événement doit être un objet'] };
  }

  const raw = input as Record<string, unknown>;
  const errors = hasForbiddenKeys(raw);

  const requiredStrings: (keyof TelemetryEvent)[] = [
    'eventId',
    'tenantId',
    'deviceId',
    'occurredAt',
    'extensionVersion',
    'policyVersion',
  ];

  for (const key of requiredStrings) {
    if (typeof raw[key] !== 'string' || (raw[key] as string).length === 0) {
      errors.push(`${key} requis (string non vide)`);
    }
  }

  if (typeof raw.eventId === 'string' && !isUuidLike(raw.eventId)) {
    errors.push('eventId doit être un UUID v4');
  }

  if (typeof raw.ruleType === 'string' && !ALL_RULE_TYPES.includes(raw.ruleType as RuleType)) {
    errors.push('ruleType invalide');
  }

  if (typeof raw.action === 'string' && !ACTIONS.includes(raw.action as RuleAction)) {
    errors.push('action invalide');
  }

  if (typeof raw.host === 'string' && !LLM_HOSTS.includes(raw.host as LlmHost)) {
    errors.push('host invalide');
  }

  if (typeof raw.locale === 'string' && !LOCALES.includes(raw.locale as Locale)) {
    errors.push('locale invalide');
  }

  if (typeof raw.browser === 'string' && !BROWSERS.includes(raw.browser as BrowserFamily)) {
    errors.push('browser invalide');
  }

  if (raw.departmentId !== undefined && typeof raw.departmentId !== 'string') {
    errors.push('departmentId doit être une string si présent');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event: TelemetryEvent = {
    eventId: raw.eventId as string,
    tenantId: raw.tenantId as string,
    deviceId: raw.deviceId as string,
    occurredAt: raw.occurredAt as string,
    ruleType: raw.ruleType as RuleType,
    action: raw.action as RuleAction,
    host: raw.host as LlmHost,
    extensionVersion: raw.extensionVersion as string,
    policyVersion: raw.policyVersion as string,
    locale: raw.locale as Locale,
    browser: raw.browser as BrowserFamily,
    ...(raw.departmentId !== undefined
      ? { departmentId: raw.departmentId as string }
      : {}),
  };

  return { ok: true, event };
}

/** Rejette les clés interdites sur un objet brut (defense in depth avant JSON.stringify). */
export function assertNoForbiddenTelemetryFields(payload: Record<string, unknown>): void {
  const forbidden = hasForbiddenKeys(payload);
  if (forbidden.length > 0) {
    throw new Error(forbidden.join('; '));
  }
}
